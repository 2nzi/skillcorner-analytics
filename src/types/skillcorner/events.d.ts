/**
 * Types bruts SkillCorner pour les événements dynamiques
 * Format tel que fourni par SkillCorner (dynamic_events.csv)
 */

export interface SkillCornerDynamicEvent {
  // === Identifiants et timing ===
  event_id: string;
  index: number;
  match_id: number;
  frame_start: number;
  frame_end: number;
  frame_physical_start: number;
  time_start: string;
  time_end: string;
  minute_start: number;
  second_start: number;
  duration: number;
  period: number;

  // === Côté attaquant et type d'événement ===
  attacking_side_id: number;
  attacking_side: string;
  event_type_id: number;
  event_type: string;
  event_subtype_id: number | null;
  event_subtype: string | null;

  // === Joueur concerné ===
  player_id: number | null;
  player_name: string | null;
  player_position_id: number | null;
  player_position: string | null;

  // === Joueur en possession ===
  player_in_possession_id: number | null;
  player_in_possession_name: string | null;
  player_in_possession_position_id: number | null;
  player_in_possession_position: string | null;

  // === Équipe ===
  team_id: number;
  team_shortname: string;

  // === Position de départ ===
  x_start: number;
  y_start: number;
  channel_id_start: number;
  channel_start: string;
  third_id_start: number;
  third_start: string;
  penalty_area_start: boolean;

  // === Position de fin ===
  x_end: number;
  y_end: number;
  channel_id_end: number;
  channel_end: string;
  third_id_end: number;
  third_end: string;
  penalty_area_end: boolean;

  // === Possession associée ===
  associated_player_possession_event_id: string | null;
  associated_player_possession_frame_start: number | null;
  associated_player_possession_frame_end: number | null;
  associated_player_possession_end_type_id: number | null;
  associated_player_possession_end_type: string | null;

  // === Course hors ballon associée ===
  associated_off_ball_run_event_id: string | null;
  associated_off_ball_run_subtype_id: number | null;
  associated_off_ball_run_subtype: string | null;

  // === État du match ===
  game_state_id: number;
  game_state: string;
  team_score: number;
  opponent_team_score: number;

  // === Phase de jeu ===
  phase_index: number;
  player_possession_phase_index: number | null;
  first_player_possession_in_team_possession: boolean;
  last_player_possession_in_team_possession: boolean;
  lead_to_different_phase: boolean;
  issue_from_different_phase: boolean;
  n_player_possessions_in_phase: number;
  team_possession_loss_in_phase: boolean;

  // === Types de phases ===
  team_in_possession_phase_type_id: number;
  team_in_possession_phase_type: string;
  team_out_of_possession_phase_type_id: number;
  team_out_of_possession_phase_type: string;
  current_team_in_possession_next_phase_type_id: number | null;
  current_team_in_possession_next_phase_type: string | null;
  current_team_out_of_possession_next_phase_type_id: number | null;
  current_team_out_of_possession_next_phase_type: string | null;
  current_team_in_possession_previous_phase_type_id: number | null;
  current_team_in_possession_previous_phase_type: string | null;
  current_team_out_of_possession_previous_phase_type_id: number | null;
  current_team_out_of_possession_previous_phase_type: string | null;

  // === Interruptions de jeu ===
  game_interruption_before_id: number | null;
  game_interruption_before: string | null;
  game_interruption_after_id: number | null;
  game_interruption_after: string | null;

  // === Résultat ===
  lead_to_shot: boolean;
  lead_to_goal: boolean;

  // === Mouvement ===
  distance_covered: number;
  trajectory_angle: number;
  trajectory_direction_id: number;
  trajectory_direction: string;
  in_to_out: boolean | null;
  out_to_in: boolean | null;
  speed_avg: number;
  speed_avg_band_id: number;
  speed_avg_band: string;

  // === Séparation et lignes défensives ===
  separation_start: number;
  separation_end: number;
  separation_gain: number;
  last_defensive_line_x_start: number;
  last_defensive_line_x_end: number;
  delta_to_last_defensive_line_start: number;
  delta_to_last_defensive_line_end: number;
  delta_to_last_defensive_line_gain: number;
  last_defensive_line_height_start: number;
  last_defensive_line_height_end: number;
  last_defensive_line_height_gain: number;
  inside_defensive_shape_start: boolean;
  inside_defensive_shape_end: boolean;

  // === Début et fin de l'action ===
  start_type_id: number;
  start_type: string;
  end_type_id: number;
  end_type: string;

