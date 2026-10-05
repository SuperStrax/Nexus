import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GlobalStats, PlayerPerformance, TeamLeaderboard, MapPopularity, MapWinRate,HeadToHeadResponse, TeamRoster, PlayerRating} from './analytics.types';
import { DefaultArgs } from '@prisma/client/runtime/library'; // Импорт для типов

// Добавляем новый тип для данных команды
interface TeamLeaderboardEntry {
  team_id: number;
  name: string;
  winRate: number;
  wins: number;
  losses: number;
  totalMatches: number;
  form: number[]; // Массив из 0 и 1, где 1 - победа, 0 - поражение
}


@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  
  async getGlobalStats() {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // 1. Общее количество матчей (за всё время)
    const totalMatches = await this.prisma.matches.count();

    // 2. Количество новых матчей за последнюю неделю
    const newMatchesThisWeekCount = await this.prisma.matches.count({
      where: { match_date: { gte: sevenDaysAgo } }
    });

    // 3. Активные игроки за последнюю неделю (как мы определили ранее)
    const activePlayersResult = await this.prisma.player_match_stats.groupBy({
      by: ['player_id'],
      where: { matches: { match_date: { gte: sevenDaysAgo } } }
    });
    const activePlayersCount = activePlayersResult.length;

    // 4. Общее количество игроков
    const totalPlayers = await this.prisma.players.count();

    // 5. Общее количество команд
    const teamsCount = await this.prisma.teams.count();

    // 6. Средний рейтинг
    const avgRatingData = await this.prisma.player_match_stats.aggregate({ _avg: { rating: true } });
    const avgRating = Number((avgRatingData._avg?.rating ?? 0).toFixed(2));

    return {
      totalMatches,
      // --- Заменяем тренд на количество матчей за неделю ---
      matchesSubtitle: `${newMatchesThisWeekCount} matches this week`, 
      activePlayers: totalPlayers,
      activePlayersWeek: `${activePlayersCount} active this week`,
      activeTeams: teamsCount,
      avgRating: avgRating,
    };
  }

