export interface GlobalStats {
  totalMatches: number;
  activePlayers: number;
  activeTeams: number;
  avgRating: number;
}

export interface PlayerPerformance {
  player_id: number; // Было id
  nickname: string;
  teamName: string;
  avgRating: number;
  avgAdr: number;
  avgKast: number;
  totalKills: number;
  totalDeaths: number;
  ratingHistory: { date: string; rating: number }[];
}

export interface TeamLeaderboard {
  team_id: number; // Было id
  name: string;
  winRate: number;
  wins: number;
  losses: number;
  totalMatches: number;
  form: number[];  // ← добавьте это поле
}

export interface MapWinRate {
  name: string;
  winRate: number;
}

export interface MapPopularity {
  name: string;
  value: number;
  fill: string;
}

export interface KeyFactor {
  name: string;
  team1Value: number;
  team2Value: number;
  advantage: 'team1' | 'team2' | 'none';
  weight: number; // процент важности
}
export interface PlayerRating {
  player_id: number;
  nickname: string;
  avgRating: number;
}

export interface TeamRoster {
  team_id: number;
  name: string;
  players: PlayerRating[];
}

export interface HeadToHeadResponse {
  team1Wins: number;
  team2Wins: number;
  matches: {
    date: string;
    t1Score: number;
    t2Score: number;
    t1Name: string;
    t2Name: string;
    event: string;
  }[];

  
}