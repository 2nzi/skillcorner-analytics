/**
 * Rendu des joueurs et du ballon avec D3.js
 */

import * as d3 from 'd3';
import { FIELD_COLORS, SVG_CONFIG } from './constants';
import type { PlayerPosition, BallPosition, TeamInfo, FieldScales } from './types';
import {
  resolvePlayerTeamColor,
  resolvePlayerJerseyNumber,
  resolveJerseyNumberColor
} from '$lib/utils/match-analysis';

interface PlayerRenderOptions {
  scales: FieldScales;
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;
  showNumbers?: boolean;
  playerInPossessionId?: number | null;
  onPlayerClick?: (playerId: number) => void;
  onPlayerHover?: (playerId: number | null) => void;
}

/**
 * Détermine la couleur d'un joueur selon son équipe
 * Note: Cette fonction est un wrapper pour maintenir la compatibilité avec le code existant
 */
function getPlayerColor(playerId: number, homeTeam?: TeamInfo, awayTeam?: TeamInfo): string {
  const color = resolvePlayerTeamColor(playerId, homeTeam, awayTeam);
  // Fallback sur les couleurs par défaut si nécessaire
  if (color === 'rgba(255, 255, 255, 0.8)') {
    if (homeTeam?.playerIds.includes(playerId)) return homeTeam.color || FIELD_COLORS.HOME_TEAM;
    if (awayTeam?.playerIds.includes(playerId)) return awayTeam.color || FIELD_COLORS.AWAY_TEAM;
    return '#888888';
  }
  return color;
}

/**
 * Récupère le numéro du maillot d'un joueur
 * Note: Cette fonction est un wrapper pour maintenir la compatibilité avec le code existant
 */
function getPlayerNumber(playerId: number, homeTeam?: TeamInfo, awayTeam?: TeamInfo): number | null {
  return resolvePlayerJerseyNumber(playerId, null, homeTeam, awayTeam);
}

/**
 * Récupère la couleur du numéro d'un joueur selon son équipe
 * Note: Cette fonction est un wrapper pour maintenir la compatibilité avec le code existant
 */
function getNumberColor(playerId: number, homeTeam?: TeamInfo, awayTeam?: TeamInfo): string {
  return resolveJerseyNumberColor(playerId, homeTeam, awayTeam);
}

/**
 * Crée ou met à jour les joueurs sur le terrain
 */
