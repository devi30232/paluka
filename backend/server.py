from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import os, re, secrets, logging, bcrypt, jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
app = FastAPI(title="VaaniStock AI")
api = APIRouter(prefix="/api")
JWT_SECRET = os.environ.get("JWT_SECRET", "vaanistock-demo-secret-change-me")
JWT_ALGO = "HS256"

def now(): return datetime.now(timezone.utc).isoformat()
def uid(): return secrets.token_hex(12)
def safe(doc):
    if not doc: return None
    doc = dict(doc); doc.pop("_id", None); doc.pop("password_hash", None); return doc
def token_for(user_id):
    return jwt.encode({"sub": user_id, "jti": uid(), "exp": datetime.now(timezone.utc)+timedelta(days=7)}, JWT_SECRET, algorithm=JWT_ALGO)
def hash_password(value): return bcrypt.hashpw(value.encode(), bcrypt.gensalt()).decode()
def verify_password(value, hashed): return bcrypt.checkpw(value.encode(), hashed.encode())

async def current_user(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token: raise HTTPException(401, "Please sign in to continue.")
    try: payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception: raise HTTPException(401, "Your session has expired. Please sign in again.")
    if payload.get("jti") and await db.revoked_tokens.find_one({"jti": payload["jti"]}): raise HTTPException(401, "Your session has ended. Please sign in again.")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user: raise HTTPException(401, "Please sign in to continue.")
    return user

class AuthIn(BaseModel): email: EmailStr; password: str = Field(min_length=6)
class ProfileIn(BaseModel): name: str; phone: str = ""; preferred_language: str = "Telugu + English"
class ShopIn(BaseModel): shop_name: str; owner_name: str; business_type: str = "Kirana Store"; phone: str = ""; email: str = ""; city: str = ""; currency: str = "INR ₹"
class SettingsIn(BaseModel): preferred_language: str = "Telugu + English"; voice_response_enabled: bool = True; default_low_stock_threshold: int = Field(default=5, ge=1)
class ProductIn(BaseModel): name: str; category: str = "Grocery"; quantity: float = Field(ge=0); unit: str; price: float = Field(ge=0); minimum_stock: Optional[float] = Field(default=None, ge=0); icon: str = "◌"
class StockIn(BaseModel): product_id: str; quantity: float = Field(gt=0); unit: Optional[str] = None; price: Optional[float] = Field(default=None, ge=0); source: str = "Manual"; original_command: str = ""
class CommandIn(BaseModel): command: str

SEED = [
    ("Rice", "Grains", 18, "BAG", 850, 8, "🌾"), ("Sugar", "Staples", 7, "BAG", 520, 8, "🫙"),
    ("Sunflower Oil", "Cooking", 3, "CARTON", 1450, 5, "🫗"), ("Milk", "Dairy", 12, "PACKET", 35, 6, "🥛"),
    ("Soap", "Personal Care", 24, "PIECE", 42, 10, "🧼"), ("Wheat Flour", "Grains", 8, "BAG", 650, 5, "🌾"),
    ("Biscuits", "Snacks", 4, "BOX", 120, 6, "🍪")]

async def ensure_shop(user):
    shop = await db.shops.find_one({"owner_id": user["id"]}, {"_id": 0})
    if shop: return shop
    shop = {"id": uid(), "owner_id": user["id"], "shop_name": "Sri Lakshmi Kirana", "owner_name": user.get("name", "Shop Owner"), "business_type": "Kirana Store", "phone": "", "email": user["email"], "city": "Hyderabad", "currency": "INR ₹", "preferred_language": "Telugu + English", "voice_response_enabled": True, "default_low_stock_threshold": 5, "created_at": now(), "updated_at": now()}
    await db.shops.insert_one(shop)
    if await db.products.count_documents({"shop_id": shop["id"]}) == 0:
        for name, cat, qty, unit, price, minimum, icon in SEED:
            await db.products.insert_one({"id": uid(), "shop_id": shop["id"], "name": name, "category": cat, "quantity": qty, "unit": unit, "price": price, "minimum_stock": minimum, "icon": icon, "created_at": now(), "updated_at": now()})
    return shop
async def context(user): return await ensure_shop(user)

def set_auth_cookie(response, token):
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
@api.post("/auth/register")
async def register(body: AuthIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}): raise HTTPException(409, "An account with this email already exists.")
    user = {"id": uid(), "email": email, "password_hash": hash_password(body.password), "name": email.split("@")[0].title(), "phone": "", "preferred_language": "Telugu + English", "created_at": now()}
    await db.users.insert_one(user); await ensure_shop(user)
    token = token_for(user["id"]); set_auth_cookie(response, token); return {"user": safe(user), "token": token}
