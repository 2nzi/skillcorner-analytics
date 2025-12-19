import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

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
 * Enriched player data for cards
 */
interface EnrichedPlayerData {
  id: string;
  playerId: string;
  name: string;
  surname: string;
  shortName: string;
  age: number;
  position: string;
  teamName: string;

  // Match statistics
  matchesPlayed: number;
  totalMinutesPlayed: number;
  totalGoals: number;
  totalYellowCards: number;
  totalRedCards: number;
  averageMinutesPerMatch: number;
  goalsPerMatch: number;

  // List of matches for this player
  matchIds: number[];
}

/**
 * GET /api/players/enriched
 *
 * Returns enriched player data extracted from match.json files.
 * This endpoint provides cleaner, aggregated data specifically for player cards.
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

    // Map to aggregate player stats: playerId -> EnrichedPlayerData
    const playerDataMap = new Map<string, EnrichedPlayerData>();

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

          // Get existing data or create new entry
          if (!playerDataMap.has(playerId)) {
            // Calculate age from birthday
            const birthYear = new Date(player.birthday).getFullYear();
            const currentYear = new Date().getFullYear();
            const age = currentYear - birthYear;

            // Split name for card display
            const nameParts = player.short_name.split(' ');
            const surname = nameParts.pop() || '';
            const name = nameParts.join(' ');

            playerDataMap.set(playerId, {
              id: playerId,
              playerId,
              name,
              surname,
              shortName: player.short_name,
              age,
              teamName,
              position: player.player_role.position_group,
              matchesPlayed: 0,
              totalMinutesPlayed: 0,
              totalGoals: 0,
              totalYellowCards: 0,
              totalRedCards: 0,
              averageMinutesPerMatch: 0,
              goalsPerMatch: 0,
              matchIds: []
            });
          }

          const playerData = playerDataMap.get(playerId)!;

          // Aggregate statistics
          playerData.totalMinutesPlayed += player.playing_time.total.minutes_played;
          playerData.totalGoals += player.goal;
          playerData.totalYellowCards += player.yellow_card;
          playerData.totalRedCards += player.red_card;
          playerData.matchesPlayed += 1;
          playerData.matchIds.push(matchData.id);
        }
      } catch (matchError) {
        console.warn(`Failed to process match ${matchId}:`, matchError);
        // Continue processing other matches
      }
    }

    // Convert map to array and calculate derived statistics
    const enrichedPlayers = Array.from(playerDataMap.values()).map(player => {
      // Calculate averages
      const averageMinutesPerMatch =
        player.matchesPlayed > 0
          ? Math.round((player.totalMinutesPlayed / player.matchesPlayed) * 10) / 10
          : 0;

      const goalsPerMatch =
        player.matchesPlayed > 0
          ? Math.round((player.totalGoals / player.matchesPlayed) * 100) / 100
          : 0;

      return {
        ...player,
        // Round total minutes to 1 decimal place
        totalMinutesPlayed: Math.round(player.totalMinutesPlayed * 10) / 10,
        averageMinutesPerMatch,
        goalsPerMatch
      };
    });

    return json(enrichedPlayers);
  } catch (error) {
    console.error('Error loading enriched player data:', error);
    return json({ error: 'Failed to load enriched player data' }, { status: 500 });
  }
};
