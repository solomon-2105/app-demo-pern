const { z } = require("zod");

const noteFields = {
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10000).default(""),
};

const noteCreate = z.object(noteFields).strict();

const noteUpdate = z
  .object({ ...noteFields, version: z.number().int().min(1).max(2147483647) })
  .strict();

// 2147483647 = max of Postgres int4
const idParam = z.object({ id: z.coerce.number().int().positive().max(2147483647) });

const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { noteCreate, noteUpdate, idParam, listQuery };