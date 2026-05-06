import { kv } from "@vercel/kv";

export type JsonStore = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  /** Varias escrituras en una sola ida (pipeline / multi). */
  setMany(entries: { key: string; value: unknown }[]): Promise<void>;
};

function parseJson<T>(raw: string | null | undefined): T | null {
  if (raw == null || raw === "") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function kvRestStore(): JsonStore {
  return {
    async get<T>(key: string): Promise<T | null> {
      return kv.get<T>(key);
    },
    async set(key: string, value: unknown): Promise<void> {
      await kv.set(key, value as never);
    },
    async del(key: string): Promise<void> {
      await kv.del(key);
    },
    async mget<T>(keys: string[]): Promise<(T | null)[]> {
      if (keys.length === 0) return [];
      const rows = await kv.mget<(T | null)[]>(...keys);
      return rows as (T | null)[];
    },
    async setMany(entries: { key: string; value: unknown }[]): Promise<void> {
      if (entries.length === 0) return;
      const p = kv.pipeline();
      for (const { key, value } of entries) {
        p.set(key, value as never);
      }
      await p.exec();
    },
  };
}

type GlobalRedis = typeof globalThis & { __torneoPdlRedis?: unknown };

async function getRedisTcp() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL no definido");

  const g = globalThis as GlobalRedis;
  if (!g.__torneoPdlRedis) {
    const { createClient } = await import("redis");
    const client = createClient({ url });
    client.on("error", (err: Error) => console.error("[redis]", err.message));
    await client.connect();
    g.__torneoPdlRedis = client;
  }
  return g.__torneoPdlRedis as {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<string | null>;
    del(key: string): Promise<number>;
    mGet(keys: string[]): Promise<(string | null)[]>;
    multi(): {
      set(k: string, v: string): unknown;
      exec(): Promise<unknown>;
    };
  };
}

function redisTcpStore(): JsonStore {
  return {
    async get<T>(key: string): Promise<T | null> {
      const r = await getRedisTcp();
      const raw = await r.get(key);
      return parseJson<T>(raw);
    },
    async set(key: string, value: unknown): Promise<void> {
      const r = await getRedisTcp();
      await r.set(key, JSON.stringify(value));
    },
    async del(key: string): Promise<void> {
      const r = await getRedisTcp();
      await r.del(key);
    },
    async mget<T>(keys: string[]): Promise<(T | null)[]> {
      if (keys.length === 0) return [];
      const r = await getRedisTcp();
      const vals = await r.mGet(keys);
      return vals.map((raw) => parseJson<T>(raw));
    },
    async setMany(entries: { key: string; value: unknown }[]): Promise<void> {
      if (entries.length === 0) return;
      const r = await getRedisTcp();
      const multi = r.multi();
      for (const { key, value } of entries) {
        multi.set(key, JSON.stringify(value));
      }
      await multi.exec();
    },
  };
}

let cachedMode: "rest" | "tcp" | null = null;
let cachedStore: JsonStore | null = null;

/**
 * Prioridad: REDIS_URL (TCP, ej. Redis Cloud) > KV_REST_* (REST / Upstash).
 */
export function getJsonStore(): JsonStore {
  const hasTcp = Boolean(process.env.REDIS_URL?.trim());
  const hasRest =
    Boolean(process.env.KV_REST_API_URL?.trim()) && Boolean(process.env.KV_REST_API_TOKEN?.trim());

  const mode = hasTcp ? "tcp" : hasRest ? "rest" : null;

  if (mode === null) {
    throw new Error(
      "Definí REDIS_URL (redis://…) o KV_REST_API_URL + KV_REST_API_TOKEN en las variables de entorno.",
    );
  }

  if (cachedMode === mode && cachedStore) return cachedStore;

  cachedMode = mode;
  cachedStore = mode === "tcp" ? redisTcpStore() : kvRestStore();
  return cachedStore;
}
