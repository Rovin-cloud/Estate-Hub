---
name: Supabase DB env var guard
description: SUPABASE_DB_URL must be validated before use — a stale Replit secret with same name can contain a JWT, causing getaddrinfo ENOTFOUND base
---

## Rule
In `lib/db/src/index.ts`, always validate `SUPABASE_DB_URL` starts with `postgresql://` or `postgres://` before using it. Fall back to `DATABASE_URL` if the value is not a valid connection string.

**Why:** During setup attempts, the user accidentally set SUPABASE_DB_URL as a Replit Secret containing a Supabase JWT anon key (starts with `eyJ...`). pg tried to parse the JWT as a connection string, resulting in `getaddrinfo ENOTFOUND base`. The secret persists in the Replit Secrets manager and cannot be deleted via code_execution.

**How to apply:** Already implemented in `lib/db/src/index.ts`:
```ts
const isValidSupabaseUrl = supabaseUrl?.startsWith("postgresql://") || supabaseUrl?.startsWith("postgres://");
const connectionString = (isValidSupabaseUrl ? supabaseUrl : undefined) || process.env.DATABASE_URL;
```
