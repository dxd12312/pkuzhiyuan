import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const sql = getSql();
  const rows = await sql`SELECT data FROM kv WHERE key = ${key}`;
  if (rows.length === 0) return null;
  return rows[0].data as T;
}

export async function kvPut(key: string, data: unknown): Promise<void> {
  const sql = getSql();
  await sql`INSERT INTO kv (key, data, updated_at) VALUES (${key}, ${JSON.stringify(data)}::jsonb, now()) ON CONFLICT (key) DO UPDATE SET data = ${JSON.stringify(data)}::jsonb, updated_at = now()`;
}

export async function kvDelete(key: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM kv WHERE key = ${key}`;
}

export async function kvList(prefix: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`SELECT key FROM kv WHERE key LIKE ${prefix + "%"} ORDER BY key`;
  return rows.map((r) => r.key as string);
}

export async function kvGetAll<T>(prefix: string): Promise<T[]> {
  const sql = getSql();
  const rows = await sql`SELECT data FROM kv WHERE key LIKE ${prefix + "%"} ORDER BY key`;
  return rows.map((r) => r.data as T);
}
