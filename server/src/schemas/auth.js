const { z } = require("zod");

const email = z.string().trim().toLowerCase().email().max(254);

const newPassword = z
  .string()
  .min(8)
  .max(128)
  .refine((p) => Buffer.byteLength(p, "utf8") <= 72, "Password must be at most 72 bytes");

// .strict() rejects unknown fields instead of silently ignoring them
const register = z.object({ email, password: newPassword }).strict();
const login = z.object({ email, password: z.string().min(1).max(128) }).strict();

module.exports = { register, login };