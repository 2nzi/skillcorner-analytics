/**
 * Utilities for transforming coordinates based on attacking direction
 */

/**
 * Determine if coordinates need to be flipped based on attacking side
 * @param attackingSide - Possible values: "left-to-right", "right-to-left", "left", "right"
 * @returns true if coordinates should be inverted
 */
export function shouldFlipCoordinates(attackingSide: string): boolean {
  // Handle both formats: "right-to-left" or "right"
  return attackingSide === 'right-to-left' || attackingSide === 'right';
}

/**
 * Transform X coordinate based on attacking direction
 * @param x - Original X coordinate
 * @param attackingSide - "left-to-right", "right-to-left", "left", or "right"
 * @returns Transformed X coordinate (negated if attacking right-to-left)
 */
export function transformX(x: number, attackingSide: string): number {
  // Inverser le signe X si l'équipe attaque de droite à gauche
  return shouldFlipCoordinates(attackingSide) ? -x : x;
}

/**
 * Transform Y coordinate based on attacking direction
 * @param y - Original Y coordinate
 * @param attackingSide - "left-to-right", "right-to-left", "left", or "right"
 * @returns Transformed Y coordinate (negated if attacking right-to-left)
 */
export function transformY(y: number, attackingSide: string): number {
  // Inverser le signe Y si l'équipe attaque de droite à gauche
  return shouldFlipCoordinates(attackingSide) ? -y : y;
}

/**
 * Transform a point (x, y) based on attacking direction
 */
export function transformPoint(
  x: number,
  y: number,
  attackingSide: string
): { x: number; y: number } {
  return {
    x: transformX(x, attackingSide),
    y: transformY(y, attackingSide)
  };
}
