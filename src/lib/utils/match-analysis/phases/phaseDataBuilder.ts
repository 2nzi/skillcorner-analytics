/**
 * Phase Data Builder
 *
 * Construit les données de phase de jeu pour l'affichage sur le terrain.
 *
 * Une phase de jeu comprend :
 * - Le range de mouvement du ballon
 * - Les passes effectuées pendant la phase
 * - La trajectoire du ballon échantillonnée
 * - Les métadonnées (équipe en possession, timing, etc.)
 */

import type {
  SkillCornerPhaseOfPlay,
  SkillCornerDynamicEvent,
  SkillCornerTrackingFrame,
  SkillCornerMatch
} from '$types/skillcorner';
import type { PhaseData, PassData, BallTracePoint } from '$lib/components/features/match-analysis/football-field';
import { transformX, transformY } from '$lib/utils/coordinateTransform';

/**
 * Trouve la phase de jeu active à une frame donnée
 *
 * Parcourt les phases pour trouver celle qui contient la frame spécifiée.
 *
 * @param phases - Toutes les phases du match
 * @param frameNumber - Numéro de frame recherché
 * @returns Phase active ou null si aucune phase à cette frame
 *
 * @example
 * const currentPhase = findPhaseAtFrame(phasesData, 15000);
 * // Returns: { phase_index: 42, team_in_possession: "PSG", ... }
 */
export function findPhaseAtFrame(
  phases: SkillCornerPhaseOfPlay[],
  frameNumber: number
): SkillCornerPhaseOfPlay | null {
  return phases.find(
    phase => frameNumber >= phase.frame_start && frameNumber <= phase.frame_end
  ) || null;
}

/**
 * Calcule le range de mouvement du ballon pendant une phase
 *
 * Détermine les positions X minimale et maximale du ballon pendant la phase
 * en analysant les données de tracking. Utilisé pour afficher le range
 * de la phase sur le terrain.
 *
 * @param trackingData - Données de tracking du match
 * @param phase - Phase de jeu
 * @param attackingSide - Sens d'attaque ("left-to-right" ou "right-to-left")
 * @returns Objet avec xStart (min) et xEnd (max)
 *
 * @example
 * const range = calculateBallMovementRange(tracking, phase, "left-to-right");
 * // Returns: { xStart: -15.5, xEnd: 25.3 }
 */
function calculateBallMovementRange(
  trackingData: SkillCornerTrackingFrame[],
  phase: SkillCornerPhaseOfPlay,
  attackingSide: string
): { xStart: number; xEnd: number } {
  // Filtrer les frames de tracking pour cette phase
  const phaseTrackingFrames = trackingData.filter(
    frame =>
      frame.frame >= phase.frame_start &&
      frame.frame <= phase.frame_end &&
      frame.ball_data?.x != null
  );

  // Si pas de données de tracking, utiliser les valeurs de la phase
  if (phaseTrackingFrames.length === 0) {
    return {
      xStart: transformX(phase.x_start, attackingSide),
      xEnd: transformX(phase.x_end, attackingSide)
    };
  }

  // Calculer le min et max des positions X du ballon
  const xValues = phaseTrackingFrames.map(frame =>
    transformX(frame.ball_data.x, attackingSide)
  );

  return {
    xStart: Math.min(...xValues),
    xEnd: Math.max(...xValues)
  };
}

/**
 * Extrait les passes d'une phase de jeu
 *
 * Filtre les événements pour ne garder que les player_possession qui se
 * terminent par une passe, puis transforme leurs coordonnées.
 *
 * IMPORTANT: Les coordonnées des événements sont normalisées (toujours comme si
 * l'équipe attaquait vers la droite). Il faut donc les transformer en fonction
 * de l'attacking_side de CHAQUE événement, pas celui de la phase.
 *
 * @param events - Tous les événements du match
 * @param phase - Phase de jeu
 * @param attackingSide - Sens d'attaque (non utilisé, gardé pour compatibilité)
 * @returns Tableau de passes avec coordonnées start/end transformées
 *
 * @example
 * const passes = extractPassEventsFromPhase(eventsData, phase, "right-to-left");
 * // Returns: [
 * //   { xStart: 10, yStart: 5, xEnd: 20, yEnd: -3, frameStart: 12500 },
 * //   ...
 * // ]
 */
function extractPassEventsFromPhase(
  events: SkillCornerDynamicEvent[],
  phase: SkillCornerPhaseOfPlay,
  attackingSide: string
): PassData[] {
  // Filtrer les événements de player_possession qui se terminent par une passe
  const passEvents = events.filter(
    event =>
      event.frame_start >= phase.frame_start &&
      event.frame_end <= phase.frame_end &&
      event.event_type === 'player_possession' &&
      event.end_type === 'pass' &&
      event.x_start != null &&
      event.y_start != null &&
      event.x_end != null &&
      event.y_end != null
  );

  // Transformer les coordonnées des passes
  // Les coordonnées des événements sont normalisées pour toujours attaquer vers la droite (attacking_side_id = 1)
  // Si attacking_side_id = 2 (attaque vers la gauche), il faut inverser les coordonnées x et y
  return passEvents.map(event => {
    const needsFlip = event.attacking_side_id === 2;
    return {
      xStart: needsFlip ? -event.x_start : event.x_start,
      yStart: needsFlip ? -event.y_start : event.y_start,
      xEnd: needsFlip ? -event.x_end : event.x_end,
      yEnd: needsFlip ? -event.y_end : event.y_end,
      frameStart: event.frame_start
    };
  });
}

