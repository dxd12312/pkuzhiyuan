declare const kv: {
  get(key: string, options?: { type?: string }): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    complete: boolean;
    cursor: string | null;
    keys: { key: string }[];
  }>;
};

export async function kvGet<T>(key: string): Promise<T | null> {
  const val = await kv.get(key, { type: "json" });
  return (val as T) ?? null;
}

export async function kvPut(key: string, data: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(data));
}

export async function kvDelete(key: string): Promise<void> {
  await kv.delete(key);
}

export async function kvList(prefix: string): Promise<string[]> {
  const allKeys: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await kv.list({ prefix, limit: 256, cursor });
    allKeys.push(...result.keys.map((k) => k.key));
    cursor = result.complete ? undefined : (result.cursor ?? undefined);
  } while (cursor);
  return allKeys;
}

export async function kvGetAll<T>(prefix: string): Promise<T[]> {
  const keys = await kvList(prefix);
  const results: T[] = [];
  for (const key of keys) {
    const val = await kvGet<T>(key);
    if (val) results.push(val);
  }
  return results;
}
