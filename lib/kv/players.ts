import { kv } from "@vercel/kv";
import type { CareerStats, HistoryEntry, Player } from "@/lib/types";
import { K } from "@/lib/kv/keys";

export async function listPlayers(): Promise<Player[]> {
  const ids = (await kv.get<string[]>(K.playersIndex)) ?? [];
  if (ids.length === 0) return [];
  const keys = ids.map((id) => K.player(id));
  const rows = await kv.mget<(Player | null)[]>(...keys);
  const out: Player[] = [];
  for (let i = 0; i < ids.length; i++) {
    const p = rows[i];
    if (p) out.push(p);
  }
  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPlayer(id: string): Promise<Player | null> {
  return kv.get<Player>(K.player(id));
}

export async function savePlayer(player: Player): Promise<void> {
  const ids = (await kv.get<string[]>(K.playersIndex)) ?? [];
  const set = new Set(ids);
  set.add(player.id);
  const next = Array.from(set);
  await kv.set(K.player(player.id), player);
  await kv.set(K.playersIndex, next);
}

export async function deletePlayer(id: string): Promise<void> {
  const ids = (await kv.get<string[]>(K.playersIndex)) ?? [];
  const next = ids.filter((x) => x !== id);
  await kv.del(K.player(id));
  await kv.del(K.playerCareer(id));
  await kv.del(K.playerHistory(id));
  await kv.set(K.playersIndex, next);
}

export async function getPlayerCareer(id: string): Promise<CareerStats | null> {
  return kv.get<CareerStats>(K.playerCareer(id));
}

export async function getPlayerHistory(id: string): Promise<HistoryEntry[]> {
  return (await kv.get<HistoryEntry[]>(K.playerHistory(id))) ?? [];
}
