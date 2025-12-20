import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Event from CSV
 */
interface DynamicEvent {
  event_id: string;
  event_type: string;
  event_subtype: string;
  player_id: string;
  player_name: string;
  match_id: string;
  minute_start: number;
  second_start: number;
  duration: number;
  third_id_start: string;
  third_id_end: string;
  force_backward: string | boolean;
  affected_line_break: string | null;
  pressing_chain_end_type: string | null;
}

/**
 * Aggregated event statistics
 */
interface EventStats {
  playerId: string;
  eventType: string;
  totalEvents: number;
  totalMinutesPlayed: number;
  eventsPer30Minutes: number;

  // Breakdown by subtype
  subtypeBreakdown: {
    subtype: string;
    count: number;
    percentage: number;
    per30OTIP: number;
    midBlockCount: number;
    highBlockCount: number;
    midBlockPer30OTIP: number;
    highBlockPer30OTIP: number;
    forceBackwardCount: number;
    forceBackwardPercentage: number;
    affectedLineBreakCount: number;
    affectedLineBreakPercentage: number;
    regainCount: number;
    regainPercentage: number;
  }[];

  // Match-level details
  matchStats: {
    matchId: string;
    events: number;
    otipMinutes: number;
    eventsPer30OTIP: number;
  }[];
}

/**
 * GET /api/players/[playerId]/events/[eventType]
 *
 * Returns event statistics for a specific player and event type across all their matches.
 * Calculates events normalized per 30 minutes OTIP like SkillCorner does.
 */
