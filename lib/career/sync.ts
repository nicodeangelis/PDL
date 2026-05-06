import { listPlayers } from "@/lib/kv/players";
import { recomputeAllPlayerAggregates } from "@/lib/career/recompute-aggregates";
import { getJsonStore } from "@/lib/kv/store";

export async function syncPlayerAggregates(): Promise<void> {
  const players = await listPlayers();
  await recomputeAllPlayerAggregates(getJsonStore(), players);
}
