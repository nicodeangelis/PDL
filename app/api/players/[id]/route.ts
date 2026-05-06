import { NextResponse } from "next/server";
import { deletePlayer, getPlayer, getPlayerCareer, getPlayerHistory, savePlayer } from "@/lib/kv/players";
import type { Player } from "@/lib/types";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const player = await getPlayer(id);
    if (!player) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const career = await getPlayerCareer(id);
    const history = await getPlayerHistory(id);
    return NextResponse.json({ player, career, history });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "KV no disponible" }, { status: 503 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const existing = await getPlayer(id);
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const body = await req.json();
    const fullName =
      body.fullName !== undefined ? String(body.fullName).trim() : existing.fullName;
    const level = body.level !== undefined ? Number(body.level) : existing.level;
    if (!fullName) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (!Number.isFinite(level) || level < 1 || level > 7) {
      return NextResponse.json({ error: "Nivel entre 1 y 7" }, { status: 400 });
    }
    const updated: Player = {
      ...existing,
      fullName,
      level: Math.round(level),
    };
    await savePlayer(updated);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 503 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const existing = await getPlayer(id);
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await deletePlayer(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 503 });
  }
}
