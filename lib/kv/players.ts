import type { CareerStats, HistoryEntry, Player } from "@/lib/types";
import { K } from "@/lib/kv/keys";
import { getJsonStore } from "@/lib/kv/store";

export async function listPlayers(): Promise<Player[]> {
  const store = getJsonStore();
  const ids = (await store.get<string[]>(K.playersIndex)) ?? [];
  if (ids.length === 0) return [];
  const keys = ids.map((id) => K.player(id));
  const rows = await store.mget<Player>(keys);
  const out: Player[] = [];
  for (let i = 0; i < ids.length; i++) {
    const p = rows[i];
    if (p) out.push(p);
  }
  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPlayer(id: string): Promise<Player | null> {
  const store = getJsonStore();
  return store.get<Player>(K.player(id));
}

export async function savePlayer(player: Player): Promise<void> {
  const store = getJsonStore();
  const ids = (await store.get<string[]>(K.playersIndex)) ?? [];
  const set = new Set(ids);
  set.add(player.id);
  const next = Array.from(set);
  await store.set(K.player(player.id), player);
  await store.set(K.playersIndex, next);
}

export async function deletePlayer(id: string): Promise<void> {
  const store = getJsonStore();
  const ids = (await store.get<string[]>(K.playersIndex)) ?? [];
  const next = ids.filter((x) => x !== id);
  await store.del(K.player(id));
  await store.del(K.playerCareer(id));
  await store.del(K.playerHistory(id));
  await store.set(K.playersIndex, next);
}

export async function getPlayerCareer(id: string): Promise<CareerStats | null> {
  const store = getJsonStore();
  return store.get<CareerStats>(K.playerCareer(id));
}

export async function getPlayerHistory(id: string): Promise<HistoryEntry[]> {
  const store = getJsonStore();
  return (await store.get<HistoryEntry[]>(K.playerHistory(id))) ?? [];
}
