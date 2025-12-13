/**
 * Football Field Component
 *
 * Composant de visualisation de terrain de football avec D3.js
 * Affiche le terrain, les joueurs et le ballon
 */

// Composant principal
export { default as FootballField } from './FootballField.svelte';

// Types
export type {
  FieldDimensions,
  PlayerPosition,
  BallPosition,
  TeamInfo,
  FrameData,
  FootballFieldConfig,
  FieldScales
} from './types';

// Constantes (pour personnalisation avancée)
export { FIELD_DIMENSIONS, FIELD_COLORS, SVG_CONFIG } from './constants';

// Renderers (pour usage avancé)
export { createFieldScales, renderField } from './field-renderer';
export { renderPlayers, renderBall, renderPhase, type PhaseData, type PassData, type BallTracePoint } from './player-renderer';
