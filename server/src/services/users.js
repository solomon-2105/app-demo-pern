const bcrypt = require("bcryptjs");
const pool = require("../db");
const { AppError } = require("../errors");

const COST = 12;
// compared against when the email is unknown, so both failure paths cost the same time
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", COST);

async function createUser(email, password) {
  const hash = await bcrypt.hash(password, COST);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, hash]
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23505")
      throw new AppError(409, "EMAIL_TAKEN", "Email already registered");
    throw err;
  }
}

async function verifyCredentials(email, password) {
  const { rows } = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok)
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  return { id: user.id, email: user.email };
}

module.exports = { createUser, verifyCredentials };