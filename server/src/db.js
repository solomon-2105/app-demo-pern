const { Pool } = require("pg");
const config = require("./config");
const logger = require("./logger");

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
// without this listener an error on an idle connection crashes the process
pool.on("error", (err) => logger.error({ err }, "idle pg client error"));

module.exports = pool;