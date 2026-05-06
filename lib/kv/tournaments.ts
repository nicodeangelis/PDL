import { kv } from "@vercel/kv";
import type { MatchRow, Tournament } from "@/lib/types";
import { K } from "@/lib/kv/keys";

export async function listTournaments(): Promise<Tournament[]> {
  const ids = (await kv.get<string[]>(K.tournamentsIndex)) ?? [];
  if (ids.length === 0) return [];
  const keys = ids.map((id) => K.tournament(id));
  const rows = await kv.mget<(Tournament | null)[]>(...keys);
  const out: Tournament[] = [];
  for (let i = 0; i < ids.length; i++) {
    const t = rows[i];
    if (t) out.push(t);
  }
  return out.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
}

export async function getTournament(id: string): Promise<Tournament | null> {
  return kv.get<Tournament>(K.tournament(id));
}

export async function saveTournament(t: Tournament): Promise<void> {
  const ids = (await kv.get<string[]>(K.tournamentsIndex)) ?? [];
  const set = new Set(ids);
  set.add(t.id);
  const next = Array.from(set);
  await kv.set(K.tournament(t.id), t);
  await kv.set(K.tournamentsIndex, next);
}

export async function deleteTournament(id: string): Promise<void> {
  const ids = (await kv.get<string[]>(K.tournamentsIndex)) ?? [];
  const next = ids.filter((x) => x !== id);
  await kv.del(K.tournament(id));
  await kv.del(K.tournamentMatches(id));
  await kv.set(K.tournamentsIndex, next);
}

export async function getMatches(tournamentId: string): Promise<MatchRow[]> {
  return (await kv.get<MatchRow[]>(K.tournamentMatches(tournamentId))) ?? [];
}

export async function saveMatches(tournamentId: string, matches: MatchRow[]): Promise<void> {
  await kv.set(K.tournamentMatches(tournamentId), matches);
}
