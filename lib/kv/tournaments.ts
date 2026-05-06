import type { MatchRow, Tournament } from "@/lib/types";
import { K } from "@/lib/kv/keys";
import { getJsonStore } from "@/lib/kv/store";

export async function listTournaments(): Promise<Tournament[]> {
  const store = getJsonStore();
  const ids = (await store.get<string[]>(K.tournamentsIndex)) ?? [];
  if (ids.length === 0) return [];
  const keys = ids.map((id) => K.tournament(id));
  const rows = await store.mget<Tournament>(keys);
  const out: Tournament[] = [];
  for (let i = 0; i < ids.length; i++) {
    const t = rows[i];
    if (t) out.push(t);
  }
  return out.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const store = getJsonStore();
  return store.get<Tournament>(K.tournament(id));
}

export async function saveTournament(t: Tournament): Promise<void> {
  const store = getJsonStore();
  const ids = (await store.get<string[]>(K.tournamentsIndex)) ?? [];
  const set = new Set(ids);
  set.add(t.id);
  const next = Array.from(set);
  await store.set(K.tournament(t.id), t);
  await store.set(K.tournamentsIndex, next);
}

export async function deleteTournament(id: string): Promise<void> {
  const store = getJsonStore();
  const ids = (await store.get<string[]>(K.tournamentsIndex)) ?? [];
  const next = ids.filter((x) => x !== id);
  await store.del(K.tournament(id));
  await store.del(K.tournamentMatches(id));
  await store.set(K.tournamentsIndex, next);
}

export async function getMatches(tournamentId: string): Promise<MatchRow[]> {
  const store = getJsonStore();
  return (await store.get<MatchRow[]>(K.tournamentMatches(tournamentId))) ?? [];
}

export async function saveMatches(tournamentId: string, matches: MatchRow[]): Promise<void> {
  const store = getJsonStore();
  await store.set(K.tournamentMatches(tournamentId), matches);
}
