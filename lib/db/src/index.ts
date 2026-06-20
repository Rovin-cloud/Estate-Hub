import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_DB_URL;
const isValidSupabaseUrl = supabaseUrl?.startsWith("postgresql://") || supabaseUrl?.startsWith("postgres://");
const connectionString = (isValidSupabaseUrl ? supabaseUrl : undefined) || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sslConfig = isValidSupabaseUrl ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ connectionString, ssl: sslConfig });
export const db = drizzle(pool, { schema });

export * from "./schema";
