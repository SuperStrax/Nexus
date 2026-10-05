"use client";

import { useState } from "react";
import { LiveMatchPlayer } from "./LiveMatchPlayer";
import { AiPrediction } from "./AiPrediction";
import { Activity } from "lucide-react";

export function LiveSection({ liveMatches }: { liveMatches: any[] }) {
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  return (
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          {liveMatches.length > 0 ? "Now Live" : "No Live Matches"}
        </h2>
        <LiveMatchPlayer
          matches={liveMatches}
          activeMatch={selectedMatch}
          onMatchSelect={setSelectedMatch}
        />
      </div>

      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">AI Insight</h2>
        <AiPrediction match={selectedMatch} />
      </div>
    </section>
  );
}