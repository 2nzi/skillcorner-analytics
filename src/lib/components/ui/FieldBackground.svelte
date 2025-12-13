<script lang="ts">
  export interface Props {
    opacity?: number;
  }

  let { opacity = 0.15 }: Props = $props();
</script>

<svg class="football-field" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    <!-- Gradient pour les lignes (vert brillant) -->
    <linearGradient id="lineGradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#00ff88;stop-opacity:{opacity}" />
      <stop offset="100%" style="stop-color:#00ff88;stop-opacity:{opacity * 0.3}" />
    </linearGradient>

    <!-- Gradient pour le remplissage du terrain -->
    <linearGradient id="fieldFill" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#00ff88;stop-opacity:{opacity * 0.2}" />
      <stop offset="100%" style="stop-color:#00ff88;stop-opacity:{opacity * 0.05}" />
    </linearGradient>
  </defs>

  <!-- Remplissage du terrain (trapèze) -->
  <path d="M 0 100 L 100 100 L 66 25 L 34 25 Z" fill="url(#fieldFill)" />

  <!-- Point de fuite au centre-haut (50, 0) -->
  <g class="field-lines" stroke="url(#lineGradient)" fill="none" stroke-width="0.2">

    <!-- Périmètre du terrain (trapèze en perspective) -->
    <!-- Ligne de touche gauche -->
    <line x1="0" y1="100" x2="34" y2="25" />

    <!-- Ligne de touche droite -->
    <line x1="100" y1="100" x2="66" y2="25" />

    <!-- Ligne médiane (milieu du terrain) -->
    <line x1="22.5" y1="50" x2="77.5" y2="50" stroke-width="0.2" stroke="#00ff88" stroke-opacity="0.1" />

    <!-- ligne fond  -->
    <line x1="34" y1="25" x2="66" y2="25" stroke-width="0.2" stroke="#00ff88" stroke-opacity="0.1" />

    <!-- ligne horintale surface  -->
    <line x1="42" y1="30" x2="58" y2="30" stroke-width="0.2" stroke="#00ff88" stroke-opacity="0.1" />

    <!-- ligne droite surface  -->
    <line x1="56.5" y1="25" x2="58" y2="30" stroke-width="0.2" stroke="#00ff88" stroke-opacity="0.1" />

    <!-- ligne gauche surface  -->
    <line x1="43.5" y1="25" x2="42" y2="30" stroke-width="0.2" stroke="#00ff88" stroke-opacity="0.1" />

    <!-- Cercle central -->
    <ellipse cx="50" cy="50" rx="10" ry="3.5" />

    <!-- Point central -->
    <circle cx="50" cy="50" r="0.4" fill="url(#lineGradient)" />
  </g>
</svg>

<style>
  .football-field {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 0;
    pointer-events: none;
  }

  .field-lines {
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Animation subtile de pulse sur les lignes */
  @keyframes pulse-lines {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  .field-lines {
    animation: pulse-lines 4s ease-in-out infinite;
  }
</style>
