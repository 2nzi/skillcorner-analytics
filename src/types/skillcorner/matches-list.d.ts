/**
 * Types bruts SkillCorner pour la liste des matchs
 * Format tel que fourni par SkillCorner (matches.json)
 */

export interface SkillCornerMatchListItem {
  id: number;
  date_time: string;
  home_team: {
    id: number;
    short_name: string;
  };
  away_team: {
    id: number;
    short_name: string;
  };
  status: string;
  competition_id: number;
  season_id: number;
  competition_edition_id: number;
}

export type SkillCornerMatchesList = SkillCornerMatchListItem[];
