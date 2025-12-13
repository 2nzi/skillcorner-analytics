/**
 * Types pour le composant FootballField
 */

export interface FieldDimensions {
  length: number;  // Longueur en mètres
  width: number;   // Largeur en mètres
}

export interface PlayerPosition {
  x: number;
  y: number;
  playerId: number;
  isDetected: boolean;
}

export interface BallPosition {
  x: number | null;
  y: number | null;
  z: number | null;
  isDetected: boolean | null;
}

export interface TeamInfo {
  id: number;
  name: string;
  shortName: string;
  color: string;
  numberColor: string;
  playerIds: number[];
  playerNumbers: Map<number, number>; // player_id -> numéro du maillot
}

export interface FrameData {
  frame: number;
  timestamp: string | null;
  period: number | null;
  players: PlayerPosition[];
  ball: BallPosition;
  possession: {
    playerId: number | null;
    group: string | null;
  };
}

export interface FootballFieldConfig {
  // Dimensions du terrain
  dimensions: FieldDimensions;

  // Équipes
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;

  // Options visuelles
  showBall?: boolean;
  showPlayerNumbers?: boolean;
  showPossession?: boolean;

  // Callbacks
  onPlayerClick?: (playerId: number) => void;
  onPlayerHover?: (playerId: number | null) => void;
}

// Type pour les scales D3
export interface FieldScales {
  x: d3.ScaleLinear<number, number>;
  y: d3.ScaleLinear<number, number>;
}
