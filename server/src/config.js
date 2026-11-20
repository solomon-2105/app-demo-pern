require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  quiet: true,
});
const { z } = require("zod");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  CLIENT_ORIGIN: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const i of parsed.error.issues) console.error(`  ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}

module.exports = Object.freeze(parsed.data);