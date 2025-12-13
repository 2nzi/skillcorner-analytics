<script lang="ts">
  import type { SkillCornerMatch, SkillCornerTrackingFrame } from '$types/skillcorner';
  import { formatTimestamp } from '$lib/utils/timeFormat';

  interface Props {
    matchData: SkillCornerMatch | null;
    currentFrame: SkillCornerTrackingFrame | null;
    isPlaying: boolean;
    isLoading: boolean;
    hasTrackingData: boolean;
    onPlayPause: () => void;
    onJumpBackward: () => void;
    onJumpForward: () => void;
  }

  let {
    matchData,
    currentFrame,
    isPlaying,
    isLoading,
    hasTrackingData,
    onPlayPause,
    onJumpBackward,
    onJumpForward
  }: Props = $props();
</script>

<!-- Barre de contrôle avec score et timer (au-dessus du terrain) -->
<div class="match-control-bar" class:loading={isLoading}>
  <!-- Équipe domicile -->
  {#if matchData}
    <div class="team-control home" style="background-color: {matchData.home_team_kit?.jersey_color || '#ff4444'};">
      <img
        src="/api/team-logo/{matchData.home_team.id}"
        alt="{matchData.home_team.short_name}"
        class="team-logo-control"
      />
      <span class="score-control">{matchData.home_team_score}</span>
    </div>
  {/if}

  <!-- Contrôles de navigation -->
  <div class="navigation-controls">
    <!-- Saut arrière -5s -->
    <button
      class="nav-btn jump-btn"
      onclick={onJumpBackward}
      disabled={isLoading || !hasTrackingData}
      aria-label="Reculer de 5 secondes"
      title="Reculer de 5s"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
      </svg>
      <span class="jump-label">5s</span>
    </button>

    <!-- Bouton Play/Pause avec temps -->
    <button
      class="play-pause-time-btn"
      onclick={onPlayPause}
      disabled={isLoading || !hasTrackingData}
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      <div class="play-icon">
        {#if isPlaying}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        {/if}
      </div>
      <span class="time-display">{formatTimestamp(currentFrame?.timestamp)}</span>
    </button>

    <!-- Saut avant +5s -->
    <button
      class="nav-btn jump-btn"
      onclick={onJumpForward}
      disabled={isLoading || !hasTrackingData}
      aria-label="Avancer de 5 secondes"
      title="Avancer de 5s"
    >
      <span class="jump-label">5s</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
      </svg>
    </button>
  </div>

  <!-- Équipe extérieure -->
  {#if matchData}
    <div class="team-control away" style="background-color: {matchData.away_team_kit?.jersey_color || '#4444ff'};">
      <span class="score-control">{matchData.away_team_score}</span>
      <img
        src="/api/team-logo/{matchData.away_team.id}"
        alt="{matchData.away_team.short_name}"
        class="team-logo-control"
      />
    </div>
  {/if}
</div>

<style>
  /* Barre de contrôle avec score et timer */
  .match-control-bar {
    display: flex;
    align-items: stretch;
    justify-content: center;
    width: 100%;
    margin: 0;
    z-index: 10;
    height: 40px;
    gap: 0; /* Pas d'espace, éléments collés */
  }

  .match-control-bar.loading {
    animation: pulse-subtle 2s ease-in-out infinite;
  }

  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  /* Sections équipe avec effet parallélogramme */
  .team-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1.5rem;
    min-width: 140px;
    position: relative;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15); /* Contour léger */
  }

  .team-control.home {
    padding-right: 1.5rem;
    /* /home/ : coupe diagonale à droite uniquement */
    clip-path: polygon(
      0 0,
      100% 0,
      calc(100% - 20px) 100%,
      0 100%
    );
    margin-right: -12px;
    z-index: 1;
  }

  .team-control.away {
    padding-left: 1.5rem;
    /* \away\ : coupe diagonale à gauche uniquement */
    clip-path: polygon(
      20px 0,
      100% 0,
      100% 100%,
      0 100%
    );
    margin-left: -12px;
    z-index: 1;
  }

  .team-logo-control {
    width: 32px;
    height: 32px;
    object-fit: contain;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
  }

  .score-control {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    min-width: 2rem;
    text-align: center;
  }

  /* Conteneur des contrôles de navigation */
  .navigation-controls {
    display: flex;
    align-items: stretch;
    gap: 2px;
    z-index: 2;
  }

  /* Bouton -5s : /-5s/ (coupe à droite) */
  .jump-btn:first-child {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0 0.75rem;
    border: none;
    background: #3a5742;
    color: white;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    margin: 0;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
    min-width: 60px;
    clip-path: polygon(
      20px 0,
      100% 0,
      calc(100% - 20px) 100%,
      0 100%
    );
    margin-right: -12px;
    z-index: 3;
  }

  /* Bouton +5s : \+5s\ (coupe à gauche) */
  .jump-btn:last-child {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0 0.75rem;
    border: none;
    background: #3a5742;
    color: white;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    margin: 0;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
    min-width: 60px;
    clip-path: polygon(
      20px 0,
      100% 0,
      calc(100% - 20px) 100%,
      0 100%
    );
    margin-left: -12px;
    z-index: 3;
  }

  .jump-btn:hover:not(:disabled) {
    background: #4a6b52;
  }

  .jump-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .jump-btn:disabled {
    background: #666;
    cursor: not-allowed;
    opacity: 0.5;
  }

  .jump-label {
    font-size: 0.7rem;
    font-weight: 600;
  }

  /* Bouton Play/Pause avec temps : /pause/ (même angle que les autres) */
  .play-pause-time-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0 1.5rem;
    border: none;
    background: #4a6b52;
    color: white;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    margin: 0;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
    /* /pause/ : même angle cohérent */
    clip-path: polygon(
      20px 0,
      100% 0,
      calc(100% - 20px) 100%,
      0 100%
    );
    min-width: 120px;
    margin-left: -12px;
    margin-right: -12px;
    z-index: 4;
  }

  .play-pause-time-btn:hover:not(:disabled) {
    background: #5a7b62;
  }

  .play-pause-time-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .play-pause-time-btn:disabled {
    background: #999;
    cursor: not-allowed;
  }

  .play-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .time-display {
    font-family: monospace;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
</style>
