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
    onFrameChange,
    width = null,
    isLoading = false
  }: Props = $props();

  // Constantes de style (synchronisées avec MatchTimeline)
  const CHART_HEIGHT = 120;
  const PADDING_TOP = 10;
  const PADDING_BOTTOM = 20;
  const PERIOD_GAP = 4; // Gap entre les périodes (identique à timeline: gap: 4px)
  const NOTCH_SIZE = 10; // Taille des coins coupés (identique à timeline)

  // Filtrer les événements avec xthreat valide
  const validEvents = $derived(filterByNumericField(events, 'xthreat'));

  // Calculer les données xThreat cumulées pour chaque équipe par période
  const xThreatData = $derived.by(() => {
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
      const xthreat = Number(event.xthreat) || 0;

      if (event.team_id === homeTeamId) {
        homeCumulative += xthreat;
        homeData.push({ frame: event.frame_start, cumulative: homeCumulative });
      } else if (event.team_id === awayTeamId) {
        awayCumulative += xthreat;
        awayData.push({ frame: event.frame_start, cumulative: awayCumulative });
      }
    });

    const maxValue = Math.max(homeCumulative, awayCumulative, 0.1); // Éviter division par 0

    return { home: homeData, away: awayData, maxValue };
  });

  // Générer les points du SVG path pour une équipe dans une période
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
  let tooltipHomeValue = $state(0);
  let tooltipAwayValue = $state(0);

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
      const periodRect = document.querySelector(`[data-xg-period="${activePeriodIndex}"]`) as SVGRectElement;
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

  // Gestion du tooltip au survol
  function handlePeriodHover(event: MouseEvent, periodIndex: number) {
    const target = event.currentTarget as SVGRectElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const period = periods[periodIndex];
    const targetFrame = period.start_frame + percentage * period.duration_frames;

    // Trouver les valeurs cumulées les plus proches de cette frame
    const homeValue = findCumulativeValueAtFrame(xThreatData.home, targetFrame);
    const awayValue = findCumulativeValueAtFrame(xThreatData.away, targetFrame);

    tooltipHomeValue = homeValue;
    tooltipAwayValue = awayValue;
    tooltipX = event.clientX;
    tooltipY = rect.top - 10; // Au-dessus du graphique
    tooltipVisible = true;
  }

  function handlePeriodLeave() {
    tooltipVisible = false;
  }

  function findCumulativeValueAtFrame(
    data: Array<{ frame: number; cumulative: number }>,
    targetFrame: number
  ): number {
    if (data.length === 0) return 0;

    // Trouver la valeur cumulée la plus proche avant ou à cette frame
    let value = 0;
    for (const point of data) {
      if (point.frame <= targetFrame) {
        value = point.cumulative;
      } else {
        break;
      }
    }
    return value;
  }
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div class="xg-chart-container" style={width ? `width: ${width}px` : ''}>
  {#if isLoading || periods.length === 0}
    <!-- Placeholder pendant le chargement -->
    <div class="chart-loading" style="height: {CHART_HEIGHT}px"></div>
  {:else}
    <svg
      width="100%"
      height={CHART_HEIGHT}
      class="xg-chart"
    >
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

        <!-- Zone cliquable de la période avec style notched -->
        <g>
          <!-- Background notched (coins coupés haut-droit et bas-gauche) -->
          <defs>
            <clipPath id="notch-clip-{i}">
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
            clip-path="url(#notch-clip-{i})"
            data-xg-period={i}
            onmousedown={(e) => handleMouseDownOnPeriod(e, i)}
            onmousemove={(e) => handlePeriodHover(e, i)}
            onmouseleave={handlePeriodLeave}
            onkeydown={() => {}}
            style="cursor: pointer;"
            role="button"
            aria-label="xThreat chart période {period.period}"
            tabindex={0}
          />

          <!-- Lignes xThreat dans cette période -->
          <g clip-path="url(#notch-clip-{i})">
            <!-- Ligne home team -->
            <path
              d={generatePathForPeriod(xThreatData.home, period, periodWidth, xThreatData.maxValue)}
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
              d={generatePathForPeriod(xThreatData.away, period, periodWidth, xThreatData.maxValue)}
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
        <span class="tooltip-color" style="background-color: {homeTeamColor}"></span>
        <span class="tooltip-value">{tooltipHomeValue.toFixed(2)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-color" style="background-color: {awayTeamColor}"></span>
        <span class="tooltip-value">{tooltipAwayValue.toFixed(2)}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .xg-chart-container {
    width: 100%;
    position: relative;
    margin-top: 0;
  }

  .xg-chart {
    display: block;
  }

  /* Enlever le contour noir lors de la sélection */
  .xg-chart rect:focus {
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
