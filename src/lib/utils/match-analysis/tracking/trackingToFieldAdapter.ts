/**
 * Tracking to Field Adapter
 *
 * Convertit les données de tracking brutes (SkillCorner) vers le format
 * utilisé par le composant FootballField pour l'affichage.
 *
 * Les données de tracking utilisent des coordonnées relatives au sens d'attaque
 * qui doivent être transformées pour un affichage cohérent.
 */

import type { SkillCornerTrackingFrame } from '$types/skillcorner';
import type { PlayerPosition, BallPosition } from '$lib/components/features/match-analysis/football-field';
import { transformX, transformY } from '$lib/utils/coordinateTransform';

/**
 * Convertit les positions des joueurs du tracking vers le format du terrain
 *
 * Transforme les coordonnées en fonction du sens d'attaque pour que
 * l'affichage soit toujours cohérent (équipe attaquant vers la droite).
 *
 * @param trackingFrame - Frame de données de tracking
 * @param attackingSide - Sens d'attaque ("left-to-right" ou "right-to-left")
 * @returns Tableau de positions de joueurs formatées pour le terrain
 *
 * @example
 * const positions = convertTrackingPlayersToFieldPositions(currentFrame, "left-to-right");
 * // Returns: [{ playerId: 1, x: 10.5, y: 5.2, isDetected: true }, ...]
 */
export function convertTrackingPlayersToFieldPositions(
  trackingFrame: SkillCornerTrackingFrame | null,
  attackingSide: string
): PlayerPosition[] {
  if (!trackingFrame || !trackingFrame.player_data) {
    return [];
  }

  return trackingFrame.player_data.map((player) => ({
    playerId: player.player_id,
    x: transformX(player.x, attackingSide),
    y: transformY(player.y, attackingSide),
    isDetected: true
  }));
}

/**
 * Convertit la position du ballon du tracking vers le format du terrain
 *
 * Transforme les coordonnées X, Y et Z du ballon en fonction du sens d'attaque.
 *
 * @param trackingFrame - Frame de données de tracking
 * @param attackingSide - Sens d'attaque ("left-to-right" ou "right-to-left")
 * @returns Position du ballon formatée pour le terrain
 *
 * @example
 * const ballPos = convertTrackingBallToFieldPosition(currentFrame, "right-to-left");
 * // Returns: { x: -15.2, y: -3.5, z: 0.5, isDetected: true }
 */
export function convertTrackingBallToFieldPosition(
  trackingFrame: SkillCornerTrackingFrame | null,
  attackingSide: string
): BallPosition {
  if (!trackingFrame || !trackingFrame.ball_data) {
    return {
      x: 0,
      y: 0,
      z: 0,
      isDetected: false
    };
  }

  return {
    x: transformX(trackingFrame.ball_data.x, attackingSide),
    y: transformY(trackingFrame.ball_data.y, attackingSide),
    z: trackingFrame.ball_data.z,
    isDetected: true
  };
}

/**
 * Recherche une frame de tracking par son numéro (recherche binaire optimisée)
 *
 * Utilise une recherche binaire pour trouver rapidement l'index de la frame
 * correspondant au numéro demandé. Utile pour la navigation temporelle.
 *
 * @param trackingData - Tableau de toutes les frames de tracking
 * @param targetFrameNumber - Numéro de frame recherché
 * @returns Index de la frame dans le tableau, ou -1 si non trouvé
 *
 * @example
 * const index = findTrackingFrameIndexByNumber(trackingData, 12500);
 * const frame = trackingData[index];
 */
export function findTrackingFrameIndexByNumber(
  trackingData: SkillCornerTrackingFrame[],
  targetFrameNumber: number
): number {
  if (trackingData.length === 0) return -1;

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

  return trackingData[low]?.frame === targetFrameNumber ? low : -1;
}

/**
 * Trouve la première frame valide avec des données de joueurs
 *
 * Parcourt les frames de tracking pour trouver la première qui contient
 * des données de joueurs détectés. Utile pour initialiser la lecture.
 *
 * @param trackingData - Tableau de toutes les frames de tracking
 * @returns Index de la première frame valide, ou 0 si aucune trouvée
 *
 * @example
 * const startIndex = findFirstValidTrackingFrame(trackingData);
 * // Commence la lecture à la première frame avec des joueurs détectés
 */
export function findFirstValidTrackingFrame(
  trackingData: SkillCornerTrackingFrame[]
): number {
  const index = trackingData.findIndex(frame =>
    frame.player_data && frame.player_data.length > 0
  );
  return index !== -1 ? index : 0;
}
