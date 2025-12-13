/**
 * Configuration du terrain de football
 */
export interface PitchConfig {
  dimensions: {
    width: number;  // Largeur en mètres
    height: number; // Hauteur en mètres
  };
  colors: {
    pitch: string;
    pitchLines: string;
    homeTeam: string;
    awayTeam: string;
    ball: string;
  };
  player: {
    radius: number;
    strokeWidth: number;
    showNumbers: boolean;
    fontSize: number;
  };
  ball: {
    radius: number;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Configuration par défaut
 */
export const DEFAULT_PITCH_CONFIG: PitchConfig = {
  dimensions: {
    width: 105,  // Terrain FIFA standard
    height: 68
  },
  colors: {
    pitch: '#2d5f3f',
    pitchLines: 'white',
    homeTeam: '#ff4444',
    awayTeam: '#4444ff',
    ball: 'white'
  },
  player: {
    radius: 1.5,
    strokeWidth: 0,
    showNumbers: true,
    fontSize: 1.2
  },
  ball: {
    radius: 0.5
  },
  margins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  }
};

/**
 * Thèmes prédéfinis
 */
export const PITCH_THEMES = {
  classic: DEFAULT_PITCH_CONFIG,

  darkMode: {
    ...DEFAULT_PITCH_CONFIG,
    colors: {
      ...DEFAULT_PITCH_CONFIG.colors,
      pitch: '#1a1a1a',
      pitchLines: '#00ff00'
    }
  } as PitchConfig,

  highContrast: {
    ...DEFAULT_PITCH_CONFIG,
    colors: {
      ...DEFAULT_PITCH_CONFIG.colors,
      homeTeam: '#ff0000',
      awayTeam: '#0000ff'
    }
  } as PitchConfig
};
