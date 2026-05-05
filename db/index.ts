import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export { schema };

let _db: NeonHttpDatabase<typeof schema> | null = null;

function init(): NeonHttpDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (or your Vercel env) to use the database.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

/**
 * Lazily-initialized Drizzle client. Importing this file does NOT touch the
 * database connection — that happens on first method call. Safe at build time
 * even when DATABASE_URL is unset.
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_t, prop) {
    if (!_db) _db = init();
    const target = _db as unknown as Record<string | symbol, unknown>;
    const v = target[prop];
    return typeof v === "function" ? (v as (...args: unknown[]) => unknown).bind(_db) : v;
  },
});
