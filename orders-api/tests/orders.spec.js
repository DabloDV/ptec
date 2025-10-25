process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const request = require("supertest");
const { app } = require("../src/app");

describe("orders-api", () => {
  it("GET /health -> 200", async () => {
    const r = await request(app).get("/health");
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("ok", true);
  });

  it("GET /orders sin JWT -> 401", async () => {
    const r = await request(app).get("/orders");
    expect(r.status).toBe(401);
  });
});