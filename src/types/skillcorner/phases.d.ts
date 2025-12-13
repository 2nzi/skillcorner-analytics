/**
 * Types bruts SkillCorner pour les phases de jeu
 * Format tel que fourni par SkillCorner (phases_of_play.csv)
 */

export interface SkillCornerPhaseOfPlay {
  index: number;
  match_id: number;
  frame_start: number;
  frame_end: number;
  time_start: string;
  time_end: string;
  minute_start: number;
  second_start: number;
  duration: number;
  period: number;
  attacking_side_id: number;
  team_in_possession_id: number;
  attacking_side: string;
  team_in_possession_shortname: string;
  n_player_possessions_in_phase: number;
  team_possession_loss_in_phase: boolean;
  team_possession_lead_to_goal: boolean;
  team_possession_lead_to_shot: boolean;
  team_in_possession_phase_type: string;
  team_in_possession_phase_type_id: number;
  team_out_of_possession_phase_type: string;
  team_out_of_possession_phase_type_id: number;
  x_start: number;
  y_start: number;
  channel_id_start: number;
  channel_start: string;
  third_id_start: number;
  third_start: string;
  penalty_area_start: boolean;
  x_end: number;
  y_end: number;
  channel_id_end: number;
  channel_end: string;
  third_id_end: number;
  third_end: string;
  penalty_area_end: boolean;
  team_in_possession_width_start: number;
  team_in_possession_width_end: number;
  team_in_possession_length_start: number;
  team_in_possession_length_end: number;
  team_out_of_possession_width_start: number;
  team_out_of_possession_width_end: number;
  team_out_of_possession_length_start: number;
  team_out_of_possession_length_end: number;
}
