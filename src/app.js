const express = require("express");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const httpError = (status, message) => Object.assign(new Error(message), { status });
const isNonNegativeInt = (n) => Number.isInteger(n) && n >= 0;

// Health check (also verifies the database connection)
app.get("/health", async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});

// ---------- Products ----------
app.get("/api/products", async (req, res) => {
  res.json(await prisma.product.findMany({ orderBy: { id: "asc" } }));
});

app.post("/api/products", async (req, res) => {
  const name = req.body.name?.trim();
  const stockQuantity = Number(req.body.stockQuantity);
  if (!name || !isNonNegativeInt(stockQuantity)) {
    throw httpError(400, "Name and a whole-number stock quantity (0 or more) are required");
  }
  const product = await prisma.product.create({ data: { name, stockQuantity } });
  res.status(201).json(product);
});

app.put("/api/products/:id", async (req, res) => {
  const stockQuantity = Number(req.body.stockQuantity);
  if (!isNonNegativeInt(stockQuantity)) {
    throw httpError(400, "Stock quantity must be a whole number (0 or more)");
  }
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: { stockQuantity },
  });
  res.json(product);
});

app.delete("/api/products/:id", async (req, res) => {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ---------- Orders ----------
app.get("/api/orders", async (req, res) => {
  res.json(
    await prisma.order.findMany({
      include: { product: true },
      orderBy: { id: "desc" },
    })
  );
});

app.post("/api/orders", async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  const customerName = req.body.customerName?.trim();
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || !customerName) {
    throw httpError(400, "Product, customer name and a quantity of at least 1 are required");
  }

  // Reduce stock and create the order in one transaction
  const order = await prisma.$transaction(async (tx) => {
    const { count } = await tx.product.updateMany({
      where: { id: productId, stockQuantity: { gte: quantity } },
      data: { stockQuantity: { decrement: quantity } },
    });
    if (count === 0) throw httpError(400, "Product not found or not enough stock");
    return tx.order.create({ data: { productId, quantity, customerName } });
  });
  res.status(201).json(order);
});

// ---------- Error handling ----------
app.use((err, req, res, next) => {
  if (err.code === "P2025") return res.status(404).json({ error: "Not found" });
  if (err.code === "P2003") {
    return res.status(409).json({ error: "This product has orders and cannot be deleted" });
  }
  if (err.name === "PrismaClientValidationError") {
    return res.status(400).json({ error: "Invalid request" });
  }
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Internal server error" });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Inventory app listening on port ${port}`));
}

module.exports = { app, prisma };
