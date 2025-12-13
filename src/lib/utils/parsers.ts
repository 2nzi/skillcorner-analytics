/**
 * Utilitaires simples pour parser les fichiers SkillCorner
 */

import Papa from 'papaparse';

/**
 * Parse un fichier JSONL (JSON Lines) - une ligne = un JSON
 * Utilisé pour les fichiers de tracking
 *
 * @example
 * const frames = parseJSONL<SkillCornerTrackingFrame>(fileContent);
 */
export function parseJSONL<T = any>(content: string): T[] {
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

/**
 * Parse un fichier CSV avec headers
 * Utilise PapaParse pour gérer les cas complexes (virgules dans les valeurs, types, etc.)
 *
 * @example
 * const events = parseCSV<SkillCornerDynamicEvent>(fileContent);
 */
export function parseCSV<T = any>(content: string): T[] {
  const result = Papa.parse<T>(content, {
    header: true, // Première ligne = headers
    dynamicTyping: true, // Convertir automatiquement les nombres
    skipEmptyLines: true,
    transform: (value) => {
      // Convertir les booléens SkillCorner
      if (value === 'True') return true;
      if (value === 'False') return false;
      return value;
    }
  });

  if (result.errors.length > 0) {
    console.error('Erreurs de parsing CSV:', result.errors);
  }

  return result.data;
}
