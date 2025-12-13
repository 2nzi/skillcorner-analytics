/**
 * Constantes pour le terrain de football
 * Dimensions FIFA standard et configuration visuelle
 */

// Dimensions FIFA standard (en mètres)
export const FIELD_DIMENSIONS = {
  // Dimensions du terrain (peut varier selon le stade)
  DEFAULT_LENGTH: 105,
  DEFAULT_WIDTH: 68,

  // Surface de réparation (penalty area)
  PENALTY_AREA_WIDTH: 40.32, // 44 yards
  PENALTY_AREA_DEPTH: 16.5,  // 18 yards

  // Surface de but (goal area)
  GOAL_AREA_WIDTH: 18.32,    // 20 yards
  GOAL_AREA_DEPTH: 5.5,      // 6 yards

  // Point de penalty
  PENALTY_SPOT_DISTANCE: 11, // 12 yards

  // Arc de cercle penalty
  PENALTY_ARC_RADIUS: 9.15,  // 10 yards

  // Cercle central
  CENTER_CIRCLE_RADIUS: 9.15, // 10 yards

  // But
  GOAL_WIDTH: 7.32,          // 8 yards
  GOAL_DEPTH: 2.44,          // Pour la représentation visuelle

  // Coin
  CORNER_ARC_RADIUS: 1,      // 1 yard
} as const;

// Couleurs du terrain
export const FIELD_COLORS = {
  // Fond du terrain
  GRASS: '#1a472a',           // Vert foncé
  GRASS_LIGHT: '#1e5631',     // Bandes alternées (optionnel)

  // Lignes
  LINE: '#ffffff',
  LINE_WIDTH: 0.12,           // ~12cm en mètres (sera converti en pixels)

  // Joueurs
  HOME_TEAM: '#ff4444',
  AWAY_TEAM: '#4444ff',
  BALL: '#ffff00',

  // Sélection
  SELECTED_PLAYER: '#ffff00',
} as const;

// Configuration SVG par défaut
export const SVG_CONFIG = {
  // Padding autour du terrain (en mètres)
  PADDING: 0,

  // Taille des joueurs (rayon en mètres)
  PLAYER_RADIUS: 1.5,
  BALL_RADIUS: 0.8,

  // Animation
  TRANSITION_DURATION: 100, // ms
} as const;
