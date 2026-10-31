const { test, after } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const { app, prisma } = require("../src/app");

// Unique name so the tests never touch real data
const name = `test-product-${Date.now()}`;
let productId;

after(async () => {
  await prisma.order.deleteMany({ where: { product: { name } } });
  await prisma.product.deleteMany({ where: { name } });
  await prisma.$disconnect();
});

test("GET /health returns ok", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("POST /api/products creates a product", async () => {
  const res = await request(app).post("/api/products").send({ name, stockQuantity: 10 });
  assert.equal(res.status, 201);
  assert.equal(res.body.stockQuantity, 10);
  productId = res.body.id;
});

test("POST /api/products rejects invalid input", async () => {
  const res = await request(app).post("/api/products").send({ name: "", stockQuantity: -5 });
  assert.equal(res.status, 400);
});

test("POST /api/orders reduces stock", async () => {
  const res = await request(app)
    .post("/api/orders")
    .send({ productId, quantity: 4, customerName: "Alice" });
  assert.equal(res.status, 201);

  const products = await request(app).get("/api/products");
  const product = products.body.find((p) => p.id === productId);
  assert.equal(product.stockQuantity, 6);
});

test("POST /api/orders rejects orders larger than stock", async () => {
  const res = await request(app)
    .post("/api/orders")
    .send({ productId, quantity: 100, customerName: "Bob" });
  assert.equal(res.status, 400);
});
