import { NextResponse } from "next/server";
import { deleteTournament, getTournament, saveTournament } from "@/lib/kv/tournaments";
import type { Tournament } from "@/lib/types";
import { syncPlayerAggregates } from "@/lib/career/sync";
import { verifyTournamentLockPassword } from "@/lib/server/tournamentLock";

function hasLockPermission(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return verifyTournamentLockPassword((body as { lockPassword?: string }).lockPassword);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const t = await getTournament(id);
    if (!t) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(t);
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
    const existing = await getTournament(id);
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const body = await req.json();
    const canBypassLock = hasLockPermission(body);

    if (existing.locked && !canBypassLock && body.locked === undefined) {
      return NextResponse.json({ error: "Torneo bloqueado" }, { status: 423 });
    }
    if (body.locked !== undefined && !canBypassLock) {
      return NextResponse.json({ error: "Password inválido" }, { status: 401 });
    }

    const next: Tournament = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() || undefined : existing.name,
      dateISO: body.dateISO !== undefined ? String(body.dateISO).trim() : existing.dateISO,
      courts:
        body.courts !== undefined ? Math.max(1, Number(body.courts) || existing.courts) : existing.courts,
      matchTimeMin:
        body.matchTimeMin !== undefined
          ? Math.max(5, Number(body.matchTimeMin) || existing.matchTimeMin)
          : existing.matchTimeMin,
      restTimeMin:
        body.restTimeMin !== undefined
          ? Math.max(0, Number(body.restTimeMin) || existing.restTimeMin)
          : existing.restTimeMin,
      participantIds: Array.isArray(body.participantIds)
        ? body.participantIds.map((x: unknown) => String(x))
        : existing.participantIds,
      locked: body.locked !== undefined ? Boolean(body.locked) : Boolean(existing.locked),
    };

    if (!next.dateISO) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }

    await saveTournament(next);
    return NextResponse.json(next);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 503 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const existing = await getTournament(id);
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const url = new URL(req.url);
    const lockPassword = url.searchParams.get("lockPassword");
    if (existing.locked && !verifyTournamentLockPassword(lockPassword)) {
      return NextResponse.json({ error: "Torneo bloqueado" }, { status: 423 });
    }
    await deleteTournament(id);
    await syncPlayerAggregates();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 503 });
  }
}