@api.post("/auth/login")
async def login(body: AuthIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]): raise HTTPException(401, "Email or password is incorrect.")
    await ensure_shop(user); token = token_for(user["id"]); set_auth_cookie(response, token); return {"user": safe(user), "token": token}
@api.post("/auth/demo")
async def demo(response: Response):
    email = "demo@vaanistock.ai"; user = await db.users.find_one({"email": email})
    if not user:
        user = {"id": uid(), "email": email, "password_hash": hash_password("demo123"), "name": "Anjali Reddy", "phone": "+91 98765 43210", "preferred_language": "Telugu + English", "created_at": now()}; await db.users.insert_one(user)
    await ensure_shop(user); token = token_for(user["id"]); set_auth_cookie(response, token); return {"user": safe(user), "token": token}
@api.get("/auth/me")
async def me(user=Depends(current_user)): return safe(user)
@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.headers.get("Authorization", "")[7:] if request.headers.get("Authorization", "").startswith("Bearer ") else request.cookies.get("access_token")
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO], options={"verify_exp": False})
            if payload.get("jti"): await db.revoked_tokens.insert_one({"jti": payload["jti"], "created_at": now()})
        except Exception: pass
    response.delete_cookie("access_token", path="/"); return {"ok": True}

async def product_list(shop): return [safe(x) for x in await db.products.find({"shop_id": shop["id"]}, {"_id": 0}).sort("name", 1).to_list(200)]
def status(p): return "Out of Stock" if p["quantity"] <= 0 else ("Low Stock" if p["quantity"] <= p["minimum_stock"] else "Good Stock")
async def stats(shop):
    products = await product_list(shop); start = datetime.now(timezone.utc).date().isoformat()
    tx = await db.transactions.find({"shop_id": shop["id"], "created_at": {"$gte": start}}, {"_id": 0}).to_list(500)
    return {"total_products": len(products), "low_stock": sum(status(p)=="Low Stock" for p in products), "out_of_stock": sum(status(p)=="Out of Stock" for p in products), "stock_in_today": sum(x["quantity"] for x in tx if x["action"]=="STOCK_IN"), "stock_out_today": sum(x["quantity"] for x in tx if x["action"]=="STOCK_OUT")}
async def mutate(shop, body, action):
    p = await db.products.find_one({"id": body.product_id, "shop_id": shop["id"]}, {"_id": 0})
    if not p: raise HTTPException(404, "We couldn't find that product.")
    old = p["quantity"]; new = old + body.quantity if action == "STOCK_IN" else old - body.quantity
    if new < 0: raise HTTPException(400, f"Only {old:g} {p['unit'].lower()} are available. You cannot remove {body.quantity:g}.")
    await db.products.update_one({"id": p["id"]}, {"$set": {"quantity": new, "updated_at": now()}})
    tx = {"id": uid(), "shop_id": shop["id"], "product_id": p["id"], "product_name": p["name"], "action": action, "quantity": body.quantity, "unit": body.unit or p["unit"], "price": body.price, "previous_quantity": old, "new_quantity": new, "source": body.source, "original_command": body.original_command, "created_at": now()}
    await db.transactions.insert_one(tx); return {"product": {**p, "quantity": new}, "transaction": safe(tx)}

