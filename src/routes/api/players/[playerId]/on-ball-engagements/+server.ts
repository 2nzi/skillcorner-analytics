import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

/**
 * On-ball engagement event from CSV
 */
interface OnBallEngagementEvent {
  event_id: string;
  event_type: string;
  event_subtype: string;
  player_id: string;
  player_name: string;
  match_id: string;
  minute_start: number;
  second_start: number;
  duration: number;
}

/**
 * Aggregated on-ball engagement statistics
 */
interface OnBallEngagementStats {
  playerId: string;
  totalEvents: number;
  totalMinutesPlayed: number;
  eventsPer30Minutes: number;

  // Breakdown by subtype
  subtypeBreakdown: {
    subtype: string;
    count: number;
    percentage: number;
    per30Minutes: number;
  }[];

  // Match-level details
  matchStats: {
    matchId: string;
    events: number;
    minutesPlayed: number;
    eventsPer30Minutes: number;
  }[];
}

/**
 * GET /api/players/[playerId]/on-ball-engagements
 *
 * Returns on-ball engagement statistics for a specific player across all their matches.
 * Calculates events normalized per 30 minutes like SkillCorner does.
 */
export const GET: RequestHandler = async ({ params }) => {
  const { playerId } = params;

  if (!playerId) {
    return json({ error: 'Player ID is required' }, { status: 400 });
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
    const playerMatchMinutes: Map<string, number> = new Map();

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
          playerMatchMinutes.set(matchId, playerInMatch.playing_time.total.minutes_played);
        }
      } catch (error) {
        // Skip matches that can't be read
        continue;
      }
    }

    if (playerMatchIds.length === 0) {
      return json({
        playerId,
        totalEvents: 0,
        totalMinutesPlayed: 0,
        eventsPer30Minutes: 0,
        subtypeBreakdown: [],
        matchStats: []
      });
    }

    // Now read on-ball engagement events from dynamic_events.csv for each match
    let totalEvents = 0;
    let totalMinutesPlayed = 0;
    const subtypeCounts: Map<string, number> = new Map();
    const matchStats: { matchId: string; events: number; minutesPlayed: number; eventsPer30Minutes: number }[] = [];

    for (const matchId of playerMatchIds) {
      try {
        const eventsFilePath = join(matchesPath, matchId, `${matchId}_dynamic_events.csv`);
        const eventsContent = await readFile(eventsFilePath, 'utf-8');

        const events = parse(eventsContent, {
          columns: true,
          skip_empty_lines: true
        }) as OnBallEngagementEvent[];

        // Filter events for this player where event_type is "on_ball_engagement"
        const playerOnBallEngagements = events.filter(
          event => String(event.player_id) === playerId && event.event_type === 'on_ball_engagement'
        );

        const matchEventsCount = playerOnBallEngagements.length;
        const matchMinutes = playerMatchMinutes.get(matchId) || 0;

        // Count by subtype
        playerOnBallEngagements.forEach(event => {
          const subtype = event.event_subtype || 'unknown';
          subtypeCounts.set(subtype, (subtypeCounts.get(subtype) || 0) + 1);
        });

        totalEvents += matchEventsCount;
        totalMinutesPlayed += matchMinutes;

        // Calculate per 30 min for this match
        const eventsPer30Min = matchMinutes > 0 ? (matchEventsCount / matchMinutes) * 30 : 0;

        matchStats.push({
          matchId,
          events: matchEventsCount,
          minutesPlayed: Math.round(matchMinutes * 10) / 10,
          eventsPer30Minutes: Math.round(eventsPer30Min * 10) / 10
        });
      } catch (error) {
        console.warn(`Failed to read events for match ${matchId}:`, error);
        continue;
      }
    }

    // Calculate overall events per 30 minutes
    const eventsPer30Minutes = totalMinutesPlayed > 0
      ? (totalEvents / totalMinutesPlayed) * 30
      : 0;

    // Build subtype breakdown
    const subtypeBreakdown = Array.from(subtypeCounts.entries()).map(([subtype, count]) => ({
      subtype,
      count,
      percentage: Math.round((count / totalEvents) * 100 * 10) / 10,
      per30Minutes: totalMinutesPlayed > 0
        ? Math.round((count / totalMinutesPlayed) * 30 * 10) / 10
        : 0
    })).sort((a, b) => b.count - a.count); // Sort by count descending

    const stats: OnBallEngagementStats = {
      playerId,
      totalEvents,
      totalMinutesPlayed: Math.round(totalMinutesPlayed * 10) / 10,
      eventsPer30Minutes: Math.round(eventsPer30Minutes * 10) / 10,
      subtypeBreakdown,
      matchStats
    };

    return json(stats);
  } catch (error) {
    console.error('Error loading on-ball engagement stats:', error);
    return json({ error: 'Failed to load on-ball engagement statistics' }, { status: 500 });
  }
};
