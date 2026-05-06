import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listPlayers, savePlayer } from "@/lib/kv/players";
import type { Player } from "@/lib/types";
export async function GET() {
  try {
    const players = await listPlayers();
    return NextResponse.json(players);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "No se pudo leer jugadores. ¿Configuraste KV_REST_API_URL y KV_REST_API_TOKEN?" },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName ?? "").trim();
    const level = Number(body.level);
    if (!fullName) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (!Number.isFinite(level) || level < 1 || level > 7) {
      return NextResponse.json({ error: "Nivel entre 1 y 7" }, { status: 400 });
    }
    const player: Player = {
      id: randomUUID(),
      fullName,
      level: Math.round(level),
      createdAt: new Date().toISOString(),
    };
    await savePlayer(player);
    return NextResponse.json(player, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear jugador" }, { status: 503 });
  }
}
