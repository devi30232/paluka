import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Bell, ChevronDown, CircleHelp, ClipboardList, Home as HomeIcon, Languages,
  LogOut, Menu, Mic, Package, Plus, Search, Settings, ShoppingBag, Sparkles,
  Store, Trash2, TrendingDown, TrendingUp, UserRound, X, Check, AlertTriangle,
} from "lucide-react";
import "@/App.css";
import { makeT, supportedLanguages } from "@/i18n";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const call = async (path, options = {}) => {
  const token = localStorage.getItem("vaani_token");
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Something went wrong. Please try again.");
  return data;
};

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const title = (s) => s?.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function useAppData() {
  const [data, setData] = useState(null);
  const refresh = () => call("/bootstrap").then(setData);
  useEffect(() => { refresh().catch(() => {}); }, []);
  return { data, refresh };
}

function useLang(data) {
  const lang = data?.shop?.preferred_language || localStorage.getItem("vaani_lang") || "Telugu + English";
  return useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const lang = localStorage.getItem("vaani_lang") || "Telugu + English";
  const t = makeT(lang);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const d = await call(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("vaani_token", d.token);
      onAuth(d.user);
    } catch (x) { setError(x.message); }
  };
  const demo = async () => {
    const d = await call("/auth/demo", { method: "POST" });
    localStorage.setItem("vaani_token", d.token);
    onAuth(d.user);
  };

  return (
    <main className="auth-page">
      <div className="auth-art">
        <div className="brand-mark large"><Mic size={26} /><span>VaaniStock <i>AI</i></span></div>
        <div className="auth-copy">
          <p className="eyebrow">{t("auth_kicker")}</p>
          <h1>{t("auth_h1a")}<br /><em>{t("auth_h1_em")}</em></h1>
          <p>{t("auth_sub")}</p>
          <div className="voice-sticker">
            <div className="sticker-icon"><Mic size={28} /></div>
            <div>
              <strong>“Rice 5 bags add cheyyi”</strong>
              <small>We understand Telugu-English</small>
            </div>
          </div>
        </div>
        <div className="art-shelf"><span>🌾</span><span>🥛</span><span>🧼</span><span>🍪</span></div>
      </div>
      <section className="auth-card">
        <div className="auth-head">
          <span className="mini-kicker">{t("auth_welcome_eyebrow")}</span>
          <h2>{mode === "login" ? t("auth_welcome_title") : t("auth_create_title")}</h2>
          <p>{mode === "login" ? t("auth_welcome_sub") : t("auth_create_sub")}</p>
        </div>
        <form onSubmit={submit}>
          <label>{t("auth_email")}
            <input data-testid="auth-email-input" type="email" required placeholder={t("auth_email_ph")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>{t("auth_password")}
            <input data-testid="auth-password-input" type="password" required minLength="6" placeholder={t("auth_password_ph")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <div className="error-box" data-testid="auth-error">{error}</div>}
          <button className="primary-btn full" data-testid="auth-submit-button">
            {mode === "login" ? t("auth_sign_in") : t("auth_create_account")}<span>→</span>
          </button>
        </form>
        <div className="or"><span>{t("auth_or")}</span></div>
        <button className="demo-btn" data-testid="demo-shop-button" onClick={demo}>
          <Sparkles size={16} /> {t("auth_demo")}
        </button>
        <p className="switch-auth">
          {mode === "login" ? t("auth_switch_to_register") : t("auth_switch_to_login")}{" "}
          <button data-testid="auth-mode-toggle" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? t("auth_create_account") : t("auth_sign_in")}
          </button>
        </p>
      </section>
    </main>
  );
}

function useNavItems(t) {
  return [
    { to: "/", label: t("nav_home"), icon: HomeIcon, mobile: t("mobile_home") },
    { to: "/voice", label: t("nav_voice"), icon: Mic, mobile: t("nav_voice") },
    { to: "/inventory", label: t("nav_inventory"), icon: Package, mobile: t("mobile_inventory") },
    { to: "/alerts", label: t("nav_alerts"), icon: Bell, mobile: t("mobile_alerts") },
    { to: "/history", label: t("nav_history"), icon: ClipboardList, mobile: t("mobile_history") },
  ];
}

