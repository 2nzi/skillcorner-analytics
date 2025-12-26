import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import type { SkillCornerMatch, SkillCornerDynamicEvent } from '$types/skillcorner';

/**
 * Head-to-head match data between two teams
 */
export interface MatchupData {
  opponent_id: number;
  possession_percentage: number;
  pass_accuracy: number;
}

/**
 * Team performance aggregated data
 */
export interface TeamPerformance {
  team_id: number;
  team_name: string;
  team_color: string;
  avg_possession: number;
  avg_pass_accuracy: number;
  matches_played: number;
  matchups: MatchupData[];
}

/**
 * Per-match team statistics
 */
interface MatchTeamStats {
  team_id: number;
  team_name: string;
  possession_percentage: number;
  pass_accuracy: number;
}

/**
 * GET /api/teams/performance
 *
 * Returns aggregated team performance data across all matches:
 * - Average possession percentage (from minutes_tip in match.json)
 * - Average pass accuracy (from dynamic_events.csv filtering player_possession + pass events)
 */
export const GET: RequestHandler = async () => {
  try {
    const matchesPath = join(process.cwd(), 'opendata', 'data', 'matches');

    // Read all match directories (reusing pattern from events API)
    const matchDirs = await readdir(matchesPath, { withFileTypes: true });
    const matchIds = matchDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Store per-match stats for each team (keyed by team_id for uniqueness)
    const teamMatchStats: Map<number, MatchTeamStats[]> = new Map();

    // Store team colors (first occurrence wins)
    const teamColors: Map<number, string> = new Map();

    // Store matchup data: team_id -> opponent_id -> { possessions: number[], pass_accuracies: number[] }
    const teamMatchups: Map<number, Map<number, { possessions: number[], pass_accuracies: number[] }>> = new Map();

    // Process each match
    for (const matchId of matchIds) {
      try {
        // 1. Read match.json to get possession data (reusing pattern from match-stats API)
        const matchFilePath = join(matchesPath, matchId, `${matchId}_match.json`);
        const matchContent = await readFile(matchFilePath, 'utf-8');
        const matchData: SkillCornerMatch = JSON.parse(matchContent);

        // Extract team data (using existing types)
        const homeTeamId = matchData.home_team?.id;
        const homeTeamName = matchData.home_team?.name;
        const awayTeamId = matchData.away_team?.id;
        const awayTeamName = matchData.away_team?.name;

        // Extract team colors from kits
        const homeTeamColor = matchData.home_team_kit?.jersey_color || '#FFFFFF';
        const awayTeamColor = matchData.away_team_kit?.jersey_color || '#FFFFFF';

        if (!homeTeamId || !homeTeamName || !awayTeamId || !awayTeamName) {
          continue;
        }

        // Store team colors (first occurrence)
        if (!teamColors.has(homeTeamId)) {
          teamColors.set(homeTeamId, homeTeamColor);
        }
        if (!teamColors.has(awayTeamId)) {
          teamColors.set(awayTeamId, awayTeamColor);
        }

        const homeTIP = matchData.home_team_playing_time?.minutes_tip || 0;
        const awayTIP = matchData.away_team_playing_time?.minutes_tip || 0;
        const totalTIP = homeTIP + awayTIP;

        // Calculate possession percentages
        const homePossession = totalTIP > 0 ? (homeTIP / totalTIP) * 100 : 0;
        const awayPossession = totalTIP > 0 ? (awayTIP / totalTIP) * 100 : 0;

        // 2. Read dynamic_events.csv (reusing pattern from events API)
        const eventsFilePath = join(matchesPath, matchId, `${matchId}_dynamic_events.csv`);
        const eventsContent = await readFile(eventsFilePath, 'utf-8');

        const events = parse(eventsContent, {
          columns: true,
          skip_empty_lines: true
        }) as SkillCornerDynamicEvent[];

        // Filter for pass events: event_type = player_possession AND end_type = pass
        // (following the same logic as phaseDataBuilder.ts extractPassEventsFromPhase)
        const passEvents = events.filter(
          event =>
            event.event_type === 'player_possession' &&
            event.end_type === 'pass'
        );

        // Group passes by team (using existing homeTeamId and awayTeamId variables)
        const homePassEvents = passEvents.filter(
          event => String(event.team_id) === String(homeTeamId)
        );
        const awayPassEvents = passEvents.filter(
          event => String(event.team_id) === String(awayTeamId)
        );

        // Calculate pass accuracy for each team (using pass_outcome field from types)
        const calculatePassAccuracy = (passes: SkillCornerDynamicEvent[]) => {
          if (passes.length === 0) return 0;
          const successfulPasses = passes.filter(
            event => event.pass_outcome === 'successful'
          ).length;
          return (successfulPasses / passes.length) * 100;
        };

        const homePassAccuracy = calculatePassAccuracy(homePassEvents);
        const awayPassAccuracy = calculatePassAccuracy(awayPassEvents);

        // Store match stats for home team
        if (!teamMatchStats.has(homeTeamId)) {
          teamMatchStats.set(homeTeamId, []);
        }
        teamMatchStats.get(homeTeamId)!.push({
          team_id: homeTeamId,
          team_name: homeTeamName,
          possession_percentage: homePossession,
          pass_accuracy: homePassAccuracy
        });

        // Store match stats for away team
        if (!teamMatchStats.has(awayTeamId)) {
          teamMatchStats.set(awayTeamId, []);
        }
        teamMatchStats.get(awayTeamId)!.push({
          team_id: awayTeamId,
          team_name: awayTeamName,
          possession_percentage: awayPossession,
          pass_accuracy: awayPassAccuracy
        });

        // Store matchup data for home team (against away team)
        if (!teamMatchups.has(homeTeamId)) {
          teamMatchups.set(homeTeamId, new Map());
        }
        if (!teamMatchups.get(homeTeamId)!.has(awayTeamId)) {
          teamMatchups.get(homeTeamId)!.set(awayTeamId, { possessions: [], pass_accuracies: [] });
        }
        teamMatchups.get(homeTeamId)!.get(awayTeamId)!.possessions.push(homePossession);
        teamMatchups.get(homeTeamId)!.get(awayTeamId)!.pass_accuracies.push(homePassAccuracy);

        // Store matchup data for away team (against home team)
        if (!teamMatchups.has(awayTeamId)) {
          teamMatchups.set(awayTeamId, new Map());
        }
        if (!teamMatchups.get(awayTeamId)!.has(homeTeamId)) {
          teamMatchups.get(awayTeamId)!.set(homeTeamId, { possessions: [], pass_accuracies: [] });
        }
        teamMatchups.get(awayTeamId)!.get(homeTeamId)!.possessions.push(awayPossession);
        teamMatchups.get(awayTeamId)!.get(homeTeamId)!.pass_accuracies.push(awayPassAccuracy);

      } catch (error) {
        console.warn(`Failed to process match ${matchId}:`, error);
        continue;
      }
    }

    // 3. Calculate averages for each team (following aggregation pattern from aggregates API)
    const teamPerformances: TeamPerformance[] = Array.from(teamMatchStats.entries()).map(
      ([teamId, matches]) => {
        const totalPossession = matches.reduce((sum, m) => sum + m.possession_percentage, 0);
        const totalPassAccuracy = matches.reduce((sum, m) => sum + m.pass_accuracy, 0);
        const matchesPlayed = matches.length;

        // Build matchups array with average possession and pass accuracy for each opponent
        const matchups: MatchupData[] = [];
        const opponentMap = teamMatchups.get(teamId);
        if (opponentMap) {
          opponentMap.forEach((data, opponentId) => {
            const avgPossession = data.possessions.reduce((sum, p) => sum + p, 0) / data.possessions.length;
            const avgPassAccuracy = data.pass_accuracies.reduce((sum, p) => sum + p, 0) / data.pass_accuracies.length;
            matchups.push({
              opponent_id: opponentId,
              possession_percentage: Math.round(avgPossession * 10) / 10,
              pass_accuracy: Math.round(avgPassAccuracy * 10) / 10
            });
          });
        }

        return {
          team_id: teamId,
          team_name: matches[0].team_name, // Team name is the same for all matches
          team_color: teamColors.get(teamId) || '#FFFFFF',
          avg_possession: Math.round((totalPossession / matchesPlayed) * 10) / 10,
          avg_pass_accuracy: Math.round((totalPassAccuracy / matchesPlayed) * 10) / 10,
          matches_played: matchesPlayed,
          matchups: matchups
        };
      }
    );

    // Sort by matches played (descending)
    teamPerformances.sort((a, b) => b.matches_played - a.matches_played);

    return json(teamPerformances);
  } catch (error) {
    console.error('Error loading team performance data:', error);
    return json({ error: 'Failed to load team performance data' }, { status: 500 });
  }
};
