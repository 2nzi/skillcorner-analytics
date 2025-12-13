<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { createFieldScales, renderField } from './field-renderer';
  import { renderPlayers, renderBall, clearPlayers, clearBall, renderPhase, clearPhase, type PhaseData } from './player-renderer';
  import { FIELD_DIMENSIONS } from './constants';
  import type { FieldDimensions, PlayerPosition, BallPosition, TeamInfo, FieldScales } from './types';

  interface Props {
    // Dimensions du terrain (optionnel, utilise les valeurs FIFA par défaut)
    pitchLength?: number;
    pitchWidth?: number;

    // Données de frame
    players?: PlayerPosition[];
    ball?: BallPosition;
    playerInPossessionId?: number | null;

    // Informations des équipes
    homeTeam?: TeamInfo;
    awayTeam?: TeamInfo;

    // Phase de jeu active
    phase?: PhaseData | null;

    // Options d'affichage
    showBall?: boolean;
    showPlayerNumbers?: boolean;
    isLoading?: boolean;

    // Callbacks
    onPlayerClick?: (playerId: number) => void;
    onPlayerHover?: (playerId: number | null) => void;
    onSvgResize?: (width: number) => void;
  }

  let {
    pitchLength = FIELD_DIMENSIONS.DEFAULT_LENGTH,
    pitchWidth = FIELD_DIMENSIONS.DEFAULT_WIDTH,
    players = [],
    ball = { x: null, y: null, z: null, isDetected: false },
    playerInPossessionId = null,
    homeTeam,
    awayTeam,
    phase = null,
    showBall = true,
    showPlayerNumbers = false,
    isLoading = false,
    onPlayerClick,
    onPlayerHover,
    onSvgResize
  }: Props = $props();

  // Référence au conteneur
  let container: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let scales: FieldScales;

  // Dimensions calculées
  let svgWidth = $state(0);
  let svgHeight = $state(0);

  // Dimensions du terrain
  const dimensions = $derived<FieldDimensions>({
    length: pitchLength,
    width: pitchWidth
  });

  // Observer pour le resize
  let resizeObserver: ResizeObserver;

  onMount(() => {
    initializeSvg();

    // Observer les changements de taille
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
  });

  /**
   * Initialise le SVG et dessine le terrain
   */
  function initializeSvg() {
    if (!container) return;

    // Calculer les dimensions en gardant le ratio du terrain
    const rect = container.getBoundingClientRect();
    const aspectRatio = dimensions.length / dimensions.width;

    if (rect.width / rect.height > aspectRatio) {
      // Container plus large que le ratio
      svgHeight = rect.height;
      svgWidth = svgHeight * aspectRatio;
    } else {
      // Container plus haut que le ratio
      svgWidth = rect.width;
      svgHeight = svgWidth / aspectRatio;
    }

    // Créer le SVG
    d3.select(container).select('svg').remove();

    svg = d3.select(container)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Notifier le parent de la largeur du SVG
    onSvgResize?.(svgWidth);

    // Créer les scales
    scales = createFieldScales(dimensions, svgWidth, svgHeight);

    // Dessiner le terrain
    renderField(svg, scales, dimensions);

    // Dessiner les joueurs et le ballon
    updatePlayersAndBall();
  }

  /**
   * Gère le redimensionnement
   */
  function handleResize() {
    initializeSvg();
  }

  /**
   * Met à jour l'affichage de la phase, des joueurs et du ballon
   */
  function updatePlayersAndBall() {
    if (!svg || !scales) return;

    // Phase de jeu (en dessous des joueurs)
    if (phase) {
      renderPhase(svg, phase, scales);
    } else {
      clearPhase(svg);
    }

    // Joueurs
    if (players.length > 0) {
      renderPlayers(svg, players, {
        scales,
        homeTeam,
        awayTeam,
        showNumbers: showPlayerNumbers,
        playerInPossessionId,
        onPlayerClick,
        onPlayerHover
      });
    } else {
      clearPlayers(svg);
    }

    // Ballon
    if (showBall && ball) {
      renderBall(svg, ball, scales);
    } else {
      clearBall(svg);
    }
  }

  // Réagir aux changements de données
  $effect(() => {
    players; // dépendance
    ball;
    playerInPossessionId;
    homeTeam;
    awayTeam;
    phase;
    showBall;
    showPlayerNumbers;

    updatePlayersAndBall();
  });
</script>

<div class="football-field-container" class:loading={isLoading} bind:this={container}>
  <!-- SVG sera inséré ici par D3 -->
</div>

<style>
  .football-field-container {
    width: 100%;
    height: 100%;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0;
  }

  .football-field-container.loading :global(.field-background) {
    animation: pulse-subtle 2s ease-in-out infinite;
  }

  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.85;
    }
  }

  .football-field-container :global(svg) {
    display: block;
    margin: 0;
    padding: 0;
  }
</style>
