/**
 * Formater le timestamp en MM:SS (temps total depuis le début du match)
 */
export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return '--:--';
  // Le timestamp est au format HH:MM:SS.mmm ou HH:MM:SS ou MM:SS
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    // Format HH:MM:SS ou HH:MM:SS.mmm -> calculer le temps total en minutes
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2].split('.')[0]; // Enlever les millisecondes
    const totalMinutes = hours * 60 + minutes;
    return `${totalMinutes}:${seconds}`;
  } else if (parts.length === 2) {
    // Format MM:SS ou MM:SS.mmm
    const seconds = parts[1].split('.')[0]; // Enlever les millisecondes
    return `${parts[0]}:${seconds}`;
  }
  return '--:--';
}
