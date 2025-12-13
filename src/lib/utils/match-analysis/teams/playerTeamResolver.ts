/**
 * Player Team Resolver
 *
 * Résout les informations d'équipe pour les joueurs :
 * - Numéro de maillot
 * - Couleur de l'équipe
 * - Couleur du numéro
 * - Appartenance à l'équipe domicile/extérieur
 *
 * Centralise toute la logique de résolution joueur → équipe pour éviter
 * la duplication de code dans les composants.
 */

import type { SkillCornerMatch, SkillCornerPlayer } from '$types/skillcorner';
import type { TeamInfo } from '$lib/components/features/match-analysis/football-field';

/**
 * Construit les informations complètes d'une équipe à partir des données du match
 *
 * Extrait et structure toutes les informations nécessaires pour une équipe :
 * ID, nom, couleurs, liste des joueurs avec leurs numéros.
 *
 * @param teamType - Type d'équipe ('home' ou 'away')
 * @param matchData - Données complètes du match
 * @returns Objet TeamInfo avec toutes les informations de l'équipe
 *
 * @example
 * const homeTeam = buildTeamInfoFromMatch('home', matchData);
 * // Returns: { id: 123, name: "PSG", color: "#004170", playerNumbers: Map(...), ... }
 */
export function buildTeamInfoFromMatch(
  teamType: 'home' | 'away',
  matchData: SkillCornerMatch
): TeamInfo {
  const isHome = teamType === 'home';
  const team = isHome ? matchData.home_team : matchData.away_team;
  const kit = isHome ? matchData.home_team_kit : matchData.away_team_kit;

  // Couleurs par défaut si non définies
  const defaultTeamColor = isHome ? '#ff4444' : '#4444ff';
  const defaultNumberColor = '#ffffff';

  // Filtrer les joueurs de cette équipe
  const teamPlayers = matchData.players.filter(p => p.team_id === team.id);

  return {
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    color: kit?.jersey_color || defaultTeamColor,
    numberColor: kit?.number_color || defaultNumberColor,
    playerIds: teamPlayers.map(p => p.id),
    playerNumbers: new Map(teamPlayers.map(p => [p.id, p.number]))
  };
}

/**
 * Résout le numéro de maillot d'un joueur
 *
 * Recherche le numéro de maillot d'un joueur soit via les TeamInfo (O(1)),
 * soit directement dans matchData (O(n) fallback).
 *
 * @param playerId - ID du joueur
 * @param matchData - Données du match (optionnel, fallback)
 * @param homeTeam - Informations équipe domicile (optionnel, plus rapide)
 * @param awayTeam - Informations équipe extérieur (optionnel, plus rapide)
 * @returns Numéro du joueur ou null si non trouvé
 *
 * @example
 * // Méthode rapide avec TeamInfo
 * const number = resolvePlayerJerseyNumber(playerId, null, homeTeam, awayTeam);
 *
 * // Méthode fallback avec matchData
 * const number = resolvePlayerJerseyNumber(playerId, matchData);
 */
export function resolvePlayerJerseyNumber(
  playerId: number | null,
  matchData?: SkillCornerMatch | null,
  homeTeam?: TeamInfo,
  awayTeam?: TeamInfo
): number | null {
  if (!playerId) return null;

  // Option 1: Recherche via TeamInfo (plus rapide - O(1) avec Map)
  if (homeTeam || awayTeam) {
    const homeNumber = homeTeam?.playerNumbers.get(playerId);
    if (homeNumber !== undefined) return homeNumber;

    const awayNumber = awayTeam?.playerNumbers.get(playerId);
    if (awayNumber !== undefined) return awayNumber;

    return null;
  }

  // Option 2: Recherche directe dans matchData (fallback - O(n))
  if (matchData) {
    const player = matchData.players.find(p => p.id === playerId);
    return player?.number ?? null;
  }

  return null;
}

