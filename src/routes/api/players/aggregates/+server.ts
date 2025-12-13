import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

type PlayerAggregate = {
  player_name: string;
  player_short_name: string;
  player_id: string;
  player_birthdate: string;
  team_name: string;
  position_group: string;
  count_match: number;
  minutes_full_all: number;
  total_distance_full_all: number;
  sprint_distance_full_all: number;
  hsr_distance_full_all: number;
  running_distance_full_all: number;
  hi_distance_full_all: number;
  psv99: number;
  highaccel_count_full_all: number;
  highdecel_count_full_all: number;
  sprint_count_full_all: number;
  hsr_count_full_all: number;
  total_metersperminute_full_all: number;
};

type AggregatedPlayer = {
  id: string;
  playerId: string; // ID original du joueur (sans position)
  name: string;
  surname: string;
  age: number;
  position: string;
  scores: Record<string, number>;
  rawValues: Record<string, number>;
};

export const GET: RequestHandler = async () => {
  try {
    // Path to aggregates folder (à la racine du projet)
    const aggregatesPath = join(process.cwd(), 'opendata', 'data', 'aggregates');
    const csvFile = join(aggregatesPath, 'aus1league_physicalaggregates_20242025_midfielders.csv');

    // Read CSV file
    const fileContent = await readFile(csvFile, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        // Cast numeric columns
        if (context.column === 'count_match' ||
            context.column === 'minutes_full_all' ||
            context.column === 'total_distance_full_all' ||
            context.column === 'sprint_distance_full_all' ||
            context.column === 'hsr_distance_full_all' ||
            context.column === 'running_distance_full_all' ||
            context.column === 'hi_distance_full_all' ||
            context.column === 'psv99' ||
            context.column === 'highaccel_count_full_all' ||
            context.column === 'highdecel_count_full_all' ||
            context.column === 'sprint_count_full_all' ||
            context.column === 'hsr_count_full_all' ||
            context.column === 'total_metersperminute_full_all') {
          return value === '' ? 0 : parseFloat(value);
        }
        return value;
      }
    }) as PlayerAggregate[];

    // Group by player_id + position_group (keep stats separated by position)
    const playerPositionMap = new Map<string, PlayerAggregate>();

    records.forEach(record => {
      // Unique key: player_id + position_group
      const key = `${record.player_id}_${record.position_group}`;

      if (playerPositionMap.has(key)) {
        // Sum the stats if same player + same position appears multiple times
        const existing = playerPositionMap.get(key)!;
        existing.count_match += record.count_match;
        existing.minutes_full_all += record.minutes_full_all;
        existing.total_distance_full_all += record.total_distance_full_all;
        existing.sprint_distance_full_all += record.sprint_distance_full_all;
        existing.hsr_distance_full_all += record.hsr_distance_full_all;
        existing.running_distance_full_all += record.running_distance_full_all;
        existing.hi_distance_full_all += record.hi_distance_full_all;
        existing.psv99 = Math.max(existing.psv99, record.psv99);
        existing.highaccel_count_full_all += record.highaccel_count_full_all;
        existing.highdecel_count_full_all += record.highdecel_count_full_all;
        existing.sprint_count_full_all += record.sprint_count_full_all;
        existing.hsr_count_full_all += record.hsr_count_full_all;
        existing.total_metersperminute_full_all = Math.max(existing.total_metersperminute_full_all, record.total_metersperminute_full_all);
      } else {
        playerPositionMap.set(key, { ...record });
      }
    });

    // Convert to array (now contains one entry per player-position combination)
    const aggregatedPlayers = Array.from(playerPositionMap.values());

    // Calculate min/max for normalization
    const criteria = [
      'minutes_full_all',
      'total_distance_full_all',
      'sprint_distance_full_all',
      'hsr_distance_full_all',
      'running_distance_full_all',
      'hi_distance_full_all',
      'psv99',
      'highaccel_count_full_all',
      'highdecel_count_full_all',
      'sprint_count_full_all',
      'hsr_count_full_all',
      'total_metersperminute_full_all'
    ] as const;

    const minMax: Record<string, { min: number; max: number }> = {};
    criteria.forEach(criterion => {
      const values = aggregatedPlayers.map(p => p[criterion]).filter(v => v > 0);
      minMax[criterion] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    // Normalize and format
    const formattedPlayers: AggregatedPlayer[] = aggregatedPlayers.map(player => {
      const [firstName, ...rest] = player.player_name.split(' ');
      const lastName = rest.join(' ');

      // Calculate age
      const birthYear = new Date(player.player_birthdate).getFullYear();
      const age = new Date().getFullYear() - birthYear;

      // Normalize scores (0 to 1)
      const normalize = (value: number, criterion: string) => {
        const { min, max } = minMax[criterion];
        if (max === min) return 0.5;
        return (value - min) / (max - min);
      };

      return {
        id: `${player.player_id}_${player.position_group}`, // Unique ID per player-position
        playerId: player.player_id, // Original player ID
        name: firstName,
        surname: lastName,
        age,
        position: player.position_group,
        scores: {
          'Minutes': normalize(player.minutes_full_all, 'minutes_full_all'),
          'Total distance': normalize(player.total_distance_full_all, 'total_distance_full_all'),
          'Sprint distance': normalize(player.sprint_distance_full_all, 'sprint_distance_full_all'),
          'HSR distance': normalize(player.hsr_distance_full_all, 'hsr_distance_full_all'),
          'Running distance': normalize(player.running_distance_full_all, 'running_distance_full_all'),
          'HI distance': normalize(player.hi_distance_full_all, 'hi_distance_full_all'),
          'PSV99': normalize(player.psv99, 'psv99'),
          'High accel count': normalize(player.highaccel_count_full_all, 'highaccel_count_full_all'),
          'High decel count': normalize(player.highdecel_count_full_all, 'highdecel_count_full_all'),
          'Sprint count': normalize(player.sprint_count_full_all, 'sprint_count_full_all'),
          'HSR count': normalize(player.hsr_count_full_all, 'hsr_count_full_all'),
          'Meters per minute': normalize(player.total_metersperminute_full_all, 'total_metersperminute_full_all')
        },
        rawValues: {
          'Minutes': Math.round(player.minutes_full_all),
          'Total distance': Math.round(player.total_distance_full_all),
          'Sprint distance': Math.round(player.sprint_distance_full_all),
          'HSR distance': Math.round(player.hsr_distance_full_all),
          'Running distance': Math.round(player.running_distance_full_all),
          'HI distance': Math.round(player.hi_distance_full_all),
          'PSV99': Math.round(player.psv99 * 10) / 10, // 1 décimale
          'High accel count': Math.round(player.highaccel_count_full_all),
          'High decel count': Math.round(player.highdecel_count_full_all),
          'Sprint count': Math.round(player.sprint_count_full_all),
          'HSR count': Math.round(player.hsr_count_full_all),
          'Meters per minute': Math.round(player.total_metersperminute_full_all * 10) / 10 // 1 décimale
        }
      };
    });

    return json(formattedPlayers);
  } catch (error) {
    console.error('Error loading player aggregates:', error);
    return json({ error: 'Failed to load player data' }, { status: 500 });
  }
};
