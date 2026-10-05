"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Map as MapIcon,
  Activity,
  Clock,
  Users,
  Swords,
  BrainCircuit,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";

export default function MatchDetails() {
  const { id } = useParams();
  const router = useRouter();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [prediction, setPrediction] = useState<any>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState("");

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`http://localhost:3000/matches/${id}`);
        const data = await res.json();
        setMatch(data);
      } catch (e) {
        console.error("Ошибка загрузки данных:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (
      match &&
      match.status === "upcoming" &&
      match.team1_id &&
      match.team2_id
    ) {
      setPredictionLoading(true);
      setPredictionError("");
      // передаём формат матча, если он есть, иначе 'bo3'
      const format = match.format || "bo3";
      fetch(
        `http://localhost:3000/analytics/predict?team1_id=${match.team1_id}&team2_id=${match.team2_id}&format=${format}`
      )
        .then((res) => {
          if (!res.ok) throw new Error("Prediction unavailable");
          return res.json();
        })
        .then((data) => setPrediction(data))
        .catch((err) => setPredictionError(err.message))
        .finally(() => setPredictionLoading(false));
    } else {
      setPrediction(null);
    }
  }, [match]);

  if (loading)
    return (
      <div className="p-20 text-center text-slate-500 font-mono animate-pulse">
        LOADING ANALYTICS...
      </div>
    );
  if (!match)
    return <div className="p-20 text-center text-white">MATCH NOT FOUND</div>;

  const team1Stats =
    match.player_match_stats?.filter(
      (s: any) => s.team_id === match.team1_id
    ) || [];
  const team2Stats =
    match.player_match_stats?.filter(
      (s: any) => s.team_id === match.team2_id
    ) || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-EN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStatsTable = (stats: any[], teamName: string) => (
    <div className="bg-[#121216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
      <div className="bg-[#1a1a20] px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-white font-bold text-lg">{teamName} Players</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#16161b] text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Player</th>
              <th className="px-6 py-4 font-medium text-center">K - D</th>
              <th className="px-6 py-4 font-medium text-center">+/-</th>
              <th className="px-6 py-4 font-medium text-center">ADR</th>
              <th className="px-6 py-4 font-medium text-center">KAST</th>
              <th className="px-6 py-4 font-medium text-center">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {stats
              .sort((a, b) => b.rating - a.rating)
              .map((stat, idx) => {
                const diff = (stat.kills || 0) - (stat.deaths || 0);
                const isTop = idx === 0;
                return (
                  <tr
                    key={stat.stat_id}
                    className={`hover:bg-[#1f1f26] transition-colors ${
                      isTop ? "bg-blue-500/5" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-xs font-bold ${
                            isTop
                              ? "text-blue-400 ring-1 ring-blue-500/50"
                              : "text-slate-300"
                          }`}
                        >
                          {stat.players?.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`font-semibold ${
                            isTop ? "text-blue-400" : "text-slate-200"
                          }`}
                        >
                          {stat.players?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-300 font-medium">
                      {stat.kills} - {stat.deaths}
                    </td>
                    <td
                      className={`px-6 py-4 text-center font-bold ${
                        diff > 0
                          ? "text-emerald-400"
                          : diff < 0
                          ? "text-red-400"
                          : "text-slate-400"
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-300 font-medium">
                      {stat.adr?.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-300 font-medium">
                      {stat.kast?.toFixed(1)}%
                    </td>
                    <td
                      className={`px-6 py-4 text-center font-black ${
                        stat.rating >= 1.05
                          ? "text-blue-400"
                          : stat.rating < 0.9
                          ? "text-red-400"
                          : "text-slate-300"
                      }`}
                    >
                      {stat.rating?.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUpcomingRoster = (
    stats: any[],
    teamName: string,
    isLeft: boolean
  ) => (
    <div className="bg-[#121216] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex-1">
      <div
        className={`bg-[#1a1a20] px-6 py-5 border-b border-white/5 flex items-center gap-4 ${
          isLeft ? "" : "flex-row-reverse"
        }`}
      >
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center font-black text-emerald-500 text-sm">
          {teamName?.substring(0, 2).toUpperCase()}
        </div>
        <h3 className="text-white font-black text-xl tracking-wide">
          {teamName}
        </h3>
      </div>
      <div className="p-2">
        {stats.length > 0 ? (
          stats.map((stat) => (
            <div
              key={stat.stat_id}
              className={`flex items-center p-4 hover:bg-white/5 rounded-xl transition-colors gap-4 ${
                isLeft ? "" : "flex-row-reverse"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#27272a] flex items-center justify-center text-sm font-bold text-slate-300 border border-white/5 shrink-0">
                {stat.players?.name.substring(0, 2).toUpperCase()}
              </div>
              <div
                className={`flex flex-col ${
                  isLeft ? "items-start" : "items-end"
                }`}
              >
                <span className="font-bold text-slate-200 text-lg">
                  {stat.players?.name}
                </span>
                {stat.is_standin && (
                  <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">
                    Stand-in
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-500 italic font-mono uppercase tracking-widest">
            Lineups TBD
          </div>
        )}
      </div>
    </div>
  );

  // ---------- Confidence из API ----------
  const confidenceStr = prediction?.confidence || "Moderate";
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
  const config = confidenceConfig[confidenceStr] || confidenceConfig.Moderate;
  const ConfidenceIcon = config.icon;

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1400px] mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-[#121216] px-4 py-2 rounded-lg border border-white/5 w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero Section */}
      <div
        className={`bg-[#121216] border border-white/5 rounded-3xl p-8 relative shadow-2xl ${
          match.status === "upcoming" ? "border-emerald-500/20" : ""
        }`}
      >
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`flex items-center gap-3 mb-12 px-4 py-2 rounded-full border backdrop-blur-md ${
              match.status === "upcoming"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-black/40 border-white/5 text-slate-400"
            }`}
          >
            {match.status === "upcoming" ? (
              <Clock className="w-4 h-4" />
            ) : (
              <Trophy className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-sm font-semibold tracking-wide uppercase">
              {match.tournament}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className="text-sm font-medium">{match.format}</span>
          </div>

          <div className="flex items-center justify-between w-full max-w-4xl">
            {/* Team 1 */}
            <div className="flex flex-col items-center gap-4 w-1/3">
              <div
                className={`w-28 h-28 rounded-2xl p-1 ${
                  match.status === "finished" &&
                  match.winner_team_id === match.team1_id
                    ? "bg-gradient-to-b from-blue-500 to-transparent"
                    : "bg-white/5"
                }`}
              >
                <div className="w-full h-full rounded-xl bg-[#0a0a0c] flex items-center justify-center text-3xl font-black text-white border border-white/5 italic">
                  {match.teams_matches_team1_idToteams?.name[0]}
                </div>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight text-center">
                {match.teams_matches_team1_idToteams?.name}
              </h2>
            </div>

            {/* Score or Date */}
            <div className="flex flex-col items-center justify-center w-1/3">
              {match.status === "upcoming" ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a20] border border-white/10 flex items-center justify-center shadow-xl mb-2">
                    <span className="text-2xl font-black text-slate-500">
                      VS
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {formatDate(match.match_date)}
                    <span className="mx-1">|</span>
                    <Clock className="w-3 h-3" />
                    {formatTime(match.match_date)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="text-6xl font-black text-white flex items-center gap-6">
                    <span
                      className={
                        match.winner_team_id === match.team1_id
                          ? "text-blue-400"
                          : "text-white"
                      }
                    >
                      {match.score_team1}
                    </span>
                    <span className="text-3xl text-slate-600 font-medium">
                      -
                    </span>
                    <span
                      className={
                        match.winner_team_id === match.team2_id
                          ? "text-blue-400"
                          : "text-white"
                      }
                    >
                      {match.score_team2}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {formatDate(match.match_date)}
                    <span className="mx-1">|</span>
                    <Clock className="w-3 h-3" />
                    {formatTime(match.match_date)}
                  </div>
                </div>
              )}
            </div>

            {/* Team 2 */}
            <div className="flex flex-col items-center gap-4 w-1/3">
              <div
                className={`w-28 h-28 rounded-2xl p-1 ${
                  match.status === "finished" &&
                  match.winner_team_id === match.team2_id
                    ? "bg-gradient-to-b from-blue-500 to-transparent"
                    : "bg-white/5"
                }`}
              >
                <div className="w-full h-full rounded-xl bg-[#0a0a0c] flex items-center justify-center text-3xl font-black text-white border border-white/5 italic">
                  {match.teams_matches_team2_idToteams?.name[0]}
                </div>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight text-center">
                {match.teams_matches_team2_idToteams?.name}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Блоки для upcoming */}
      {match.status === "upcoming" && (
        <>
          {/* Составы */}
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Users className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-black text-white tracking-wide">
                Starting Rosters
              </h2>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              {renderUpcomingRoster(
                team1Stats,
                match.teams_matches_team1_idToteams?.name,
                true
              )}
              <div className="hidden md:flex items-center justify-center">
                <Swords className="w-8 h-8 text-slate-600 opacity-50" />
              </div>
              {renderUpcomingRoster(
                team2Stats,
                match.teams_matches_team2_idToteams?.name,
                false
              )}
            </div>
          </div>

          {/* ML‑прогноз */}
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <BrainCircuit className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-black text-white tracking-wide">
                AI Match Prediction
              </h2>
            </div>

            {predictionLoading && (
              <div className="bg-[#121216] border border-white/5 rounded-2xl p-8 flex justify-center items-center gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Calculating prediction…</span>
              </div>
            )}

            {predictionError && !predictionLoading && (
              <div className="bg-[#121216] border border-red-500/20 rounded-2xl p-6 text-center text-red-400 text-sm">
                {predictionError}
              </div>
            )}

            {prediction && !predictionLoading && (
              <div className="bg-[#121216] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                {/* Основной прогноз */}
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Team 1 */}
                  <div className="flex-1 text-center">
                    <p className="text-sm text-slate-400 mb-1">
                      {match.teams_matches_team1_idToteams?.name}
                    </p>
                    <p className="text-4xl font-black text-blue-400">
                      {prediction.team1Probability}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Odds: {prediction.team1Odds}
                    </p>
                  </div>

                  {/* Winner + bar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Predicted Winner
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                      {prediction.team1Probability >
                      prediction.team2Probability
                        ? match.teams_matches_team1_idToteams?.name
                        : match.teams_matches_team2_idToteams?.name}
                    </div>
                    <div className="w-48 h-2 bg-[#27272a] rounded-full overflow-hidden flex mt-2">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${prediction.team1Probability}%`,
                        }}
                      />
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${prediction.team2Probability}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="flex-1 text-center">
                    <p className="text-sm text-slate-400 mb-1">
                      {match.teams_matches_team2_idToteams?.name}
                    </p>
                    <p className="text-4xl font-black text-red-400">
                      {prediction.team2Probability}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Odds: {prediction.team2Odds}
                    </p>
                  </div>
                </div>

                {/* Индикатор качества данных */}
                <div
                  className={`p-4 rounded-xl border ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start gap-3">
                    <ConfidenceIcon
                      className={`w-5 h-5 mt-0.5 ${config.color}`}
                    />
                    <div>
                      <div
                        className={`text-sm font-semibold ${config.color}`}
                      >
                        {confidenceStr} Confidence
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {confidenceStr === "High"
                          ? "Sufficient data for reliable prediction."
                          : confidenceStr === "Low"
                          ? "Very limited history. Prediction may be unreliable."
                          : "Some data missing. Treat prediction with caution."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Завершённые матчи – карты и статистика */}
      {match.status !== "upcoming" && (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Activity className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-black text-white tracking-wide">
              Match Stats
            </h2>
          </div>

          <div className="bg-[#121216] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <MapIcon className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Maps</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {match.match_maps?.map((map: any, idx: number) => {
                const team1Won = map.team1_score > map.team2_score;
                return (
                  <div
                    key={map.map_id}
                    className="bg-[#1a1a20] border border-white/5 rounded-xl p-4 flex flex-col relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors"></div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">
                      Map {idx + 1}
                    </span>
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-bold text-white relative z-10">
                        {map.map_name}
                      </span>
                      <div className="flex items-center gap-2 font-black text-lg relative z-10">
                        <span
                          className={
                            team1Won ? "text-blue-400" : "text-slate-400"
                          }
                        >
                          {map.team1_score}
                        </span>
                        <span className="text-slate-600">:</span>
                        <span
                          className={
                            !team1Won ? "text-blue-400" : "text-slate-400"
                          }
                        >
                          {map.team2_score}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {renderStatsTable(
              team1Stats,
              match.teams_matches_team1_idToteams?.name
            )}
            {renderStatsTable(
              team2Stats,
              match.teams_matches_team2_idToteams?.name
            )}
          </div>
        </div>
      )}
    </div>
  );
}