function Layout({ children, user, setUser, t }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = useNavItems(t);
  const logout = () => { localStorage.removeItem("vaani_token"); setUser(null); };
  const pageTitleMap = {
    "/settings": t("nav_settings"),
    "/help": t("nav_help"),
    "/profile": t("profile_my"),
    "/shop-profile": t("profile_shop"),
  };
  const currentNav = navItems.find((x) => x.to === loc.pathname);
  const pageTitle = currentNav?.label || pageTitleMap[loc.pathname] || t("workspace");

  return (
    <div className="app-shell">
      {mobileOpen && <div className="sidebar-scrim" data-testid="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={mobileOpen ? "sidebar open" : "sidebar"} data-testid="sidebar">
        <div className="brand-mark"><span className="brand-icon"><Mic size={17} /></span><span>VaaniStock <i>AI</i></span></div>
        <div className="side-label">{t("workspace")}</div>
        <nav>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              data-testid={`nav-${to === "/" ? "home" : to.slice(1)}`}
              key={to} to={to} end={to === "/"}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} /><span>{label}</span>
              {to === "/alerts" && <b className="nav-dot">!</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-label">{t("more")}</div>
          <NavLink data-testid="nav-help" to="/help" onClick={() => setMobileOpen(false)}><CircleHelp size={18} /><span>{t("nav_help")}</span></NavLink>
          <NavLink data-testid="nav-settings" to="/settings" onClick={() => setMobileOpen(false)}><Settings size={18} /><span>{t("nav_settings")}</span></NavLink>
          <div className="sidebar-user">
            <div className="avatar">{user?.name?.[0] || "A"}</div>
            <div>
              <strong>{user?.name || "Shop owner"}</strong>
              <small>{user?.email}</small>
            </div>
            <button data-testid="sidebar-logout-button" onClick={logout}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <button className="mobile-menu" data-testid="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={21} /></button>
          <div>
            <span className="top-kicker">
              {loc.pathname === "/"
                ? `${t("greeting_morning")}${user?.name ? `, ${user.name.split(" ")[0].toUpperCase()}` : ""}`
                : "VAANISTOCK AI"}
            </span>
            <h2>{pageTitle}</h2>
          </div>
          <div className="top-actions">
            <button className="icon-btn" data-testid="notification-button" onClick={() => nav("/alerts")}><Bell size={19} /><span className="notification-dot" /></button>
            <button className="icon-btn" data-testid="help-button" onClick={() => nav("/help")}><CircleHelp size={19} /></button>
            <div className="profile-wrap">
              <button className="profile-trigger" data-testid="profile-avatar-button" onClick={() => setProfileOpen(!profileOpen)}>
                <span className="avatar">{user?.name?.[0] || "A"}</span><ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="profile-menu" data-testid="profile-dropdown">
                  <button data-testid="profile-menu-my-profile" onClick={() => { nav("/profile"); setProfileOpen(false); }}><UserRound size={16} /> {t("profile_my")}</button>
                  <button data-testid="profile-menu-shop-profile" onClick={() => { nav("/shop-profile"); setProfileOpen(false); }}><Store size={16} /> {t("profile_shop")}</button>
                  <button data-testid="profile-menu-settings" onClick={() => { nav("/settings"); setProfileOpen(false); }}><Settings size={16} /> {t("profile_settings")}</button>
                  <button data-testid="profile-menu-help" onClick={() => { nav("/help"); setProfileOpen(false); }}><CircleHelp size={16} /> {t("profile_help")}</button>
                  <hr />
                  <button data-testid="profile-menu-logout" onClick={logout}><LogOut size={16} /> {t("profile_logout")}</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </div>
      <nav className="mobile-nav">
        {navItems.slice(0, 2).map(({ to, label, icon: Icon, mobile }) => (
          <NavLink data-testid={`mobile-nav-${to === "/" ? "home" : to.slice(1)}`} key={to} to={to} end={to === "/"}>
            <Icon size={19} /><span>{mobile}</span>
          </NavLink>
        ))}
        <NavLink className="mobile-voice" data-testid="mobile-voice-button" to="/voice"><Mic size={23} /></NavLink>
        {navItems.slice(2, 4).map(({ to, label, icon: Icon, mobile }) => (
          <NavLink data-testid={`mobile-nav-${to.slice(1)}`} key={to} to={to}>
            <Icon size={19} /><span>{mobile}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Home({ data, refresh, t }) {
  const nav = useNavigate();
  if (!data) return <Loading t={t} />;
  const { stats, products, history, shop } = data;
  return (
    <div className="page home-page">
      <section className="welcome-grid">
        <div className="welcome-copy">
          <span className="eyebrow">{shop?.shop_name} · {shop?.city}</span>
          <h1>{t("home_h1a")}<br />{t("home_h1b")} <em>{t("home_h1_em")}</em></h1>
          <p>{t("home_sub")}</p>
          <button className="speak-btn" data-testid="home-speak-button" onClick={() => nav("/voice")}>
            <span className="speak-icon"><Mic size={27} /></span>
            <span>
              <strong>{t("home_speak_title")}</strong>
              <small>{t("home_speak_hint")}</small>
            </span>
            <span className="arrow">→</span>
          </button>
        </div>
        <div className="shelf-illustration">
          <div className="sun-shape" />
          <div className="shelf-title">{t("shelf_top")}<br /><strong>{t("shelf_bottom")}</strong></div>
          <div className="shelf-items"><span>🌾</span><span>🫗</span><span>🥛</span><span>🍪</span></div>
          <div className="shelf-line" />
          <small>{t("shelf_tag")}</small>
        </div>
      </section>
      <section className="stats-grid">
        {[
          [Package, t("stat_total"), stats.total_products, t("stat_total_sub"), "plum", "total-products"],
          [AlertTriangle, t("stat_low"), stats.low_stock, t("stat_low_sub"), "peach", "low-stock"],
          [TrendingDown, t("stat_out"), stats.out_of_stock, t("stat_out_sub"), "rose", "out-of-stock"],
          [TrendingUp, t("stat_in"), stats.stock_in_today, t("stat_in_sub"), "green", "stock-in-today"],
          [ShoppingBag, t("stat_out_today"), stats.stock_out_today, t("stat_out_today_sub"), "lavender", "stock-out-today"],
        ].map(([Icon, label, value, sub, tone, testKey]) => (
          <div className={`stat-card ${tone}`} data-testid={`stat-${testKey}`} key={testKey}>
            <span className="stat-icon"><Icon size={17} /></span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
              <small>{sub}</small>
            </div>
          </div>
        ))}
      </section>
      <div className="section-heading">
        <div><span className="eyebrow">{t("inv_kicker")}</span><h3>{t("inv_title")}</h3></div>
        <button className="text-btn" data-testid="view-all-inventory-button" onClick={() => nav("/inventory")}>{t("inv_view_all")}</button>
      </div>
      <div className="inventory-preview">
        {products.slice(0, 4).map((p) => <ProductRow key={p.id} p={p} />)}
      </div>
      <div className="home-bottom">
        <section className="activity-panel">
          <div className="section-heading compact">
            <div><span className="eyebrow">{t("recent_kicker")}</span><h3>{t("recent_title")}</h3></div>
            <button className="icon-btn" data-testid="home-history-button" onClick={() => nav("/history")}><TrendingUp size={17} /></button>
          </div>
          {history.length ? history.slice(0, 4).map((tx) => <Activity key={tx.id} t={tx} />) : <Empty text={t("empty_activity")} />}
        </section>
        <section className="alert-panel">
          <div className="alert-panel-head">
            <div><span className="eyebrow">{t("alerts_kicker")}</span><h3>{t("alerts_title")}</h3></div>
            <span className="alert-count">{stats.low_stock + stats.out_of_stock}</span>
          </div>
          {products.filter((p) => p.quantity <= p.minimum_stock).slice(0, 3).map((p) => (
            <div className="mini-alert" key={p.id}>
              <span>{p.icon}</span>
              <div><strong>{p.name}</strong><small>{p.quantity} {p.unit.toLowerCase()} {t("left_short")}</small></div>
              <button data-testid={`home-alert-${p.id}`} onClick={() => nav("/alerts")}>View</button>
            </div>
          ))}
          {!products.some((p) => p.quantity <= p.minimum_stock) && <Empty text={t("everything_good")} />}
          <button className="soft-btn full" data-testid="view-alerts-button" onClick={() => nav("/alerts")}>{t("view_all_alerts")}</button>
        </section>
      </div>
    </div>
  );
}

function ProductRow({ p, onEdit, onDelete }) {
  return (
    <div className="product-row" data-testid={`product-row-${p.id}`}>
      <span className="product-emoji">{p.icon}</span>
      <div className="product-main"><strong>{p.name}</strong><small>{p.category}</small></div>
      <div className="product-qty"><strong>{p.quantity}</strong><small>{p.unit}</small></div>
      <div className="product-price">{money(p.price)}</div>
      <Status p={p} />
      {onEdit && (
        <div className="row-actions">
          <button data-testid={`edit-product-${p.id}`} onClick={() => onEdit(p)}>Edit</button>
          <button data-testid={`delete-product-${p.id}`} onClick={() => onDelete(p)}><Trash2 size={15} /></button>
        </div>
      )}
    </div>
  );
}

function Status({ p }) {
  const s = p.quantity <= 0 ? "Out of Stock" : p.quantity <= p.minimum_stock ? "Low Stock" : "Good Stock";
  return <span className={`status ${s.split(" ")[0].toLowerCase()}`} data-testid={`status-${p.id}`}>{s}</span>;
}

function Voice({ refresh, t, shop }) {
  const [state, setState] = useState("idle");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState("");
  const recognition = useMemo(() => {
    const C = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!C) return null;
    const r = new C();
    r.lang = "en-IN";
    r.interimResults = false;
    r.onresult = (e) => { setText(e.results[0][0].transcript); setState("processing"); };
    r.onerror = () => { setError("I couldn't catch that. Try again or type the command below."); setState("error"); };
    r.onend = () => {};
    return r;
  }, []);

  useEffect(() => {
    if (state === "processing" && text) {
      call("/voice/parse", { method: "POST", body: JSON.stringify({ command: text }) })
        .then((d) => {
          setParsed(d);
          setAnswer(d.answer || null);
          setState(d.intent?.includes("QUERY") || d.intent === "CHECK_STOCK" ? "answer" : "confirm");
        })
        .catch((e) => { setError(e.message); setState("error"); });
    }
  }, [state, text]);

  const speak = (msg) => {
    if (!shop?.voice_response_enabled) return;
    try {
      const u = new SpeechSynthesisUtterance(msg);
      u.lang = "en-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const start = () => {
    setError(""); setParsed(null); setAnswer(null);
    if (!recognition) {
      setError("Voice is unavailable right now. You can still type your command.");
      setState("error");
      return;
    }
    setState("listening");
    try { recognition.start(); } catch { /* already running */ }
  };

  const confirm = async () => {
    if (!parsed?.product || !parsed.quantity) {
      setError("Please include a product and quantity, like ‘5 bags’.");
      return;
    }
    try {
      const ps = await call("/products");
      const p = ps.find((x) =>
        x.name.toLowerCase().includes(parsed.product.toLowerCase())
        || (parsed.product === "oil" && x.name.toLowerCase().includes("oil"))
      );
      if (!p) throw Error("I couldn't find that product.");
      await call(parsed.intent === "STOCK_IN" ? "/stock/in" : "/stock/out", {
        method: "POST",
        body: JSON.stringify({
          product_id: p.id,
          quantity: parsed.quantity,
          unit: parsed.unit,
          source: "Voice",
          original_command: parsed.original_command,
        }),
      });
      setState("success");
      speak(`${parsed.quantity} ${parsed.unit?.toLowerCase() || "units"} of ${p.name} ${parsed.intent === "STOCK_IN" ? "added" : "removed"}.`);
      refresh();
    } catch (e) { setError(e.message); setState("error"); }
  };

  const stateLabel = {
    idle: t("voice_state_idle"),
    listening: t("voice_state_listening"),
    processing: t("voice_state_processing"),
    confirm: t("voice_state_confirm"),
    answer: t("voice_state_answer"),
    success: t("voice_state_success"),
    error: t("voice_state_error"),
  }[state];
  const stateSub = {
    idle: t("voice_state_idle_sub"),
    listening: t("voice_state_listening_sub"),
  }[state] || "";

  return (
    <div className="page voice-page">
      <div className="voice-top">
        <div>
          <span className="eyebrow">{t("voice_kicker")}</span>
          <h1>{t("voice_h1a")} <em>{t("voice_h1_em")}</em></h1>
          <p>{t("voice_sub")}</p>
        </div>
        <div className="voice-language"><Languages size={17} /><span>{shop?.preferred_language || "Telugu + English"}</span></div>
      </div>
      <section className={`voice-console ${state}`}>
        <div className="voice-orbit orbit-one" />
        <div className="voice-orbit orbit-two" />
        <button className="orb-button" data-testid="voice-microphone-button" onClick={state === "listening" ? () => {} : start}>
          <Mic size={40} />
        </button>
        <div className="voice-state" data-testid="voice-state">
          <strong>{stateLabel}</strong>
          <span>{stateSub}</span>
        </div>
      </section>
      <div className="command-entry">
        <label>
          <Search size={17} />
          <input
            data-testid="voice-command-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text && setState("processing")}
            placeholder={t("voice_input_placeholder")}
          />
          <button data-testid="voice-command-submit" onClick={() => text && setState("processing")}>{t("voice_ask")}</button>
        </label>
      </div>
      {error && <div className="error-box wide" data-testid="voice-error">{error}</div>}
      {parsed && state === "confirm" && (
        <div className="confirm-card" data-testid="voice-confirmation">
          <div className="confirm-head">
            <span className="eyebrow">{t("voice_understood")}</span>
            <span className="intent-chip">{parsed.intent === "STOCK_IN" ? t("voice_stock_in") : t("voice_stock_out")}</span>
          </div>
          <div className="parsed-grid">
            <div><small>{t("voice_product")}</small><strong>{title(parsed.product) || "—"}</strong></div>
            <div><small>{t("voice_quantity")}</small><strong>{parsed.quantity || "—"} {parsed.unit || ""}</strong></div>
            <div><small>{t("voice_action")}</small><strong>{parsed.intent === "STOCK_IN" ? t("voice_add_to_stock") : t("voice_remove_from_stock")}</strong></div>
          </div>
          <div className="confirm-actions">
            <button className="soft-btn" data-testid="voice-correct-button" onClick={() => { setState("idle"); setParsed(null); }}>{t("voice_correct")}</button>
            <button className="primary-btn" data-testid="voice-confirm-button" onClick={confirm}><Check size={16} /> {t("voice_confirm")}</button>
          </div>
        </div>
      )}
      {answer && (
        <div className="answer-card" data-testid="voice-answer">
          <div className="answer-head">
            <Sparkles size={18} />
            <strong>
              {parsed.intent === "CHECK_STOCK" ? t("voice_current_stock") : parsed.intent === "LOW_STOCK_QUERY" ? t("voice_low_items") : t("voice_reorder")}
            </strong>
          </div>
          {answer.length ? answer.map((p) => (
            <div className="answer-row" key={p.id}>
              <span>{p.icon}</span><strong>{p.name}</strong>
              <span>{p.quantity} {p.unit.toLowerCase()}</span>
            </div>
          )) : <Empty text={t("everything_good")} />}
        </div>
      )}
      {state === "success" && (
        <div className="success-card" data-testid="voice-success">
          <div className="success-check"><Check size={25} /></div>
          <div>
            <span className="eyebrow">{t("voice_success_eyebrow")}</span>
            <h3>{t("voice_success_title")}</h3>
            <p>{parsed?.quantity} {parsed?.unit?.toLowerCase() || "units"} of {title(parsed?.product)} {parsed?.intent === "STOCK_IN" ? "added" : "removed"} successfully.</p>
          </div>
          <button className="soft-btn" data-testid="voice-add-another-button" onClick={() => { setState("idle"); setText(""); setParsed(null); setAnswer(null); }}>
            {t("voice_add_another")}
          </button>
        </div>
      )}
      <div className="example-commands">
        <span>{t("voice_try_saying")}</span>
        <button data-testid="example-command-rice" onClick={() => { setText("Rice 5 bags add cheyyi"); setState("processing"); }}>“Rice 5 bags add cheyyi”</button>
        <button data-testid="example-command-low" onClick={() => { setText("Low stock items enti?"); setState("processing"); }}>“Low stock items enti?”</button>
        <button data-testid="example-command-oil" onClick={() => { setText("Oil rendu cartons add cheyyi"); setState("processing"); }}>“Oil rendu cartons add cheyyi”</button>
      </div>
    </div>
  );
}

function Inventory({ data, refresh, t }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", category: "Grocery", quantity: 0, unit: "BAG", price: 0, minimum_stock: 5, icon: "📦" });
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const products = data?.products || [];
  const visible = products
    .filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => filter === "low" ? p.quantity <= p.minimum_stock : true);
  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await call(modal?.id ? `/products/${modal.id}` : "/products", {
        method: modal?.id ? "PUT" : "POST",
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), price: Number(form.price), minimum_stock: Number(form.minimum_stock) }),
      });
      setModal(null);
      refresh();
    } catch (x) { setError(x.message); }
  };
  const edit = (p) => { setForm(p); setModal(p); setError(""); };
  const del = async (p) => {
    if (window.confirm(`Delete ${p.name}?`)) {
      await call(`/products/${p.id}`, { method: "DELETE" });
      refresh();
    }
  };
  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">{t("inv_page_kicker")}</span>
          <h1>{t("inv_page_h1a")} <em>{t("inv_page_h1_em")}</em></h1>
          <p>{t("inv_page_sub")}</p>
        </div>
        <button className="primary-btn" data-testid="add-product-button" onClick={() => { setForm({ name: "", category: "Grocery", quantity: 0, unit: "BAG", price: 0, minimum_stock: 5, icon: "📦" }); setError(""); setModal({}); }}>
          <Plus size={17} /> {t("add_product")}
        </button>
      </div>
      <div className="inventory-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input data-testid="inventory-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_products_ph")} />
        </label>
        <div className="filter-pills">
          <button className={filter === "all" ? "active" : ""} data-testid="inventory-all-filter" onClick={() => setFilter("all")}>{t("filter_all")} · {products.length}</button>
          <button className={filter === "low" ? "active" : ""} data-testid="inventory-low-filter" onClick={() => setFilter("low")}>{t("filter_low")} · {products.filter((p) => p.quantity <= p.minimum_stock).length}</button>
        </div>
      </div>
      <div className="inventory-list">
        {visible.length ? visible.map((p) => <ProductRow p={p} key={p.id} onEdit={edit} onDelete={del} />) : <Empty text={t("empty_search")} />}
      </div>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" data-testid="product-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" data-testid="product-modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            <span className="eyebrow">{modal.id ? t("modal_edit_kicker") : t("modal_add_kicker")}</span>
            <h2>{modal.id ? t("modal_edit_title") : t("modal_add_title")}</h2>
            <p>{t("modal_hint")}</p>
            <form onSubmit={save}>
              <div className="form-grid">
                <label>{t("field_name")}<input data-testid="product-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rice" /></label>
                <label>{t("field_category")}<input data-testid="product-category-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Grocery" /></label>
                <label>{t("field_quantity")}<input data-testid="product-quantity-input" type="number" min="0" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
                <label>{t("field_unit")}
                  <select data-testid="product-unit-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {["BAG", "KG", "PACKET", "CARTON", "BOX", "PIECE", "LITRE", "DOZEN"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label>{t("field_price")}<input data-testid="product-price-input" type="number" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                <label>{t("field_min")}<input data-testid="product-minimum-input" type="number" min="0" required value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} /></label>
              </div>
              {error && <div className="error-box">{error}</div>}
              <button className="primary-btn full" data-testid="product-save-button">{modal.id ? t("save_changes") : t("add_product")}<span>→</span></button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Alerts({ data, t }) {
  const nav = useNavigate();
  const [tab, setTab] = useState("low");
  const all = data?.products || [];
  const list = all.filter((p) =>
    tab === "out" ? p.quantity <= 0
      : tab === "reorder" ? p.quantity <= p.minimum_stock
      : p.quantity > 0 && p.quantity <= p.minimum_stock
  );
  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">{t("alerts_page_kicker")}</span>
          <h1>{t("alerts_page_h1a")} <em>{t("alerts_page_h1_em")}</em></h1>
          <p>{t("alerts_page_sub")}</p>
        </div>
        <div className="alert-summary">
          <strong>{all.filter((p) => p.quantity <= p.minimum_stock).length}</strong>
          <span>{t("alerts_need_attn_a")}<br />{t("alerts_need_attn_b")}</span>
        </div>
      </div>
      <div className="alert-tabs">
        <button className={tab === "low" ? "active" : ""} data-testid="alerts-low-tab" onClick={() => setTab("low")}>{t("tab_low")} <span>{all.filter((p) => p.quantity > 0 && p.quantity <= p.minimum_stock).length}</span></button>
        <button className={tab === "out" ? "active" : ""} data-testid="alerts-out-tab" onClick={() => setTab("out")}>{t("tab_out")} <span>{all.filter((p) => p.quantity <= 0).length}</span></button>
        <button className={tab === "reorder" ? "active" : ""} data-testid="alerts-reorder-tab" onClick={() => setTab("reorder")}>{t("tab_reorder")}</button>
      </div>
      <div className="alerts-list">
        {list.length ? list.map((p) => (
          <div className="alert-card" data-testid={`alert-card-${p.id}`} key={p.id}>
            <span className="alert-product-icon">{p.icon}</span>
            <div className="alert-card-main">
              <div>
                <h3>{p.name}</h3>
                <span className="status low">{p.quantity <= 0 ? t("stat_out") : t("stat_low")}</span>
              </div>
              <p>{t("voice_current_stock")} <strong>{p.quantity} {p.unit.toLowerCase()}</strong> · {t("minimum_short")} <strong>{p.minimum_stock} {p.unit.toLowerCase()}</strong></p>
              <div className="reorder-line">
                <TrendingUp size={15} /> {t("suggested_reorder")} <strong>{Math.max(p.minimum_stock * 2 - p.quantity, p.minimum_stock - p.quantity)} {p.unit.toLowerCase()}</strong>
              </div>
            </div>
            <div className="alert-actions">
              <button className="soft-btn" data-testid={`alert-stock-in-${p.id}`} onClick={() => nav("/inventory")}>{t("stock_in_action")}</button>
              <button className="text-btn" data-testid={`alert-view-${p.id}`} onClick={() => nav("/inventory")}>{t("view_product")}</button>
            </div>
          </div>
        )) : <Empty text={t("everything_good")} sub={t("everything_good_sub")} />}
      </div>
    </div>
  );
}

