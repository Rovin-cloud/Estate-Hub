---
name: Postgres migration quirks
description: Known constraints and workarounds for DB migrations in this project
---

## ADD CONSTRAINT IF NOT EXISTS not supported
This Postgres version does NOT support `ALTER TABLE t ADD CONSTRAINT IF NOT EXISTS ...`
Workaround: Run constraint additions without IF NOT EXISTS, or clean orphan data first then add the constraint unconditionally.

## drizzle-kit push hangs
`pnpm --filter @workspace/db run push` hangs indefinitely in this Replit environment.
**Always** use the `executeSql()` callback in the code_execution tool to run schema migrations.
Run statements one at a time (loop over array) for reliable error reporting.

## SUPABASE_DB_URL conflict
The SUPABASE_DB_URL secret contains a JWT value (not a PostgreSQL URL). lib/db/src/index.ts guards against this by checking `startsWith("postgresql://")`. Never use SUPABASE_DB_URL as the DB connection string — use DATABASE_URL.

## Safe migration pattern
```js
const migrations = ["CREATE TABLE ...", "ALTER TABLE ..."];
for (const sql of migrations) {
  const r = await executeSql(sql);
  if (!r.success) console.log('FAIL:', sql.slice(0,60), r.output);
}
```
