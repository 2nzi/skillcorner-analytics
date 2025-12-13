/**
 * Types bruts SkillCorner pour les métadonnées de match
 * Format tel que fourni par SkillCorner (match.json)
 */

export interface SkillCornerTeam {
  id: number;
  name: string;
  short_name: string;
  acronym: string;
}

export interface SkillCornerKit {
  id: number;
  team_id: number;
  season: {
    id: number;
    start_year: number;
    end_year: number;
    name: string;
  };
  name: string;
  jersey_color: string;
  number_color: string;
}

export interface SkillCornerStadium {
  id: number;
  name: string;
  city: string;
  capacity: number;
}

export interface SkillCornerPlayerRole {
  id: number;
  position_group: string;
  name: string;
  acronym: string;
}

export interface SkillCornerPlayer {
  player_role: SkillCornerPlayerRole;
  start_time: string | null;
  end_time: string | null;
  number: number;
  yellow_card: number;
  red_card: number;
  injured: boolean;
  goal: number;
  own_goal: number;
  playing_time: {
    total: {
      minutes_tip: number;
      minutes_otip: number;
      start_frame: number;
      end_frame: number;
      minutes_played: number;
      minutes_played_regular_time: number;
    } | null;
    by_period: Array<{
      name: string;
      minutes_tip: number;
      minutes_otip: number;
      start_frame: number;
      end_frame: number;
      minutes_played: number;
    }>;
  };
  team_player_id: number;
  team_id: number;
  id: number;
  first_name: string;
  last_name: string;
  short_name: string;
  birthday: string | null;
  trackable_object: number;
  gender: string;
}

export interface SkillCornerMatchPeriod {
  period: number;
  name: string;
  start_frame: number;
  end_frame: number;
  duration_frames: number;
  duration_minutes: number;
}

export interface SkillCornerCompetitionEdition {
  id: number;
  competition: {
    id: number;
    area: string;
    name: string;
    gender: string;
    age_group: string;
  };
  season: {
    id: number;
    start_year: number;
    end_year: number;
    name: string;
  };
  name: string;
}

export interface SkillCornerMatch {
  id: number;
  home_team_score: number;
  away_team_score: number;
  date_time: string;
  stadium: SkillCornerStadium;
  home_team: SkillCornerTeam;
  home_team_kit: SkillCornerKit;
  away_team: SkillCornerTeam;
  away_team_kit: SkillCornerKit;
  home_team_coach: any | null;
  away_team_coach: any | null;
  home_team_playing_time: {
    minutes_tip: number;
    minutes_otip: number;
  };
  away_team_playing_time: {
    minutes_tip: number;
    minutes_otip: number;
  };
  competition_edition: SkillCornerCompetitionEdition;
  match_periods: SkillCornerMatchPeriod[];
  competition_round: {
    id: number;
    name: string;
    round_number: number;
    potential_overtime: boolean;
  };
  referees: any[];
  players: SkillCornerPlayer[];
  status: string;
  home_team_side: string[];
  ball: {
    trackable_object: number;
  };
  pitch_length: number;
  pitch_width: number;
}
