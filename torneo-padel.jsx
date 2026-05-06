import React, { useState, useMemo } from "react";
import { Plus, Trash2, Trophy, Users, Clock, MapPin, ChevronRight, ChevronLeft, Save } from "lucide-react";

export default function TorneoPadel() {
  const [step, setStep] = useState("setup"); // setup | matches | standings
  const [players, setPlayers] = useState([
    { id: 1, name: "Santi", level: 5 },
    { id: 2, name: "Cristian", level: 5 },
    { id: 3, name: "Pablo", level: 3 },
    { id: 4, name: "Nico", level: 3 },
    { id: 5, name: "Guille", level: 3 },
    { id: 6, name: "Fede", level: 3 },
    { id: 7, name: "Pali", level: 3 },
    { id: 8, name: "Mati", level: 3 },
  ]);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState(3);
  const [courts, setCourts] = useState(2);
  const [matchTime, setMatchTime] = useState(15);
  const [restTime, setRestTime] = useState(5);
  const [matches, setMatches] = useState([]);

  const addPlayer = () => {
    if (!newName.trim()) return;
    setPlayers([...players, { id: Date.now(), name: newName.trim(), level: Number(newLevel) }]);
    setNewName("");
    setNewLevel(3);
  };

  const removePlayer = (id) => setPlayers(players.filter((p) => p.id !== id));

  // Genera el rooster de partidos: parejas balanceadas por nivel, formato americano
  const generateMatches = () => {
    if (players.length < 4) {
      alert("Necesitás al menos 4 jugadores");
      return;
    }
    if (players.length % 4 !== 0) {
      alert("Necesitás un múltiplo de 4 jugadores (4, 8, 12, 16...)");
      return;
    }

    // Ordeno por nivel para armar parejas balanceadas: el mejor con el peor
    const sorted = [...players].sort((a, b) => b.level - a.level);
    const half = sorted.length / 2;
    const top = sorted.slice(0, half);
    const bottom = sorted.slice(half).reverse();

    // Genero rondas tipo round-robin de parejas
    const pairs = top.map((t, i) => ({ id: `p${i}`, players: [t, bottom[i]], level: t.level + bottom[i].level }));

    // Round robin: cada pareja juega contra cada otra pareja
    const generated = [];
    let matchId = 1;
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        generated.push({
          id: matchId++,
          team1: pairs[i],
          team2: pairs[j],
          score1: "",
          score2: "",
          court: ((generated.length) % courts) + 1,
        });
      }
    }

    // Tiempo por partido lo define el usuario
    setMatches(generated.map((m) => ({ ...m, duration: matchTime })));
    setStep("matches");
  };

  const updateScore = (matchId, field, value) => {
    setMatches(matches.map((m) => (m.id === matchId ? { ...m, [field]: value } : m)));
  };

  // Calcula standings
  const standings = useMemo(() => {
    const stats = {};
    players.forEach((p) => {
      stats[p.id] = { ...p, played: 0, won: 0, lost: 0, gamesFor: 0, gamesAgainst: 0, points: 0 };
    });

    matches.forEach((m) => {
      const s1 = parseInt(m.score1);
      const s2 = parseInt(m.score2);
      if (isNaN(s1) || isNaN(s2)) return;

      m.team1.players.forEach((p) => {
        stats[p.id].played++;
        stats[p.id].gamesFor += s1;
        stats[p.id].gamesAgainst += s2;
        if (s1 > s2) {
          stats[p.id].won++;
          stats[p.id].points += 3;
        } else if (s1 < s2) {
          stats[p.id].lost++;
        } else {
          stats[p.id].points += 1;
        }
      });

      m.team2.players.forEach((p) => {
        stats[p.id].played++;
        stats[p.id].gamesFor += s2;
        stats[p.id].gamesAgainst += s1;
        if (s2 > s1) {
          stats[p.id].won++;
          stats[p.id].points += 3;
        } else if (s2 < s1) {
          stats[p.id].lost++;
        } else {
          stats[p.id].points += 1;
        }
      });
    });

    return Object.values(stats).sort((a, b) => {
      if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
      const diffA = a.gamesFor - a.gamesAgainst;
      const diffB = b.gamesFor - b.gamesAgainst;
      if (diffB !== diffA) return diffB - diffA;
      if (b.points !== a.points) return b.points - a.points;
      return String(a.name).localeCompare(String(b.name), "es");
    });
  }, [matches, players]);

  const completedMatches = matches.filter((m) => m.score1 !== "" && m.score2 !== "").length;

  // ===== SETUP =====
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <header className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3 z-10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            <h1 className="text-base font-medium">Torneo de pádel</h1>
          </div>
        </header>

        <main className="px-4 py-4 space-y-5 pb-24">
          {/* Config torneo */}
          <section className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-stone-500" />
              Config
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-xs text-stone-500 block mb-1">Canchas</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={courts}
                  onChange={(e) => setCourts(e.target.value)}
                  onBlur={(e) => setCourts(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-2 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-500 block mb-1">Min/partido</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  onBlur={(e) => setMatchTime(Math.max(5, Number(e.target.value) || 15))}
                  className="w-full px-2 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-500 block mb-1">Descanso</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={restTime}
                  onChange={(e) => setRestTime(e.target.value)}
                  onBlur={(e) => setRestTime(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
                />
              </label>
            </div>
          </section>

          {/* Jugadores */}
          <section className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="text-sm font-medium mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-500" />
                Jugadores
              </span>
              <span className="text-xs text-stone-500">{players.length}</span>
            </h2>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nombre"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900"
              />
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(Number(e.target.value))}
                className="px-2 py-2 text-sm border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-stone-900"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    Nv {n}
                  </option>
                ))}
              </select>
              <button
                onClick={addPlayer}
                className="px-3 py-2 bg-stone-900 text-white rounded-lg active:bg-stone-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {players.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-3">Agregá jugadores (múltiplos de 4)</p>
            ) : (
              <ul className="space-y-1.5">
                {players.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg"
                  >
                    <span className="w-5 text-xs text-stone-400">{i + 1}</span>
                    <span className="flex-1 text-sm">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-stone-200 rounded font-medium">Nv {p.level}</span>
                    <button onClick={() => removePlayer(p.id)} className="text-stone-400 active:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {players.length >= 4 && players.length % 4 === 0 && (() => {
            const numPairs = players.length / 2;
            const numMatches = (numPairs * (numPairs - 1)) / 2;
            const rounds = Math.ceil(numMatches / courts);
            const totalMin = rounds * matchTime + (rounds - 1) * restTime;
            const hours = Math.floor(totalMin / 60);
            const mins = totalMin % 60;
            return (
              <section className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <p className="font-medium mb-1">Resumen</p>
                <p>
                  {numMatches} partidos en {rounds} rondas → {hours > 0 ? `${hours}h ` : ""}{mins}min total
                </p>
              </section>
            );
          })()}
        </main>

        {/* CTA fixed */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3">
          <button
            onClick={generateMatches}
            disabled={players.length < 4 || players.length % 4 !== 0}
            className="w-full py-3 bg-stone-900 text-white rounded-lg font-medium text-sm disabled:bg-stone-300 active:bg-stone-700 flex items-center justify-center gap-2"
          >
            Generar fixture
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ===== MATCHES =====
  if (step === "matches") {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <header className="sticky top-0 bg-white border-b border-stone-200 px-3 py-2 z-10">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep("setup")} className="text-stone-500 active:text-stone-900 -ml-1 p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">Fixture</span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-500">{completedMatches}/{matches.length}</span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-500">{matches[0]?.duration}min</span>
            </div>
            <button onClick={() => setStep("standings")} className="text-amber-600 active:text-amber-800 -mr-1 p-1">
              <Trophy className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-1.5 h-0.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${matches.length ? (completedMatches / matches.length) * 100 : 0}%` }}
            />
          </div>
        </header>

        <main className="px-2 py-2 space-y-1.5 pb-20">
          {matches.map((m, idx) => {
            const filled = m.score1 !== "" && m.score2 !== "";
            const w1 = filled && parseInt(m.score1) > parseInt(m.score2);
            const w2 = filled && parseInt(m.score2) > parseInt(m.score1);
            return (
              <article
                key={m.id}
                className={`bg-white rounded-lg border px-2 py-2 ${filled ? "border-stone-300" : "border-stone-200"}`}
              >
                <div className="flex items-center justify-between mb-1.5 text-[10px] text-stone-500">
                  <span className="font-medium">P{idx + 1} · C{m.court}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`flex-1 min-w-0 text-xs leading-tight px-2 py-1.5 rounded ${w1 ? "bg-green-50 text-green-900" : "bg-stone-50"}`}>
                    <p className="truncate font-medium">{m.team1.players[0].name}</p>
                    <p className="truncate font-medium">{m.team1.players[1].name}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={m.score1}
                    onChange={(e) => updateScore(m.id, "score1", e.target.value)}
                    className="w-9 h-10 shrink-0 text-center text-base font-medium border border-stone-300 rounded focus:outline-none focus:border-stone-900 bg-white"
                  />
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={m.score2}
                    onChange={(e) => updateScore(m.id, "score2", e.target.value)}
                    className="w-9 h-10 shrink-0 text-center text-base font-medium border border-stone-300 rounded focus:outline-none focus:border-stone-900 bg-white"
                  />
                  <div className={`flex-1 min-w-0 text-xs leading-tight px-2 py-1.5 rounded text-right ${w2 ? "bg-green-50 text-green-900" : "bg-stone-50"}`}>
                    <p className="truncate font-medium">{m.team2.players[0].name}</p>
                    <p className="truncate font-medium">{m.team2.players[1].name}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-3 py-2">
          <button
            onClick={() => setStep("standings")}
            className="w-full py-2.5 bg-stone-900 text-white rounded-lg font-medium text-sm active:bg-stone-700 flex items-center justify-center gap-2"
          >
            Ver tabla
            <Trophy className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ===== STANDINGS =====
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => setStep("matches")} className="text-stone-500 active:text-stone-900">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-medium">Tabla final</h1>
          <div className="w-5" />
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {completedMatches}/{matches.length} partidos jugados · orden por juegos ganados
        </p>
      </header>

      <main className="px-4 py-4 pb-8">
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-1 px-3 py-2 text-xs text-stone-500 bg-stone-50 border-b border-stone-200 font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Jugador</div>
            <div className="col-span-2 text-center">PJ</div>
            <div className="col-span-2 text-center">Dif</div>
            <div className="col-span-2 text-right">JG</div>
          </div>
          {standings.map((p, i) => (
            <div
              key={p.id}
              className={`grid grid-cols-12 gap-1 px-3 py-2.5 text-sm border-b border-stone-100 last:border-0 ${
                i === 0 ? "bg-amber-50" : ""
              }`}
            >
              <div className={`col-span-1 font-medium ${i === 0 ? "text-amber-700" : i < 3 ? "text-stone-700" : "text-stone-400"}`}>
                {i + 1}
              </div>
              <div className="col-span-5 truncate">
                {p.name}
                <span className="ml-1 text-xs text-stone-400">Nv{p.level}</span>
              </div>
              <div className="col-span-2 text-center text-stone-600">{p.played}</div>
              <div className={`col-span-2 text-center ${p.gamesFor - p.gamesAgainst > 0 ? "text-green-700" : p.gamesFor - p.gamesAgainst < 0 ? "text-red-700" : "text-stone-500"}`}>
                {p.gamesFor - p.gamesAgainst > 0 ? "+" : ""}
                {p.gamesFor - p.gamesAgainst}
              </div>
              <div className="col-span-2 text-right font-medium">{p.gamesFor}</div>
            </div>
          ))}
        </div>

        {standings.length > 0 && completedMatches === matches.length && matches.length > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <Trophy className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-xs text-amber-900 mb-1">Ganador</p>
            <p className="text-lg font-medium text-amber-900">{standings[0]?.name}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function TeamRow({ team, score, onChange, winner }) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${winner ? "bg-green-50" : "bg-stone-50"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{team.players[0].name}</p>
        <p className="text-sm font-medium truncate">{team.players[1].name}</p>
      </div>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={score}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-12 text-center text-lg font-medium border border-stone-300 rounded-lg focus:outline-none focus:border-stone-900 bg-white"
      />
    </div>
  );
}
