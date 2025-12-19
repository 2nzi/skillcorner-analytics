import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Player data from match.json file
 */
interface MatchPlayerData {
  id: number;
  first_name: string;
  last_name: string;
  short_name: string;
  birthday: string;
  team_id: number;
  number: number;
  goal: number;
  own_goal: number;
  yellow_card: number;
  red_card: number;
  player_role: {
    id: number;
    position_group: string;
    name: string;
    acronym: string;
  };
  playing_time: {
    total: {
      minutes_played: number;
      minutes_tip: number;
      minutes_otip: number;
    } | null;
  };
}

/**
 * Match data structure
 */
interface MatchData {
  id: number;
  date_time: string;
  home_team: {
    id: number;
    name: string;
    short_name: string;
  };
  away_team: {
    id: number;
    name: string;
    short_name: string;
  };
  players: MatchPlayerData[];
}

/**
 * Aggregated player statistics from all matches
 */
interface PlayerMatchStats {
  playerId: string;
  firstName: string;
  lastName: string;
  shortName: string;
  age: number;
  teamName: string;
  position: string;

  // Aggregated statistics
  totalMinutesPlayed: number;
  totalGoals: number;
  totalOwnGoals: number;
  totalYellowCards: number;
  totalRedCards: number;
  matchesPlayed: number;
  matchIds: number[];
}

/**
 * GET /api/players/match-stats
 *
 * Returns aggregated player statistics extracted from match.json files.
 * For each player, calculates cumulative stats like minutes played, goals, cards, etc.
 */
export const GET: RequestHandler = async () => {
  try {
    // Path to matches folder
    const matchesPath = join(process.cwd(), 'opendata', 'data', 'matches');

    // Read all match directories
    const matchDirs = await readdir(matchesPath, { withFileTypes: true });
    const matchIds = matchDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Map to aggregate player stats: playerId -> PlayerMatchStats
    const playerStatsMap = new Map<string, PlayerMatchStats>();

    // Process each match
    for (const matchId of matchIds) {
      try {
        const matchFilePath = join(matchesPath, matchId, `${matchId}_match.json`);
        const matchContent = await readFile(matchFilePath, 'utf-8');
        const matchData: MatchData = JSON.parse(matchContent);

        // Process each player in the match
        for (const player of matchData.players) {
          // Skip substitute players who didn't play
          if (!player.playing_time.total) {
            continue;
          }

          const playerId = String(player.id);

          // Determine team name for this player
          const teamName = player.team_id === matchData.home_team.id
            ? matchData.home_team.name
            : matchData.away_team.name;

          // Get existing stats or create new entry
          if (!playerStatsMap.has(playerId)) {
            // Calculate age from birthday
            const birthYear = new Date(player.birthday).getFullYear();
            const currentYear = new Date().getFullYear();
            const age = currentYear - birthYear;

            playerStatsMap.set(playerId, {
              playerId,
              firstName: player.first_name,
              lastName: player.last_name,
              shortName: player.short_name,
              age,
              teamName,
              position: player.player_role.position_group,
              totalMinutesPlayed: 0,
              totalGoals: 0,
              totalOwnGoals: 0,
              totalYellowCards: 0,
              totalRedCards: 0,
              matchesPlayed: 0,
              matchIds: []
            });
          }

          const stats = playerStatsMap.get(playerId)!;

          // Aggregate statistics
          stats.totalMinutesPlayed += player.playing_time.total.minutes_played;
          stats.totalGoals += player.goal;
          stats.totalOwnGoals += player.own_goal;
          stats.totalYellowCards += player.yellow_card;
          stats.totalRedCards += player.red_card;
          stats.matchesPlayed += 1;
          stats.matchIds.push(matchData.id);
        }
      } catch (matchError) {
        console.warn(`Failed to process match ${matchId}:`, matchError);
        // Continue processing other matches
      }
    }

    // Convert map to array and format response
    const playersStats = Array.from(playerStatsMap.values()).map(stats => ({
      playerId: stats.playerId,
      firstName: stats.firstName,
      lastName: stats.lastName,
      shortName: stats.shortName,
      age: stats.age,
      teamName: stats.teamName,
      position: stats.position,

      // Round minutes to 1 decimal place
      totalMinutesPlayed: Math.round(stats.totalMinutesPlayed * 10) / 10,
      totalGoals: stats.totalGoals,
      totalOwnGoals: stats.totalOwnGoals,
      totalYellowCards: stats.totalYellowCards,
      totalRedCards: stats.totalRedCards,
      matchesPlayed: stats.matchesPlayed,
      matchIds: stats.matchIds,

      // Calculated stats
      averageMinutesPerMatch: Math.round((stats.totalMinutesPlayed / stats.matchesPlayed) * 10) / 10,
      goalsPerMatch: Math.round((stats.totalGoals / stats.matchesPlayed) * 100) / 100
    }));

    return json(playersStats);
  } catch (error) {
    console.error('Error loading player match statistics:', error);
    return json({ error: 'Failed to load player match statistics' }, { status: 500 });
  }
};
