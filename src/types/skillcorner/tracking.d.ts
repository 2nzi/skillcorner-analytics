/**
 * Types bruts SkillCorner pour les données de tracking
 * Format tel que fourni par SkillCorner (JSONL)
 */

export interface SkillCornerPlayerPosition {
  x: number;
  y: number;
  player_id: number;
  is_detected: boolean;
}

export interface SkillCornerBallData {
  x: number | null;
  y: number | null;
  z: number | null;
  is_detected: boolean | null;
}

export interface SkillCornerTrackingFrame {
  frame: number;
  timestamp: string | null;
  period: number | null;
  image_corners_projection: number[][] | null;
  ball_data: SkillCornerBallData;
  possession: {
    player_id: number | null;
    group: string | null;
  };
  player_data: SkillCornerPlayerPosition[];
}