export function renderPlayers(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  players: PlayerPosition[],
  options: PlayerRenderOptions
): void {
  const { scales, homeTeam, awayTeam, showNumbers, playerInPossessionId, onPlayerClick, onPlayerHover } = options;
  const { x, y } = scales;

  // Groupe pour les joueurs
  let playersGroup = svg.select<SVGGElement>('.players');
  if (playersGroup.empty()) {
    playersGroup = svg.append('g').attr('class', 'players');
  }

  // Rayon des joueurs en pixels
  const playerRadius = Math.abs(x(SVG_CONFIG.PLAYER_RADIUS) - x(0));

  // Data join pour les joueurs
  const playerCircles = playersGroup
    .selectAll<SVGGElement, PlayerPosition>('.player')
    .data(players, d => d.playerId?.toString() ?? 'unknown');

  // Enter: nouveaux joueurs
  const enterGroup = playerCircles.enter()
    .append('g')
    .attr('class', 'player')
    .attr('transform', d => `translate(${x(d.x)}, ${y(d.y)})`)
    .style('cursor', 'pointer');

  // Cercle en pointillés pour la possession (subtil, couleur de l'équipe)
  enterGroup.append('circle')
    .attr('class', 'player-possession-circle')
    .attr('r', playerRadius * 1.5)
    .attr('fill', 'none')
    .attr('stroke', d => getPlayerColor(d.playerId, homeTeam, awayTeam))
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4,3')
    .attr('opacity', d => d.playerId === playerInPossessionId ? 0.8 : 0);

  // Cercle du joueur
  enterGroup.append('circle')
    .attr('class', 'player-circle')
    .attr('r', playerRadius)
    .attr('fill', d => getPlayerColor(d.playerId, homeTeam, awayTeam))
    .attr('opacity', d => d.isDetected ? 1 : 0.4)
    .attr('stroke', d => d.playerId === playerInPossessionId ? getPlayerColor(d.playerId, homeTeam, awayTeam) : 'rgba(0,0,0,0.2)')
    .attr('stroke-width', d => d.playerId === playerInPossessionId ? 3 : 1);

  // Numéro du joueur (toujours affiché si disponible)
  enterGroup.append('text')
    .attr('class', 'player-number')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('fill', d => getNumberColor(d.playerId, homeTeam, awayTeam))
    .attr('font-size', playerRadius * 0.9)
    .attr('font-weight', 'bold')
    .text(d => {
      const number = getPlayerNumber(d.playerId, homeTeam, awayTeam);
      return number !== null ? number : '';
    });

  // Update: joueurs existants (avec transition)
  playerCircles
    .transition()
    .duration(SVG_CONFIG.TRANSITION_DURATION)
    .attr('transform', d => `translate(${x(d.x)}, ${y(d.y)})`);

  // Mettre à jour les couleurs, opacité et effets selon détection et possession
  playerCircles.select('.player-circle')
    .attr('fill', d => getPlayerColor(d.playerId, homeTeam, awayTeam))
    .attr('opacity', d => d.isDetected ? 1 : 0.4)
    .attr('stroke', d => d.playerId === playerInPossessionId ? getPlayerColor(d.playerId, homeTeam, awayTeam) : 'rgba(0,0,0,0.2)')
    .attr('stroke-width', d => d.playerId === playerInPossessionId ? 3 : 1);

  playerCircles.select('.player-number')
    .attr('fill', d => getNumberColor(d.playerId, homeTeam, awayTeam))
    .attr('opacity', d => d.isDetected ? 1 : 0.4)
    .text(d => {
      const number = getPlayerNumber(d.playerId, homeTeam, awayTeam);
      return number !== null ? number : '';
    });

  // Mettre à jour le cercle de possession en pointillés (couleur de l'équipe)
  playerCircles.select('.player-possession-circle')
    .attr('stroke', d => getPlayerColor(d.playerId, homeTeam, awayTeam))
    .attr('opacity', d => d.playerId === playerInPossessionId ? 0.8 : 0);

  // Exit: joueurs qui ne sont plus présents
  playerCircles.exit().remove();

  // Events (sur tous les joueurs)
  playersGroup.selectAll<SVGGElement, PlayerPosition>('.player')
    .on('click', (event, d) => {
      event.stopPropagation();
      onPlayerClick?.(d.playerId);
    })
    .on('mouseenter', (event, d) => {
      onPlayerHover?.(d.playerId);
      d3.select(event.currentTarget)
        .select('.player-circle')
        .transition()
        .duration(100)
        .attr('r', playerRadius * 1.3)
        .attr('stroke-width', 3);
    })
    .on('mouseleave', (event) => {
      onPlayerHover?.(null);
      d3.select(event.currentTarget)
        .select('.player-circle')
        .transition()
        .duration(100)
        .attr('r', playerRadius)
        .attr('stroke-width', 2);
    });
}

/**
 * Crée ou met à jour le ballon sur le terrain
 */
