import { NextResponse } from "next/server";
import { generateAmericanFixture } from "@/lib/fixture/generate-american";
import { getPlayer } from "@/lib/kv/players";
import { getTournament, saveMatches } from "@/lib/kv/tournaments";
import type { Player } from "@/lib/types";
import { syncPlayerAggregates } from "@/lib/career/sync";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const t = await getTournament(id);
    if (!t) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const players: Player[] = [];
    for (const pid of t.participantIds) {
      const p = await getPlayer(pid);
      if (p) players.push(p);
    }

    const gen = generateAmericanFixture({
      players,
      courts: t.courts,
      matchTimeMin: t.matchTimeMin,
    });

    if (!gen.ok) {
      return NextResponse.json({ error: gen.error }, { status: 400 });
    }

    await saveMatches(id, gen.matches);
    await syncPlayerAggregates();
    return NextResponse.json(gen.matches);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al generar" }, { status: 503 });
  }
}