function History({ data, t }) {
  const [q, setQ] = useState("");
  const tx = (data?.history || []).filter((x) => (x.product_name || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">{t("history_kicker")}</span>
          <h1>{t("history_h1a")} <em>{t("history_h1_em")}</em></h1>
          <p>{t("history_sub")}</p>
        </div>
      </div>
      <label className="search-field history-search">
        <Search size={17} />
        <input data-testid="history-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_history_ph")} />
      </label>
      <div className="timeline">
        {tx.length ? tx.map((tr) => <Activity t={tr} detail key={tr.id} />) : <Empty text={t("empty_activity")} sub={t("empty_history_sub")} />}
      </div>
    </div>
  );
}

function Activity({ t, detail }) {
  const inStock = t.action === "STOCK_IN";
  return (
    <div className="activity-row" data-testid={`transaction-${t.id}`}>
      <span className={`activity-icon ${inStock ? "in" : "out"}`}>{inStock ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</span>
      <div>
        <strong>{t.product_name}</strong>
        <span>{inStock ? "Stock In" : "Stock Out"} · {t.source}</span>
      </div>
      <div className="activity-amount">
        <strong>{inStock ? "+" : "−"}{t.quantity} {t.unit}</strong>
        {detail && <small>{t.previous_quantity} → {t.new_quantity} {t.unit}</small>}
      </div>
      <time>{new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
    </div>
  );
}

function Profile({ data, refresh, shop = false, t }) {
  const [form, setForm] = useState(shop
    ? data.shop
    : { name: data.user?.name || "", phone: data.user?.phone || "", preferred_language: data.shop?.preferred_language || "Telugu + English" });
  const [saved, setSaved] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setSaved("");
    try {
      await call(shop ? "/shop" : "/profile", {
        method: "PUT",
        body: JSON.stringify(shop ? { ...form, email: data.shop.email, currency: data.shop.currency || "INR ₹" } : form),
      });
      await refresh();
      setSaved(t("profile_updated"));
    } catch (x) { setSaved(x.message); }
  };
  return (
    <div className="page narrow-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">{shop ? t("profile_kicker_shop") : t("profile_kicker_my")}</span>
          <h1>{shop ? t("profile_title_shop") : t("profile_title_my")}</h1>
          <p>{shop ? t("profile_sub_shop") : t("profile_sub_my")}</p>
        </div>
      </div>
      <section className="form-section">
        <div className="profile-banner">
          <div className="avatar giant">{((shop ? form.shop_name : form.name) || "A")[0]}</div>
          <div>
            <h3>{shop ? form.shop_name : (form.name || "Shop owner")}</h3>
            <p>{shop ? form.business_type : data.user?.email}</p>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            {shop ? (
              <>
                <label>{t("field_shop_name")}<input data-testid="shop-name-input" required value={form.shop_name || ""} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} /></label>
                <label>{t("field_owner_name")}<input data-testid="shop-owner-input" required value={form.owner_name || ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></label>
                <label>{t("field_business")}<input data-testid="shop-business-input" value={form.business_type || ""} onChange={(e) => setForm({ ...form, business_type: e.target.value })} /></label>
                <label>{t("field_city")}<input data-testid="shop-city-input" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
                <label>{t("field_phone")}<input data-testid="shop-phone-input" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              </>
            ) : (
              <>
                <label>{t("field_owner_name")}<input data-testid="profile-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label>{t("field_phone")}<input data-testid="profile-phone-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label>{t("field_language")}
                  <select data-testid="profile-language-input" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}>
                    {supportedLanguages.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
          {saved && <div className="saved-note" data-testid="profile-saved">{saved}</div>}
          <button className="primary-btn" data-testid="profile-save-button">{t("save_changes")} <Check size={16} /></button>
        </form>
      </section>
    </div>
  );
}

function SettingsPage({ data, refresh, t }) {
  const [form, setForm] = useState({
    preferred_language: data.shop.preferred_language,
    voice_response_enabled: data.shop.voice_response_enabled,
    default_low_stock_threshold: data.shop.default_low_stock_threshold,
  });
  const [saved, setSaved] = useState("");
  const save = async () => {
    setSaved("");
    try {
      await call("/settings", {
        method: "PUT",
        body: JSON.stringify({ ...form, default_low_stock_threshold: Number(form.default_low_stock_threshold) }),
      });
      localStorage.setItem("vaani_lang", form.preferred_language);
      await refresh();
      setSaved(t("settings_saved"));
    } catch (x) { setSaved(x.message); }
  };
  const reset = async () => {
    if (window.confirm(t("reset_confirm"))) {
      await call("/reset-demo", { method: "POST" });
      await refresh();
    }
  };
  return (
    <div className="page narrow-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">{t("settings_kicker")}</span>
          <h1>{t("settings_title")}</h1>
          <p>{t("settings_sub")}</p>
        </div>
      </div>
      <section className="settings-list">
        <div className="setting-row">
          <div>
            <Languages size={19} />
            <div><strong>{t("setting_language")}</strong><small>{t("setting_language_sub")}</small></div>
          </div>
          <select data-testid="settings-language" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}>
            {supportedLanguages.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="setting-row">
          <div>
            <Mic size={19} />
            <div><strong>{t("setting_voice")}</strong><small>{t("setting_voice_sub")}</small></div>
          </div>
          <button
            className={form.voice_response_enabled ? "toggle on" : "toggle"}
            data-testid="voice-response-toggle"
            onClick={() => setForm({ ...form, voice_response_enabled: !form.voice_response_enabled })}
          >
            <span />
          </button>
        </div>
        <div className="setting-row">
          <div>
            <AlertTriangle size={19} />
            <div><strong>{t("setting_threshold")}</strong><small>{t("setting_threshold_sub")}</small></div>
          </div>
          <input
            className="small-input"
            data-testid="settings-threshold"
            type="number"
            min="1"
            value={form.default_low_stock_threshold}
            onChange={(e) => setForm({ ...form, default_low_stock_threshold: e.target.value })}
          />
        </div>
      </section>
      {saved && <div className="saved-note" data-testid="settings-saved">{saved}</div>}
      <button className="primary-btn" data-testid="settings-save-button" onClick={save}>{t("save_settings")} <Check size={16} /></button>
      <section className="danger-section">
        <div>
          <strong>{t("reset_title")}</strong>
          <p>{t("reset_sub")}</p>
        </div>
        <button className="soft-btn danger-btn" data-testid="reset-demo-button" onClick={reset}>{t("reset_btn")}</button>
      </section>
    </div>
  );
}

function Help({ t }) {
  const faqs = [
    ["How do I add stock using voice?", "Tap the microphone and say something like “Rice 5 bags add cheyyi”. We will show what we understood before changing anything."],
    ["What commands can I say?", "Try adding stock, selling stock, asking what is available, checking low stock, or asking what to order."],
    ["Why is my microphone not working?", "Check your browser microphone permission, try a quiet place, or use the type-in command box as a manual fallback."],
    ["How are reorder suggestions calculated?", "Suggestions are based on your configured minimum stock: enough to bring stock up to twice that minimum."],
  ];
  return (
    <div className="page help-page">
      <div className="help-hero">
        <div>
          <span className="eyebrow">{t("help_kicker")}</span>
          <h1>{t("help_h1a")} <em>{t("help_h1_em")}</em></h1>
          <p>{t("help_sub")}</p>
        </div>
        <div className="help-art">?<span>✦</span></div>
      </div>
      <label className="search-field help-search">
        <Search size={17} />
        <input data-testid="help-search-input" placeholder={t("help_search_ph")} />
      </label>
      <div className="faq-grid">
        {faqs.map(([q, a], i) => (
          <details data-testid={`faq-${i}`} key={q}>
            <summary>{q}<ChevronDown size={17} /></summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <section className="command-guide">
        <span className="eyebrow">{t("guide_kicker")}</span>
        <h2>{t("guide_title")}</h2>
        <div className="command-columns">
          <div><span className="guide-label">{t("guide_stock_in")}</span><p>“Rice 5 bags add cheyyi”</p><p>“Add 10 packets of milk”</p></div>
          <div><span className="guide-label">{t("guide_stock_out")}</span><p>“Sugar 2 kg sold”</p><p>“Remove 3 boxes of biscuits”</p></div>
          <div><span className="guide-label">{t("guide_ask")}</span><p>“Rice stock entha undi?”</p><p>“Low stock items enti?”</p></div>
        </div>
      </section>
    </div>
  );
}

function Empty({ text, sub }) {
  return (
    <div className="empty-state">
      <span>✦</span>
      <strong>{text}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Loading({ t }) {
  return (
    <div className="loading">
      <span className="loader" />
      {t ? t("loading") : "Loading your shelves…"}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(undefined);
  const { data, refresh } = useAppData();
  const { t } = useLang(data);

  useEffect(() => {
    const token = localStorage.getItem("vaani_token");
    if (!token) { setUser(null); return; }
    call("/auth/me").then(setUser).catch(() => {
      localStorage.removeItem("vaani_token");
      setUser(null);
    });
  }, []);

  useEffect(() => { if (user && !data) refresh().catch(() => {}); }, [user, data, refresh]);

  useEffect(() => {
    if (data?.shop?.preferred_language) localStorage.setItem("vaani_lang", data.shop.preferred_language);
  }, [data?.shop?.preferred_language]);

  if (user === undefined) return <Loading />;
  if (!user) return <Auth onAuth={setUser} />;
  if (!data) return <Loading />;

  return (
    <BrowserRouter>
      <Layout user={user} setUser={setUser} t={t}>
        <Routes>
          <Route path="/" element={<Home data={data} refresh={refresh} t={t} />} />
          <Route path="/voice" element={<Voice refresh={refresh} t={t} shop={data.shop} />} />
          <Route path="/inventory" element={<Inventory data={data} refresh={refresh} t={t} />} />
          <Route path="/alerts" element={<Alerts data={data} refresh={refresh} t={t} />} />
          <Route path="/history" element={<History data={data} t={t} />} />
          <Route path="/profile" element={<Profile data={{ ...data, user }} refresh={refresh} t={t} />} />
          <Route path="/shop-profile" element={<Profile data={{ ...data, user }} refresh={refresh} shop t={t} />} />
          <Route path="/settings" element={<SettingsPage data={data} refresh={refresh} t={t} />} />
          <Route path="/help" element={<Help t={t} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