export const GET: RequestHandler = async ({ params }) => {
  const { playerId, eventType } = params;

  if (!playerId || !eventType) {
    return json({ error: 'Player ID and Event Type are required' }, { status: 400 });
  }

  try {
    // First, get player's match data to find which matches they played in
    const matchesPath = join(process.cwd(), 'opendata', 'data', 'matches');

    // We need to scan all match.json files to find matches where this player participated
    const fs = await import('fs/promises');
    const matchDirs = await fs.readdir(matchesPath, { withFileTypes: true });
    const matchIds = matchDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const playerMatchIds: string[] = [];
    const playerMatchOTIPMinutes: Map<string, number> = new Map();

    // Find matches where player participated
    for (const matchId of matchIds) {
      try {
        const matchFilePath = join(matchesPath, matchId, `${matchId}_match.json`);
        const matchContent = await readFile(matchFilePath, 'utf-8');
        const matchData = JSON.parse(matchContent);

        // Check if player played in this match
        const playerInMatch = matchData.players?.find(
          (p: any) => String(p.id) === playerId && p.playing_time?.total
        );

        if (playerInMatch) {
          playerMatchIds.push(matchId);
          // Use minutes_otip (Opponent Team In Possession) for normalization
          const otipMinutes = playerInMatch.playing_time.total.minutes_otip || 0;
          playerMatchOTIPMinutes.set(matchId, otipMinutes);
        }
      } catch (error) {
        // Skip matches that can't be read
        continue;
      }
    }

    if (playerMatchIds.length === 0) {
      return json({
        playerId,
        eventType,
        totalEvents: 0,
        totalMinutesPlayed: 0,
        eventsPer30Minutes: 0,
        subtypeBreakdown: [],
        matchStats: []
      });
    }

    // Now read events from dynamic_events.csv for each match
    let totalEvents = 0;
    let totalOTIPMinutes = 0;
    const subtypeCounts: Map<string, number> = new Map();
    const subtypeMidBlockCounts: Map<string, number> = new Map();
    const subtypeHighBlockCounts: Map<string, number> = new Map();
    const subtypeForceBackwardCounts: Map<string, number> = new Map();
    const subtypeAffectedLineBreakCounts: Map<string, number> = new Map();
    const subtypeRegainCounts: Map<string, number> = new Map();
    const matchStats: { matchId: string; events: number; otipMinutes: number; eventsPer30OTIP: number }[] = [];

    for (const matchId of playerMatchIds) {
      try {
        const eventsFilePath = join(matchesPath, matchId, `${matchId}_dynamic_events.csv`);
        const eventsContent = await readFile(eventsFilePath, 'utf-8');

        const events = parse(eventsContent, {
          columns: true,
          skip_empty_lines: true
        }) as DynamicEvent[];

        // Filter events for this player where event_type matches the requested type
        const playerEvents = events.filter(
          event => String(event.player_id) === playerId && event.event_type === eventType
        );

        const matchEventsCount = playerEvents.length;
        const matchOTIPMinutes = playerMatchOTIPMinutes.get(matchId) || 0;

        // Count by subtype and track third_start_id and third_end_id
        playerEvents.forEach(event => {
          const subtype = event.event_subtype || 'unknown';
          subtypeCounts.set(subtype, (subtypeCounts.get(subtype) || 0) + 1);

          // Count mid block (id 2) and high block (id 3) for third_id_start and third_id_end
          const thirdIdStart = String(event.third_id_start);
          const thirdIdEnd = String(event.third_id_end);

          if (thirdIdStart === '2' || thirdIdEnd === '2') {
            subtypeMidBlockCounts.set(subtype, (subtypeMidBlockCounts.get(subtype) || 0) + 1);
          }

          if (thirdIdStart === '3' || thirdIdEnd === '3') {
            subtypeHighBlockCounts.set(subtype, (subtypeHighBlockCounts.get(subtype) || 0) + 1);
          }

          // Count force_backward (True or true)
          if (event.force_backward === true || event.force_backward === 'True' || event.force_backward === 'true') {
            subtypeForceBackwardCounts.set(subtype, (subtypeForceBackwardCounts.get(subtype) || 0) + 1);
          }

          // Count affected_line_break (not None/NA/null/empty)
          if (event.affected_line_break &&
              event.affected_line_break !== 'None' &&
              event.affected_line_break !== 'NA' &&
              event.affected_line_break !== '') {
            subtypeAffectedLineBreakCounts.set(subtype, (subtypeAffectedLineBreakCounts.get(subtype) || 0) + 1);
          }

          // Count regain (pressing_chain_end_type === "regain")
          if (event.pressing_chain_end_type === 'regain') {
            subtypeRegainCounts.set(subtype, (subtypeRegainCounts.get(subtype) || 0) + 1);
          }
        });

        totalEvents += matchEventsCount;
        totalOTIPMinutes += matchOTIPMinutes;

        // Calculate per 30 OTIP minutes for this match
        const eventsPer30OTIP = matchOTIPMinutes > 0 ? (matchEventsCount / matchOTIPMinutes) * 30 : 0;

        matchStats.push({
          matchId,
          events: matchEventsCount,
          otipMinutes: Math.round(matchOTIPMinutes * 10) / 10,
          eventsPer30OTIP: Math.round(eventsPer30OTIP * 10) / 10
        });
      } catch (error) {
        console.warn(`Failed to read events for match ${matchId}:`, error);
        continue;
      }
    }

    // Calculate overall events per 30 OTIP minutes
    const eventsPer30OTIP = totalOTIPMinutes > 0
      ? (totalEvents / totalOTIPMinutes) * 30
      : 0;

    // Build subtype breakdown with mid/high block stats
    const subtypeBreakdown = Array.from(subtypeCounts.entries()).map(([subtype, count]) => {
      const midBlockCount = subtypeMidBlockCounts.get(subtype) || 0;
      const highBlockCount = subtypeHighBlockCounts.get(subtype) || 0;
      const forceBackwardCount = subtypeForceBackwardCounts.get(subtype) || 0;
      const affectedLineBreakCount = subtypeAffectedLineBreakCounts.get(subtype) || 0;
      const regainCount = subtypeRegainCounts.get(subtype) || 0;

      return {
        subtype,
        count,
        percentage: Math.round((count / totalEvents) * 100 * 10) / 10,
        per30OTIP: totalOTIPMinutes > 0
          ? Math.round((count / totalOTIPMinutes) * 30 * 10) / 10
          : 0,
        midBlockCount,
        highBlockCount,
        midBlockPer30OTIP: totalOTIPMinutes > 0
          ? Math.round((midBlockCount / totalOTIPMinutes) * 30 * 10) / 10
          : 0,
        highBlockPer30OTIP: totalOTIPMinutes > 0
          ? Math.round((highBlockCount / totalOTIPMinutes) * 30 * 10) / 10
          : 0,
        forceBackwardCount,
        forceBackwardPercentage: count > 0
          ? Math.round((forceBackwardCount / count) * 100 * 10) / 10
          : 0,
        affectedLineBreakCount,
        affectedLineBreakPercentage: count > 0
          ? Math.round((affectedLineBreakCount / count) * 100 * 10) / 10
          : 0,
        regainCount,
        regainPercentage: count > 0
          ? Math.round((regainCount / count) * 100 * 10) / 10
          : 0
      };
    }).sort((a, b) => b.count - a.count); // Sort by count descending

    const stats: EventStats = {
      playerId,
      eventType,
      totalEvents,
      totalMinutesPlayed: Math.round(totalOTIPMinutes * 10) / 10,
      eventsPer30Minutes: Math.round(eventsPer30OTIP * 10) / 10,
      subtypeBreakdown,
      matchStats
    };

    return json(stats);
  } catch (error) {
    console.error('Error loading event stats:', error);
    return json({ error: 'Failed to load event statistics' }, { status: 500 });
  }
};