@api.get("/bootstrap")
async def bootstrap(user=Depends(current_user)):
    shop = await context(user); products = await product_list(shop); history = [safe(x) for x in await db.transactions.find({"shop_id": shop["id"]}, {"_id": 0}).sort("created_at", -1).to_list(5)]
    return {"shop": safe(shop), "products": products, "stats": await stats(shop), "history": history}
@api.get("/products")
async def products(user=Depends(current_user)): return await product_list(await context(user))
@api.post("/products")
async def add_product(body: ProductIn, user=Depends(current_user)):
    shop = await context(user); data = body.model_dump(); data["minimum_stock"] = shop.get("default_low_stock_threshold", 5) if data["minimum_stock"] is None or data["minimum_stock"] == 5 else data["minimum_stock"]; p = {"id": uid(), "shop_id": shop["id"], **data, "unit": body.unit.upper(), "created_at": now(), "updated_at": now()}; await db.products.insert_one(p); return safe(p)
@api.put("/products/{pid}")
async def edit_product(pid: str, body: ProductIn, user=Depends(current_user)):
    shop = await context(user); existing = await db.products.find_one({"id": pid, "shop_id": shop["id"]}, {"_id": 0})
    if not existing: raise HTTPException(404, "We couldn't find that product.")
    data = body.model_dump(); data["minimum_stock"] = existing["minimum_stock"] if data["minimum_stock"] is None else data["minimum_stock"]; data["unit"] = data["unit"].upper(); data["updated_at"] = now(); await db.products.update_one({"id": pid, "shop_id": shop["id"]}, {"$set": data}); return safe(await db.products.find_one({"id": pid}, {"_id": 0}))
@api.delete("/products/{pid}")
async def delete_product(pid: str, user=Depends(current_user)):
    result = await db.products.delete_one({"id": pid, "shop_id": (await context(user))["id"]})
    if result.deleted_count == 0: raise HTTPException(404, "We couldn't find that product.")
    return {"ok": True}