export function renderBall(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  ball: BallPosition,
  scales: FieldScales
): void {
  const { x, y } = scales;

  // Groupe pour le ballon (toujours au-dessus de tout)
  let ballGroup = svg.select<SVGGElement>('.ball-group');
  if (ballGroup.empty()) {
    ballGroup = svg.append('g').attr('class', 'ball-group');
  } else {
    // S'assurer que le groupe est bien à la fin (au-dessus de tout)
    ballGroup.raise();
  }

  // Rayon du ballon en pixels
  const ballRadius = Math.abs(x(SVG_CONFIG.BALL_RADIUS) - x(0));

  // Si le ballon n'est pas détecté ou pas de position
  if (!ball.isDetected || ball.x === null || ball.y === null) {
    ballGroup.selectAll('.ball').remove();
    return;
  }

  // Data join
  const ballSelection = ballGroup
    .selectAll<SVGCircleElement, BallPosition>('.ball')
    .data([ball]);

  // Enter
  ballSelection.enter()
    .append('circle')
    .attr('class', 'ball')
    .attr('r', ballRadius)
    .attr('fill', FIELD_COLORS.BALL)
    .attr('stroke', '#000000')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3,2')
    .attr('cx', x(ball.x))
    .attr('cy', y(ball.y));

  // Update
  ballSelection
    .transition()
    .duration(SVG_CONFIG.TRANSITION_DURATION)
    .attr('cx', x(ball.x))
    .attr('cy', y(ball.y));

  // Exit
  ballSelection.exit().remove();
}

/**
 * Efface tous les joueurs du terrain
 */
export function clearPlayers(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): void {
  svg.select('.players').remove();
}

/**
 * Efface le ballon du terrain
 */
export function clearBall(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): void {
  svg.select('.ball-group').remove();
}

/**
 * Interface pour les données de passe
 */
export interface PassData {
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  frameStart: number;
}

/**
 * Interface pour les positions de la balle dans la phase
 */
export interface BallTracePoint {
  x: number;
  y: number;
  frame: number;
}

/**
 * Interface pour les données de phase
 */
export interface PhaseData {
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  phaseName?: string;
  teamColor?: string;
  passes?: PassData[];
  ballTrace?: BallTracePoint[];
  currentFrame?: number;
  // Debug info
  timeStart?: string;
  timeEnd?: string;
  frameStart?: number;
  frameEnd?: number;
}

/**
 * Crée ou met à jour la visualisation de la phase de jeu sur le terrain
 */
