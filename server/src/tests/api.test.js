const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const config = require("../config");
const pool = require("../db");
const app = require("../app");

const PASSWORD = "password123";
const authed = (token) => ({ Authorization: `Bearer ${token}` });

async function registerUser(email) {
  const res = await request(app).post("/api/auth/register").send({ email, password: PASSWORD });
  assert.equal(res.status, 201);
  return res.body.token;
}

before(async () => {
  // this suite truncates tables: refuse to run against anything but the test DB
  assert.ok(config.DATABASE_URL.endsWith("_test"), "refusing to run against a non-test database");
  await pool.query("TRUNCATE users RESTART IDENTITY CASCADE");
});
after(() => pool.end());

test("register rejects invalid input with 400 and field details", async () => {
  const res = await request(app).post("/api/auth/register").send({ email: "nope", password: "short" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.ok(res.body.error.details.length >= 2);
});

test("register rejects unknown fields", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: "x@test.com", password: PASSWORD, isAdmin: true });
  assert.equal(res.status, 400);
});

test("duplicate registration returns 409", async () => {
  await registerUser("dup@test.com");
  const res = await request(app).post("/api/auth/register").send({ email: "DUP@test.com", password: PASSWORD });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "EMAIL_TAKEN");
});

test("login: wrong password 401, unknown email 401, correct 200", async () => {
  await registerUser("login@test.com");
  const bad = await request(app).post("/api/auth/login").send({ email: "login@test.com", password: "wrongwrong" });
  assert.equal(bad.status, 401);
  const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@test.com", password: PASSWORD });
  assert.equal(unknown.status, 401);
  assert.deepEqual(bad.body, unknown.body);
  const ok = await request(app).post("/api/auth/login").send({ email: "login@test.com", password: PASSWORD });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
});

test("notes endpoints require a valid token", async () => {
  assert.equal((await request(app).get("/api/notes")).status, 401);
  assert.equal((await request(app).get("/api/notes").set(authed("garbage"))).status, 401);
});

test("notes CRUD and cross-user isolation", async () => {
  const a = await registerUser("a-notes@test.com");
  const b = await registerUser("b-notes@test.com");

  const created = await request(app).post("/api/notes").set(authed(a)).send({ title: "t", content: "c" });
  assert.equal(created.status, 201);
  assert.equal(created.body.version, 1);
  const id = created.body.id;

  const listB = await request(app).get("/api/notes").set(authed(b));
  assert.equal(listB.status, 200);
  assert.deepEqual(listB.body.data, []);
  assert.equal(listB.body.total, 0);

  assert.equal((await request(app).put(`/api/notes/${id}`).set(authed(b)).send({ title: "x", version: 1 })).status, 404);
  assert.equal((await request(app).delete(`/api/notes/${id}`).set(authed(b))).status, 404);

  const upd = await request(app).put(`/api/notes/${id}`).set(authed(a)).send({ title: "t2", content: "c2", version: 1 });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.title, "t2");
  assert.equal(upd.body.version, 2);

  assert.equal((await request(app).put("/api/notes/abc").set(authed(a)).send({ title: "x", version: 1 })).status, 400);
  assert.equal((await request(app).put(`/api/notes/${id}`).set(authed(a)).send({ title: "x" })).status, 400); // version required
  assert.equal((await request(app).post("/api/notes").set(authed(a)).send({ title: "   " })).status, 400);
  assert.equal((await request(app).delete(`/api/notes/${id}`).set(authed(a))).status, 204);
});

test("stale version returns 409 and does not overwrite", async () => {
  const token = await registerUser("lock@test.com");
  const created = await request(app).post("/api/notes").set(authed(token)).send({ title: "v1" });
  const id = created.body.id;

  const first = await request(app).put(`/api/notes/${id}`).set(authed(token)).send({ title: "tab1", version: 1 });
  assert.equal(first.status, 200);
  assert.equal(first.body.version, 2);

  const stale = await request(app).put(`/api/notes/${id}`).set(authed(token)).send({ title: "tab2", version: 1 });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, "VERSION_CONFLICT");

  const list = await request(app).get("/api/notes").set(authed(token));
  assert.equal(list.body.data[0].title, "tab1");
});

test("pagination: pages, totals, bounds, validation", async () => {
  const token = await registerUser("page@test.com");
  for (let i = 1; i <= 5; i++) {
    const r = await request(app).post("/api/notes").set(authed(token)).send({ title: `n${i}` });
    assert.equal(r.status, 201);
  }
  const p1 = await request(app).get("/api/notes?page=1&limit=2").set(authed(token));
  assert.equal(p1.status, 200);
  assert.equal(p1.body.data.length, 2);
  assert.equal(p1.body.total, 5);
  assert.equal(p1.body.totalPages, 3);
  assert.equal(p1.body.data[0].title, "n5"); // newest first

  const p3 = await request(app).get("/api/notes?page=3&limit=2").set(authed(token));
  assert.equal(p3.body.data.length, 1);
  const p9 = await request(app).get("/api/notes?page=9&limit=2").set(authed(token));
  assert.deepEqual(p9.body.data, []);

  assert.equal((await request(app).get("/api/notes?limit=1000").set(authed(token))).status, 400);
  assert.equal((await request(app).get("/api/notes?page=0").set(authed(token))).status, 400);
});

test("API responses are not cacheable", async () => {
  const token = await registerUser("cache@test.com");
  const res = await request(app).get("/api/notes").set(authed(token));
  assert.equal(res.headers["cache-control"], "no-store");
});

test("malformed JSON returns 400, not 500", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{bad json");
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "INVALID_JSON");
});

test("unknown route returns 404", async () => {
  const res = await request(app).get("/api/nope");
  assert.equal(res.status, 404);
});