async getTopPlayers(): Promise<PlayerPerformance[]> {
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    const MIN_MATCHES_THRESHOLD = 30;

    // 1. Все игроки, у которых есть хотя бы одна игра за 6 месяцев
    const activePlayersData = await this.prisma.player_match_stats.findMany({
        where: { matches: { match_date: { gte: sixMonthsAgo } } },
        select: { player_id: true },
        distinct: ['player_id'],
    });
    const activePlayerIds = activePlayersData
        .map(p => p.player_id)
        .filter((id): id is number => id !== null);

    // 2. Количество матчей каждого из них за 6 месяцев
    const matchCounts = await this.prisma.player_match_stats.groupBy({
        by: ['player_id'],
        _count: { stat_id: true },
        where: {
            player_id: { in: activePlayerIds },
            matches: { match_date: { gte: sixMonthsAgo } },
        },
    });
    const countsMap = new Map<number, number>();
    for (const item of matchCounts) {
        if (item.player_id !== null) {
            countsMap.set(item.player_id, item._count.stat_id);
        }
    }

    // 3. Кандидаты: ≥30 матчей за период
    const candidateIds = activePlayerIds.filter(id => (countsMap.get(id) ?? 0) >= MIN_MATCHES_THRESHOLD);

    const eligiblePlayers: PlayerPerformance[] = [];

    for (const playerId of candidateIds) {
        // 4. Проверка «стажа»: первый матч должен быть ≥6 месяцев назад
        const firstStat = await this.prisma.player_match_stats.findFirst({
            where: { player_id: playerId },
            orderBy: { matches: { match_date: 'asc' } },
            include: { matches: { select: { match_date: true } } },
        });
        const firstMatchDate = firstStat?.matches?.match_date;
        if (!firstMatchDate || new Date(firstMatchDate).getTime() > sixMonthsAgo.getTime()) {
            continue; // играет меньше полугода
        }

        // 5. Агрегация статистики за 6 месяцев
        const statsAgg = await this.prisma.player_match_stats.aggregate({
            where: {
                player_id: playerId,
                matches: { match_date: { gte: sixMonthsAgo } },
            },
            _avg: { rating: true, adr: true, kast: true },
            _sum: { kills: true, deaths: true },
        });

        // 6. Основные данные игрока и последняя команда
        const player = await this.prisma.players.findUnique({ where: { player_id: playerId } });
        const lastStat = await this.prisma.player_match_stats.findFirst({
            where: { player_id: playerId },
            orderBy: { stat_id: 'desc' },
            include: { teams: true },
        });

        // 7. Помесячная история рейтинга
        const historyRaw = await this.prisma.player_match_stats.findMany({
            where: {
                player_id: playerId,
                matches: { match_date: { gte: sixMonthsAgo } },
            },
            orderBy: { matches: { match_date: 'asc' } },
            select: { matches: { select: { match_date: true } }, rating: true },
        });

        const monthlyMap = new Map<string, { sum: number; count: number }>();
        for (const entry of historyRaw) {
            const date = entry.matches?.match_date;
            if (!date || entry.rating == null) continue;
            const key = new Date(date).toLocaleString('en-US', { month: 'short', year: 'numeric' });
            if (!monthlyMap.has(key)) monthlyMap.set(key, { sum: 0, count: 0 });
            const m = monthlyMap.get(key)!;
            m.sum += entry.rating;
            m.count++;
        }

        const ratingHistory = Array.from(monthlyMap.entries())
            .map(([date, data]) => ({
                date,
                rating: parseFloat((data.sum / data.count).toFixed(2)),
            }))
            .sort((a, b) => new Date(a.date.replace(',', '')).getTime() - new Date(b.date.replace(',', '')).getTime());

        eligiblePlayers.push({
            player_id: playerId,
            nickname: player?.name ?? 'Unknown',
            teamName: lastStat?.teams?.name ?? 'Free Agent',
            avgRating: Number((statsAgg._avg?.rating ?? 0).toFixed(2)),
            avgAdr: Number((statsAgg._avg?.adr ?? 0).toFixed(1)),
            avgKast: Number((statsAgg._avg?.kast ?? 0).toFixed(1)),
            totalKills: statsAgg._sum?.kills ?? 0,
            totalDeaths: statsAgg._sum?.deaths ?? 0,
            ratingHistory: ratingHistory as { date: string; rating: number }[],
        });
    }

    // Сортировка по убыванию рейтинга, топ-5
    return eligiblePlayers
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 5);
}
  
  // ... (остальные методы сервиса) ...

  async getTeamLeaderboard(): Promise<TeamLeaderboard[]> {
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  const MIN_MATCHES = 30;
  const FORM_LAST_N = 5;

  const teams = await this.prisma.teams.findMany({
    include: {
      matches_matches_team1_idToteams: {
        where: {
          match_date: { gte: sixMonthsAgo },
          status: 'finished',
        },
        select: { match_date: true, winner_team_id: true },
        orderBy: { match_date: 'desc' },
      },
      matches_matches_team2_idToteams: {
        where: {
          match_date: { gte: sixMonthsAgo },
          status: 'finished',
        },
        select: { match_date: true, winner_team_id: true },
        orderBy: { match_date: 'desc' },
      },
    },
  });

  const result: TeamLeaderboard[] = [];

  for (const team of teams) {
    const allMatches = [
      ...team.matches_matches_team1_idToteams,
      ...team.matches_matches_team2_idToteams,
    ].sort((a, b) => {
      const dateA = a.match_date ? new Date(a.match_date).getTime() : 0;
      const dateB = b.match_date ? new Date(b.match_date).getTime() : 0;
      return dateB - dateA;
    });

    const totalMatches = allMatches.length;
    if (totalMatches < MIN_MATCHES) continue;   // пропускаем команды с малым количеством игр

    const wins = allMatches.filter(m => m.winner_team_id === team.team_id).length;
    const losses = totalMatches - wins;
    const winRate = Number(((wins / totalMatches) * 100).toFixed(1));

    const lastN = allMatches.slice(0, FORM_LAST_N);
    const form: number[] = lastN
      .map(m => (m.winner_team_id === team.team_id ? 1 : 0))
      .reverse(); // от старого к новому

    result.push({
      team_id: team.team_id,
      name: team.name,
      winRate,
      wins,
      losses,
      totalMatches,
      form,
    });
  }

  return result
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);
}

