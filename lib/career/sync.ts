import { kv } from "@vercel/kv";
import { listPlayers } from "@/lib/kv/players";
import { recomputeAllPlayerAggregates } from "@/lib/career/recompute-aggregates";

export async function syncPlayerAggregates(): Promise<void> {
  const players = await listPlayers();
  await recomputeAllPlayerAggregates(kv, players);
}
