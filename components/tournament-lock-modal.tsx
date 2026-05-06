"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onClose: () => void;
  /** Devolvé true si salió bien para cerrar el modal. */
  onSubmit: (password: string) => Promise<boolean>;
};

export function TournamentLockModal({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onSubmit,
}: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    try {
      const ok = await onSubmit(password);
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/50 sm:items-center sm:justify-center">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm rounded-t-2xl border border-stone-200 bg-white p-4 shadow-lg sm:rounded-2xl"
      >
        <h3 className="text-sm font-medium text-stone-900">{title}</h3>
        {description ? <p className="mt-1 text-xs text-stone-500">{description}</p> : null}
        <label className="mt-3 block text-xs text-stone-600">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !password.trim()}
            className="flex-1 rounded-lg bg-stone-900 py-2 text-sm font-medium text-white disabled:bg-stone-400"
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
