import cors from "cors";
import express from "express";
import { nanoid } from "nanoid";
import { articles, categories, vouchers } from "./data.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const orders = [];
const users = [
  {
    id: "usr-demo",
    name: "Gudfoody Member",
    email: "member@gudfoody.id",
    phone: "081234567890",
    points: 12850
  }
];
const admins = [
  {
    id: "adm-demo",
    name: "Admin Gudfoody",
    email: "admin@gudfoody.id",
    role: "admin"
  }
];

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

function getVoucher(id) {
  return vouchers.find((voucher) => voucher.id === id);
}

function buildOrderItems(items = []) {
  return items.map((item) => {
    const voucher = getVoucher(item.voucherId);
    if (!voucher) {
      const error = new Error(`Voucher ${item.voucherId} tidak ditemukan`);
      error.status = 404;
      throw error;
    }

    const quantity = Math.max(1, Number(item.quantity || 1));
    if (quantity > voucher.stock) {
      const error = new Error(`Stok ${voucher.merchant} tidak mencukupi`);
      error.status = 400;
      throw error;
    }

    return {
      voucherId: voucher.id,
      merchant: voucher.merchant,
      title: voucher.title,
      price: voucher.price,
      quantity,
      subtotal: voucher.price * quantity,
      codes: Array.from({ length: quantity }, () => `GDF-${nanoid(8).toUpperCase()}`)
    };
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gudfoody-api" });
});

app.get("/api/home", (_req, res) => {
  const sections = [
    { id: "flash", title: "FLASH SALE VOUCHER MAKANAN" },
    { id: "new", title: "NEW ON GUDFOODY" },
    { id: "weekly", title: "PROMO MINGGU INI" },
    { id: "popular", title: "NOW ON GUDFOODY" },
    { id: "favorite", title: "MERCHANT FAVORIT" },
    { id: "groceries", title: "DAILY GROCERIES" },
    { id: "ramen", title: "HOUSE OF RAMEN" },
    { id: "gift", title: "GIFT CARD" }
  ].map((section) => ({
    ...section,
    items: vouchers.filter((voucher) => voucher.section === section.id)
  }));

  res.json({
    hero: {
      headline: "Dapatkan diskon voucher makanan hingga 85%",
      subheadline: "Beli voucher F&B digital, kirim gift card, dan redeem instan di merchant pilihan.",
      countdownEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 9).toISOString()
    },
    categories,
    sections,
    articles
  });
});

app.get("/api/vouchers", (req, res) => {
  const { category = "all", q = "", sort = "popular" } = req.query;
  const query = String(q).toLowerCase();
  let results = vouchers.filter((voucher) => {
    const matchesCategory =
      category === "all" ||
      voucher.category === category ||
      (category === "flash" && voucher.section === "flash");
    const matchesQuery = [voucher.merchant, voucher.title, voucher.location]
      .join(" ")
      .toLowerCase()
      .includes(query);
    return matchesCategory && matchesQuery;
  });

  if (sort === "discount") results = results.sort((a, b) => b.discount - a.discount);
  if (sort === "price-low") results = results.sort((a, b) => a.price - b.price);
  if (sort === "price-high") results = results.sort((a, b) => b.price - a.price);

  res.json(results);
});

app.get("/api/vouchers/:id", (req, res) => {
  const voucher = getVoucher(req.params.id);
  if (!voucher) return res.status(404).json({ message: "Voucher tidak ditemukan" });
  res.json(voucher);
});

app.post("/api/auth/login", (req, res) => {
  const { email = "member@gudfoody.id", role = "user" } = req.body;
  const user =
    role === "admin"
      ? admins.find((item) => item.email === email) || admins[0]
      : users.find((item) => item.email === email) || users[0];
  res.json({ token: `${role}-${nanoid(16)}`, user: { ...user, role } });
});

app.get("/api/me", (_req, res) => {
  res.json(users[0]);
});

app.post("/api/orders", (req, res, next) => {
  try {
    const { items, customer, paymentMethod = "QRIS" } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Keranjang masih kosong" });
    }

    const orderItems = buildOrderItems(items);
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const serviceFee = Math.ceil(subtotal * 0.01);
    const total = subtotal + serviceFee;
    const order = {
      id: `GDF-${nanoid(10).toUpperCase()}`,
      status: "PAID",
      customer: customer || users[0],
      paymentMethod,
      items: orderItems,
      subtotal,
      serviceFee,
      total,
      totalLabel: rupiah.format(total),
      createdAt: new Date().toISOString()
    };

    orders.unshift(order);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders", (_req, res) => {
  res.json(orders);
});

app.get("/api/admin/summary", (_req, res) => {
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const sold = orders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  res.json({
    products: vouchers.length,
    orders: orders.length,
    sold,
    revenue,
    revenueLabel: rupiah.format(revenue),
    lowStock: vouchers.filter((voucher) => voucher.stock <= 20).length,
    latestOrders: orders.slice(0, 12)
  });
});

app.post("/api/admin/vouchers", (req, res) => {
  const {
    merchant,
    title,
    category = "fast-food",
    section = "new",
    price,
    originalPrice,
    discount,
    stock,
    location = "Digital",
    image
  } = req.body;

  if (!merchant || !title || !price || !originalPrice || !image) {
    return res.status(400).json({ message: "Merchant, title, price, originalPrice, dan image wajib diisi" });
  }

  const voucher = {
    id: `${merchant.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${nanoid(5)}`,
    merchant,
    title,
    category,
    section,
    price: Number(price),
    originalPrice: Number(originalPrice),
    discount: Number(discount || Math.round((1 - Number(price) / Number(originalPrice)) * 100)),
    stock: Number(stock || 1),
    location,
    image,
    terms: ["Voucher digital", "Berlaku sesuai ketentuan merchant", "Tidak dapat diuangkan"]
  };
  vouchers.unshift(voucher);
  res.status(201).json(voucher);
});

app.patch("/api/admin/vouchers/:id", (req, res) => {
  const voucher = getVoucher(req.params.id);
  if (!voucher) return res.status(404).json({ message: "Voucher tidak ditemukan" });
  Object.assign(voucher, req.body);
  res.json(voucher);
});

app.delete("/api/admin/vouchers/:id", (req, res) => {
  const index = vouchers.findIndex((voucher) => voucher.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Voucher tidak ditemukan" });
  const [removed] = vouchers.splice(index, 1);
  res.json(removed);
});

app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ message: err.message || "Terjadi kesalahan server" });
});

app.listen(PORT, () => {
  console.log(`Gudfoody API running at http://localhost:${PORT}`);
});
