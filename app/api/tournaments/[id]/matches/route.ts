import { NextResponse } from "next/server";
import { getMatches, getTournament, saveMatches } from "@/lib/kv/tournaments";
import type { MatchRow } from "@/lib/types";
import { syncPlayerAggregates } from "@/lib/career/sync";

function normalizeMatch(m: unknown, fallbackOrder: number): MatchRow | null {
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  const id = String(o.id ?? "");
  const team1 = o.team1 as [string, string] | undefined;
  const team2 = o.team2 as [string, string] | undefined;
  if (!id || !team1 || !team2 || team1.length !== 2 || team2.length !== 2) return null;
  const ord = Number(o.order);
  return {
    id,
    order: Number.isFinite(ord) ? ord : fallbackOrder,
    team1: [String(team1[0]), String(team1[1])],
    team2: [String(team2[0]), String(team2[1])],
    score1: String(o.score1 ?? ""),
    score2: String(o.score2 ?? ""),
    court: Math.max(1, Number(o.court) || 1),
    duration: Math.max(5, Number(o.duration) || 15),
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const t = await getTournament(id);
    if (!t) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const matches = await getMatches(id);
    return NextResponse.json(matches);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "KV no disponible" }, { status: 503 });
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const t = await getTournament(id);
    if (!t) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const body = await req.json();
    const raw = body.matches;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "matches[] requerido" }, { status: 400 });
    }
    const matches: MatchRow[] = [];
    raw.forEach((row, i) => {
      const n = normalizeMatch(row, i);
      if (n) matches.push({ ...n, order: i });
    });
    await saveMatches(id, matches);
    await syncPlayerAggregates();
    return NextResponse.json(matches);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al guardar" }, { status: 503 });
  }
}
