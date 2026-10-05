import { Controller, Get, Query, Param } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('matches')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  // --- ДЕТАЛИ МАТЧА (Твой оригинальный рабочий метод) ---
  @Get(':id')
  async getMatchFullDetails(@Param('id') id: string) {
    return this.prisma.matches.findUnique({
      where: { match_id: parseInt(id) },
      include: {
        teams_matches_team1_idToteams: true,
        teams_matches_team2_idToteams: true,
        match_maps: true, 
        player_match_stats: {
          include: {
            players: true, 
            teams: true,   
          },
        },
      },
    });
  }

  // --- СПИСОК МАТЧЕЙ ---
  @Get()
async getMatches(
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '50',
  @Query('status') status: string = 'results',
  @Query('search') search?: string,
  @Query('dateFrom') dateFrom?: string,
  @Query('dateTo') dateTo?: string,
) {
  const p = parseInt(page) || 1;
  const l = parseInt(limit) || 50;
  const skip = (p - 1) * l;

  const dbStatus = status === 'results' ? 'finished' : status;

  const where: any = { status: dbStatus };

  // Фильтр по дате
  if (dateFrom || dateTo) {
    where.match_date = {};
    if (dateFrom) where.match_date.gte = new Date(dateFrom);
    if (dateTo) where.match_date.lte = new Date(dateTo);
  }

  // Поиск по названию турнира или команд
  if (search) {
    where.OR = [
      { tournament: { contains: search, mode: 'insensitive' } },
      { teams_matches_team1_idToteams: { name: { contains: search, mode: 'insensitive' } } },
      { teams_matches_team2_idToteams: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return this.prisma.matches.findMany({
    take: l,
    skip,
    where,
    orderBy: { match_date: status === 'upcoming' ? 'asc' : 'desc' },
    include: {
      teams_matches_team1_idToteams: { select: { name: true } },
      teams_matches_team2_idToteams: { select: { name: true } },
    },
  });
}
}