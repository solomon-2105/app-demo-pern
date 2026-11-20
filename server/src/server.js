const app = require("./app");
const config = require("./config");
const logger = require("./logger");
const pool = require("./db");

const server = app.listen(config.PORT, () =>
  logger.info(`API listening on http://localhost:${config.PORT}`)
);

function shutdown(signal) {
  logger.info({ signal }, "shutting down");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref(); // force exit if connections hang
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "unhandledRejection");
  process.exit(1);
});