async getMapWinRates(): Promise<MapWinRate[]> {
  const maps = await this.prisma.match_maps.findMany({
    select: {
      map_name: true,
      team1_score: true,
      team2_score: true,
    },
  });

  const stats: Record<string, { wins: number; total: number }> = {};

  for (const m of maps) {
    if (!m.map_name) continue;
    if (!stats[m.map_name]) stats[m.map_name] = { wins: 0, total: 0 };
    stats[m.map_name].total++;
    if ((m.team1_score ?? 0) > (m.team2_score ?? 0)) {
      stats[m.map_name].wins++;
    }
  }

  return Object.entries(stats)
    .map(([name, { wins, total }]) => ({
      name,
      winRate: Math.round((wins / total) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 10);
}

async getMapPopularity(): Promise<MapPopularity[]> {
  const result = await this.prisma.match_maps.groupBy({
    by: ['map_name'],
    _count: { map_name: true },
    orderBy: { _count: { map_name: 'desc' } },
  });

  const totalMatches = result.reduce((sum, item) => sum + item._count.map_name, 0);
  const colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#14b8a6'];

  return result
    .filter(item => item.map_name)
    .slice(0, 10)
    .map((item, i) => ({
      name: item.map_name!,
      value: Math.round((item._count.map_name / totalMatches) * 100),
      fill: colors[i % colors.length],
    }));
}

  async getHeadToHead(t1: number, t2: number): Promise<HeadToHeadResponse> {
  const allMatches = await this.prisma.matches.findMany({
    where: {
      OR: [
        { team1_id: t1, team2_id: t2 },
        { team1_id: t2, team2_id: t1 },
      ],
      status: 'finished',
    },
    orderBy: { match_date: 'desc' },
    include: {
      teams_matches_team1_idToteams: { select: { name: true } },
      teams_matches_team2_idToteams: { select: { name: true } },
    },
  });

  let team1Wins = 0;
  let team2Wins = 0;

  const matches = allMatches.slice(0, 5).map((m) => {
    // Определяем, кто из команд team1, а кто team2 в рамках этого матча
    const isTeam1First = m.team1_id === t1;
    const t1Score = isTeam1First ? m.score_team1 : m.score_team2;
    const t2Score = isTeam1First ? m.score_team2 : m.score_team1;
    const t1Name = isTeam1First
      ? m.teams_matches_team1_idToteams?.name ?? 'Team 1'
      : m.teams_matches_team2_idToteams?.name ?? 'Team 1';
    const t2Name = isTeam1First
      ? m.teams_matches_team2_idToteams?.name ?? 'Team 2'
      : m.teams_matches_team1_idToteams?.name ?? 'Team 2';

    // Подсчёт побед для общего счёта
    if (m.winner_team_id === t1) team1Wins++;
    else if (m.winner_team_id === t2) team2Wins++;

    return {
      date: m.match_date
        ? new Date(m.match_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'N/A',
      t1Score: t1Score ?? 0,
      t2Score: t2Score ?? 0,
      t1Name,
      t2Name,
      event: m.tournament ?? 'Tournament',
    };
  });

  // Если мы перебирали только последние 5, то общий счёт нужно посчитать по всем матчам
  // Поэтому пересчитаем по полному allMatches
  team1Wins = 0;
  team2Wins = 0;
  for (const m of allMatches) {
    if (m.winner_team_id === t1) team1Wins++;
    else if (m.winner_team_id === t2) team2Wins++;
  }

  return {
    team1Wins,
    team2Wins,
    matches,
  };
}
async searchTeams(query: string): Promise<{ team_id: number; name: string }[]> {
  if (!query || query.trim().length === 0) return [];
  return this.prisma.teams.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' },
    },
    select: { team_id: true, name: true },
    take: 10, // ограничим результаты
    orderBy: { name: 'asc' },
  });
}
async getTeamAllTimeStats(teamId: number): Promise<TeamLeaderboard | null> {
  const FORM_LAST_N = 5;

  const team = await this.prisma.teams.findUnique({
    where: { team_id: teamId },
    include: {
      matches_matches_team1_idToteams: {
        where: { status: 'finished' },
        select: { match_date: true, winner_team_id: true },
        orderBy: { match_date: 'desc' },
      },
      matches_matches_team2_idToteams: {
        where: { status: 'finished' },
        select: { match_date: true, winner_team_id: true },
        orderBy: { match_date: 'desc' },
      },
    },
  });

  if (!team) return null;

  const allMatches = [
    ...team.matches_matches_team1_idToteams,
    ...team.matches_matches_team2_idToteams,
  ].sort((a, b) => {
    const dateA = a.match_date ? new Date(a.match_date).getTime() : 0;
    const dateB = b.match_date ? new Date(b.match_date).getTime() : 0;
    return dateB - dateA;
  });

  const wins = allMatches.filter(m => m.winner_team_id === teamId).length;
  const totalMatches = allMatches.length;
  const losses = totalMatches - wins;
  const winRate = totalMatches > 0 ? Number(((wins / totalMatches) * 100).toFixed(1)) : 0;

  const lastN = allMatches.slice(0, FORM_LAST_N);
  const form: number[] = lastN
    .map(m => (m.winner_team_id === teamId ? 1 : 0))
    .reverse(); // от старых к новым

  return {
    team_id: team.team_id,
    name: team.name,
    winRate,
    wins,
    losses,
    totalMatches,
    form,
  };
}

async getTeamRoster(teamId: number): Promise<TeamRoster> {
  // Получаем имя команды заранее, чтобы использовать в любом случае
  const numericId = Number(teamId);
  const team = await this.prisma.teams.findUnique({
    where: { team_id: numericId },
    select: { name: true },
  });
  const teamName = team?.name ?? 'Unknown';

  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  const stats = await this.prisma.player_match_stats.findMany({
    where: {
      team_id: numericId,
      matches: { match_date: { gte: sixMonthsAgo } },
      is_standin: false,   // только основные игроки (если поле есть)
    },
    include: {
      players: { select: { player_id: true, name: true } },
    },
  });

  // Группируем по игроку, считаем средний рейтинг
  const playerMap = new Map<number, { nickname: string; ratings: number[] }>();
  for (const s of stats) {
    if (s.player_id == null || s.rating == null) continue;
    if (!playerMap.has(s.player_id)) {
      playerMap.set(s.player_id, { nickname: s.players?.name ?? 'Unknown', ratings: [] });
    }
    playerMap.get(s.player_id)!.ratings.push(s.rating);
  }

  const roster: PlayerRating[] = [];
  for (const [player_id, { nickname, ratings }] of playerMap.entries()) {
    const avgRating = Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2));
    roster.push({ player_id, nickname, avgRating });
  }

  roster.sort((a, b) => b.avgRating - a.avgRating);

  // Всегда возвращаем объект TeamRoster, даже если игроков нет
  return {
    team_id: teamId,
    name: teamName,
    players: roster,   // пустой массив при отсутствии данных
  };
}

async getMlPrediction(team1Id: number, team2Id: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`http://127.0.0.1:5000/predict?team1_id=${team1Id}&team2_id=${team2Id}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`ML service responded with ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

}