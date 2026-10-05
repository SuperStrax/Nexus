import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { GlobalStats, PlayerPerformance, TeamLeaderboard, MapPopularity, MapWinRate, TeamRoster } from './analytics.types';
import { ParseIntPipe } from '@nestjs/common';  // не забудьте импортировать

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('global')
  async getGlobal(): Promise<GlobalStats> {
    return this.analyticsService.getGlobalStats();
  }

  @Get('top-players')
  async getPlayers(): Promise<PlayerPerformance[]> {
    return this.analyticsService.getTopPlayers();
  }

  @Get('teams')
  async getTeams(): Promise<TeamLeaderboard[]> {
    return this.analyticsService.getTeamLeaderboard();
  }

  @Get('map-win-rates')
async getMapWinRates() {
  return this.analyticsService.getMapWinRates();
}

@Get('map-popularity')
async getMapPopularity() {
  return this.analyticsService.getMapPopularity();
}

  @Get('h2h')
  async getH2H(@Query('t1') t1: string, @Query('t2') t2: string) {
    return this.analyticsService.getHeadToHead(Number(t1), Number(t2));
  }
  // analytics.controller.ts
@Get('teams/search')
async searchTeams(@Query('q') q: string) {
  return this.analyticsService.searchTeams(q);
}
@Get('head-to-head')
async getHeadToHead(@Query('t1') t1: string, @Query('t2') t2: string) {
  return this.analyticsService.getHeadToHead(+t1, +t2);
}

@Get('team-alltime-stats')
async getTeamAllTimeStats(@Query('teamId') teamId: string) {
  return this.analyticsService.getTeamAllTimeStats(+teamId);
}

@Get('team-roster')
async getTeamRoster(@Query('teamId', ParseIntPipe) teamId: number): Promise<TeamRoster> {
  const roster = await this.analyticsService.getTeamRoster(teamId);
  return roster;
}

@Get('predict')
async predict(@Query('team1_id') t1: string, @Query('team2_id') t2: string) {
  return this.analyticsService.getMlPrediction(+t1, +t2);
}

}