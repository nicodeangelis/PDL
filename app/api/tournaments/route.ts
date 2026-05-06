import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listTournaments, saveMatches, saveTournament } from "@/lib/kv/tournaments";
import type { Tournament } from "@/lib/types";

export async function GET() {
  try {
    const list = await listTournaments();
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "KV no disponible" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = body.name != null ? String(body.name).trim() : undefined;
    const dateISO = String(body.dateISO ?? "").trim();
    if (!dateISO) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }
    const courts = Math.max(1, Number(body.courts) || 2);
    const matchTimeMin = Math.max(5, Number(body.matchTimeMin) || 15);
    const restTimeMin = Math.max(0, Number(body.restTimeMin) || 5);
    const participantIds = Array.isArray(body.participantIds)
      ? body.participantIds.map((x: unknown) => String(x))
      : [];

    const t: Tournament = {
      id: randomUUID(),
      name: name || undefined,
      dateISO,
      courts,
      matchTimeMin,
      restTimeMin,
      participantIds,
      createdAt: new Date().toISOString(),
      locked: false,
    };
    await saveTournament(t);
    await saveMatches(t.id, []);
    return NextResponse.json(t, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear torneo" }, { status: 503 });
  }
}
