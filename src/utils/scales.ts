import * as d3 from 'd3';

/**
 * Crée les scales D3 pour convertir les coordonnées terrain → pixels SVG
 */
export function createPitchScales(
  pitchWidth: number,
  pitchHeight: number
) {
  // Terrain centré à (0,0) avec coordonnées en mètres
  const xScale = d3.scaleLinear()
    .domain([-pitchWidth / 2, pitchWidth / 2])
    .range([0, pitchWidth]);

  const yScale = d3.scaleLinear()
    .domain([-pitchHeight / 2, pitchHeight / 2])
    .range([pitchHeight, 0]); // Inversé car SVG y descend

  return { xScale, yScale };
}

/**
 * Convertit une position terrain en pixels
 */
export function positionToPixels(
  x: number,
  y: number,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
): { x: number; y: number } {
  return {
    x: xScale(x),
    y: yScale(y)
  };
}
