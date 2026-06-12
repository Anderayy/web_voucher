import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BadgePercent,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  CircleUserRound,
  Gift,
  Heart,
  Home,
  LayoutDashboard,
  LogIn,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Soup,
  Sparkles,
  Ticket,
  Trash2,
  Utensils,
  X
} from "lucide-react";
import "./styles.css";

const API_BASE = "/api";
const imageFallback =
  "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=80";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);

function useCountdown(target) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!target) return undefined;
    const tick = () => setRemaining(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  const seconds = Math.floor(remaining / 1000);
  return [
    String(Math.floor(seconds / 3600)).padStart(2, "0"),
    String(Math.floor((seconds % 3600) / 60)).padStart(2, "0"),
    String(seconds % 60).padStart(2, "0")
  ];
}

function App() {
  const [home, setHome] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [category, setCategory] = useState("all");
  const [voucherTab, setVoucherTab] = useState("voucher");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("home");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [adminSummary, setAdminSummary] = useState(null);
  const [toast, setToast] = useState("");

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  useEffect(() => {
    refreshHome();
    refreshOrders();
  }, []);

  useEffect(() => {
    refreshVouchers();
  }, [category, query]);

  useEffect(() => {
    if (view === "admin") refreshAdmin();
  }, [view]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function refreshHome() {
    fetch(`${API_BASE}/home`)
      .then((response) => response.json())
      .then(setHome)
      .catch(() => setToast("Backend belum aktif. Jalankan npm run server."));

    fetch(`${API_BASE}/vouchers?category=all&sort=discount`)
      .then((response) => response.json())
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }

  function refreshVouchers() {
    const params = new URLSearchParams({ category, q: query, sort: "discount" });
    fetch(`${API_BASE}/vouchers?${params}`)
      .then((response) => response.json())
      .then(setVouchers)
      .catch(() => setVouchers([]));
  }

  function refreshOrders() {
    fetch(`${API_BASE}/orders`)
      .then((response) => response.json())
      .then(setOrders)
      .catch(() => setOrders([]));
  }

  function refreshAdmin() {
    fetch(`${API_BASE}/admin/summary`)
      .then((response) => response.json())
      .then(setAdminSummary)
      .catch(() => setAdminSummary(null));
  }

  function addToCart(voucher) {
    setCart((items) => {
      const found = items.find((item) => item.id === voucher.id);
      if (!found) return [...items, { ...voucher, quantity: 1 }];
      return items.map((item) =>
        item.id === voucher.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    });
    setToast(`${voucher.merchant} masuk pesanan`);
  }

  function updateQuantity(id, amount) {
    setCart((items) =>
      items
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item
        )
        .filter((item) => item.quantity)
    );
  }

  async function checkout() {
    const response = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: "QRIS",
        customer: user,
        items: cart.map((item) => ({ voucherId: item.id, quantity: item.quantity }))
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(data.message || "Checkout gagal");
      return;
    }
    setOrders((items) => [data, ...items]);
    setCart([]);
    setCartOpen(false);
    setView("orders");
    setToast(`Pesanan ${data.id} berhasil`);
  }

  async function login(role) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        email: role === "admin" ? "admin@gudfoody.id" : "member@gudfoody.id"
      })
    });
    const data = await response.json();
    setUser(data.user);
    setLoginOpen(false);
    setView(role === "admin" ? "admin" : "account");
    setToast(`Login ${role} berhasil`);
  }

  async function createVoucher(payload) {
    const response = await fetch(`${API_BASE}/admin/vouchers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(data.message || "Gagal tambah produk");
      return;
    }
    refreshHome();
    refreshVouchers();
    refreshAdmin();
    setToast("Produk baru berhasil ditambahkan");
  }

  async function deleteVoucher(id) {
    await fetch(`${API_BASE}/admin/vouchers/${id}`, { method: "DELETE" });
    refreshHome();
    refreshVouchers();
    refreshAdmin();
    setToast("Produk dihapus");
  }

  function selectCategory(nextCategory) {
    setCategory(nextCategory);
    if (nextCategory === "flash") setVoucherTab("flash");
    if (["fast-food", "coffee", "bakery", "ramen", "dessert"].includes(nextCategory)) setVoucherTab("food");
    setQuery("");
    setView("voucher");
  }

  function selectVoucherTab(nextTab) {
    setVoucherTab(nextTab);
    setQuery("");
    setCategory("all");
    setView("voucher");
  }

  if (!home) {
    return (
      <main className="loading-screen">
        <div className="brand-badge">G</div>
        <p>Memuat Gudfoody...</p>
      </main>
    );
  }

  const baseCatalog = catalog.length ? catalog : home.sections.flatMap((section) => section.items);
  const tabProducts = getTabProducts(baseCatalog, voucherTab);
  const allProducts = query || category !== "all" ? vouchers : tabProducts;

  return (
    <>
      <div className="page-wrap">
        <TopPromo onOpen={() => setView("voucher")} />
        <SearchHeader
          query={query}
          setQuery={(value) => {
            setQuery(value);
            setView("voucher");
          }}
          itemCount={itemCount}
          user={user}
          onCart={() => setCartOpen(true)}
          onLogin={() => setLoginOpen(true)}
          onAdmin={() => setView("admin")}
        />
        <div className="desktop-layout">
          <SideRail view={view} setView={setView} itemCount={itemCount} user={user} />
          <main className="app-shell">
            {view === "home" && (
              <HomeView
                home={home}
                products={allProducts}
                category={category}
                user={user}
                orders={orders}
                itemCount={itemCount}
                cartTotal={cartTotal}
                onCategory={selectCategory}
                voucherTab={voucherTab}
                onVoucherTab={selectVoucherTab}
                onSelect={setSelected}
                onAdd={addToCart}
                onCart={() => setCartOpen(true)}
                onLogin={() => setLoginOpen(true)}
                onAdmin={() => setView("admin")}
              />
            )}
            {view === "voucher" && (
              <VoucherView
                title={query ? "HASIL PENCARIAN" : "SEMUA VOUCHER MAKANAN"}
                subtitle={query ? `Untuk "${query}"` : getTabSubtitle(voucherTab)}
                products={allProducts}
                category={category}
                voucherTab={voucherTab}
                onCategory={selectCategory}
                onVoucherTab={selectVoucherTab}
                onSelect={setSelected}
                onAdd={addToCart}
                countdown={home.hero.countdownEndsAt}
              />
            )}
            {view === "orders" && <OrdersView orders={orders} onCart={() => setCartOpen(true)} />}
            {view === "account" && (
              <AccountView
                user={user}
                orders={orders}
                itemCount={itemCount}
                cartTotal={cartTotal}
                onLogin={() => setLoginOpen(true)}
                onAdmin={() => setView("admin")}
                onOrders={() => setView("orders")}
                onLogout={() => {
                  setUser(null);
                  setToast("Logout berhasil");
                }}
              />
            )}
            {view === "admin" && (
              <AdminView
                user={user}
                products={allProducts}
                summary={adminSummary}
                onLogin={() => setLoginOpen(true)}
                onCreate={createVoucher}
                onDelete={deleteVoucher}
              />
            )}
          </main>
        </div>
      </div>
      <BottomNav view={view} setView={setView} itemCount={itemCount} />
      <CartDrawer
        open={cartOpen}
        cart={cart}
        total={cartTotal}
        orders={orders}
        onClose={() => setCartOpen(false)}
        onQuantity={updateQuantity}
        onCheckout={checkout}
      />
      <VoucherModal voucher={selected} onClose={() => setSelected(null)} onAdd={addToCart} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={login} />
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function getTabProducts(products, tab) {
  if (tab === "flash") return products.filter((item) => item.section === "flash");
  if (tab === "food") {
    const foodCategories = ["fast-food", "coffee", "bakery", "ramen", "dessert"];
    return products.filter((item) => foodCategories.includes(item.category));
  }
  return products;
}

function getTabSubtitle(tab) {
  if (tab === "flash") return "Voucher stok terbatas dengan countdown dan diskon terbesar.";
  if (tab === "food") return "Kumpulan voucher restoran, kopi, bakery, ramen, dan dessert.";
  return "Semua voucher makanan, market, dan gift card Gudfoody.";
}

function TopPromo({ onOpen }) {
  return (
    <header className="top-promo">
      <div className="brand-badge">G</div>
      <div>
        <strong>Dapatkan diskon voucher makanan hingga 85%</strong>
        <span>Belanja voucher Gudfoody langsung dari website</span>
      </div>
      <button type="button" onClick={onOpen}>BUKA</button>
    </header>
  );
}

function SearchHeader({ query, setQuery, itemCount, user, onCart, onLogin, onAdmin }) {
  return (
    <section className="search-header">
      <label>
        <Search size={24} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari di Gudfoody" />
      </label>
      <button type="button" title="Admin CMS" onClick={onAdmin}>
        <LayoutDashboard size={24} />
      </button>
      <button type="button" title="Login" onClick={onLogin}>
        {user ? <CircleUserRound size={25} /> : <LogIn size={24} />}
      </button>
      <button type="button" title="Pesanan" className="bag-button" onClick={onCart}>
        <ShoppingBag size={25} />
        {itemCount > 0 && <span>{itemCount}</span>}
      </button>
    </section>
  );
}

function SideRail({ view, setView, itemCount, user }) {
  const items = [
    ["home", "Beranda", Home],
    ["voucher", "Voucher", Ticket],
    ["orders", `Pesanan${itemCount ? ` (${itemCount})` : ""}`, BriefcaseBusiness],
    ["account", user?.name || "Akun", CircleUserRound],
    ["admin", "Admin CMS", LayoutDashboard]
  ];
  return (
    <aside className="side-rail">
      <div className="logo-lockup">
        <div className="brand-badge">G</div>
        <strong>gudfoody</strong>
      </div>
      {items.map(([id, label, Icon]) => (
        <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}>
          <Icon size={20} />
          {label}
        </button>
      ))}
    </aside>
  );
}

function HomeView({
  home,
  products,
  category,
  user,
  orders,
  itemCount,
  cartTotal,
  onCategory,
  voucherTab,
  onVoucherTab,
  onSelect,
  onAdd,
  onCart,
  onLogin,
  onAdmin
}) {
  return (
    <>
      <ProfileStrip
        user={user}
        orders={orders}
        itemCount={itemCount}
        cartTotal={cartTotal}
        onCart={onCart}
        onLogin={onLogin}
        onAdmin={onAdmin}
      />
      <QuickMenu onCategory={onCategory} onCart={onCart} />
      <HeroCarousel products={products} />
      <VoucherTabs active={voucherTab} onSelect={onVoucherTab} />
      <CategoryGrid active={category} onChange={onCategory} />
      <FlashDeals
        items={(home.sections.find((section) => section.id === "flash")?.items || products).slice(0, 5)}
        onSelect={onSelect}
        onAdd={onAdd}
        countdown={home.hero.countdownEndsAt}
      />
      <CampaignSection
        title="NEW ON GUDFOODY"
        subtitle="Laper dikit, checkout voucher"
        theme="magenta"
        items={home.sections.find((section) => section.id === "new")?.items || []}
        onSelect={onSelect}
        onAdd={onAdd}
      />
      <CampaignSection
        title="PROMO MINGGU INI"
        subtitle="Trending merchant bulan ini"
        theme="green"
        items={home.sections.find((section) => section.id === "weekly")?.items || []}
        onSelect={onSelect}
        onAdd={onAdd}
      />
      <CampaignSection
        title="MERCHANT FAVORIT"
        subtitle="Ngopi, makan, jajan makin hemat"
        theme="mint"
        items={products.filter((item) => ["favorite", "popular", "ramen"].includes(item.section)).slice(0, 8)}
        onSelect={onSelect}
        onAdd={onAdd}
      />
      <ProductGrid title="SEMUA PRODUK PILIHAN" products={products.slice(0, 12)} onSelect={onSelect} onAdd={onAdd} />
    </>
  );
}

function VoucherView({
  title,
  subtitle,
  products,
  category,
  voucherTab,
  onCategory,
  onVoucherTab,
  onSelect,
  onAdd,
  countdown
}) {
  return (
    <>
      <VoucherTabs active={voucherTab} onSelect={onVoucherTab} />
      <TabExplainer active={voucherTab} count={products.length} />
      <CategoryGrid active={category} onChange={onCategory} />
      <CampaignSection title={title} subtitle={subtitle} theme="lime" items={products} onSelect={onSelect} onAdd={onAdd} />
      <FlashDeals items={products.slice(0, 5)} onSelect={onSelect} onAdd={onAdd} countdown={countdown} />
      <ProductGrid title="KATALOG VOUCHER" products={products} onSelect={onSelect} onAdd={onAdd} />
    </>
  );
}

function ProfileStrip({ user, orders, itemCount, cartTotal, onCart, onLogin, onAdmin }) {
  if (!user) {
    return (
      <section className="profile-strip guest-strip">
        <div className="guest-avatar">
          <CircleUserRound size={36} />
        </div>
        <div>
          <strong>Masuk untuk akses voucher member</strong>
          <span>Checkout lebih cepat, simpan transaksi, dan dapatkan poin Gudfoody.</span>
        </div>
        <button type="button" onClick={onLogin}>Login</button>
      </section>
    );
  }

  if (user.role === "admin") {
    return (
      <section className="profile-strip admin-strip">
        <div className="admin-avatar">
          <LayoutDashboard size={34} />
        </div>
        <div>
          <strong>{user.name}</strong>
          <span>Mode admin aktif. Kelola produk, stok, dan transaksi voucher.</span>
        </div>
        <button type="button" onClick={onAdmin}>CMS</button>
        <div className="member-metrics">
          <div><span>Produk</span><strong>Live</strong></div>
          <div><span>Order</span><strong>{orders.length}</strong></div>
          <div><span>Cart</span><strong>{itemCount}</strong></div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-strip member-strip">
      <div className="member-avatar">
        <CircleUserRound size={36} />
      </div>
      <div>
        <strong>Hi, {user.name}</strong>
        <span>{user.points.toLocaleString("id-ID")} poin aktif. Voucher digital siap checkout.</span>
      </div>
      <button type="button" onClick={onCart}>Cart</button>
      <div className="member-metrics">
        <div><span>Pesanan</span><strong>{orders.length}</strong></div>
        <div><span>Keranjang</span><strong>{itemCount}</strong></div>
        <div><span>Total</span><strong>{formatRupiah(cartTotal)}</strong></div>
      </div>
    </section>
  );
}

function QuickMenu({ onCategory, onCart }) {
  const menus = [
    { label: "Gift", icon: Gift, tone: "pink", action: () => onCategory("gift") },
    { label: "Favorite", icon: Heart, tone: "red", action: () => onCategory("all") },
    { label: "Food", icon: Utensils, tone: "green", action: () => onCategory("fast-food") },
    { label: "Voucher", icon: BadgePercent, tone: "gold", action: () => onCategory("flash") },
    { label: "Cart", icon: ShoppingBag, tone: "blue", action: onCart }
  ];

  return (
    <section className="quick-menu">
      {menus.map(({ label, icon: Icon, tone, action }) => (
        <button type="button" key={label} onClick={action} className={`menu-${tone}`}>
          <span><Icon size={25} /></span>
          {label}
        </button>
      ))}
    </section>
  );
}

function HeroCarousel({ products }) {
  const [active, setActive] = useState(0);
  const banners = [
    {
      title: "HEMAT MAKAN SEKARANG",
      copy: "Voucher restoran, kopi, bakery, ramen",
      className: "hero-food",
      product: products[0]
    },
    {
      title: "CHECKOUT VOUCHER HARI INI",
      copy: "Diskon sampai 50% untuk merchant baru",
      className: "hero-new",
      product: products[1]
    },
    {
      title: "TRENDING MERCHANT",
      copy: "Brand makanan paling dicari bulan ini",
      className: "hero-trend",
      product: products[2]
    }
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % banners.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  return (
    <section className="hero-carousel">
      <div className="banner-viewport">
        <div className="banner-track" style={{ transform: `translateX(-${active * 100}%)` }}>
          {banners.map((banner) => (
            <article className={`promo-banner ${banner.className}`} key={banner.title}>
              <div>
                <span>GUDFOODY VOUCHER</span>
                <h1>{banner.title}</h1>
                <p>{banner.copy}</p>
              </div>
              <img src={banner.product?.image || imageFallback} alt={banner.title} />
            </article>
          ))}
        </div>
      </div>
      <div className="dots">
        {banners.map((banner, index) => (
          <button
            type="button"
            key={banner.title}
            className={index === active ? "active" : ""}
            onClick={() => setActive(index)}
            aria-label={`Promo ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function VoucherTabs({ active, onSelect }) {
  const tabs = [
    ["voucher", "Voucher", "Semua voucher"],
    ["food", "Food Deals", "Restoran & cafe"],
    ["flash", "Flash Sale", "Promo terbatas"]
  ];
  return (
    <section className="voucher-tabs">
      {tabs.map(([id, label, helper]) => (
        <button
          type="button"
          key={id}
          className={active === id ? "active" : ""}
          onClick={() => onSelect(id)}
        >
          <strong>{label}</strong>
          <span>{helper}</span>
        </button>
      ))}
    </section>
  );
}

function TabExplainer({ active, count }) {
  const copy = {
    voucher: ["Mode Voucher", "Menampilkan semua voucher aktif lintas kategori."],
    food: ["Mode Food Deals", "Hanya voucher makanan, coffee, bakery, ramen, dan dessert."],
    flash: ["Mode Flash Sale", "Hanya promo berbatas waktu dari campaign flash sale."]
  };
  const [title, description] = copy[active] || copy.voucher;
  return (
    <section className={`tab-explainer ${active}`}>
      <div>
        <span>{title}</span>
        <strong>{description}</strong>
      </div>
      <p>{count} produk</p>
    </section>
  );
}

function CategoryGrid({ active, onChange }) {
  const categories = [
    ["all", "All", Sparkles],
    ["flash", "Flash", BadgePercent],
    ["fast-food", "F&B", Utensils],
    ["coffee", "Coffee", Soup],
    ["bakery", "Bakery", Gift],
    ["ramen", "Ramen", Soup],
    ["groceries", "Market", ShoppingBag],
    ["dessert", "Dessert", PackageCheck],
    ["gift", "Gift", Gift]
  ];

  return (
    <section className="category-grid">
      {categories.map(([id, label, Icon]) => (
        <button type="button" key={id} className={active === id ? "active" : ""} onClick={() => onChange(id)}>
          <span><Icon size={24} /></span>
          {label}
        </button>
      ))}
    </section>
  );
}

function FlashDeals({ items, onSelect, onAdd, countdown }) {
  const [hours, minutes, seconds] = useCountdown(countdown);
  return (
    <section className="flash-section">
      <div className="section-title">
        <h2>FLASH SALE VOUCHER MAKANAN</h2>
        <div className="time-chip">
          <span>Berakhir dalam</span>
          <strong>{hours} : {minutes} : {seconds}</strong>
        </div>
      </div>
      <div className="deal-stage">
        <div className="stage-poster">
          <span>FLASH SALE</span>
          <strong>MAKAN HEMAT</strong>
          <small>LIMITED STOCK</small>
        </div>
        <div className="ticket-row">
          {items.map((item) => (
            <VoucherTicket key={item.id} item={item} onSelect={onSelect} onAdd={onAdd} />
          ))}
          <button type="button" className="see-all"><ChevronRight size={36} />See All</button>
        </div>
      </div>
    </section>
  );
}

function CampaignSection({ title, subtitle, theme, items, onSelect, onAdd }) {
  return (
    <section className="campaign-section">
      <div className="section-title">
        <h2>{title}</h2>
        <button type="button" aria-label="Lihat semua"><ChevronRight size={24} /></button>
      </div>
      <div className={`merchant-stage ${theme}`}>
        <div className="campaign-copy">
          <h3>{subtitle}</h3>
          <p>Diskon voucher makanan pilihan, stok terbatas setiap hari.</p>
        </div>
        <div className="merchant-row">
          {items.length === 0 ? (
            <p className="empty-stage">Belum ada voucher.</p>
          ) : (
            items.slice(0, 8).map((item) => (
              <MerchantCard key={item.id} item={item} onSelect={onSelect} onAdd={onAdd} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function MerchantCard({ item, onSelect, onAdd }) {
  return (
    <article className="merchant-card" onClick={() => onSelect(item)}>
      <span className="discount-ribbon">{item.discount}% off</span>
      <div className="merchant-logo">
        <img src={item.image} alt={item.merchant} />
        <strong>{item.merchant}</strong>
      </div>
      <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(item); }}>
        <Plus size={16} />
      </button>
    </article>
  );
}

function VoucherTicket({ item, onSelect, onAdd }) {
  return (
    <article className="voucher-ticket" onClick={() => onSelect(item)}>
      <span className="discount-ribbon">{item.discount}% Off</span>
      <img src={item.image} alt={item.merchant} />
      <h3>{item.title}</h3>
      <div className="ticket-price">
        <strong>{formatRupiah(item.price)}</strong>
        <s>{formatRupiah(item.originalPrice)}</s>
      </div>
      <div className="ticket-meta">
        <span>V. Digital</span>
        <small>Stok {item.stock}</small>
      </div>
      <p>{item.merchant}</p>
      <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(item); }}>Beli</button>
    </article>
  );
}

function ProductGrid({ title, products, onSelect, onAdd }) {
  return (
    <section className="product-grid-section">
      <div className="section-title">
        <h2>{title}</h2>
      </div>
      <div className="product-grid">
        {products.map((item) => (
          <VoucherTicket key={item.id} item={item} onSelect={onSelect} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

function OrdersView({ orders, onCart }) {
  return (
    <section className="panel-view">
      <div className="panel-hero">
        <h1>Pesanan Voucher</h1>
        <p>Lihat transaksi, status pembayaran, dan kode voucher digital yang sudah dibuat.</p>
        <button type="button" onClick={onCart}>Buka Keranjang</button>
      </div>
      <div className="order-list">
        {orders.length === 0 ? (
          <div className="empty-card">Belum ada transaksi. Checkout voucher dulu dari keranjang.</div>
        ) : (
          orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div>
                <span>{order.status}</span>
                <h3>{order.id}</h3>
                <p>{new Date(order.createdAt).toLocaleString("id-ID")}</p>
              </div>
              <strong>{order.totalLabel}</strong>
              <ul>
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.voucherId}`}>
                    {item.merchant} x{item.quantity} - {item.codes.join(", ")}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function AccountView({ user, orders, itemCount, cartTotal, onLogin, onAdmin, onOrders, onLogout }) {
  if (!user) {
    return (
      <section className="panel-view account-state guest-account">
        <div className="panel-hero account-hero">
          <span className="state-pill">Guest Mode</span>
          <h1>Login dulu untuk pengalaman member Gudfoody</h1>
          <p>Setelah login, halaman akun berubah menjadi member wallet dengan poin, histori order, dan akses cepat checkout.</p>
          <div className="hero-actions">
            <button type="button" onClick={onLogin}>Login User/Admin</button>
            <button type="button" onClick={onAdmin}>Coba Admin CMS</button>
          </div>
        </div>
        <div className="account-grid">
          <div><Ticket size={28} /><strong>Voucher tersimpan</strong><span>Aktif setelah login dan checkout.</span></div>
          <div><Bell size={28} /><strong>Promo member</strong><span>Rekomendasi voucher sesuai transaksi.</span></div>
          <div><BarChart3 size={28} /><strong>Gudfoody points</strong><span>Simulasi poin member untuk user login.</span></div>
        </div>
      </section>
    );
  }

  if (user.role === "admin") {
    return (
      <section className="panel-view account-state admin-account">
        <div className="panel-hero admin-account-hero">
          <span className="state-pill">Admin Active</span>
          <h1>{user.name}</h1>
          <p>{user.email}. Anda sedang berada di mode admin, dengan akses CMS untuk produk dan transaksi.</p>
          <div className="hero-actions">
            <button type="button" onClick={onAdmin}>Buka Command Center</button>
            <button type="button" onClick={onLogout}>Logout</button>
          </div>
        </div>
        <div className="account-grid">
          <div><LayoutDashboard size={28} /><strong>CMS Produk</strong><span>Tambah dan hapus voucher dari dashboard.</span></div>
          <div><BriefcaseBusiness size={28} /><strong>Transaksi</strong><span>{orders.length} transaksi terekam di server.</span></div>
          <div><BarChart3 size={28} /><strong>Revenue Monitor</strong><span>Pantau summary di Admin CMS.</span></div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-view account-state member-account">
      <div className="panel-hero member-account-hero">
        <span className="state-pill">Member Active</span>
        <h1>{user.name}</h1>
        <p>{user.email}. Wallet member aktif dengan poin, cart, dan histori transaksi voucher makanan.</p>
        <div className="hero-actions">
          <button type="button" onClick={onOrders}>Lihat Pesanan</button>
          <button type="button" onClick={onLogout}>Logout</button>
        </div>
      </div>
      <div className="member-wallet">
        <div>
          <span>Gudfoody Points</span>
          <strong>{user.points.toLocaleString("id-ID")}</strong>
        </div>
        <div>
          <span>Keranjang</span>
          <strong>{itemCount} voucher</strong>
        </div>
        <div>
          <span>Nilai Cart</span>
          <strong>{formatRupiah(cartTotal)}</strong>
        </div>
      </div>
      <div className="account-grid">
        <div><Ticket size={28} /><strong>Voucher Digital</strong><span>Kode otomatis setelah checkout.</span></div>
        <div><BriefcaseBusiness size={28} /><strong>Histori Pesanan</strong><span>{orders.length} transaksi tersimpan.</span></div>
        <div><BarChart3 size={28} /><strong>Member Tier</strong><span>Foodie Gold aktif untuk demo user.</span></div>
      </div>
    </section>
  );
}

function AdminView({ user, products, summary, onLogin, onCreate, onDelete }) {
  const [form, setForm] = useState({
    merchant: "",
    title: "",
    category: "fast-food",
    section: "new",
    price: "",
    originalPrice: "",
    discount: "",
    stock: "",
    location: "Digital",
    image: imageFallback
  });

  const isAdmin = user?.role === "admin";

  function submit(event) {
    event.preventDefault();
    onCreate(form);
    setForm((current) => ({ ...current, merchant: "", title: "", price: "", originalPrice: "", discount: "", stock: "" }));
  }

  return (
    <section className="admin-view">
      <div className="admin-hero">
        <div>
          <span>Admin CMS</span>
          <h1>Kelola produk, stok, dan transaksi Gudfoody</h1>
          <p>Tambah voucher makanan, pantau transaksi, dan hapus produk dummy langsung dari dashboard.</p>
        </div>
        {!isAdmin && <button type="button" onClick={onLogin}>Login Admin</button>}
      </div>
      <div className="stat-grid">
        <Stat label="Produk" value={summary?.products || products.length} />
        <Stat label="Transaksi" value={summary?.orders || 0} />
        <Stat label="Voucher Terjual" value={summary?.sold || 0} />
        <Stat label="Revenue" value={summary?.revenueLabel || "Rp 0"} />
      </div>
      <div className="admin-grid">
        <form className="admin-form" onSubmit={submit}>
          <h2>Tambah Product Voucher</h2>
          <input required placeholder="Merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} />
          <input required placeholder="Nama voucher" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="form-row">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="fast-food">F&B</option>
              <option value="coffee">Coffee</option>
              <option value="bakery">Bakery</option>
              <option value="ramen">Ramen</option>
              <option value="groceries">Market</option>
              <option value="dessert">Dessert</option>
              <option value="gift">Gift</option>
            </select>
            <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              <option value="new">New</option>
              <option value="flash">Flash</option>
              <option value="weekly">Weekly</option>
              <option value="favorite">Favorite</option>
              <option value="popular">Popular</option>
            </select>
          </div>
          <div className="form-row">
            <input required type="number" placeholder="Harga jual" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input required type="number" placeholder="Harga asli" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
          </div>
          <div className="form-row">
            <input type="number" placeholder="Diskon %" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            <input type="number" placeholder="Stok" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <input placeholder="Lokasi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input required placeholder="URL gambar internet" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <button type="submit" disabled={!isAdmin}>Tambah Produk</button>
          {!isAdmin && <p className="form-note">Login admin dulu untuk mengaktifkan CMS.</p>}
        </form>
        <div className="admin-table">
          <h2>Produk Aktif</h2>
          {products.slice(0, 18).map((item) => (
            <div className="admin-product" key={item.id}>
              <img src={item.image} alt={item.merchant} />
              <div>
                <strong>{item.merchant}</strong>
                <span>{item.title}</span>
                <small>{formatRupiah(item.price)} - stok {item.stock}</small>
              </div>
              <button type="button" disabled={!isAdmin} onClick={() => onDelete(item.id)} title="Hapus">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-transactions">
        <h2>Transaksi Terbaru</h2>
        {(summary?.latestOrders || []).length === 0 ? (
          <div className="empty-card">Belum ada transaksi.</div>
        ) : (
          summary.latestOrders.map((order) => (
            <div className="trx-row" key={order.id}>
              <span>{order.id}</span>
              <strong>{order.totalLabel}</strong>
              <small>{order.items.length} item - {order.status}</small>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CartDrawer({ open, cart, total, orders, onClose, onQuantity, onCheckout }) {
  return (
    <aside className={`cart-drawer ${open ? "open" : ""}`}>
      <div className="drawer-header">
        <div><span>Pesanan</span><h2>Keranjang Voucher</h2></div>
        <button type="button" onClick={onClose} title="Tutup"><X size={20} /></button>
      </div>
      <div className="drawer-items">
        {cart.length === 0 ? (
          <p className="empty-state">Keranjang masih kosong.</p>
        ) : (
          cart.map((item) => (
            <div className="cart-item" key={item.id}>
              <img src={item.image} alt={item.merchant} />
              <div>
                <h3>{item.merchant}</h3>
                <p>{formatRupiah(item.price)}</p>
                <div className="quantity">
                  <button type="button" onClick={() => onQuantity(item.id, -1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => onQuantity(item.id, 1)}><Plus size={14} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="drawer-footer">
        <div className="summary-row"><span>Subtotal</span><strong>{formatRupiah(total)}</strong></div>
        <div className="summary-row"><span>Biaya layanan</span><strong>{formatRupiah(Math.ceil(total * 0.01))}</strong></div>
        <button type="button" disabled={cart.length === 0} onClick={onCheckout}>Bayar Sekarang</button>
        {orders.length > 0 && <div className="latest-order"><span>Pesanan terbaru</span><strong>{orders[0].id}</strong><p>{orders[0].totalLabel}</p></div>}
      </div>
    </aside>
  );
}

function VoucherModal({ voucher, onClose, onAdd }) {
  if (!voucher) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="voucher-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Tutup"><X size={20} /></button>
        <img src={voucher.image} alt={voucher.merchant} />
        <div>
          <span className="discount-ribbon">{voucher.discount}% off</span>
          <h2>{voucher.merchant}</h2>
          <p>{voucher.title}</p>
          <strong>{formatRupiah(voucher.price)}</strong>
          <s>{formatRupiah(voucher.originalPrice)}</s>
          <ul>{voucher.terms.map((term) => <li key={term}>{term}</li>)}</ul>
          <button type="button" onClick={() => onAdd(voucher)}>Tambah ke Pesanan</button>
        </div>
      </article>
    </div>
  );
}

function LoginModal({ open, onClose, onLogin }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="login-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} title="Tutup"><X size={20} /></button>
        <h2>Login Gudfoody</h2>
        <p>Pilih role demo untuk mengakses fitur user atau admin CMS.</p>
        <button type="button" onClick={() => onLogin("user")}><CircleUserRound size={20} /> Login User</button>
        <button type="button" onClick={() => onLogin("admin")}><LayoutDashboard size={20} /> Login Admin CMS</button>
      </article>
    </div>
  );
}

function BottomNav({ view, setView, itemCount }) {
  const items = [
    ["home", "Beranda", Home],
    ["voucher", "Voucher", Ticket],
    ["orders", `Pesanan${itemCount ? ` (${itemCount})` : ""}`, BriefcaseBusiness],
    ["account", "Akun", CircleUserRound]
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([id, label, Icon]) => (
        <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}>
          <Icon size={23} />
          {label}
        </button>
      ))}
    </nav>
  );
}

createRoot(document.getElementById("root")).render(<App />);
