import { LiveSection } from "@/components/LiveSection";
import { Trophy } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  try {
    const [liveRes, recentRes] = await Promise.all([
      fetch("http://localhost:3000/matches?status=live&limit=5", {
        cache: "no-store",
      }),
      fetch("http://localhost:3000/matches?status=results&limit=5", {
        cache: "no-store",
      }),
    ]);

    const liveMatches = await liveRes.json();
    const recentMatches = await recentRes.json();

    return (
      <div className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto">
        {/* Верхний ряд: Плеер + AI Прогноз */}
        <LiveSection liveMatches={liveMatches} />

        {/* Нижний ряд: История матчей */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Recent Database Results
            </h2>
            <Link
              href="/matches"
              className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-[0.2em] transition-colors"
            >
              Full History →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recentMatches.map((match: any) => (
              <Link
                href={`/matches/${match.match_id}`}
                key={match.match_id}
                className="block group"
              >
                <div className="bg-[#121216] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/50 transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>

                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-4 tracking-wider truncate">
                    {match.tournament || "Pro Match"}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300 truncate mr-2">
                        {match.teams_matches_team1_idToteams?.name || "T1"}
                      </span>
                      <span className="text-lg font-black text-white">
                        {match.score_team1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300 truncate mr-2">
                        {match.teams_matches_team2_idToteams?.name || "T2"}
                      </span>
                      <span className="text-lg font-black text-white">
                        {match.score_team2}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[9px] text-slate-600 font-bold uppercase">
                      Finished
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">
                      {match.match_date
                        ? new Date(match.match_date).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-20 text-center text-white text-xl">
        Backend offline.
      </div>
    );
  }
}