  // === Caractéristiques de l'action ===
  consecutive_on_ball_engagements: number | null;
  one_touch: boolean | null;
  quick_pass: boolean | null;
  carry: boolean | null;
  forward_momentum: boolean | null;
  is_header: boolean | null;
  hand_pass: boolean | null;
  initiate_give_and_go: boolean | null;

  // === Réception de passe ===
  pass_angle_received: number | null;
  pass_direction_received_id: number | null;
  pass_direction_received: string | null;
  pass_distance_received: number | null;
  pass_range_received_id: number | null;
  pass_range_received: string | null;

  // === Résultat de la passe ===
  pass_outcome_id: number | null;
  pass_outcome: string | null;
  targeted_passing_option_event_id: string | null;
  high_pass: boolean | null;

  // === Joueur ciblé par la passe ===
  player_targeted_id: number | null;
  player_targeted_name: string | null;
  player_targeted_position_id: number | null;
  player_targeted_position: string | null;
  player_targeted_x_pass: number | null;
  player_targeted_y_pass: number | null;
  player_targeted_channel_pass_id: number | null;
  player_targeted_channel_pass: string | null;
  player_targeted_third_pass_id: number | null;
  player_targeted_third_pass: string | null;
  player_targeted_penalty_area_pass: boolean | null;
  player_targeted_x_reception: number | null;
  player_targeted_y_reception: number | null;
  player_targeted_channel_reception_id: number | null;
  player_targeted_channel_reception: string | null;
  player_targeted_third_reception_id: number | null;
  player_targeted_third_reception: string | null;
  player_targeted_penalty_area_reception: boolean | null;
  player_targeted_distance_to_goal_start: number | null;
  player_targeted_distance_to_goal_end: number | null;
  player_targeted_angle_to_goal_start: number | null;
  player_targeted_angle_to_goal_end: number | null;
  player_targeted_average_speed: number | null;
  player_targeted_speed_avg_band_id: number | null;
  player_targeted_speed_avg_band: string | null;
  speed_difference: number | null;
  player_targeted_xpass_completion: number | null;
  player_targeted_difficult_pass_target: boolean | null;
  player_targeted_xthreat: number | null;
  player_targeted_dangerous: boolean | null;

  // === Options de passe ===
  n_passing_options: number | null;
  n_off_ball_runs: number | null;
  n_passing_options_line_break: number | null;
  n_passing_options_first_line_break: number | null;
  n_passing_options_second_last_line_break: number | null;
  n_passing_options_last_line_break: number | null;
  n_passing_options_ahead: number | null;
  n_passing_options_dangerous_difficult: number | null;
  n_passing_options_dangerous_not_difficult: number | null;
  n_passing_options_not_dangerous_not_difficult: number | null;
  n_passing_options_not_dangerous_difficult: number | null;
  n_passing_options_at_start: number | null;
  n_passing_options_at_end: number | null;
  n_passing_options_ahead_at_start: number | null;
  n_passing_options_ahead_at_end: number | null;
  n_teammates_ahead_end: number | null;
  n_teammates_ahead_start: number | null;
  n_player_targeted_opponents_ahead_start: number | null;
  n_player_targeted_opponents_ahead_end: number | null;
  n_player_targeted_teammates_ahead_start: number | null;
  n_player_targeted_teammates_ahead_end: number | null;
  n_player_targeted_teammates_within_5m_start: number | null;
  n_player_targeted_teammates_within_5m_end: number | null;
  n_player_targeted_opponents_within_5m_start: number | null;
  n_player_targeted_opponents_within_5m_end: number | null;

  // === Défense organisée ===
  organised_defense: boolean | null;
  defensive_structure: string | null;
  n_defensive_lines: number | null;

  // === Rupture de lignes ===
  first_line_break: boolean | null;
  first_line_break_type_id: number | null;
  first_line_break_type: string | null;
  second_last_line_break: boolean | null;
  second_last_line_break_type_id: number | null;
  second_last_line_break_type: string | null;
  last_line_break: boolean | null;
  last_line_break_type_id: number | null;
  last_line_break_type: string | null;
  furthest_line_break_id: number | null;
  furthest_line_break: string | null;
  furthest_line_break_type_id: number | null;
  furthest_line_break_type: string | null;