/**
 * Résout la couleur de l'équipe d'un joueur
 *
 * Détermine la couleur du maillot d'un joueur en identifiant son équipe.
 *
 * @param playerId - ID du joueur
 * @param homeTeam - Informations équipe domicile
 * @param awayTeam - Informations équipe extérieur
 * @returns Couleur de l'équipe (hex) ou couleur par défaut
 *
 * @example
 * const color = resolvePlayerTeamColor(playerId, homeTeam, awayTeam);
 * // Returns: "#004170" (couleur du PSG)
 */
export function resolvePlayerTeamColor(
  playerId: number,
  homeTeam?: TeamInfo,
  awayTeam?: TeamInfo
): string {
  if (homeTeam?.playerIds.includes(playerId)) {
    return homeTeam.color;
  }
  if (awayTeam?.playerIds.includes(playerId)) {
    return awayTeam.color;
  }
  // Couleur par défaut si joueur non trouvé
  return 'rgba(255, 255, 255, 0.8)';
}

/**
 * Résout la couleur du numéro de maillot d'un joueur
 *
 * Détermine la couleur du numéro affiché sur le maillot (peut différer
 * de la couleur du maillot lui-même).
 *
 * @param playerId - ID du joueur
 * @param homeTeam - Informations équipe domicile
 * @param awayTeam - Informations équipe extérieur
 * @returns Couleur du numéro (hex) ou noir par défaut
 *
 * @example
 * const numberColor = resolveJerseyNumberColor(playerId, homeTeam, awayTeam);
 * // Returns: "#ffffff" (numéro blanc)
 */
export function resolveJerseyNumberColor(
  playerId: number,
  homeTeam?: TeamInfo,
  awayTeam?: TeamInfo
): string {
  if (homeTeam?.playerIds.includes(playerId)) {
    return homeTeam.numberColor;
  }
  if (awayTeam?.playerIds.includes(playerId)) {
    return awayTeam.numberColor;
  }
  // Couleur par défaut
  return '#000000';
}

/**
 * Détermine si un joueur appartient à l'équipe domicile
 *
 * Utile pour appliquer des styles ou comportements différents selon l'équipe.
 *
 * @param playerId - ID du joueur
 * @param homeTeam - Informations équipe domicile
 * @returns true si le joueur est dans l'équipe domicile
 *
 * @example
 * if (isPlayerInHomeTeam(playerId, homeTeam)) {
 *   // Afficher avec un style spécifique pour l'équipe domicile
 * }
 */
export function isPlayerInHomeTeam(
  playerId: number,
  homeTeam?: TeamInfo
): boolean {
  return homeTeam?.playerIds.includes(playerId) ?? false;
}

/**
 * Résout toutes les informations d'un joueur en une seule fois
 *
 * Fonction utilitaire qui résout simultanément toutes les informations
 * d'un joueur pour éviter les multiples appels de fonctions.
 *
 * @param playerId - ID du joueur
 * @param homeTeam - Informations équipe domicile
 * @param awayTeam - Informations équipe extérieur
 * @returns Objet avec toutes les informations du joueur
 *
 * @example
 * const playerInfo = resolveAllPlayerInfo(playerId, homeTeam, awayTeam);
 * // Returns: {
 * //   jerseyNumber: 10,
 * //   teamColor: "#004170",
 * //   numberColor: "#ffffff",
 * //   isHomeTeam: true
 * // }
 */
export function resolveAllPlayerInfo(
  playerId: number,
  homeTeam?: TeamInfo,
  awayTeam?: TeamInfo
): {
  jerseyNumber: number | null;
  teamColor: string;
  numberColor: string;
  isHomeTeam: boolean;
} {
  return {
    jerseyNumber: resolvePlayerJerseyNumber(playerId, null, homeTeam, awayTeam),
    teamColor: resolvePlayerTeamColor(playerId, homeTeam, awayTeam),
    numberColor: resolveJerseyNumberColor(playerId, homeTeam, awayTeam),
    isHomeTeam: isPlayerInHomeTeam(playerId, homeTeam)
  };
}
