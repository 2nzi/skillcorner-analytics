/**
 * Timeline Navigator
 *
 * Gère la navigation dans la timeline du match.
 * Permet de chercher et naviguer vers des frames spécifiques.
 */

import type { SkillCornerTrackingFrame } from '$types/skillcorner';

/**
 * Trouve l'index de la frame la plus proche d'un numéro de frame donné
 *
 * Utilise une recherche binaire pour une performance optimale sur de grandes quantités de données.
 *
 * @param trackingData - Toutes les frames de tracking du match
 * @param targetFrameNumber - Numéro de frame recherché
 * @returns Index de la frame la plus proche dans le tableau trackingData
 *
 * @example
 * const index = findFrameIndexByNumber(trackingData, 15000);
 * const frame = trackingData[index];
 */
export function findFrameIndexByNumber(
  trackingData: SkillCornerTrackingFrame[],
  targetFrameNumber: number
): number {
  if (trackingData.length === 0) {
    return 0;
  }

  // Recherche binaire pour trouver l'index le plus proche
  let low = 0;
  let high = trackingData.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (trackingData[mid].frame < targetFrameNumber) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Trouve l'index de la première frame avec des données valides de joueurs
 *
 * Cherche la première frame qui contient au moins un joueur avec des coordonnées valides.
 * Utile pour initialiser la vue du terrain avec des données visibles.
 *
 * @param trackingData - Toutes les frames de tracking du match
 * @returns Index de la première frame valide, ou 0 si aucune n'est trouvée
 *
 * @example
 * const startIndex = findFirstValidFrameIndex(trackingData);
 * currentFrameIndex = startIndex;
 */
export function findFirstValidFrameIndex(
  trackingData: SkillCornerTrackingFrame[]
): number {
  for (let i = 0; i < trackingData.length; i++) {
    const frame = trackingData[i];
    if (frame.player_data && frame.player_data.length > 0) {
      // Vérifier qu'au moins un joueur a des coordonnées valides
      const hasValidPlayer = frame.player_data.some(
        player => player.x != null && player.y != null
      );
      if (hasValidPlayer) {
        return i;
      }
    }
  }
  return 0;
}

/**
 * Crée un navigateur de timeline
 *
 * Fournit des méthodes pour naviguer dans la timeline du match.
 *
 * @param getTrackingData - Fonction qui retourne les données de tracking actuelles
 * @param onFrameIndexChange - Callback appelé quand l'index de frame change
 * @returns Navigateur de timeline
 *
 * @example
 * const navigator = createTimelineNavigator(
 *   () => trackingData,
 *   (newIndex) => { currentFrameIndex = newIndex; }
 * );
 * navigator.navigateToFrame(15000);
 */
export function createTimelineNavigator(
  getTrackingData: () => SkillCornerTrackingFrame[],
  onFrameIndexChange: (newIndex: number) => void
) {
  return {
    /**
     * Navigue vers un numéro de frame spécifique
     */
    navigateToFrame(frameNumber: number) {
      const trackingData = getTrackingData();
      const newIndex = findFrameIndexByNumber(trackingData, frameNumber);
      onFrameIndexChange(newIndex);
    },

    /**
     * Navigue vers la première frame valide
     */
    navigateToFirstValidFrame() {
      const trackingData = getTrackingData();
      const firstValidIndex = findFirstValidFrameIndex(trackingData);
      onFrameIndexChange(firstValidIndex);
    },

    /**
     * Navigue vers le début du match
     */
    navigateToStart() {
      onFrameIndexChange(0);
    },

    /**
     * Navigue vers la fin du match
     */
    navigateToEnd() {
      const trackingData = getTrackingData();
      if (trackingData.length > 0) {
        onFrameIndexChange(trackingData.length - 1);
      }
    }
  };
}
