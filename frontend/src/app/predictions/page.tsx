"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  X,
  BarChart3,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  TrendingUp,
  Target,
  Flame,
  Star,
} from "lucide-react";

// ==================== TYPES ====================
interface PlayerRating {
  player_id: number;
  nickname: string;
  avgRating: number;
}

interface TeamRoster {
  team_id: number;
  name: string;
  players: PlayerRating[];
}

interface KeyFactor {
  name: string;
  team1Value: number | null;
  team2Value: number | null;
  advantage: "team1" | "team2" | "none";
  weight: number;
}

interface Prediction {
  team1Probability: number;
  team2Probability: number;
  team1Odds: number;
  team2Odds: number;
}

// ==================== TEAM SEARCH INPUT ====================
function TeamSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: { team_id: number; name: string } | null;
  onChange: (team: { team_id: number; name: string } | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ team_id: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  const searchTeams = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:3000/analytics/teams/search?q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error("Search error", e);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchTeams(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, searchTeams]);

  const handleSelect = (team: { team_id: number; name: string }) => {
    onChange(team);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative w-64">
      {value ? (
        <div className="flex items-center justify-between bg-[#121216] border border-emerald-500/50 rounded-lg px-4 py-2">
          <span className="text-white text-sm">{value.name}</span>
          <button onClick={handleClear} className="text-[#71717a] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full bg-[#121216] border border-white/5 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-[#18181b] border border-white/5 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {results.map((team) => (
                <div
                  key={team.team_id}
                  onMouseDown={() => handleSelect(team)}
                  className="px-4 py-2 text-sm text-white hover:bg-emerald-500/20 cursor-pointer"
                >
                  {team.name}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function PredictionsPage() {
  const [team1, setTeam1] = useState<{ team_id: number; name: string } | null>(null);
  const [team2, setTeam2] = useState<{ team_id: number; name: string } | null>(null);
  const [roster1, setRoster1] = useState<TeamRoster | null>(null);
  const [roster2, setRoster2] = useState<TeamRoster | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [keyFactors, setKeyFactors] = useState<KeyFactor[]>([]);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchFormat, setMatchFormat] = useState<string>('bo3'); // формат по умолчанию

  // Безопасная загрузка состава
  const fetchRoster = useCallback(async (teamId: number): Promise<TeamRoster | null> => {
    try {
      const res = await fetch(`http://localhost:3000/analytics/team-roster?teamId=${teamId}`);
      if (!res.ok) {
        console.warn(`Roster endpoint returned ${res.status} for team ${teamId}`);
        return null;
      }
      const text = await res.text();
      if (!text.trim()) return null;
      const data = JSON.parse(text);
      return data.players ? data : null;
    } catch (e) {
      console.error(`Failed to load roster for team ${teamId}`, e);
      return null;
    }
  }, []);

  // Загрузка ML-предсказания
  const fetchPrediction = useCallback(async () => {
    if (!team1 || !team2) return;
    setIsPredicting(true);
    setError(null);
    setPrediction(null);
    setKeyFactors([]);
    setConfidence(null);
    try {
      const res = await fetch(
        `http://localhost:3000/analytics/predict?team1_id=${team1.team_id}&team2_id=${team2.team_id}&format=${matchFormat}`
      );
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setPrediction({
        team1Probability: data.team1Probability,
        team2Probability: data.team2Probability,
        team1Odds: data.team1Odds,
        team2Odds: data.team2Odds,
      });
      setKeyFactors(data.factors || []);
      setConfidence(data.confidence || "Moderate");
    } catch (e: any) {
      console.error("Prediction failed", e);
      setError(e.message || "Failed to calculate prediction. Please try again.");
    } finally {
      setIsPredicting(false);
    }
  }, [team1, team2, matchFormat]);

  // Загрузка составов при смене команды
  useEffect(() => {
    if (!team1) {
      setRoster1(null);
      return;
    }
    setRosterLoading(true);
    fetchRoster(team1.team_id).then((data) => {
      setRoster1(data);
      setRosterLoading(false);
    });
  }, [team1, fetchRoster]);

  useEffect(() => {
    if (!team2) {
      setRoster2(null);
      return;
    }
    setRosterLoading(true);
    fetchRoster(team2.team_id).then((data) => {
      setRoster2(data);
      setRosterLoading(false);
    });
  }, [team2, fetchRoster]);

  // Запуск предсказания при наличии обеих команд
  useEffect(() => {
    if (team1 && team2) {
      fetchPrediction();
    } else {
      setPrediction(null);
      setKeyFactors([]);
      setConfidence(null);
    }
  }, [team1, team2, fetchPrediction]);

  const confidenceConfig: Record<
    string,
    { icon: React.ElementType; color: string; bg: string; border: string }
  > = {
    High: {
      icon: ShieldCheck,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    },
    Moderate: {
      icon: ShieldAlert,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
    Low: {
      icon: ShieldOff,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
  };
  const config = confidenceConfig[confidence || "Moderate"] || confidenceConfig.Moderate;
  const ConfidenceIcon = config.icon;

  return (
    <main className="min-h-screen bg-[#0a0a0c] p-6 lg:p-10 text-white font-sans">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">
              ML <span className="text-emerald-500">Predictions</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
              Match outcome prediction based on advanced analytics
            </p>
          </div>
        </div>

        {/* TEAM SELECTION */}
        <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6">
          <h2 className="text-sm font-bold text-[#71717a] mb-6 uppercase tracking-wider">
            Select Teams
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <TeamSearchInput value={team1} onChange={setTeam1} placeholder="Search Team 1..." />
            <div className="text-xl font-black text-white">VS</div>
            <TeamSearchInput value={team2} onChange={setTeam2} placeholder="Search Team 2..." />
          </div>

          {/* Формат матча */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-slate-400">Format:</span>
            <select
              value={matchFormat}
              onChange={(e) => setMatchFormat(e.target.value)}
              className="bg-[#121216] border border-white/5 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="bo1">BO1</option>
              <option value="bo3">BO3</option>
              <option value="bo5">BO5</option>
            </select>
          </div>

          {/* Rosters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {roster1 && (
              <div className="rounded-xl bg-[#121216] border border-white/5 p-4">
                <h3 className="font-black uppercase text-sm text-white mb-3">{roster1.name}</h3>
                <div className="space-y-2">
                  {roster1.players.map((p) => (
                    <div key={p.player_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-black text-emerald-500">
                          {p.nickname.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-white">{p.nickname}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">
                        {p.avgRating.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rosterLoading && !roster1 && team1 && (
              <div className="rounded-xl bg-[#121216] border border-white/5 p-4 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading roster...
              </div>
            )}

            {roster2 && (
              <div className="rounded-xl bg-[#121216] border border-white/5 p-4">
                <h3 className="font-black uppercase text-sm text-white mb-3">{roster2.name}</h3>
                <div className="space-y-2">
                  {roster2.players.map((p) => (
                    <div key={p.player_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-black text-emerald-500">
                          {p.nickname.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-white">{p.nickname}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">
                        {p.avgRating.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rosterLoading && !roster2 && team2 && (
              <div className="rounded-xl bg-[#121216] border border-white/5 p-4 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading roster...
              </div>
            )}
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {isPredicting && (
          <div className="flex justify-center items-center gap-3 text-[#71717a] animate-pulse py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Calculating prediction... this may take a few seconds.</span>
          </div>
        )}

        {/* ERROR */}
        {error && !isPredicting && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center text-red-400">
            {error}
          </div>
        )}

        {/* PREDICTION RESULT */}
        {prediction && team1 && team2 && !isPredicting && (
          <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-black uppercase">Prediction Result</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center rounded-xl bg-[#121216] border border-white/5 p-6">
                <p className="text-sm text-[#71717a] mb-2">{team1.name}</p>
                <p className="text-4xl font-bold text-blue-400">
                  {prediction.team1Odds.toFixed(2)}
                </p>
                <p className="text-sm text-[#71717a] mt-1">
                  {prediction.team1Probability.toFixed(1)}% chance
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <p className="text-sm text-[#71717a] mb-2">Predicted Winner</p>
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="font-semibold text-emerald-400">
                    {prediction.team1Probability > prediction.team2Probability
                      ? team1.name
                      : team2.name}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center rounded-xl bg-[#121216] border border-white/5 p-6">
                <p className="text-sm text-[#71717a] mb-2">{team2.name}</p>
                <p className="text-4xl font-bold text-red-400">
                  {prediction.team2Odds.toFixed(2)}
                </p>
                <p className="text-sm text-[#71717a] mt-1">
                  {prediction.team2Probability.toFixed(1)}% chance
                </p>
              </div>
            </div>

            {/* Probability Bar */}
            <div className="mt-8">
              <div className="flex justify-between text-sm text-[#71717a] mb-2">
                <span>{team1.name}</span>
                <span>{team2.name}</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-[#27272a]">
                <div
                  className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${prediction.team1Probability}%` }}
                />
                <div
                  className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${prediction.team2Probability}%` }}
                />
              </div>
            </div>

            {/* DATA CONFIDENCE */}
            <div className={`mt-6 p-4 rounded-xl border ${config.bg} ${config.border}`}>
              <div className="flex items-start gap-3">
                <ConfidenceIcon className={`w-5 h-5 mt-0.5 ${config.color}`} />
                <div>
                  <div className={`text-sm font-semibold ${config.color}`}>
                    {confidence} Confidence
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {confidence === "High"
                      ? "Sufficient data for reliable prediction."
                      : confidence === "Low"
                      ? "Very limited history. Prediction may be unreliable."
                      : "Some data missing. Treat prediction with caution."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KEY INFLUENCING FACTORS */}
        {keyFactors.length > 0 && team1 && team2 && !isPredicting && (
          <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              <h2 className="text-xl font-black uppercase">Key Influencing Factors</h2>
            </div>

            <div className="space-y-4">
              {keyFactors.map((factor, idx) => {
                const v1 = factor.team1Value ?? 0;
                const v2 = factor.team2Value ?? 0;
                const total = Math.abs(v1) + Math.abs(v2);
                const p1 = total > 0 ? (Math.abs(v1) / total) * 100 : 50;
                const p2 = total > 0 ? (Math.abs(v2) / total) * 100 : 50;

                const humanName: Record<string, string> = {
                  elo_diff: "ELO Rating",
                  max_rating_short_diff: "Max Player Rating",
                  recent_wr_diff: "Recent Win Rate",
                  streak_diff: "Streak",
                };
                const displayName = humanName[factor.name] || factor.name;

                // иконки для каждого фактора
                const iconMap: Record<string, React.ElementType> = {
                  elo_diff: TrendingUp,
                  max_rating_short_diff: Star,
                  recent_wr_diff: Target,
                  streak_diff: Flame,
                };
                const Icon = iconMap[factor.name] || TrendingUp;

                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-200">{displayName}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {factor.advantage === "team1"
                          ? team1.name
                          : factor.advantage === "team2"
                          ? team2.name
                          : "None"}{" "}
                        Advantage
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-16 text-right text-xs font-bold text-blue-400 tabular-nums">
                        {v1}
                      </span>

                      <div className="flex-1 h-3 bg-[#27272a] rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${p1}%` }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all duration-500"
                          style={{ width: `${p2}%` }}
                        />
                      </div>

                      <span className="w-16 text-left text-xs font-bold text-red-400 tabular-nums">
                        {v2}
                      </span>
                    </div>

                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-slate-600 font-medium">{team1.name}</span>
                      <span className="text-[9px] text-slate-600 font-medium">{team2.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}