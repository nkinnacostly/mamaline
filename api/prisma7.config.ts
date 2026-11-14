import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrations, studio) uses the DIRECT connection.
// On Neon that is the URL without "-pooler" in the host: migrations need a session,
// which the pooled (PgBouncer) connection does not give. The app itself connects
// through DATABASE_URL (pooled) in src/prisma/prisma.service.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
