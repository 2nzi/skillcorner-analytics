/**
 * Service simple pour lire les données SkillCorner
 * Lit directement les fichiers depuis le dossier ../opendata/data
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseJSONL, parseCSV } from '$lib/utils/parsers';
import type {
  SkillCornerMatch,
  SkillCornerMatchListItem,
  SkillCornerTrackingFrame,
  SkillCornerDynamicEvent,
  SkillCornerPhaseOfPlay
} from '../../types/skillcorner';

// Chemin vers le dossier opendata (à la racine du projet)
const OPENDATA_PATH = join(process.cwd(), 'opendata', 'data');

/**
 * Récupère la liste de tous les matchs disponibles
 */
export async function getMatchesList(): Promise<SkillCornerMatchListItem[]> {
  const matchesFilePath = join(OPENDATA_PATH, 'matches.json');
  const content = await readFile(matchesFilePath, 'utf-8');
  return JSON.parse(content) as SkillCornerMatchListItem[];
}

/**
 * Récupère les métadonnées complètes d'un match
 */
export async function getMatch(matchId: string): Promise<SkillCornerMatch> {
  const matchFilePath = join(OPENDATA_PATH, 'matches', matchId, `${matchId}_match.json`);
  const content = await readFile(matchFilePath, 'utf-8');
  return JSON.parse(content) as SkillCornerMatch;
}

/**
 * Récupère les données de tracking pour un match
 * @param matchId - ID du match
 * @param limit - Limite du nombre de frames (optionnel, pour tester sans charger tout)
 */
export async function getTrackingData(
  matchId: string,
  limit?: number
): Promise<SkillCornerTrackingFrame[]> {
  const trackingFilePath = join(
    OPENDATA_PATH,
    'matches',
    matchId,
    `${matchId}_tracking_extrapolated.jsonl`
  );
  const content = await readFile(trackingFilePath, 'utf-8');
  const allFrames = parseJSONL<SkillCornerTrackingFrame>(content);

  // Filtrer les frames sans données de joueurs
  const frames = allFrames.filter(frame => frame.player_data.length > 0);

  return limit ? frames.slice(0, limit) : frames;
}

/**
 * Récupère les événements dynamiques d'un match
 */
export async function getDynamicEvents(matchId: string): Promise<SkillCornerDynamicEvent[]> {
  const eventsFilePath = join(
    OPENDATA_PATH,
    'matches',
    matchId,
    `${matchId}_dynamic_events.csv`
  );
  const content = await readFile(eventsFilePath, 'utf-8');
  return parseCSV<SkillCornerDynamicEvent>(content);
}

/**
 * Récupère les phases de jeu d'un match
 */
export async function getPhasesOfPlay(matchId: string): Promise<SkillCornerPhaseOfPlay[]> {
  const phasesFilePath = join(
    OPENDATA_PATH,
    'matches',
    matchId,
    `${matchId}_phases_of_play.csv`
  );
  const content = await readFile(phasesFilePath, 'utf-8');
  return parseCSV<SkillCornerPhaseOfPlay>(content);
}
