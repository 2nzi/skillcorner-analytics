<script lang="ts">
  import type { SkillCornerMatchPeriod } from '$types/skillcorner';

  interface Props {
    periods: SkillCornerMatchPeriod[];
    currentFrame: number;
    onFrameChange: (frame: number) => void;
    width?: number | null;
    isLoading?: boolean;
  }

  let { periods, currentFrame, onFrameChange, width = null, isLoading = false }: Props = $props();

  // Temps d'affichage pour chaque période
  const periodTimeLabels = $derived(
    periods.map(p => {
      if (p.period === 1) {
        return { start: "0'", end: `${Math.round(p.duration_minutes)}'` };
      } else {
        // 2ème mi-temps commence à 45'
        return { start: "45'", end: `${Math.round(45 + p.duration_minutes)}'` };
      }
    })
  );

  // État pour le drag
  let isDragging = $state(false);
  let activePeriodIndex = $state<number | null>(null);

  // État pour le tooltip
  let tooltipVisible = $state(false);
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let tooltipTimestamp = $state('');

  function handleClickOnPeriod(event: MouseEvent, periodIndex: number) {
    const target = event.currentTarget as HTMLDivElement;
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
      // Trouver l'élément de la période active
      const periodBar = document.querySelector(`[data-period="${activePeriodIndex}"]`) as HTMLDivElement;
      if (periodBar) {
        const rect = periodBar.getBoundingClientRect();
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
    const target = event.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const period = periods[periodIndex];

    // Calculer le timestamp à cette position
    const minutes = period.period === 1
      ? Math.floor(percentage * period.duration_minutes)
      : 45 + Math.floor(percentage * period.duration_minutes);
    const seconds = Math.floor((percentage * period.duration_minutes * 60) % 60);

    tooltipTimestamp = `${minutes}'${seconds.toString().padStart(2, '0')}"`;
    tooltipX = event.clientX;
    tooltipY = rect.top + rect.height / 2; // Position au centre vertical de la barre
    tooltipVisible = true;
  }

  function handlePeriodLeave() {
    tooltipVisible = false;
  }
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div class="match-timeline" style={width ? `width: ${width}px` : ''}>
  {#if isLoading || periods.length === 0}
    <!-- Placeholder pendant le chargement -->
    <div class="period-bar loading"></div>
    <div class="period-bar loading"></div>
  {:else}
    {#each periods as period, i}
      {@const isCurrentPeriod = currentFrame >= period.start_frame && currentFrame <= period.end_frame}
      {@const cursorPosInPeriod = isCurrentPeriod
        ? ((currentFrame - period.start_frame) / period.duration_frames) * 100
        : 0}
      <!-- Calculer la largeur proportionnelle à la durée -->
      {@const totalFrames = periods.reduce((sum, p) => sum + p.duration_frames, 0)}
      {@const periodFlexGrow = period.duration_frames / totalFrames}
      <div
        class="period-bar"
        style="flex-grow: {periodFlexGrow}"
        data-period={i}
        onmousedown={(e) => handleMouseDownOnPeriod(e, i)}
        onmousemove={(e) => handlePeriodHover(e, i)}
        onmouseleave={handlePeriodLeave}
        role="slider"
        aria-label="Timeline période {period.period}"
        aria-valuemin={period.start_frame}
        aria-valuemax={period.end_frame}
        aria-valuenow={isCurrentPeriod ? currentFrame : period.start_frame}
        tabindex="0"
      >
        <!-- Labels de temps -->
        <span class="time-label start">{periodTimeLabels[i].start}</span>
        <span class="time-label end">{periodTimeLabels[i].end}</span>

        <!-- Point blanc indicateur (uniquement sur la période active) -->
        {#if isCurrentPeriod}
          <div
            class="cursor"
            style="left: {cursorPosInPeriod}%"
          ></div>
        {/if}
      </div>
    {/each}
  {/if}

  <!-- Tooltip timestamp (intégré dans chaque barre) -->
  {#if tooltipVisible}
    <div class="tooltip-in-bar" style="left: {tooltipX}px; top: {tooltipY}px">
      {tooltipTimestamp}
    </div>
  {/if}
</div>

<style>
  .match-timeline {
    width: 100%;
    display: flex;
    gap: 4px; /* PERIOD_GAP = 4px (synchronisé avec XGChart) */
    position: relative;
  }

  .period-bar {
    /* flex-grow défini inline proportionnellement à la durée de chaque période */
    flex-shrink: 0;
    flex-basis: 0;
    position: relative;
    height: 20px;
    background: rgba(0, 0, 0, 0.15);
    cursor: pointer;
    /* Style notched : coins coupés haut-droit et bas-gauche */
    /* NOTCH_SIZE = 10px (synchronisé avec XGChart) */
    clip-path: polygon(
      0 0,
      calc(100% - 10px) 0,
      100% 10px,
      100% 100%,
      10px 100%,
      0 calc(100% - 10px)
    );
  }

  .period-bar.loading {
    cursor: default;
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

  .time-label {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }

  .time-label.start {
    left: 16px;
  }

  .time-label.end {
    right: 16px;
  }

  .cursor {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    z-index: 10;
  }

  .tooltip-in-bar {
    position: fixed;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
    text-shadow:
      -1px -1px 0 rgba(0, 0, 0, 0.9),
      1px -1px 0 rgba(0, 0, 0, 0.9),
      -1px 1px 0 rgba(0, 0, 0, 0.9),
      1px 1px 0 rgba(0, 0, 0, 0.9);
  }
</style>
