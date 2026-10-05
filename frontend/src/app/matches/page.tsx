"use client";

import { Search, Filter, Calendar, Tv, ChevronRight, X, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Match {
  match_id: number;
  tournament: string;
  match_date: string;
  score_team1: number;
  score_team2: number;
  format: string;
  status: string;
  stream_url?: string | null;
  teams_matches_team1_idToteams?: { name: string };
  teams_matches_team2_idToteams?: { name: string };
}

function StatusDisplay({ match }: { match: Match }) {
  let statusText = 'No Stream';
  let statusColor = 'text-slate-500';

  if (match.stream_url) {
    if (match.status === 'live') {
      statusText = '• Stream Online';
      statusColor = 'text-emerald-500';
    } else if (match.status === 'upcoming') {
      statusText = '• Stream Ready';
      statusColor = 'text-amber-500';
    } else if (match.status === 'finished' || match.status === 'results') {
      statusText = '• No Stream';
      statusColor = 'text-slate-500';
    }
  }

  return (
    <span className={`text-[10px] uppercase font-medium ${statusColor}`}>
      {statusText}
    </span>
  );
}

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Поиск и фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Функция загрузки матчей с учётом всех параметров
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "50");
      params.append("status", activeTab);

      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await fetch(`http://localhost:3000/matches?${params.toString()}`);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Ошибка загрузки:", e);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при изменении зависимостей
  useEffect(() => {
    fetchMatches();
  }, [page, activeTab, searchQuery, dateFrom, dateTo]);

  // Сброс страницы при изменении фильтров
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const tabs = [
    { id: "live", label: "Live", count: null },
    { id: "upcoming", label: "Upcoming", count: null },
    { id: "results", label: "Results", count: null },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1400px] mx-auto">
      {/* Заголовок и Поиск */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-white text-4xl font-black uppercase tracking-tighter">
            Tournaments & <span className="text-emerald-500">Matches</span>
          </h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
            Browse and filter pro-scene matches
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Поиск */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Search team or event..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-[#121216] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 w-full md:w-64 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Кнопка фильтров */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 border rounded-xl transition-colors ${
              showFilters || dateFrom || dateTo
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-[#121216] border-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Панель фильтров по дате */}
      {showFilters && (
        <div className="bg-[#121216] border border-white/5 rounded-2xl p-5 flex flex-wrap items-end gap-4 animate-in fade-in">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">From</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="bg-[#0a0a0c] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 w-44 transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">To</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="bg-[#0a0a0c] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 w-44 transition-all"
              />
            </div>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:border-white/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      )}

      {/* Табы */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? "text-emerald-500" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {tab.label}
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    activeTab === tab.id ? "bg-emerald-500/20" : "bg-white/5"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </div>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            )}
          </button>
        ))}
      </div>

      {/* Список матчей */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-mono animate-pulse">
            LOADING MATCHES...
          </div>
        ) : matches.length > 0 ? (
          matches.map((match) => (
            <Link href={`/matches/${match.match_id}`} key={match.match_id} className="block">
              <div
                className={`group bg-[#121216] border rounded-2xl transition-all cursor-pointer overflow-hidden ${
                  activeTab === 'live'
                    ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]'
                    : 'border-white/5 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center p-5 gap-6">
                  {/* Дата / LIVE Индикатор */}
                  <div className="flex flex-row md:flex-col items-center justify-center gap-1 md:min-w-[80px] border-r border-white/5 pr-6">
                    {activeTab === 'live' ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-[10px] text-red-500 font-black uppercase mt-1 animate-pulse">
                          Live
                        </span>
                      </div>
                    ) : match.match_date ? (
                      <>
                        <span className="text-white font-bold text-lg leading-none">
                          {new Date(match.match_date).getDate()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">
                          {new Date(match.match_date).toLocaleString('en-US', { month: 'short' })}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-600 text-xs italic">TBD</span>
                    )}
                  </div>

                  {/* Команда 1 */}
                  <div className="flex items-center gap-4 flex-1 justify-end">
                    <span className="text-white font-bold text-base md:text-lg">
                      {match.teams_matches_team1_idToteams?.name || "TBD"}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white font-bold italic">
                      {match.teams_matches_team1_idToteams?.name?.[0] || "?"}
                    </div>
                  </div>

                  {/* Счет / VS */}
                  <div className="flex flex-col items-center px-8">
                    <div
                      className={`text-xl font-black ${
                        activeTab === 'live' ? 'text-red-500' : 'text-white'
                      }`}
                    >
                      {(match.score_team1 ?? 0) === 0 && (match.score_team2 ?? 0) === 0
                        ? "VS"
                        : `${match.score_team1} : ${match.score_team2}`}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono italic uppercase tracking-tighter">
                      {match.format || "BO3"}
                    </div>
                  </div>

                  {/* Команда 2 */}
                  <div className="flex items-center gap-4 flex-1 justify-start">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white font-bold italic">
                      {match.teams_matches_team2_idToteams?.name?.[0] || "?"}
                    </div>
                    <span className="text-white font-bold text-base md:text-lg">
                      {match.teams_matches_team2_idToteams?.name || "TBD"}
                    </span>
                  </div>

                  {/* Турнир и Стрим */}
                  <div className="flex items-center justify-between md:justify-end gap-6 md:min-w-[250px] bg-white/[0.02] md:bg-transparent p-3 md:p-0 rounded-xl">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-white text-right truncate max-w-[150px]">
                        {match.tournament}
                      </span>
                      <StatusDisplay match={match} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg border transition-all ${
                          match.stream_url
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black'
                            : 'bg-white/5 text-slate-700 border-white/5'
                        }`}
                      >
                        <Tv className="w-4 h-4" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-20 bg-[#121216] rounded-3xl border border-dashed border-white/10">
            <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No matches found for this category</p>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {(matches.length > 0 || page > 1) && !loading && (
        <div className="flex items-center justify-center gap-4 pt-10 pb-20">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1 || loading}
            className="px-6 py-2 bg-[#121216] border border-white/5 rounded-xl text-white font-bold hover:bg-emerald-500 hover:text-black disabled:opacity-30 disabled:hover:bg-[#121216] disabled:hover:text-white transition-all"
          >
            Back
          </button>

          <span className="text-white font-mono bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
            Page {page}
          </span>

          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading || matches.length < 50}
            className="px-6 py-2 bg-[#121216] border border-white/5 rounded-xl text-white font-bold hover:bg-emerald-500 hover:text-black disabled:opacity-30 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}