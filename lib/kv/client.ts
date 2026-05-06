import { kv } from "@vercel/kv";

export function getKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error(
      "Missing KV_REST_API_URL or KV_REST_API_TOKEN. Add Vercel KV to the project.",
    );
  }
  return kv;
}

/** For build time when env is missing — returns null and callers skip KV. */
export function tryGetKv() {
  try {
    return getKv();
  } catch {
    return null;
  }
}
