"use client";

import { useState, useEffect } from "react";
import {
  BrainCircuit,
  TrendingUp,
  Target,
  Flame,
  Star,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";

const FACTOR_META: Record<string, { label: string; icon: React.ElementType }> = {
  elo_diff: { label: "ELO Rating", icon: TrendingUp },
  max_rating_short_diff: { label: "Max Player Rating", icon: Star },
  recent_wr_diff: { label: "Recent Win Rate", icon: Target },
  streak_diff: { label: "Streak", icon: Flame },
};

interface Match {
  match_id: number;
  team1_id?: number;
  team2_id?: number;
  format?: string; // <-- добавлено поле формата
  teams_matches_team1_idToteams?: { name: string };
  teams_matches_team2_idToteams?: { name: string };
}

export function AiPrediction({ match }: { match: Match | null }) {
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    if (!match?.team1_id || !match?.team2_id) {
      setPrediction(null);
      return;
    }
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      setAnimReady(false);
      try {
        const formatParam = match.format || 'bo3';
        const res = await fetch(
          `http://localhost:3000/analytics/predict?team1_id=${match.team1_id}&team2_id=${match.team2_id}&format=${formatParam}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Prediction unavailable");
        const data = await res.json();
        setPrediction(data);
        setTimeout(() => setAnimReady(true), 50);
      } catch (err: any) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [match]);

  if (!match) {
    return (
      <div className="bg-[#121216] border border-white/5 rounded-2xl p-6 h-full flex items-center justify-center">
        <p className="text-slate-500 text-sm">Select a match to see prediction</p>
      </div>
    );
  }

  const t1Name = match.teams_matches_team1_idToteams?.name || "Team 1";
  const t2Name = match.teams_matches_team2_idToteams?.name || "Team 2";

  if (loading) {
    return (
      <div className="bg-[#121216] border border-white/5 rounded-2xl p-6 h-full flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        <span className="text-slate-400 text-sm">Analyzing match…</span>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="bg-[#121216] border border-white/5 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-red-400 text-sm gap-2">
        <p>{error || "Could not load prediction"}</p>
        <button onClick={() => setError("")} className="text-xs underline">
          Dismiss
        </button>
      </div>
    );
  }

  const prob1 = prediction.team1Probability;
  const prob2 = prediction.team2Probability;
  const winner = prob1 > prob2 ? t1Name : t2Name;

  const confidence = (prediction.confidence as string) || "Moderate";

  const confidenceConfig: Record<
    string,
    { icon: React.ElementType; color: string; bg: string; border: string }
  > = {
    High: { icon: ShieldCheck, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    Moderate: { icon: ShieldAlert, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    Low: { icon: ShieldOff, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };
  const config = confidenceConfig[confidence] || confidenceConfig.Moderate;
  const ConfidenceIcon = config.icon;

  const factors = prediction.factors || [];

  return (
    <div className="bg-[#121216] border border-white/5 rounded-2xl p-5 shadow-xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
          <BrainCircuit className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Nexus AI Prediction</h2>
          <p className="text-slate-400 text-xs font-medium">Real-time neural analysis</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-white font-bold text-xl">{t1Name}</span>
              {winner === t1Name && <span className="text-blue-400 text-sm ml-2 font-medium">Predicted Winner</span>}
            </div>
            <span className="text-3xl font-black text-white">{prob1}%</span>
          </div>

          <div className="h-4 w-full bg-[#1a1a20] rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500 relative transition-all duration-[1500ms] ease-out" style={{ width: animReady ? `${prob1}%` : "0%" }} />
            <div className="h-full bg-red-500 relative transition-all duration-[1500ms] ease-out" style={{ width: animReady ? `${prob2}%` : "100%" }} />
          </div>

          <div className="flex justify-end items-start mt-2">
            <div className="text-right">
              <span className="text-white font-bold text-xl">{t2Name}</span>
              <div className="text-3xl font-black text-white">{prob2}%</div>
            </div>
          </div>
        </div>

        <div className={`mb-6 p-4 rounded-xl border ${config.bg} ${config.border}`}>
          <div className="flex items-start gap-3">
            <ConfidenceIcon className={`w-5 h-5 mt-0.5 ${config.color}`} />
            <div>
              <div className={`text-sm font-semibold ${config.color}`}>{confidence} Confidence</div>
              <p className="text-xs text-slate-400 mt-1">
                {confidence === "High" ? "Sufficient data for reliable prediction." :
                 confidence === "Low" ? "Very limited history. Prediction may be unreliable." :
                 "Some data missing. Treat prediction with caution."}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Key Factors</h3>
          <div className="space-y-2">
            {factors.map((f: any, i: number) => {
              const meta = FACTOR_META[f.name] || { label: f.name, icon: TrendingUp };
              const Icon = meta.icon;
              const v1 = f.team1Value;
              const v2 = f.team2Value;
              const total = Math.abs(v1) + Math.abs(v2);
              const p1 = total > 0 ? (Math.abs(v1) / total) * 100 : 50;
              const p2 = total > 0 ? (Math.abs(v2) / total) * 100 : 50;

              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a20] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md bg-[#121216] flex items-center justify-center ${f.advantage === "team1" ? "text-blue-400" : "text-red-400"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{meta.label}</div>
                      <div className="text-xs text-slate-500">{f.advantage === "team1" ? t1Name : t2Name} Advantage</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400">{v1}</span>
                    <div className="w-16 h-2 bg-[#27272a] rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500" style={{ width: `${p1}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${p2}%` }} />
                    </div>
                    <span className="text-xs font-bold text-red-400">{v2}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}