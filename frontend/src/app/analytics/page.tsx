"use client";

import { useState, useEffect, ReactNode, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Trophy,
  Target,
  Activity,
  Award,
  Swords,
  X,
} from "lucide-react";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

// ==================== TYPES ====================
interface PlayerPerformance {
  player_id: number;
  nickname: string;
  teamName: string;
  avgRating: number;
  avgAdr: number;
  avgKast: number;
  totalKills: number;
  totalDeaths: number;
  ratingHistory: { date: string; rating: number }[];
}

interface GlobalStats {
  totalMatches: number;
  matchesSubtitle: string;
  activePlayers: number;
  activePlayersWeek: string;
  activeTeams: number;
  avgRating: number;
}

interface TeamLeaderboard {
  team_id: number;
  name: string;
  winRate: number;
  wins: number;
  losses: number;
  totalMatches: number;
  form: number[];
}

interface HeadToHeadMatch {
  date: string;
  t1Score: number;
  t2Score: number;
  t1Name: string;
  t2Name: string;
  event: string;
}

interface HeadToHeadResponse {
  team1Wins: number;
  team2Wins: number;
  matches: HeadToHeadMatch[];
}

interface MapWinRate {
  name: string;
  winRate: number;
}

interface MapPopularity {
  name: string;
  value: number;
  fill: string;
}

// ==================== COMPONENTS ====================

function StatCard({ title, value, subtitle, icon: Icon }: any) {
  return (
    <div className="bg-[#0f0f12] border border-[#1f1f23] rounded-xl p-6 flex flex-col justify-between h-[160px] relative overflow-hidden transition-all hover:border-[#3f3f46]">
      <div>
        <p className="text-sm text-[#71717a] mb-2 font-medium">{title}</p>
        <h3 className="text-3xl font-semibold text-white">{value}</h3>
        <p className={`text-sm mt-1 ${subtitle?.startsWith('+') ? 'text-[#22c55e]' : 'text-[#71717a]'}`}>{subtitle}</p>
      </div>
      <div className="absolute top-6 right-6 p-2 bg-[#181818] rounded-lg border border-[#27272a]">
        <Icon className="w-5 h-5 text-[#3b82f6]" />
      </div>
    </div>
  );
}

function PlayerAvatar({ nickname }: { nickname: string }): ReactNode {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-black text-emerald-500">
      {nickname?.slice(0, 2).toUpperCase() || '??'}
    </div>
  );
}

