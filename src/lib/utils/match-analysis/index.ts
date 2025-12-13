/**
 * Match Analysis Utilities - Index
 *
 * Point d'entrée centralisé pour tous les utilitaires d'analyse de match.
 * Permet des imports simplifiés dans les composants.
 *
 * @example
 * // Au lieu de multiples imports
 * import { convertTrackingPlayersToFieldPositions } from '.../tracking/trackingToFieldAdapter';
 * import { buildTeamInfoFromMatch } from '.../teams/playerTeamResolver';
 * import { buildPhaseDataForField } from '.../phases/phaseDataBuilder';
 *
 * // Un seul import groupé
 * import {
 *   convertTrackingPlayersToFieldPositions,
 *   buildTeamInfoFromMatch,
 *   buildPhaseDataForField
 * } from '$lib/utils/match-analysis';
 */

// ===== TRACKING ADAPTERS =====
// Convertisseurs de données de tracking vers format du terrain
export {
  convertTrackingPlayersToFieldPositions,
  convertTrackingBallToFieldPosition,
  findTrackingFrameIndexByNumber,
  findFirstValidTrackingFrame
} from './tracking/trackingToFieldAdapter';

// ===== TEAM RESOLVERS =====
// Résolution des informations joueur → équipe
export {
  buildTeamInfoFromMatch,
  resolvePlayerJerseyNumber,
  resolvePlayerTeamColor,
  resolveJerseyNumberColor,
  isPlayerInHomeTeam,
  resolveAllPlayerInfo
} from './teams/playerTeamResolver';

// ===== PHASE BUILDERS =====
// Construction des données de phase pour le terrain
export {
  findPhaseAtFrame,
  buildPhaseDataForField
} from './phases/phaseDataBuilder';

// ===== PLAYBACK CONTROLLER =====
// Contrôle de la lecture et navigation frame par frame
export {
  createPlaybackController,
  PLAYBACK_CONFIG,
  type PlaybackController
} from './playback/playbackController.svelte';

// ===== TIMELINE NAVIGATOR =====
// Navigation dans la timeline du match
export {
  createTimelineNavigator,
  findFrameIndexByNumber,
  findFirstValidFrameIndex
} from './navigation/timelineNavigator';