@api.post("/stock/in")
async def stock_in(body: StockIn, user=Depends(current_user)): return await mutate(await context(user), body, "STOCK_IN")
@api.post("/stock/out")
async def stock_out(body: StockIn, user=Depends(current_user)): return await mutate(await context(user), body, "STOCK_OUT")
@api.get("/transactions")
async def transactions(user=Depends(current_user)): return [safe(x) for x in await db.transactions.find({"shop_id": (await context(user))["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)]
@api.get("/alerts")
async def alerts(user=Depends(current_user)):
    ps = await product_list(await context(user)); return [{**p, "status": status(p), "suggested_order": max(p["minimum_stock"]*2-p["quantity"], p["minimum_stock"]-p["quantity"])} for p in ps if status(p) != "Good Stock"]

def parse_command(text):
    raw = (text or "").strip(); s = raw.lower()
    nums = {"oka":1,"okati":1,"rendu":2,"randu":2,"moodu":3,"mudu":3,"nalugu":4,"aidu":5,"aidhu":5,"aaru":6,"edu":7,"enimidi":8,"tommidi":9,"padi":10}
    quantity = None
    for word, value in nums.items():
        if re.search(rf"\b{word}\b", s): quantity = value; break
    m = re.search(r"\b(\d+(?:\.\d+)?)\b", s)
    if m: quantity = float(m.group(1))
    units = {"bags?|basta":"BAG","kgs?|kilo|kilograms?":"KG","packets?|packs?":"PACKET","cartons?":"CARTON","boxes?":"BOX","pieces?|pcs":"PIECE","litres?|liters?|ltr":"LITRE","dozens?":"DOZEN","grams?|gm":"GRAM","quintals?":"QUINTAL"}
    unit = next((v for k,v in units.items() if re.search(rf"\b({k})\b", s)), None)
    products = ["sunflower oil","cooking oil","wheat flour","rice","sugar","oil","milk","soap","flour","biscuits"]
    if any(x in s for x in ["low stock","low-stock","out of stock","stock lo em"]):
        return {"intent":"LOW_STOCK_QUERY","product":None,"quantity":None,"unit":None,"original_command":raw}
    if any(x in s for x in ["reorder","em order cheyyali","order cheyyali","what should i order","what to order"]):
        return {"intent":"REORDER_QUERY","product":None,"quantity":None,"unit":None,"original_command":raw}
    if any(x in s for x in ["entha undi","stock entha","how much","how many","stock em","total products"]) or ("stock" in s and quantity is None and not any(x in s for x in ["add","sold","remove","teesey","vesey"])):
        return {"intent":"CHECK_STOCK","product":next((p for p in products if p in s), None),"quantity":None,"unit":unit,"original_command":raw}
    intent = "STOCK_OUT" if any(x in s for x in ["sold","remove","teesey","ammamu","teeseyy","ammindi"]) else "STOCK_IN"
    product = next((p for p in products if p in s), None)
    return {"intent":intent,"product":product,"quantity":quantity,"unit":unit,"original_command":raw}
@api.post("/voice/parse")
async def voice_parse(body: CommandIn, user=Depends(current_user)):
    result = parse_command(body.command)
    if result["intent"] in ["CHECK_STOCK","LOW_STOCK_QUERY","REORDER_QUERY"]:
        ps = await product_list(await context(user)); needle=(result.get("product") or "").lower(); matches=[p for p in ps if needle in p["name"].lower() or (needle=="oil" and "oil" in p["name"].lower())]
        if result["intent"]=="CHECK_STOCK": result["answer"] = matches
        elif result["intent"]=="LOW_STOCK_QUERY": result["answer"] = [p for p in ps if status(p)=="Low Stock"]
        else: result["answer"] = [{**p,"suggested_order":max(p["minimum_stock"]*2-p["quantity"],p["minimum_stock"]-p["quantity"])} for p in ps if status(p)!="Good Stock"]
    return result
@api.put("/profile")
async def profile(body: ProfileIn, user=Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": body.model_dump()}); return safe(await db.users.find_one({"id": user["id"]}, {"_id": 0}))
@api.put("/shop")
async def shop_update(body: ShopIn, user=Depends(current_user)):
    shop=await context(user); await db.shops.update_one({"id":shop["id"]},{"$set":{**body.model_dump(),"updated_at":now()}}); return safe(await db.shops.find_one({"id":shop["id"]},{"_id":0}))
@api.put("/settings")
async def settings(body: SettingsIn, user=Depends(current_user)):
    shop=await context(user); await db.shops.update_one({"id":shop["id"]},{"$set":body.model_dump()}); await db.users.update_one({"id":user["id"]},{"$set":{"preferred_language":body.preferred_language}}); return {"ok":True}
@api.post("/reset-demo")
async def reset_demo(user=Depends(current_user)):
    shop=await context(user); await db.products.delete_many({"shop_id":shop["id"]}); await db.transactions.delete_many({"shop_id":shop["id"]})
    for name, cat, qty, unit, price, minimum, icon in SEED: await db.products.insert_one({"id":uid(),"shop_id":shop["id"],"name":name,"category":cat,"quantity":qty,"unit":unit,"price":price,"minimum_stock":minimum,"icon":icon,"created_at":now(),"updated_at":now()})
    return {"ok":True}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=False, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    email=os.environ.get("ADMIN_EMAIL","admin@vaanistock.ai"); password=os.environ.get("ADMIN_PASSWORD","admin123")
    if not await db.users.find_one({"email":email}): await db.users.insert_one({"id":uid(),"email":email,"password_hash":hash_password(password),"name":"Vaani Admin","phone":"","preferred_language":"Telugu + English","created_at":now()})
@app.on_event("shutdown")
async def shutdown(): client.close()