function TeamForm({ form }: { form: number[] }) {
  return (
    <div className="flex gap-1">
      {form.map((result, index) => (
        <span key={index} className={`h-2 w-2 rounded-full ${result === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
      ))}
      {Array.from({ length: Math.max(0, 5 - form.length) }).map((_, index) => (
        <span key={`empty-${index}`} className="h-2 w-2 rounded-full bg-[#27272a]" />
      ))}
    </div>
  );
}

function TeamSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: { team_id: number; name: string } | null;
  onChange: (team: { team_id: number; name: string } | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ team_id: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  const searchTeams = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/analytics/teams/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error('Search error', e);
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
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
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

function TeamRankingsTable({ teams }: { teams: TeamLeaderboard[] }) {
  return (
    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl overflow-hidden">
      <div className="p-5 bg-white/[0.02] border-b border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span>Top Teams by Win Rate</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-black uppercase text-[#71717a] tracking-widest">
              <th className="px-6 py-4 font-medium">Rank</th>
              <th className="px-6 py-4 font-medium">Team</th>
              <th className="px-6 py-4 font-medium">Win Rate</th>
              <th className="px-6 py-4 font-medium">W - L</th>
              <th className="px-6 py-4 font-medium">Matches</th>
              <th className="px-6 py-4 font-medium">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {teams.length > 0 ? (
              teams.map((team, index) => (
                <tr key={team.team_id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-yellow-500/20 text-yellow-500" : index === 1 ? "bg-gray-400/20 text-gray-400" : index === 2 ? "bg-orange-500/20 text-orange-500" : "bg-[#27272a] text-gray-400"}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-black text-emerald-500">
                        {team.name?.charAt(0).toUpperCase() || '??'}
                      </div>
                      <span className="font-black uppercase text-sm text-white">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-white/5">
                        <div className="h-2 bg-green-500 transition-all duration-300" style={{ width: `${team.winRate}%` }} />
                      </div>
                      <span className="font-bold text-green-500">{team.winRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold tabular-nums">
                    <span className="text-green-500">{team.wins}</span>
                    <span className="text-[#71717a]"> - </span>
                    <span className="text-red-500">{team.losses}</span>
                  </td>
                  <td className="px-6 py-4 text-[#71717a]">{team.totalMatches}</td>
                  <td className="px-6 py-4"><TeamForm form={team.form} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#71717a]">No team data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function AnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [players, setPlayers] = useState<PlayerPerformance[]>([]);
  const [teams, setTeams] = useState<TeamLeaderboard[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPerformance | null>(null);

  const [h2hTeam1, setH2hTeam1] = useState<{ team_id: number; name: string } | null>(null);
  const [h2hTeam2, setH2hTeam2] = useState<{ team_id: number; name: string } | null>(null);
  const [h2hTeam1Stats, setH2hTeam1Stats] = useState<TeamLeaderboard | null>(null);
  const [h2hTeam2Stats, setH2hTeam2Stats] = useState<TeamLeaderboard | null>(null);
  const [headToHeadData, setHeadToHeadData] = useState<HeadToHeadResponse | null>(null);

  const [mapWinRates, setMapWinRates] = useState<MapWinRate[]>([]);
  const [mapPopularity, setMapPopularity] = useState<MapPopularity[]>([]);

  useEffect(() => {
    setIsMounted(true);

    async function loadData() {
      try {
        const [gs, p, t, mw, mp] = await Promise.all([
          fetch('http://localhost:3000/analytics/global').then(res => res.ok ? res.json() : Promise.reject('Failed')),
          fetch('http://localhost:3000/analytics/top-players').then(res => res.ok ? res.json() : Promise.reject('Failed')),
          fetch('http://localhost:3000/analytics/teams').then(res => res.ok ? res.json() : Promise.reject('Failed')),
          fetch('http://localhost:3000/analytics/map-win-rates').then(res => res.ok ? res.json() : []),
          fetch('http://localhost:3000/analytics/map-popularity').then(res => res.ok ? res.json() : []),
        ]);

        setGlobalStats(gs);
        setPlayers(p);
        setTeams(t);
        setMapWinRates(mw);
        setMapPopularity(mp);

        if (p.length > 0) setSelectedPlayer(p[0]);
      } catch (e) {
        console.error("Error fetching data:", e);
        setGlobalStats({ totalMatches: 0, matchesSubtitle: '+0% WoW', activePlayers: 0, activePlayersWeek: '0 active this week', activeTeams: 0, avgRating: 0 });
        setPlayers([]);
        setTeams([]);
        setMapWinRates([]);
        setMapPopularity([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fetchTeamAllTimeStats = async (teamId: number) => {
    try {
      const res = await fetch(`http://localhost:3000/analytics/team-alltime-stats?teamId=${teamId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to fetch all-time stats for team', teamId, e);
    }
    return null;
  };

  const handleTeam1Select = async (team: { team_id: number; name: string } | null) => {
    setH2hTeam1(team);
    if (team) {
      const stats = await fetchTeamAllTimeStats(team.team_id);
      setH2hTeam1Stats(stats);
    } else {
      setH2hTeam1Stats(null);
    }
  };

  const handleTeam2Select = async (team: { team_id: number; name: string } | null) => {
    setH2hTeam2(team);
    if (team) {
      const stats = await fetchTeamAllTimeStats(team.team_id);
      setH2hTeam2Stats(stats);
    } else {
      setH2hTeam2Stats(null);
    }
  };

  useEffect(() => {
    if (h2hTeam1 && h2hTeam2) {
      loadHeadToHead(h2hTeam1.team_id, h2hTeam2.team_id);
    } else {
      setHeadToHeadData(null);
    }
  }, [h2hTeam1, h2hTeam2]);

  async function loadHeadToHead(t1: number, t2: number) {
    try {
      const res = await fetch(`http://localhost:3000/analytics/head-to-head?t1=${t1}&t2=${t2}`);
      if (res.ok) {
        const data: HeadToHeadResponse = await res.json();
        setHeadToHeadData(data);
      } else {
        setHeadToHeadData(null);
      }
    } catch (e) {
      console.error("Failed to load head-to-head", e);
      setHeadToHeadData(null);
    }
  }

  if (loading || !isMounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-emerald-500 font-bold animate-pulse uppercase tracking-widest">
          Loading Analytics Data...
        </div>
      </div>
    );
  }

  const radarData = [
    { stat: 'Win Rate', team1: h2hTeam1Stats?.winRate ?? 0, team2: h2hTeam2Stats?.winRate ?? 0 },
    { stat: 'Wins', team1: h2hTeam1Stats && h2hTeam2Stats ? (h2hTeam1Stats.wins / Math.max(h2hTeam1Stats.wins, h2hTeam2Stats.wins, 1)) * 100 : 0, team2: h2hTeam1Stats && h2hTeam2Stats ? (h2hTeam2Stats.wins / Math.max(h2hTeam1Stats.wins, h2hTeam2Stats.wins, 1)) * 100 : 0 },
    { stat: 'Matches', team1: h2hTeam1Stats && h2hTeam2Stats ? (h2hTeam1Stats.totalMatches / Math.max(h2hTeam1Stats.totalMatches, h2hTeam2Stats.totalMatches, 1)) * 100 : 0, team2: h2hTeam1Stats && h2hTeam2Stats ? (h2hTeam2Stats.totalMatches / Math.max(h2hTeam1Stats.totalMatches, h2hTeam2Stats.totalMatches, 1)) * 100 : 0 },
    { stat: 'Form (L5)', team1: h2hTeam1Stats ? (h2hTeam1Stats.form.reduce((a, b) => a + b, 0) / h2hTeam1Stats.form.length) * 100 : 0, team2: h2hTeam2Stats ? (h2hTeam2Stats.form.reduce((a, b) => a + b, 0) / h2hTeam2Stats.form.length) * 100 : 0 },
    { stat: 'H2H', team1: headToHeadData && (headToHeadData.team1Wins + headToHeadData.team2Wins) > 0 ? (headToHeadData.team1Wins / (headToHeadData.team1Wins + headToHeadData.team2Wins)) * 100 : 0, team2: headToHeadData && (headToHeadData.team1Wins + headToHeadData.team2Wins) > 0 ? (headToHeadData.team2Wins / (headToHeadData.team1Wins + headToHeadData.team2Wins)) * 100 : 0 },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0c] p-6 lg:p-10 text-white font-sans">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Analytics <span className="text-emerald-500">Hub</span></h1>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Live Database Insights</p>
            </div>
          </div>
        </div>

        {/* OVERVIEW STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Matches" value={globalStats?.totalMatches?.toLocaleString() ?? '0'} subtitle={globalStats?.matchesSubtitle ?? '+0% WoW'} icon={Trophy} />
          <StatCard title="Active Players" value={globalStats?.activePlayers?.toLocaleString() ?? '0'} subtitle={globalStats?.activePlayersWeek ?? '0 active this week'} icon={Users} />
          <StatCard title="Active Teams" value={globalStats?.activeTeams?.toLocaleString() ?? '0'} subtitle="Across all regions" icon={Target} />
          <StatCard title="Avg Match Rating" value={globalStats?.avgRating?.toFixed(2) ?? '0.00'} subtitle="Balanced competition" icon={Activity} />
        </div>

        {/* PLAYER RANKINGS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-black uppercase">Player Performance</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {players.length > 0 ? (
              <div className="bg-[#0f0f12] border border-white/5 rounded-3xl overflow-hidden h-fit">
                <div className="p-5 bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-widest">Top Rated Players</div>
                <div className="divide-y divide-white/5">
                  {players.map((p, index) => (
                    <button
                      key={p.player_id}
                      onClick={() => setSelectedPlayer(p)}
                      className={`w-full flex items-center gap-4 px-6 py-5 transition-all ${selectedPlayer?.player_id === p.player_id ? "bg-emerald-500/10 border-l-4 border-l-emerald-500" : "hover:bg-white/5"}`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-yellow-500/20 text-yellow-500" : index === 1 ? "bg-gray-500/20 text-gray-500" : index === 2 ? "bg-orange-500/20 text-orange-500" : "bg-[#27272a] text-gray-400"}`}>
                        {index + 1}
                      </span>
                      <PlayerAvatar nickname={p.nickname} />
                      <div className="flex-1 text-left">
                        <p className="font-black text-white uppercase text-sm">{p.nickname}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{p.teamName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-500">{p.avgRating}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Rating</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="col-span-1 bg-[#0f0f12] border border-white/5 rounded-3xl p-6 flex items-center justify-center">
                <p className="text-[#71717a]">No players found.</p>
              </div>
            )}

            {selectedPlayer ? (
              <div className="lg:col-span-2 bg-[#0f0f12] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                      <PlayerAvatar nickname={selectedPlayer.nickname} />
                      <div>
                        <h3 className="text-2xl font-black uppercase">{selectedPlayer.nickname}</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedPlayer.teamName}</p>
                      </div>
                    </div>
                    <div className="flex gap-8 text-center">
                      <div><p className="text-[10px] font-bold text-slate-500 uppercase">ADR</p><p className="text-xl font-black">{selectedPlayer.avgAdr > 0 ? selectedPlayer.avgAdr.toFixed(1) : '-'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-500 uppercase">KAST</p><p className="text-xl font-black">{selectedPlayer.avgKast > 0 ? `${selectedPlayer.avgKast.toFixed(1)}%` : '-'}</p></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="flex flex-col items-center"><p className="text-lg font-bold text-[#22c55e]">{selectedPlayer.totalKills.toLocaleString()}</p><p className="text-xs text-[#71717a] uppercase">Kills</p></div>
                    <div className="flex flex-col items-center"><p className="text-lg font-bold text-red-500">{selectedPlayer.totalDeaths.toLocaleString()}</p><p className="text-xs text-[#71717a] uppercase">Deaths</p></div>
                  </div>
                  {selectedPlayer.ratingHistory && selectedPlayer.ratingHistory.length > 0 ? (
                    <div style={{ minHeight: 200 }}>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={selectedPlayer.ratingHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} tick={{ dy: 10 }} />
                          <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} allowDataOverflow tickFormatter={(v) => v.toFixed(2)} stroke="#475569" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#121216', border: '1px solid #ffffff10', borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ minHeight: 200 }} className="flex items-center justify-center text-[#71717a]">No rating history available.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 bg-[#0f0f12] border border-white/5 rounded-xl p-8 flex items-center justify-center">
                <p className="text-[#71717a]">Select a player to view stats.</p>
              </div>
            )}
          </div>
        </section>

        {/* TEAM RANKINGS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-black uppercase">Team Rankings</h2>
          </div>
          <TeamRankingsTable teams={teams} />
        </section>

        {/* HEAD-TO-HEAD */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-black uppercase">Head-to-Head Comparison</h2>
          </div>

          <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <TeamSearchInput value={h2hTeam1} onChange={handleTeam1Select} placeholder="Search Team 1..." />
              {headToHeadData && (
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    <span className="text-green-500">{headToHeadData.team1Wins}</span>
                    <span className="text-[#71717a]"> - </span>
                    <span className="text-red-500">{headToHeadData.team2Wins}</span>
                  </p>
                  <p className="text-sm text-[#71717a]">All-time record</p>
                </div>
              )}
              <TeamSearchInput value={h2hTeam2} onChange={handleTeam2Select} placeholder="Search Team 2..." />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex justify-center items-center" style={{ minHeight: 320, minWidth: 320 }}>
                {h2hTeam1 && h2hTeam2 && headToHeadData && h2hTeam1Stats && h2hTeam2Stats ? (
                  <RadarChart width={320} height={300} data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="stat" stroke="#9ca3af" fontSize={12} />
                    <PolarRadiusAxis stroke="#374151" domain={[0, 100]} />
                    <Radar name={h2hTeam1.name} dataKey="team1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar name={h2hTeam2.name} dataKey="team2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                  </RadarChart>
                ) : (
                  <div className="text-[#71717a]">
                    {!h2hTeam1 || !h2hTeam2 ? 'Search and select two teams' : 'Loading comparison...'}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-4 text-sm font-medium text-[#71717a]">Recent Matches</p>
                {headToHeadData && headToHeadData.matches.length > 0 ? (
                  <div className="space-y-3">
                    {headToHeadData.matches.map((match, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-[#121216] border border-white/5 p-3">
                        <div>
                          <p className="text-sm text-white">{match.date}</p>
                          <p className="text-xs text-[#71717a]">{match.event}</p>
                        </div>
                        <div className="text-center">
                          <span className={match.t1Score > match.t2Score ? "text-green-500 font-bold" : "text-white font-bold"}>{match.t1Score}</span>
                          <span className="text-[#71717a] mx-1">-</span>
                          <span className={match.t2Score > match.t1Score ? "text-green-500 font-bold" : "text-white font-bold"}>{match.t2Score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#71717a] text-sm">
                    {headToHeadData ? 'No recent matches found.' : 'Select two teams to load match history.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MAP STATISTICS */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-black uppercase">Map Statistics</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Map Win Rates */}
            <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-[#71717a] mb-4 uppercase tracking-wider">Map Win Rates</h3>
              {mapWinRates.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mapWinRates} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#121216', border: '1px solid #ffffff10', borderRadius: '8px' }}
                      formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Win Rate']}
                    />
                    <Bar dataKey="winRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-[#71717a]">No map data available.</div>
              )}
            </div>

            {/* Map Popularity */}
<div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6">
  <h3 className="text-sm font-bold text-[#71717a] mb-4 uppercase tracking-wider">Map Popularity</h3>
  {mapPopularity.length > 0 ? (
    <div className="flex items-center gap-8">
      <ResponsiveContainer width={250} height={250}>
        <PieChart>
          <Pie
            data={mapPopularity}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {mapPopularity.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#121216',
              border: '1px solid #ffffff10',
              borderRadius: '8px',
            }}
            formatter={(value: any, name: any, props: any) => [`${value}%`, props.payload.name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {mapPopularity.map((map) => (
          <div key={map.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: map.fill }} />
              <span className="text-sm text-white">{map.name}</span>
            </div>
            <span className="text-sm text-[#71717a]">{map.value}%</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="h-[250px] flex items-center justify-center text-[#71717a]">
      No popularity data available.
    </div>
  )}
</div>
          </div>
        </section>
      </div>
    </main>
  );
}