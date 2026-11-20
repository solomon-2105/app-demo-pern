const pool = require("../db");
const { AppError } = require("../errors");

const COLS = "id, title, content, version, created_at, updated_at";
const notFound = () => new AppError(404, "NOT_FOUND", "Note not found");

async function list(userId, { page, limit }) {
  const offset = (page - 1) * limit;
  const [items, count] = await Promise.all([
    pool.query(
      `SELECT ${COLS} FROM notes WHERE user_id = $1
       ORDER BY updated_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query("SELECT count(*)::int AS total FROM notes WHERE user_id = $1", [userId]),
  ]);
  const total = count.rows[0].total;
  return {
    data: items.rows,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function create(userId, { title, content }) {
  const { rows } = await pool.query(
    `INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING ${COLS}`,
    [userId, title, content]
  );
  return rows[0];
}

async function update(userId, id, { title, content, version }) {
  const { rows } = await pool.query(
    `UPDATE notes
     SET title = $1, content = $2, version = version + 1, updated_at = now()
     WHERE id = $3 AND user_id = $4 AND version = $5
     RETURNING ${COLS}`,
    [title, content, id, userId, version]
  );
  if (rows.length) return rows[0];

  // zero rows: the note is missing (or not yours), or the version is stale
  const { rowCount } = await pool.query(
    "SELECT 1 FROM notes WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  if (!rowCount) throw notFound();
  throw new AppError(
    409,
    "VERSION_CONFLICT",
    "Note was modified elsewhere; reload and retry"
  );
}

async function remove(userId, id) {
  const { rowCount } = await pool.query(
    "DELETE FROM notes WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  if (!rowCount) throw notFound();
}

module.exports = { list, create, update, remove };