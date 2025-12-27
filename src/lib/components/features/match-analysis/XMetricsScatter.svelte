<script lang="ts">
  import type { SkillCornerMatchPeriod, SkillCornerDynamicEvent } from '$types/skillcorner';
  import { filterByNumericField } from '$lib/utils/dataFilters';

  interface Props {
    periods: SkillCornerMatchPeriod[];
    events: SkillCornerDynamicEvent[];
    currentFrame: number;
    homeTeamId: number;
    awayTeamId: number;
    homeTeamColor: string;
    awayTeamColor: string;
    metric: 'player_targeted_xthreat' | 'player_targeted_xpass_completion';
    onFrameChange: (frame: number) => void;
    width?: number | null;
    isLoading?: boolean;
  }

  let {
    periods,
    events,
    currentFrame,
    homeTeamId,
    awayTeamId,
    homeTeamColor,
    awayTeamColor,
    metric = 'player_targeted_xthreat',
    onFrameChange,
    width = null,
    isLoading = false
  }: Props = $props();

  // Constantes de style (synchronisées avec MatchTimeline et XGChart)
  const CHART_HEIGHT = 80;
  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 15;
  const PERIOD_GAP = 4;
  const NOTCH_SIZE = 10;
  const DOT_RADIUS = 3;

  // Filtrer les événements avec la métrique valide
  const validEvents = $derived(filterByNumericField(events, metric));

  // Calculer les données cumulées pour chaque équipe (comme xThreat)
  const cumulativeData = $derived.by(() => {
    if (periods.length === 0 || validEvents.length === 0) {
      return { home: [], away: [], maxValue: 0 };
    }

    const homeData: Array<{ frame: number; cumulative: number }> = [];
    const awayData: Array<{ frame: number; cumulative: number }> = [];

    let homeCumulative = 0;
    let awayCumulative = 0;

    // Trier les événements par frame_start
    const sortedEvents = [...validEvents].sort((a, b) => a.frame_start - b.frame_start);

    sortedEvents.forEach(event => {
      const value = Number(event[metric]) || 0;

      if (event.team_id === homeTeamId) {
        homeCumulative += value;
        homeData.push({ frame: event.frame_start, cumulative: homeCumulative });
      } else if (event.team_id === awayTeamId) {
        awayCumulative += value;
        awayData.push({ frame: event.frame_start, cumulative: awayCumulative });
      }
    });

    const maxValue = Math.max(homeCumulative, awayCumulative, 0.1); // Éviter division par 0

    return { home: homeData, away: awayData, maxValue };
  });

  // Label de la métrique (texte complet)
  const metricLabel = $derived(
    metric === 'player_targeted_xthreat'
      ? 'Player Targeted xThreat'
      : 'xPass Completion'
  );

  // Générer les points du SVG path pour une équipe dans une période (comme XGChart)
  function generatePathForPeriod(
    data: Array<{ frame: number; cumulative: number }>,
    period: SkillCornerMatchPeriod,
    periodWidth: number,
    maxValue: number
  ): string {
    const filteredData = data.filter(
      d => d.frame >= period.start_frame && d.frame <= period.end_frame
    );

    if (filteredData.length === 0) return '';

    const drawHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    const points = filteredData.map(d => {
      const x = ((d.frame - period.start_frame) / period.duration_frames) * periodWidth;
      const y = PADDING_TOP + drawHeight - (d.cumulative / maxValue) * drawHeight;
      return `${x},${y}`;
    });

    // Ajouter point de départ (début de période, valeur initiale)
    const startValue = filteredData[0].cumulative;
    const startY = PADDING_TOP + drawHeight - (startValue / maxValue) * drawHeight;
    points.unshift(`0,${startY}`);

    // Ajouter point de fin (fin de période, dernière valeur)
    const endValue = filteredData[filteredData.length - 1].cumulative;
    const endY = PADDING_TOP + drawHeight - (endValue / maxValue) * drawHeight;
    points.push(`${periodWidth},${endY}`);

    return `M ${points.join(' L ')}`;
  }

  // Calculer la position de la période active
  const activePeriodInfo = $derived.by(() => {
    const period = periods.find(p => currentFrame >= p.start_frame && currentFrame <= p.end_frame);
    if (!period) return null;

    const index = periods.findIndex(p => p === period);
    const percentage = (currentFrame - period.start_frame) / period.duration_frames;

    return { index, percentage };
  });

  // État pour le drag
  let isDragging = $state(false);
  let activePeriodIndex = $state<number | null>(null);

  // État pour le tooltip
  let tooltipVisible = $state(false);
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let tooltipValue = $state(0);
  let tooltipTeam = $state('');

  function handleClickOnPeriod(event: MouseEvent, periodIndex: number) {
    const target = event.currentTarget as SVGRectElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const period = periods[periodIndex];
    const frame = Math.round(period.start_frame + percentage * period.duration_frames);
    onFrameChange(frame);
  }

  function handleMouseDownOnPeriod(event: MouseEvent, periodIndex: number) {
    isDragging = true;
    activePeriodIndex = periodIndex;
    handleClickOnPeriod(event, periodIndex);
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging && activePeriodIndex !== null) {
      const periodRect = document.querySelector(`[data-scatter-period="${activePeriodIndex}"]`) as SVGRectElement;
      if (periodRect) {
        const rect = periodRect.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));

        const period = periods[activePeriodIndex];
        const frame = Math.round(period.start_frame + percentage * period.duration_frames);
        onFrameChange(frame);
      }
    }
  }

  function handleMouseUp() {
    isDragging = false;
    activePeriodIndex = null;
  }

  // Gestion du tooltip au survol d'un point
  function handleDotHover(event: MouseEvent, value: number, team: 'home' | 'away') {
    tooltipValue = value;
    tooltipTeam = team;
    tooltipX = event.clientX;
    tooltipY = event.pageY - 10;
    tooltipVisible = true;
  }

  function handleDotLeave() {
    tooltipVisible = false;
  }
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div class="scatter-chart-container" style={width ? `width: ${width}px` : ''}>
  {#if isLoading || periods.length === 0}
    <!-- Placeholder pendant le chargement -->
    <div class="chart-loading" style="height: {CHART_HEIGHT}px"></div>
  {:else}
    <svg
      width="100%"
      height={CHART_HEIGHT}
      class="scatter-chart"
    >
      <!-- Label du graphique - positionné horizontalement en haut à gauche -->
      <text
        x={10}
        y={15}
        text-anchor="start"
        font-size="10"
        font-weight="700"
        fill="rgba(0, 0, 0, 0.8)"
      >
        {metricLabel}
      </text>

      {#each periods as period, i}
        <!-- Calcul des dimensions de la période -->
        {@const svgWidth = (width || 900)}
        {@const totalFrames = periods.reduce((sum, p) => sum + p.duration_frames, 0)}
        {@const totalGaps = (periods.length - 1) * PERIOD_GAP}
        {@const availableWidth = svgWidth - totalGaps}

        <!-- Calcul de la largeur de cette période (proportionnelle à sa durée) -->
        {@const periodDurationRatio = period.duration_frames / totalFrames}
        {@const periodWidth = periodDurationRatio * availableWidth}

        <!-- Calcul de la position de départ (somme des largeurs précédentes + gaps) -->
        {@const previousPeriodsFrames = periods.slice(0, i).reduce((sum, p) => sum + p.duration_frames, 0)}
        {@const previousPeriodsRatio = previousPeriodsFrames / totalFrames}
        {@const periodStart = previousPeriodsRatio * availableWidth + (i * PERIOD_GAP)}

        {@const drawHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM}

        <!-- Zone cliquable de la période avec style notched -->
        <g>
          <!-- Background notched (coins coupés haut-droit et bas-gauche) -->
          <defs>
            <clipPath id="scatter-notch-clip-{i}">
              <polygon points="{periodStart},{0} {periodStart + periodWidth - NOTCH_SIZE},{0} {periodStart + periodWidth},{NOTCH_SIZE} {periodStart + periodWidth},{CHART_HEIGHT} {periodStart + NOTCH_SIZE},{CHART_HEIGHT} {periodStart},{CHART_HEIGHT - NOTCH_SIZE}" />
            </clipPath>
          </defs>

          <!-- Background rect -->
          <rect
            x={periodStart}
            y={0}
            width={periodWidth}
            height={CHART_HEIGHT}
            fill="rgba(0, 0, 0, 0.15)"
            clip-path="url(#scatter-notch-clip-{i})"
            data-scatter-period={i}
            onmousedown={(e) => handleMouseDownOnPeriod(e, i)}
            onkeydown={() => {}}
            style="cursor: pointer;"
            role="button"
            aria-label="Scatter chart période {period.period}"
            tabindex={0}
          />

          <!-- Lignes cumulées dans cette période -->
          <g clip-path="url(#scatter-notch-clip-{i})">
            <!-- Ligne home team -->
            <path
              d={generatePathForPeriod(cumulativeData.home, period, periodWidth, cumulativeData.maxValue)}
              transform="translate({periodStart}, 0)"
              fill="none"
              stroke={homeTeamColor}
              stroke-width="2.5"
              stroke-linejoin="round"
              stroke-linecap="round"
              opacity="0.9"
              style="pointer-events: none;"
            />

            <!-- Ligne away team -->
            <path
              d={generatePathForPeriod(cumulativeData.away, period, periodWidth, cumulativeData.maxValue)}
              transform="translate({periodStart}, 0)"
              fill="none"
              stroke={awayTeamColor}
              stroke-width="2.5"
              stroke-linejoin="round"
              stroke-linecap="round"
              opacity="0.9"
              style="pointer-events: none;"
            />
          </g>
        </g>
      {/each}

      <!-- Ligne verticale pour indiquer la position actuelle -->
      {#if activePeriodInfo}
        <!-- Calcul de la position de la ligne verticale -->
        {@const activePeriod = periods[activePeriodInfo.index]}
        {@const svgWidth = (width || 900)}
        {@const totalFrames = periods.reduce((sum, p) => sum + p.duration_frames, 0)}
        {@const totalGaps = (periods.length - 1) * PERIOD_GAP}
        {@const availableWidth = svgWidth - totalGaps}

        {@const periodDurationRatio = activePeriod.duration_frames / totalFrames}
        {@const periodWidth = periodDurationRatio * availableWidth}

        {@const previousPeriodsFrames = periods.slice(0, activePeriodInfo.index).reduce((sum, p) => sum + p.duration_frames, 0)}
        {@const previousPeriodsRatio = previousPeriodsFrames / totalFrames}
        {@const periodStart = previousPeriodsRatio * availableWidth + (activePeriodInfo.index * PERIOD_GAP)}

        {@const cursorX = periodStart + activePeriodInfo.percentage * periodWidth}

        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={CHART_HEIGHT}
          stroke="rgba(0, 0, 0, 0.7)"
          stroke-width="2"
          style="pointer-events: none;"
        />
      {/if}
    </svg>
  {/if}

  <!-- Tooltip -->
  {#if tooltipVisible}
    <div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px">
      <div class="tooltip-row">
        <span class="tooltip-color" style="background-color: {tooltipTeam === 'home' ? homeTeamColor : awayTeamColor}"></span>
        <span class="tooltip-value">{tooltipValue.toFixed(3)}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .scatter-chart-container {
    width: 100%;
    position: relative;
    margin-top: 1rem;
  }

  .scatter-chart {
    display: block;
  }

  /* Enlever le contour noir lors de la sélection */
  .scatter-chart rect:focus {
    outline: none;
  }

  .chart-loading {
    width: 100%;
    background: rgba(0, 0, 0, 0.05);
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

  .tooltip {
    position: fixed;
    transform: translate(-50%, -100%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .tooltip-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tooltip-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .tooltip-value {
    font-variant-numeric: tabular-nums;
  }
</style>
