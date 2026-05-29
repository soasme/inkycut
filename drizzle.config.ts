import { loadEnvConfig } from "@next/env"
import type { Config } from "drizzle-kit"

loadEnvConfig(process.cwd())

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config
