/**
 * Rendu du terrain de football avec D3.js
 * Dessine toutes les lignes et marquages du terrain
 */

import * as d3 from 'd3';
import { FIELD_DIMENSIONS, FIELD_COLORS, SVG_CONFIG } from './constants';
import type { FieldDimensions, FieldScales } from './types';

/**
 * Crée les scales D3 pour convertir les coordonnées du terrain en pixels
 */
export function createFieldScales(
  dimensions: FieldDimensions,
  svgWidth: number,
  svgHeight: number
): FieldScales {
  const padding = SVG_CONFIG.PADDING;

  // Le terrain est centré à (0,0) dans les données SkillCorner
  // x va de -length/2 à +length/2
  // y va de -width/2 à +width/2
  const halfLength = dimensions.length / 2;
  const halfWidth = dimensions.width / 2;

  const x = d3.scaleLinear()
    .domain([-halfLength - padding, halfLength + padding])
    .range([0, svgWidth]);

  const y = d3.scaleLinear()
    .domain([-halfWidth - padding, halfWidth + padding])
    .range([svgHeight, 0]); // Inversé pour SVG

  return { x, y };
}

/**
 * Dessine le terrain de football complet
 */
export function renderField(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  scales: FieldScales,
  dimensions: FieldDimensions
): void {
  const { x, y } = scales;
  const halfLength = dimensions.length / 2;
  const halfWidth = dimensions.width / 2;

  // Groupe pour le terrain
  const fieldGroup = svg.append('g').attr('class', 'field');

  // Calcul des coordonnées du terrain
  const notchSize = 25; // Taille du coin coupé en pixels (accentué)
  const fieldLeft = x(-halfLength);
  const fieldRight = x(halfLength);
  const fieldTop = y(halfWidth);
  const fieldBottom = y(-halfWidth);

  // Path notched pour le fond ET le contour
  const notchedPath = `
    M ${fieldLeft + notchSize} ${fieldTop}
    L ${fieldRight} ${fieldTop}
    L ${fieldRight} ${fieldBottom - notchSize}
    L ${fieldRight - notchSize} ${fieldBottom}
    L ${fieldLeft} ${fieldBottom}
    L ${fieldLeft} ${fieldTop + notchSize}
    Z
  `;

  // Fond du terrain (notched)
  fieldGroup.append('path')
    .attr('class', 'field-background')
    .attr('d', notchedPath)
    .attr('fill', FIELD_COLORS.GRASS);

  // Groupe pour les lignes
  const linesGroup = fieldGroup.append('g').attr('class', 'field-lines');

  // Style commun pour les lignes
  const lineStyle = {
    stroke: FIELD_COLORS.LINE,
    strokeWidth: Math.max(1, Math.abs(x(FIELD_COLORS.LINE_WIDTH) - x(0))),
    fill: 'none'
  };

  // Ligne de touche (contour du terrain) - style notched
  linesGroup.append('path')
    .attr('class', 'touchline')
    .attr('d', notchedPath)
    .attr('stroke', lineStyle.stroke)
    .attr('stroke-width', lineStyle.strokeWidth)
    .attr('fill', 'none');

  // Ligne médiane
  linesGroup.append('line')
    .attr('class', 'halfway-line')
    .attr('x1', x(0))
    .attr('y1', y(-halfWidth))
    .attr('x2', x(0))
    .attr('y2', y(halfWidth))
    .attr('stroke', lineStyle.stroke)
    .attr('stroke-width', lineStyle.strokeWidth);

  // Cercle central
  const centerCircleRadius = Math.abs(x(FIELD_DIMENSIONS.CENTER_CIRCLE_RADIUS) - x(0));
  linesGroup.append('circle')
    .attr('class', 'center-circle')
    .attr('cx', x(0))
    .attr('cy', y(0))
    .attr('r', centerCircleRadius)
    .attr('stroke', lineStyle.stroke)
    .attr('stroke-width', lineStyle.strokeWidth)
    .attr('fill', 'none');

  // Dessiner les deux côtés (gauche = -x, droite = +x)
  [-1, 1].forEach(side => {
    const sideX = side * halfLength;

    // Surface de réparation (16 mètres)
    const penaltyAreaHalfWidth = FIELD_DIMENSIONS.PENALTY_AREA_WIDTH / 2;
    const penaltyAreaDepth = FIELD_DIMENSIONS.PENALTY_AREA_DEPTH;

    linesGroup.append('rect')
      .attr('class', `penalty-area-${side > 0 ? 'right' : 'left'}`)
      .attr('x', side > 0 ? x(sideX - penaltyAreaDepth) : x(sideX))
      .attr('y', y(penaltyAreaHalfWidth))
      .attr('width', Math.abs(x(penaltyAreaDepth) - x(0)))
      .attr('height', Math.abs(y(-penaltyAreaHalfWidth) - y(penaltyAreaHalfWidth)))
      .attr('stroke', lineStyle.stroke)
      .attr('stroke-width', lineStyle.strokeWidth)
      .attr('fill', 'none');

    // Surface de but (6 mètres)
    const goalAreaHalfWidth = FIELD_DIMENSIONS.GOAL_AREA_WIDTH / 2;
    const goalAreaDepth = FIELD_DIMENSIONS.GOAL_AREA_DEPTH;

    linesGroup.append('rect')
      .attr('class', `goal-area-${side > 0 ? 'right' : 'left'}`)
      .attr('x', side > 0 ? x(sideX - goalAreaDepth) : x(sideX))
      .attr('y', y(goalAreaHalfWidth))
      .attr('width', Math.abs(x(goalAreaDepth) - x(0)))
      .attr('height', Math.abs(y(-goalAreaHalfWidth) - y(goalAreaHalfWidth)))
      .attr('stroke', lineStyle.stroke)
      .attr('stroke-width', lineStyle.strokeWidth)
      .attr('fill', 'none');
  });
}

/**
 * Met à jour les dimensions du terrain (responsive)
 */
export function updateFieldDimensions(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  scales: FieldScales,
  dimensions: FieldDimensions
): void {
  // Supprimer l'ancien terrain
  svg.select('.field').remove();

  // Redessiner
  renderField(svg, scales, dimensions);
}
