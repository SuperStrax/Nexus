"use client";

import { useState } from "react";
import { Play, Users, Monitor } from "lucide-react";

export function LiveMatchPlayer({
  matches,
  activeMatch,      // внешний выбранный матч (если управляется родителем)
  onMatchSelect,    // колбэк при выборе матча
}: {
  matches: any[];
  activeMatch?: any;
  onMatchSelect?: (match: any) => void;
}) {
  const validMatches = matches.filter((m) => m.stream_url);
  const [internalIndex, setInternalIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Если родитель передал активный матч – синхронизируем индекс
  const activeIndex = activeMatch
    ? validMatches.findIndex((m) => m.match_id === activeMatch.match_id)
    : internalIndex;
  const currentMatch = validMatches[activeIndex] || validMatches[0];

  if (!validMatches || validMatches.length === 0) {
    return (
      <div className="w-full aspect-video bg-[#121216] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 italic">
        <Monitor className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-xs uppercase tracking-widest font-bold">
          No active broadcasts found
        </p>
      </div>
    );
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    let hostname = "localhost";
    if (typeof window !== "undefined") hostname = window.location.hostname;

    if (url.includes("twitch.tv")) {
      const channel = url.split("/").pop()?.split("?")[0];
      return `https://player.twitch.tv/?channel=${channel}&parent=${hostname}&autoplay=true&muted=true`;
    }
    if (url.includes("kick.com")) {
      const channel = url.split("/").pop()?.split("?")[0];
      return `https://player.kick.com/${channel}?autoplay=true&muted=true`;
    }
    return url;
  };

  const handleSelect = (index: number) => {
    setInternalIndex(index);
    setIsPlaying(true);
    if (onMatchSelect && validMatches[index]) {
      onMatchSelect(validMatches[index]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#121216] border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#16161a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-red-500 font-black text-[10px] tracking-[0.2em] uppercase">
                LIVE NOW
              </span>
            </div>
            <div className="w-px h-4 bg-white/10 mx-2"></div>
            <span className="text-slate-300 font-bold text-sm truncate max-w-[300px]">
              {currentMatch?.tournament}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1.5 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
              <Users className="w-3 h-3 text-emerald-400" /> Live Stats Online
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video bg-black group overflow-hidden">
          {isPlaying && currentMatch?.stream_url ? (
            <iframe
              src={getEmbedUrl(currentMatch.stream_url)!}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
              referrerPolicy="origin"
            />
          ) : (
            <>
              <img
                src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200&h=675"
                alt="Gameplay"
                className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center group/btn hover:scale-110 transition-all shadow-[0_0_50px_rgba(16,185,129,0.4)]"
                >
                  <Play className="w-8 h-8 text-black fill-black ml-1" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Переключатель матчей */}
      <div className="flex flex-wrap gap-2">
        {validMatches.map((match, index) => (
          <button
            key={match.match_id}
            onClick={() => handleSelect(index)}
            className={`px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
              index === activeIndex
                ? "bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                : "bg-[#121216] text-slate-500 border-white/5 hover:border-white/20"
            }`}
          >
            {match.teams_matches_team1_idToteams?.name} vs{" "}
            {match.teams_matches_team2_idToteams?.name}
          </button>
        ))}
      </div>
    </div>
  );
}