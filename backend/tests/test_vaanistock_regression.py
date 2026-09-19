import os
import uuid
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://vaani-inventory.preview.emergentagent.com").rstrip("/")


def test_demo_bootstrap_and_voice_queries():
    session = requests.Session()
    demo = session.post(f"{BASE_URL}/api/auth/demo", timeout=20)
    assert demo.status_code == 200
    session.headers.update({"Authorization": f"Bearer {demo.json()['token']}"})
    bootstrap = session.get(f"{BASE_URL}/api/bootstrap", timeout=20)
    assert bootstrap.status_code == 200
    data = bootstrap.json()
    assert {p["name"] for p in data["products"]} >= {"Rice", "Sugar", "Sunflower Oil"}
    assert data["stats"]["total_products"] >= 7
    parsed = session.post(f"{BASE_URL}/api/voice/parse", json={"command": "Oil rendu cartons add cheyyi"}, timeout=20)
    assert parsed.status_code == 200
    assert parsed.json()["intent"] == "STOCK_IN"
    assert parsed.json()["quantity"] == 2
    assert parsed.json()["unit"] == "CARTON"


def test_stock_confirmation_persists_and_overdraw_is_rejected():
    session = requests.Session()
    demo = session.post(f"{BASE_URL}/api/auth/demo", timeout=20)
    assert demo.status_code == 200
    session.headers.update({"Authorization": f"Bearer {demo.json()['token']}"})
    products = session.get(f"{BASE_URL}/api/products", timeout=20).json()
    rice = next(p for p in products if p["name"] == "Rice")
    before = rice["quantity"]
    stock_in = session.post(f"{BASE_URL}/api/stock/in", json={"product_id": rice["id"], "quantity": 1, "unit": "BAG", "source": "TEST_"}, timeout=20)
    assert stock_in.status_code == 200
    fetched = session.get(f"{BASE_URL}/api/products", timeout=20).json()
    assert next(p for p in fetched if p["id"] == rice["id"])["quantity"] == before + 1
    overdraw = session.post(f"{BASE_URL}/api/stock/out", json={"product_id": rice["id"], "quantity": 999999, "unit": "BAG", "source": "TEST_"}, timeout=20)
    assert overdraw.status_code == 400


def test_product_profile_and_shop_persistence():
    session = requests.Session()
    demo = session.post(f"{BASE_URL}/api/auth/demo", timeout=20)
    assert demo.status_code == 200
    session.headers.update({"Authorization": f"Bearer {demo.json()['token']}"})
    name = f"TEST_{uuid.uuid4().hex[:8]}"
    created = session.post(f"{BASE_URL}/api/products", json={"name": name, "category": "Grocery", "quantity": 3, "unit": "bag", "price": 10, "minimum_stock": 1}, timeout=20)
    assert created.status_code == 200
    pid = created.json()["id"]
    assert any(p["name"] == name for p in session.get(f"{BASE_URL}/api/products", timeout=20).json())
    shop = session.get(f"{BASE_URL}/api/bootstrap", timeout=20).json()["shop"]
    updated = {k: shop[k] for k in ["shop_name", "owner_name", "business_type", "phone", "email", "city", "currency"]}
    updated["shop_name"] = f"{shop['shop_name']} TEST"
    saved = session.put(f"{BASE_URL}/api/shop", json=updated, timeout=20)
    assert saved.status_code == 200
    assert saved.json()["shop_name"].endswith(" TEST")
    session.delete(f"{BASE_URL}/api/products/{pid}", timeout=20)