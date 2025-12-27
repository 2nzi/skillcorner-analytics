/**
 * Playback Controller
 *
 * Gère la lecture et la navigation dans les données de tracking du match.
 * Contrôle la vitesse de lecture, les sauts temporels, et la navigation frame par frame.
 */

import type { SkillCornerTrackingFrame } from '$types/skillcorner';

/**
 * Configuration de la lecture
 */
export const PLAYBACK_CONFIG = {
  // Fréquence d'enregistrement des données (10 positions de tracking par seconde réelle)
  DATA_FPS: 10,

  // Intervalle de mise à jour en millisecondes pour une lecture en temps réel
  // Si les données sont à 10 FPS, une frame = 1/10 seconde = 100ms
  get PLAYBACK_INTERVAL_MS() {
    return 1000 / this.DATA_FPS; // 100ms par frame
  },

  // Nombre de frames pour les sauts rapides (5 secondes à 10 FPS = 50 frames)
  get JUMP_FRAMES() {
    return this.DATA_FPS * 5; // 50 frames
  }
} as const;

/**
 * Interface pour le contrôleur de playback
 */
export interface PlaybackController {
  isPlaying: boolean;
  playbackSpeed: number;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  setPlaybackSpeed: (speed: number) => void;
  previousFrame: () => void;
  nextFrame: () => void;
  jumpBackward: () => void;
  jumpForward: () => void;
  cleanup: () => void;
}

/**
 * Créer un contrôleur de playback
 *
 * @param currentFrameIndex - État réactif de l'index de frame actuel
 * @param trackingData - Données de tracking du match
 * @param onFrameIndexChange - Callback appelé quand l'index de frame change
 * @returns Contrôleur de playback
 *
 * @example
 * const controller = createPlaybackController(
 *   () => currentFrameIndex,
 *   trackingData,
 *   (newIndex) => { currentFrameIndex = newIndex; }
 * );
 */
export function createPlaybackController(
  getCurrentFrameIndex: () => number,
  getTrackingData: () => SkillCornerTrackingFrame[],
  onFrameIndexChange: (newIndex: number) => void
): PlaybackController {
  let isPlaying = $state(false);
  let playbackSpeed = $state(1);
  let playIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Démarre la lecture automatique
   */
  function play() {
    if (isPlaying) return;
    isPlaying = true;

    playIntervalId = setInterval(() => {
      const trackingData = getTrackingData();
      const currentIndex = getCurrentFrameIndex();

      if (currentIndex < trackingData.length - 1) {
        onFrameIndexChange(currentIndex + 1);
      } else {
        // Fin du match, arrêter la lecture
        pause();
      }
    }, PLAYBACK_CONFIG.PLAYBACK_INTERVAL_MS / playbackSpeed);
  }

  /**
   * Change la vitesse de lecture
   */
  function setPlaybackSpeed(speed: number) {
    const wasPlaying = isPlaying;
    if (wasPlaying) pause();
    playbackSpeed = speed;
    if (wasPlaying) play();
  }

  /**
   * Met en pause la lecture
   */
  function pause() {
    isPlaying = false;
    if (playIntervalId) {
      clearInterval(playIntervalId);
      playIntervalId = null;
    }
  }

  /**
   * Bascule entre play et pause
   */
  function togglePlayPause() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  /**
   * Recule d'une frame
   */
  function previousFrame() {
    pause();
    const currentIndex = getCurrentFrameIndex();
    if (currentIndex > 0) {
      onFrameIndexChange(currentIndex - 1);
    }
  }

  /**
   * Avance d'une frame
   */
  function nextFrame() {
    pause();
    const trackingData = getTrackingData();
    const currentIndex = getCurrentFrameIndex();
    if (currentIndex < trackingData.length - 1) {
      onFrameIndexChange(currentIndex + 1);
    }
  }

  /**
   * Recule de 5 secondes
   */
  function jumpBackward() {
    pause();
    const currentIndex = getCurrentFrameIndex();
    const newIndex = Math.max(0, currentIndex - PLAYBACK_CONFIG.JUMP_FRAMES);
    onFrameIndexChange(newIndex);
  }

  /**
   * Avance de 5 secondes
   */
  function jumpForward() {
    pause();
    const trackingData = getTrackingData();
    const currentIndex = getCurrentFrameIndex();
    const newIndex = Math.min(trackingData.length - 1, currentIndex + PLAYBACK_CONFIG.JUMP_FRAMES);
    onFrameIndexChange(newIndex);
  }

  /**
   * Nettoyer les intervalles lors de la destruction du composant
   */
  function cleanup() {
    pause();
  }

  return {
    get isPlaying() { return isPlaying; },
    get playbackSpeed() { return playbackSpeed; },
    play,
    pause,
    togglePlayPause,
    setPlaybackSpeed,
    previousFrame,
    nextFrame,
    jumpBackward,
    jumpForward,
    cleanup
  };
}
