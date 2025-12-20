import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

/**
 * GET /api/event-types
 *
 * Returns all unique event types found in the dynamic_events.csv files
 */
export const GET: RequestHandler = async () => {
  try {
    const matchesPath = join(process.cwd(), 'opendata', 'data', 'matches');

    // Read all match directories
    const matchDirs = await readdir(matchesPath, { withFileTypes: true });
    const matchIds = matchDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const eventTypesSet = new Set<string>();

    // Sample a few matches to get event types (checking all would be slow)
    const samplesToCheck = Math.min(5, matchIds.length);

    for (let i = 0; i < samplesToCheck; i++) {
      const matchId = matchIds[i];
      try {
        const eventsFilePath = join(matchesPath, matchId, `${matchId}_dynamic_events.csv`);
        const eventsContent = await readFile(eventsFilePath, 'utf-8');

        const events = parse(eventsContent, {
          columns: true,
          skip_empty_lines: true
        });

        // Extract unique event types
        events.forEach((event: any) => {
          if (event.event_type) {
            eventTypesSet.add(event.event_type);
          }
        });
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    // Convert to array and format for display
    const eventTypes = Array.from(eventTypesSet)
      .sort()
      .map(type => ({
        id: type,
        label: type.replace(/_/g, ' ').toUpperCase()
      }));

    return json(eventTypes);
  } catch (error) {
    console.error('Error loading event types:', error);
    return json({ error: 'Failed to load event types' }, { status: 500 });
  }
};