export function renderPhase(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  phase: PhaseData | null,
  scales: FieldScales
): void {
  const { x, y } = scales;

  // Groupe pour la phase (créé en premier pour être sous les joueurs)
  let phaseGroup = svg.select<SVGGElement>('.phase-group');
  if (phaseGroup.empty()) {
    // Insérer avant le groupe players pour être en dessous
    const playersGroup = svg.select('.players');
    if (!playersGroup.empty()) {
      phaseGroup = svg.insert('g', '.players').attr('class', 'phase-group');
    } else {
      phaseGroup = svg.append('g').attr('class', 'phase-group');
    }
  }

  // Si pas de phase, nettoyer
  if (!phase) {
    phaseGroup.selectAll('*').remove();
    return;
  }

  const color = phase.teamColor || 'rgba(255, 255, 255, 0.6)';

  // Vérifier si on a des coordonnées valides
  const hasValidCoords = phase.xStart != null && phase.xEnd != null
    && !isNaN(phase.xStart) && !isNaN(phase.xEnd);

  // Rectangle de x_start à x_end sur toute la hauteur du terrain
  // Note: (0,0) est le centre du terrain, x va de -52.5 à 52.5, y va de -34 à 34
  if (hasValidCoords) {
    const x1 = x(phase.xStart);
    const x2 = x(phase.xEnd);
    const yTop = y(34); // Haut du terrain (y = 34)
    const yBottom = y(-34); // Bas du terrain (y = -34)

    // Calculer les dimensions du rectangle
    const rectX = Math.min(x1, x2);
    const rectWidth = Math.abs(x2 - x1);
    const rectY = Math.min(yTop, yBottom);
    const rectHeight = Math.abs(yBottom - yTop);

    // Data pour le rectangle
    const rectData = [{ x: rectX, y: rectY, width: rectWidth, height: rectHeight }];

    // Rectangle
    const rect = phaseGroup
      .selectAll<SVGRectElement, typeof rectData[0]>('.phase-rect')
      .data(rectData);

    rect.enter()
      .append('rect')
      .attr('class', 'phase-rect')
      .attr('fill', color)
      .attr('fill-opacity', 0.2)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', d => d.height);

    rect
      .transition()
      .duration(SVG_CONFIG.TRANSITION_DURATION)
      .attr('fill', color)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', d => d.height);

    rect.exit().remove();
  } else {
    // Pas de coordonnées, supprimer le rectangle
    phaseGroup.selectAll('.phase-rect').remove();
  }

  // Nom de la phase en bas du terrain
  if (phase.phaseName) {
    // Position : entre x_start et x_end si disponible, sinon au centre
    const textX = hasValidCoords ? x((phase.xStart + phase.xEnd) / 2) : x(0);
    const textY = y(-34) - 8; // En bas du terrain avec un petit padding

    const textData = [{ x: textX, y: textY, text: phase.phaseName.toUpperCase() }];

    const text = phaseGroup
      .selectAll<SVGTextElement, typeof textData[0]>('.phase-label')
      .data(textData);

    text.enter()
      .append('text')
      .attr('class', 'phase-label')
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', 14)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .text(d => d.text);

    text
      .attr('fill', '#ffffff')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .text(d => d.text);

    text.exit().remove();
  } else {
    phaseGroup.selectAll('.phase-label').remove();
  }

  // Dessiner la trace de la balle
  if (phase.ballTrace && phase.ballTrace.length > 1) {
    // Vérifier si la trace existe déjà avec les mêmes données
    let existingTrace = phaseGroup.select<SVGPolylineElement>('.ball-trace');
    const tracePoints = phase.ballTrace;
    const pathPoints = tracePoints.map(p => `${x(p.x)},${y(p.y)}`).join(' ');

    if (existingTrace.empty()) {
      // Créer la trace
      phaseGroup.append('polyline')
        .attr('class', 'ball-trace')
        .attr('fill', 'none')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-opacity', 0.6)
        .attr('points', pathPoints);
    } else if (existingTrace.attr('points') !== pathPoints) {
      // Mettre à jour seulement si les points ont changé
      existingTrace.attr('points', pathPoints);
    }
  } else {
    phaseGroup.selectAll('.ball-trace').remove();
  }

  // Dessiner les cercles de départ des passes
  if (phase.passes && phase.passes.length > 0 && phase.currentFrame != null) {
    const currentFrame = phase.currentFrame;

    // Vérifier si les cercles existent déjà
    const existingCircles = phaseGroup.selectAll<SVGCircleElement, PassData>('.pass-start');

    if (existingCircles.empty() || existingCircles.size() !== phase.passes.length) {
      // Recréer les cercles seulement si nécessaire
      phaseGroup.selectAll('.pass-start').remove();

      phase.passes.forEach((p, i) => {
        phaseGroup.append('circle')
          .attr('class', 'pass-start')
          .attr('data-frame', p.frameStart)
          .attr('cx', x(p.xStart))
          .attr('cy', y(p.yStart))
          .attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', currentFrame >= p.frameStart ? '#00cc00' : '#ff0000')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2');
      });
    } else {
      // Mettre à jour seulement les couleurs
      existingCircles.each(function() {
        const circle = d3.select(this);
        const frameStart = parseInt(circle.attr('data-frame'));
        const isDone = currentFrame >= frameStart;
        const newColor = isDone ? '#00cc00' : '#ff0000';
        if (circle.attr('stroke') !== newColor) {
          circle.attr('stroke', newColor);
        }
      });
    }
  } else {
    phaseGroup.selectAll('.pass-start').remove();
  }
}

/**
 * Efface la phase du terrain
 */
export function clearPhase(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): void {
  svg.select('.phase-group').remove();
}
