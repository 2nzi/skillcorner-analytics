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
  possession: number;
  pass_accuracy: number;
  pass_volume: number;
  total_xthreat: number;
  obr_per_min: number;
  lb_attempts: number;
  lb_success_rate: number;
  pressing_actions: number;
  regain_rate: number;
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
  avg_pass_volume: number;
  avg_total_xthreat: number;
  avg_obr_per_min: number;
  avg_lb_attempts: number;
  avg_lb_success_rate: number;
  avg_pressing_actions: number;
  avg_regain_rate: number;
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
  pass_volume: number;
  total_xthreat: number;
  obr_per_min: number;
  lb_attempts: number;
  lb_success_rate: number;
  pressing_actions: number;
  regain_rate: number;
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

    // Store matchup data: team_id -> opponent_id -> arrays of all metrics
    interface MatchupMetrics {
      possessions: number[];
      pass_accuracies: number[];
      pass_volumes: number[];
      total_xthreats: number[];
      obr_per_mins: number[];
      lb_attempts_arr: number[];
      lb_success_rates: number[];
      pressing_actions_arr: number[];
      regain_rates: number[];
    }
    const teamMatchups: Map<number, Map<number, MatchupMetrics>> = new Map();

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

        // Calculate additional metrics based on Python script

        // Pass volume: number of successful passes
        const homePassVolume = homePassEvents.filter(e => e.pass_outcome === 'successful').length;
        const awayPassVolume = awayPassEvents.filter(e => e.pass_outcome === 'successful').length;

        // Total xThreat: sum of xthreat from passing_option and off_ball_run events
        const homeTotalXThreat = events
          .filter(e =>
            String(e.team_id) === String(homeTeamId) &&
            (e.event_type === 'passing_option' || e.event_type === 'off_ball_run') &&
            e.xthreat != null && String(e.xthreat).length > 0
          )
          .reduce((sum, e) => sum + (parseFloat(String(e.xthreat)) || 0), 0);
        const awayTotalXThreat = events
          .filter(e =>
            String(e.team_id) === String(awayTeamId) &&
            (e.event_type === 'passing_option' || e.event_type === 'off_ball_run') &&
            e.xthreat != null && String(e.xthreat).length > 0
          )
          .reduce((sum, e) => sum + (parseFloat(String(e.xthreat)) || 0), 0);

        // Off-ball runs per minute
        const homeOBRCount = events.filter(e =>
          String(e.team_id) === String(homeTeamId) && e.event_type === 'off_ball_run'
        ).length;
        const awayOBRCount = events.filter(e =>
          String(e.team_id) === String(awayTeamId) && e.event_type === 'off_ball_run'
        ).length;
        const homeOBRPerMin = homeTIP > 0 ? homeOBRCount / homeTIP : 0;
        const awayOBRPerMin = awayTIP > 0 ? awayOBRCount / awayTIP : 0;

        // Line break attempts and success rate
        const homeLBAttempts = events.filter(e =>
          String(e.team_id) === String(homeTeamId) && (e.last_line_break === true || e.last_line_break === 'True')
        );
        const awayLBAttempts = events.filter(e =>
          String(e.team_id) === String(awayTeamId) && (e.last_line_break === true || e.last_line_break === 'True')
        );
        const homeLBSuccessRate = homeLBAttempts.length > 0
          ? (homeLBAttempts.filter(e => e.pass_outcome === 'successful').length / homeLBAttempts.length) * 100
          : 0;
        const awayLBSuccessRate = awayLBAttempts.length > 0
          ? (awayLBAttempts.filter(e => e.pass_outcome === 'successful').length / awayLBAttempts.length) * 100
          : 0;

        // Pressing actions and regain rate
        const homePressingActions = events.filter(e =>
          String(e.team_id) === String(homeTeamId) &&
          (e.event_subtype === 'pressing' || e.event_subtype === 'counter_press')
        );
        const awayPressingActions = events.filter(e =>
          String(e.team_id) === String(awayTeamId) &&
          (e.event_subtype === 'pressing' || e.event_subtype === 'counter_press')
        );
        const homeRegainRate = homePressingActions.length > 0
          ? (homePressingActions.filter(e => e.pressing_chain_end_type === 'regain').length / homePressingActions.length) * 100
          : 0;
        const awayRegainRate = awayPressingActions.length > 0
          ? (awayPressingActions.filter(e => e.pressing_chain_end_type === 'regain').length / awayPressingActions.length) * 100
          : 0;

        // Store match stats for home team
        if (!teamMatchStats.has(homeTeamId)) {
          teamMatchStats.set(homeTeamId, []);
        }
        teamMatchStats.get(homeTeamId)!.push({
          team_id: homeTeamId,
          team_name: homeTeamName,
          possession_percentage: homePossession,
          pass_accuracy: homePassAccuracy,
          pass_volume: homePassVolume,
          total_xthreat: homeTotalXThreat,
          obr_per_min: homeOBRPerMin,
          lb_attempts: homeLBAttempts.length,
          lb_success_rate: homeLBSuccessRate,
          pressing_actions: homePressingActions.length,
          regain_rate: homeRegainRate
        });

        // Store match stats for away team
        if (!teamMatchStats.has(awayTeamId)) {
          teamMatchStats.set(awayTeamId, []);
        }
        teamMatchStats.get(awayTeamId)!.push({
          team_id: awayTeamId,
          team_name: awayTeamName,
          possession_percentage: awayPossession,
          pass_accuracy: awayPassAccuracy,
          pass_volume: awayPassVolume,
          total_xthreat: awayTotalXThreat,
          obr_per_min: awayOBRPerMin,
          lb_attempts: awayLBAttempts.length,
          lb_success_rate: awayLBSuccessRate,
          pressing_actions: awayPressingActions.length,
          regain_rate: awayRegainRate
        });

        // Store matchup data for home team (against away team)
        if (!teamMatchups.has(homeTeamId)) {
          teamMatchups.set(homeTeamId, new Map());
        }
        if (!teamMatchups.get(homeTeamId)!.has(awayTeamId)) {
          teamMatchups.get(homeTeamId)!.set(awayTeamId, {
            possessions: [],
            pass_accuracies: [],
            pass_volumes: [],
            total_xthreats: [],
            obr_per_mins: [],
            lb_attempts_arr: [],
            lb_success_rates: [],
            pressing_actions_arr: [],
            regain_rates: []
          });
        }
        const homeMatchup = teamMatchups.get(homeTeamId)!.get(awayTeamId)!;
        homeMatchup.possessions.push(homePossession);
        homeMatchup.pass_accuracies.push(homePassAccuracy);
        homeMatchup.pass_volumes.push(homePassVolume);
        homeMatchup.total_xthreats.push(homeTotalXThreat);
        homeMatchup.obr_per_mins.push(homeOBRPerMin);
        homeMatchup.lb_attempts_arr.push(homeLBAttempts.length);
        homeMatchup.lb_success_rates.push(homeLBSuccessRate);
        homeMatchup.pressing_actions_arr.push(homePressingActions.length);
        homeMatchup.regain_rates.push(homeRegainRate);

        // Store matchup data for away team (against home team)
        if (!teamMatchups.has(awayTeamId)) {
          teamMatchups.set(awayTeamId, new Map());
        }
        if (!teamMatchups.get(awayTeamId)!.has(homeTeamId)) {
          teamMatchups.get(awayTeamId)!.set(homeTeamId, {
            possessions: [],
            pass_accuracies: [],
            pass_volumes: [],
            total_xthreats: [],
            obr_per_mins: [],
            lb_attempts_arr: [],
            lb_success_rates: [],
            pressing_actions_arr: [],
            regain_rates: []
          });
        }
        const awayMatchup = teamMatchups.get(awayTeamId)!.get(homeTeamId)!;
        awayMatchup.possessions.push(awayPossession);
        awayMatchup.pass_accuracies.push(awayPassAccuracy);
        awayMatchup.pass_volumes.push(awayPassVolume);
        awayMatchup.total_xthreats.push(awayTotalXThreat);
        awayMatchup.obr_per_mins.push(awayOBRPerMin);
        awayMatchup.lb_attempts_arr.push(awayLBAttempts.length);
        awayMatchup.lb_success_rates.push(awayLBSuccessRate);
        awayMatchup.pressing_actions_arr.push(awayPressingActions.length);
        awayMatchup.regain_rates.push(awayRegainRate);

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
        const totalPassVolume = matches.reduce((sum, m) => sum + m.pass_volume, 0);
        const totalXThreat = matches.reduce((sum, m) => sum + m.total_xthreat, 0);
        const totalOBRPerMin = matches.reduce((sum, m) => sum + m.obr_per_min, 0);
        const totalLBAttempts = matches.reduce((sum, m) => sum + m.lb_attempts, 0);
        const totalLBSuccessRate = matches.reduce((sum, m) => sum + m.lb_success_rate, 0);
        const totalPressingActions = matches.reduce((sum, m) => sum + m.pressing_actions, 0);
        const totalRegainRate = matches.reduce((sum, m) => sum + m.regain_rate, 0);
        const matchesPlayed = matches.length;

        // Build matchups array with all metrics averages for each opponent
        const matchups: MatchupData[] = [];
        const opponentMap = teamMatchups.get(teamId);
        if (opponentMap) {
          opponentMap.forEach((data, opponentId) => {
            const numMatches = data.possessions.length;
            matchups.push({
              opponent_id: opponentId,
              possession: Math.round((data.possessions.reduce((sum, p) => sum + p, 0) / numMatches) * 10) / 10,
              pass_accuracy: Math.round((data.pass_accuracies.reduce((sum, p) => sum + p, 0) / numMatches) * 10) / 10,
              pass_volume: Math.round((data.pass_volumes.reduce((sum, p) => sum + p, 0) / numMatches) * 10) / 10,
              total_xthreat: Math.round((data.total_xthreats.reduce((sum, p) => sum + p, 0) / numMatches) * 100) / 100,
              obr_per_min: Math.round((data.obr_per_mins.reduce((sum, p) => sum + p, 0) / numMatches) * 100) / 100,
              lb_attempts: Math.round((data.lb_attempts_arr.reduce((sum, p) => sum + p, 0) / numMatches) * 10) / 10,
              lb_success_rate: Math.round((data.lb_success_rates.reduce((sum, p) => sum + p, 0) / numMatches) * 10) / 10,
              pressing_actions: Math.round((data.pressing_actions_arr.reduce((sum, p) => sum + p, 0) / numMatches) * 10) / 10,
              regain_rate: Math.round((data.regain_rates.reduce((sum, p) => sum + p, 0) / numMatches) * 10) / 10
            });
          });
        }

        return {
          team_id: teamId,
          team_name: matches[0].team_name, // Team name is the same for all matches
          team_color: teamColors.get(teamId) || '#FFFFFF',
          avg_possession: Math.round((totalPossession / matchesPlayed) * 10) / 10,
          avg_pass_accuracy: Math.round((totalPassAccuracy / matchesPlayed) * 10) / 10,
          avg_pass_volume: Math.round((totalPassVolume / matchesPlayed) * 10) / 10,
          avg_total_xthreat: Math.round((totalXThreat / matchesPlayed) * 100) / 100,
          avg_obr_per_min: Math.round((totalOBRPerMin / matchesPlayed) * 100) / 100,
          avg_lb_attempts: Math.round((totalLBAttempts / matchesPlayed) * 10) / 10,
          avg_lb_success_rate: Math.round((totalLBSuccessRate / matchesPlayed) * 10) / 10,
          avg_pressing_actions: Math.round((totalPressingActions / matchesPlayed) * 10) / 10,
          avg_regain_rate: Math.round((totalRegainRate / matchesPlayed) * 10) / 10,
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