/**
 * Génère la trajectoire du ballon pendant une phase
 *
 * Échantillonne les positions du ballon pendant la phase pour créer
 * une trace visuelle de son mouvement.
 *
 * @param trackingData - Données de tracking du match
 * @param phase - Phase de jeu
 * @param attackingSide - Sens d'attaque
 * @param sampleRate - Fréquence d'échantillonnage (toutes les N frames, défaut: 5)
 * @returns Tableau de points formant la trajectoire du ballon
 *
 * @example
 * const trajectory = generateBallTrajectoryPoints(tracking, phase, "left-to-right", 5);
 * // Returns: [
 * //   { x: 10.5, y: 2.3, frame: 12500 },
 * //   { x: 12.1, y: 3.5, frame: 12505 },
 * //   ...
 * // ]
 */
function generateBallTrajectoryPoints(
  trackingData: SkillCornerTrackingFrame[],
  phase: SkillCornerPhaseOfPlay,
  attackingSide: string,
  sampleRate: number = 5
): BallTracePoint[] {
  return trackingData
    .filter(
      frame =>
        frame.frame >= phase.frame_start &&
        frame.frame <= phase.frame_end &&
        frame.frame % sampleRate === 0 &&
        frame.ball_data?.x != null &&
        frame.ball_data?.y != null
    )
    .map(frame => ({
      x: transformX(frame.ball_data.x, attackingSide),
      y: transformY(frame.ball_data.y, attackingSide),
      frame: frame.frame
    }));
}

/**
 * Détermine la couleur de l'équipe en possession
 *
 * Résout la couleur du maillot de l'équipe qui a la possession pendant la phase.
 *
 * @param phase - Phase de jeu
 * @param matchData - Données du match
 * @returns Couleur hex de l'équipe en possession
 *
 * @example
 * const color = determineTeamPossessionColor(phase, matchData);
 * // Returns: "#004170" (couleur du maillot PSG)
 */
function determineTeamPossessionColor(
  phase: SkillCornerPhaseOfPlay,
  matchData: SkillCornerMatch
): string {
  const homeColor = matchData.home_team_kit?.jersey_color || '#ff4444';
  const awayColor = matchData.away_team_kit?.jersey_color || '#4444ff';

  if (phase.team_in_possession_id === matchData.home_team.id) {
    return homeColor;
  } else if (phase.team_in_possession_id === matchData.away_team.id) {
    return awayColor;
  }

  // Couleur par défaut si l'équipe n'est pas identifiée
  return 'rgba(255, 255, 255, 0.6)';
}

/**
 * Construit les données complètes d'une phase pour l'affichage sur le terrain
 *
 * Fonction principale qui assemble toutes les informations d'une phase :
 * - Range du ballon
 * - Passes
 * - Trajectoire
 * - Métadonnées
 *
 * @param phase - Phase de jeu (null si pas de phase active)
 * @param events - Tous les événements du match
 * @param trackingData - Toutes les données de tracking
 * @param matchData - Informations du match
 * @param currentFrameNumber - Frame actuelle pour le curseur
 * @returns Données de phase formatées ou null
 *
 * @example
 * const phaseData = buildPhaseDataForField(
 *   activePhase,
 *   eventsData,
 *   trackingData,
 *   matchData,
 *   15000
 * );
 * // Returns: {
 * //   xStart: -15.5,
 * //   xEnd: 25.3,
 * //   phaseName: "build_up",
 * //   teamColor: "#004170",
 * //   passes: [...],
 * //   ballTrace: [...],
 * //   currentFrame: 15000,
 * //   ...
 * // }
 */
export function buildPhaseDataForField(
  phase: SkillCornerPhaseOfPlay | null,
  events: SkillCornerDynamicEvent[],
  trackingData: SkillCornerTrackingFrame[],
  matchData: SkillCornerMatch,
  currentFrameNumber: number
): PhaseData | null {
  if (!phase) {
    return null;
  }

  const attackingSide = phase.attacking_side;

  // Calculer les composants de la phase
  const ballRange = calculateBallMovementRange(trackingData, phase, attackingSide);
  const teamColor = determineTeamPossessionColor(phase, matchData);
  const passes = extractPassEventsFromPhase(events, phase, attackingSide);
  const ballTrace = generateBallTrajectoryPoints(trackingData, phase, attackingSide);

  // Assembler l'objet PhaseData final
  return {
    xStart: ballRange.xStart,
    yStart: 0,
    xEnd: ballRange.xEnd,
    yEnd: 0,
    phaseName: phase.team_in_possession_phase_type,
    teamColor,
    passes,
    ballTrace,
    currentFrame: currentFrameNumber,
    timeStart: phase.time_start,
    timeEnd: phase.time_end,
    frameStart: phase.frame_start,
    frameEnd: phase.frame_end
  };
}
