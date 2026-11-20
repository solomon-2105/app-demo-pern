const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const pinoHttp = require("pino-http");
const config = require("./config");
const logger = require("./logger");
const pool = require("./db");
const asyncHandler = require("./asyncHandler");
const { AppError } = require("./errors");
const { apiLimiter } = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));
app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN }));
app.use(express.json({ limit: "100kb" }));

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  })
);

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/api", apiLimiter);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/notes", require("./routes/notes"));

app.use((req, res, next) => next(new AppError(404, "NOT_FOUND", "Route not found")));
app.use(errorHandler);

module.exports = app;