  // === Distance et angle entre joueurs ===
  interplayer_distance: number | null;
  interplayer_distance_range_id: number | null;
  interplayer_distance_range: string | null;
  interplayer_distance_start: number | null;
  interplayer_distance_end: number | null;
  interplayer_distance_min: number | null;
  interplayer_distance_start_physical: number | null;
  close_at_player_possession_start: boolean | null;
  interplayer_angle: number | null;
  interplayer_direction_id: number | null;
  interplayer_direction: string | null;
  angle_of_engagement: number | null;
  goal_side_start: boolean | null;
  goal_side_end: boolean | null;

  // === Caractéristiques de la passe ===
  pass_distance: number | null;
  pass_range_id: number | null;
  pass_range: string | null;
  pass_angle: number | null;
  pass_direction_id: number | null;
  pass_direction: string | null;
  pass_ahead: boolean | null;
  n_opponents_ahead_player_in_possession_pass_moment: number | null;
  n_opponents_ahead_pass_reception: number | null;
  n_opponents_bypassed: number | null;

  // === Position relative au joueur en possession ===
  location_to_player_in_possession_id_start: number | null;
  location_to_player_in_possession_start: string | null;
  location_to_player_in_possession_id_end: number | null;
  location_to_player_in_possession_end: string | null;
  distance_to_player_in_possession_start: number | null;
  distance_to_player_in_possession_end: number | null;

  // === Position du joueur en possession ===
  player_in_possession_x_start: number | null;
  player_in_possession_y_start: number | null;
  player_in_possession_channel_id_start: number | null;
  player_in_possession_channel_start: string | null;
  player_in_possession_third_id_start: number | null;
  player_in_possession_third_start: string | null;
  player_in_possession_penalty_area_start: boolean | null;
  player_in_possession_x_end: number | null;
  player_in_possession_y_end: number | null;
  player_in_possession_channel_id_end: number | null;
  player_in_possession_channel_end: string | null;
  player_in_possession_third_id_end: number | null;
  player_in_possession_third_end: string | null;
  player_in_possession_penalty_area_end: boolean | null;

  // === Option de passe ===
  targeted: boolean | null;
  received: boolean | null;
  received_in_space: boolean | null;
  dangerous: boolean | null;
  difficult_pass_target: boolean | null;
  xthreat: number | null;
  xpass_completion: number | null;
  passing_option_score: number | null;
  predicted_passing_option: boolean | null;
  peak_passing_option_frame: number | null;
  passing_option_at_player_possession_start: boolean | null;
  n_simultaneous_runs: number | null;

  // === Course hors ballon ===
  give_and_go: boolean | null;
  intended_run_behind: boolean | null;
  push_defensive_line: boolean | null;
  break_defensive_line: boolean | null;
  passing_option_at_start: boolean | null;
  n_simultaneous_passing_options: number | null;
  passing_option_at_pass_moment: boolean | null;

  // === Adversaires ===
  n_opponents_ahead_end: number | null;
  n_opponents_ahead_start: number | null;
  n_opponents_overtaken: number | null;

  // === Chaîne de pressing ===
  pressing_chain: number | null;
  pressing_chain_length: number | null;
  pressing_chain_end_type_id: number | null;
  pressing_chain_end_type: string | null;
  pressing_chain_index: number | null;
  index_in_pressing_chain: number | null;
  simultaneous_defensive_engagement_same_target: boolean | null;
  simultaneous_defensive_engagement_same_target_rank: number | null;

  // === Option de passe affectée ===
  affected_line_breaking_passing_option_id: string | null;
  affected_line_break_id: number | null;
  affected_line_break: string | null;
  affected_line_breaking_passing_option_attempted: boolean | null;
  affected_line_breaking_passing_option_xthreat: number | null;
  affected_line_breaking_passing_option_dangerous: boolean | null;
  affected_line_breaking_passing_option_run_subtype_id: number | null;
  affected_line_breaking_passing_option_run_subtype: string | null;

  // === Impact défensif ===
  possession_danger: number | null;
  beaten_by_possession: boolean | null;
  beaten_by_movement: boolean | null;
  stop_possession_danger: boolean | null;
  reduce_possession_danger: boolean | null;
  force_backward: boolean | null;

  // === Expected values ===
  xloss_player_possession_start: number | null;
  xloss_player_possession_end: number | null;
  xloss_player_possession_max: number | null;
  xshot_player_possession_start: number | null;
  xshot_player_possession_end: number | null;
  xshot_player_possession_max: number | null;

  // === Matching/Détection ===
  is_player_possession_start_matched: boolean | null;
  is_player_possession_end_matched: boolean | null;
  is_previous_pass_matched: boolean | null;
  is_pass_reception_matched: boolean | null;
  fully_extrapolated: boolean | null;
}
