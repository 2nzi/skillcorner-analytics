<script lang="ts">
  import NotchedBox from '$lib/components/ui/NotchedBox.svelte';
  import { onMount, untrack } from 'svelte';

  interface StatSegment {
    label: string;
    percentage: number;
    color: string;
    midBlockPer30OTIP?: number;
    highBlockPer30OTIP?: number;
  }

  interface Props {
    playerId: string;
    eventType?: string;
    selectedCategory?: string | null;
    onCategorySelect?: (category: string) => void;
    onStatsUpdate?: (stats: { score: number; midBlock: number; highBlock: number }) => void;
    isBestScore?: boolean;
    isBestMidBlock?: boolean;
    isBestHighBlock?: boolean;
  }

  let {
    playerId,
    eventType = 'on-ball-engagements',
    selectedCategory,
    onCategorySelect,
    onStatsUpdate,
    isBestScore = false,
    isBestMidBlock = false,
    isBestHighBlock = false
  }: Props = $props();

  // State for loading data
  let loading = $state(true);
  let error = $state<string | null>(null);
  let score = $state(0);
  let scoreLabel = $state('PER30 OTIP');
  let title = $state('ON BALL ENGAGEMENTS');
  let segments = $state<StatSegment[]>([]);
  let highBlockValue = $state(0);
  let midBlockValue = $state(0);
  let internalSelectedIndex = $state(0); // Internal state when not controlled
  let rotationAngle = $state(0); // Current rotation angle
  let isRotating = $state(false); // Animation state
  let previousExternalCategory = $state<string | null>(null); // Track previous external value

  // Calculate effective selected index based on category name
  const effectiveSelectedIndex = $derived.by(() => {
    if (selectedCategory && segments.length > 0) {
      const index = segments.findIndex(seg => seg.label === selectedCategory);
      return index >= 0 ? index : internalSelectedIndex;
    }
    return internalSelectedIndex;
  });

  // Update mid/high block values based on selected segment
  $effect(() => {
    if (segments.length > 0 && effectiveSelectedIndex >= 0 && effectiveSelectedIndex < segments.length) {
      const selectedSegment = segments[effectiveSelectedIndex];
      midBlockValue = Math.round((selectedSegment.midBlockPer30OTIP || 0) * 10) / 10;
      highBlockValue = Math.round((selectedSegment.highBlockPer30OTIP || 0) * 10) / 10;

      // Notify parent of stats update - use untrack to prevent infinite loops
      untrack(() => {
        if (onStatsUpdate) {
          onStatsUpdate({ score, midBlock: midBlockValue, highBlock: highBlockValue });
        }
      });
    }
  });

  // Gradient color palette (darkest to lightest green)
  const colorGradient = [
    '#50CA54', // Darkest
    '#115B01',
    '#1F8E01',
    '#2EC313',
    '#5EEA63'  // Lightest
  ];

  // Define category order for consistent visual arrangement
  const categoryOrder = [
    'COUNTER PRESS',
    'OTHER',
    'PRESSING',
    'PRESSURE',
    'RECOVERY PRESS'
  ];

  function getColorForCategory(categoryName: string, allCategories: string[]): string {
    // Sort categories according to predefined order
    const sortedCategories = [...allCategories].sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      const orderA = indexA >= 0 ? indexA : 999;
      const orderB = indexB >= 0 ? indexB : 999;
      return orderA - orderB;
    });

    // Find index of current category in sorted list
    const index = sortedCategories.indexOf(categoryName);

    // Distribute colors evenly across gradient
    const colorIndex = Math.floor((index / sortedCategories.length) * colorGradient.length);
    return colorGradient[Math.min(colorIndex, colorGradient.length - 1)];
  }

  async function loadEventData() {
    try {
      loading = true;
      error = null;

      // Use the generic events endpoint
      const response = await fetch(`/api/players/${playerId}/events/${eventType}`);
      if (!response.ok) throw new Error('Failed to load event data');

      const data = await response.json();

      // Set main score (events per 30 minutes)
      score = data.eventsPer30Minutes || 0;

      // Get all category names
      const allCategoryNames = data.subtypeBreakdown?.map((item: any) =>
        item.subtype.replace(/_/g, ' ').toUpperCase()
      ) || [];

      // Build segments from subtype breakdown with consistent colors and order
      const unsortedSegments = data.subtypeBreakdown?.map((item: any) => {
        const label = item.subtype.replace(/_/g, ' ').toUpperCase();
        return {
          label,
          percentage: item.percentage || 0,
          color: getColorForCategory(label, allCategoryNames),
          midBlockPer30OTIP: item.midBlockPer30OTIP || 0,
          highBlockPer30OTIP: item.highBlockPer30OTIP || 0
        };
      }) || [];

      // Sort segments by predefined category order for consistent visual arrangement
      segments = unsortedSegments.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.label);
        const indexB = categoryOrder.indexOf(b.label);
        const orderA = indexA >= 0 ? indexA : 999;
        const orderB = indexB >= 0 ? indexB : 999;
        return orderA - orderB;
      });

      // Initialize with first segment's mid/high block values
      if (segments.length > 0) {
        midBlockValue = Math.round((segments[0].midBlockPer30OTIP || 0) * 10) / 10;
        highBlockValue = Math.round((segments[0].highBlockPer30OTIP || 0) * 10) / 10;

        // Position the first segment at the bottom by default
        const firstSegmentAngle = (segments[0].percentage / 100) * 360;
        const firstSegmentMidpoint = firstSegmentAngle / 2;
        rotationAngle = 180 - firstSegmentMidpoint;
      }

    } catch (err) {
      console.error('Error loading event data:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadEventData();
  });

  // Reload data when playerId changes
  $effect(() => {
    if (playerId) {
      loadEventData();
    }
  });

  // Handle segment click
  function handleSegmentClick(index: number) {
    if (index === effectiveSelectedIndex || isRotating || index >= segments.length) return;

    // Update state (external or internal)
    if (onCategorySelect) {
      onCategorySelect(segments[index].label); // Notify parent to update shared state
    } else {
      internalSelectedIndex = index; // Update internal state
    }

    // Perform rotation animation
    performRotation(index);
  }

  // Perform rotation to position segment at bottom
  function performRotation(index: number) {
    // Validate index is within bounds
    if (index < 0 || index >= segments.length) {
      console.warn(`Invalid segment index ${index}, segments length is ${segments.length}`);
      return;
    }

    isRotating = true;

    // Calculate cumulative angle up to the selected segment
    let cumulativeAngle = 0;
    for (let i = 0; i < index; i++) {
      cumulativeAngle += (segments[i].percentage / 100) * 360;
    }

    // Add half of the selected segment's angle to center it
    const selectedSegmentAngle = (segments[index].percentage / 100) * 360;
    const segmentMidpoint = cumulativeAngle + selectedSegmentAngle / 2;

    // We want the segment midpoint at 90° (bottom)
    // Segments start at -90° (top), so we need to rotate to position the midpoint at 90°
    // Target rotation = 90° - (initial position of segment midpoint)
    // Initial position = -90° + segmentMidpoint
    // So: targetAngle = 90° - (-90° + segmentMidpoint) = 180° - segmentMidpoint
    let targetAngle = 180 - segmentMidpoint;

    // Calculate the shortest rotation path from current angle to target
    const currentAngle = rotationAngle;
    let angleDiff = targetAngle - currentAngle;

    // Normalize angle difference to [-180, 180] range for shortest path
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    // Apply the shortest rotation
    rotationAngle = currentAngle + angleDiff;

    // Reset rotation state after animation
    setTimeout(() => {
      isRotating = false;
    }, 800);
  }

  // React to external selectedCategory changes
  $effect(() => {
    if (selectedCategory && segments.length > 0) {
      // Only trigger if external category actually changed
      if (selectedCategory !== previousExternalCategory && !isRotating) {
        previousExternalCategory = selectedCategory;

        // Find the index of the category in this player's segments
        const index = segments.findIndex(seg => seg.label === selectedCategory);
        if (index >= 0) {
          performRotation(index);
        }
      }
    }
  });

  // Calculate angles for pie chart segments
  const chartSegments = $derived.by(() => {
    let currentAngle = -90; // Start at top
    return segments.map((segment, index) => {
      const angle = (segment.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // Calculate path for the segment (full pie, no donut hole)
      const radius = 100;
      const centerX = 120;
      const centerY = 120;

      // Add extra radius for selected segment (detached effect)
      const isSelected = index === effectiveSelectedIndex;
      const extraOffset = isSelected ? 8 : 0;

      const startRadians = (startAngle * Math.PI) / 180;
      const endRadians = (endAngle * Math.PI) / 180;

      // Calculate center point offset for selected segment
      const midAngle = (startAngle + endAngle) / 2;
      const offsetX = isSelected ? extraOffset * Math.cos((midAngle * Math.PI) / 180) : 0;
      const offsetY = isSelected ? extraOffset * Math.sin((midAngle * Math.PI) / 180) : 0;

      // Outer arc points
      const x1 = centerX + offsetX + radius * Math.cos(startRadians);
      const y1 = centerY + offsetY + radius * Math.sin(startRadians);
      const x2 = centerX + offsetX + radius * Math.cos(endRadians);
      const y2 = centerY + offsetY + radius * Math.sin(endRadians);

      const largeArcFlag = angle > 180 ? 1 : 0;

      // Path for a full pie segment (triangle from center)
      const path = [
        `M ${centerX + offsetX} ${centerY + offsetY}`, // Start at center
        `L ${x1} ${y1}`, // Line to start of arc
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc to end
        'Z' // Close path back to center
      ].join(' ');

      // Calculate label position (centered between white circle and edge)
      // Labels use the segment's original angle (midAngle) to stay centered in the segment
      const whiteCircleRadius = 35;
      const labelRadius = whiteCircleRadius + (radius - whiteCircleRadius) / 2;

      // Use midAngle without rotation - the label position is relative to the segment itself
      const labelX = centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      return {
        ...segment,
        path,
        labelX,
        labelY,
        angle: endAngle - startAngle,
        isSelected,
        midAngle
      };
    });
  });
</script>

<div class="stat-chart">
  <!-- Score Display -->
  <div class="score-section">
    <NotchedBox
      backgroundColor="#3FFE69"
      borderColor="transparent"
      padding="0.75rem 2rem"
      notchedCorners={{ topRight: true, bottomLeft: true }}
    >
      <div class="score-content">
        <div class="score-value {isBestScore ? 'best-value' : ''}">{score}</div>
        <div class="score-label">{scoreLabel}</div>
      </div>
    </NotchedBox>
  </div>

  <!-- Pie Chart -->
  <div class="chart-container-wrapper">
    <svg viewBox="0 0 240 240" class="pie-chart">
      <!-- Rotating group for segments and labels -->
      <g
        class="chart-rotation-group"
        style="transform: rotate({rotationAngle}deg); transform-origin: 120px 120px; transition: transform 0.8s ease-in-out;"
      >
        <!-- Draw segments -->
        {#each chartSegments as segment, index}
          <path
            d={segment.path}
            fill={segment.color}
            class="chart-segment {segment.isSelected ? 'selected' : ''}"
            onclick={() => handleSegmentClick(index)}
          />
        {/each}

        <!-- Labels (rotate with segments, but text stays horizontal) -->
        {#each chartSegments as segment, index}
          {#if segment.angle > 15}
            {@const words = segment.label.split(' ')}
            {@const isTwoLines = words.length > 1}

            <!-- Label group with pointer-events disabled and counter-rotation to keep text horizontal -->
            <g
              class="label-group"
              style="pointer-events: none; transform: rotate({-rotationAngle}deg); transform-origin: {segment.labelX}px {segment.labelY}px; transition: transform 0.8s ease-in-out;"
            >
            {#if isTwoLines}
              <!-- Two-line label -->
              <text
                x={segment.labelX}
                y={segment.labelY - 10}
                text-anchor="middle"
                dominant-baseline="middle"
                class="segment-label"
              >
                {words[0]}
              </text>
              <text
                x={segment.labelX}
                y={segment.labelY + 2}
                text-anchor="middle"
                dominant-baseline="middle"
                class="segment-label"
              >
                {words.slice(1).join(' ')}
              </text>
              <text
                x={segment.labelX}
                y={segment.labelY + 14}
                text-anchor="middle"
                dominant-baseline="middle"
                class="segment-percentage"
              >
                {segment.percentage}%
              </text>
            {:else}
              <!-- Single-line label -->
              <text
                x={segment.labelX}
                y={segment.labelY - 6}
                text-anchor="middle"
                dominant-baseline="middle"
                class="segment-label"
              >
                {segment.label}
              </text>
              <text
                x={segment.labelX}
                y={segment.labelY + 6}
                text-anchor="middle"
                dominant-baseline="middle"
                class="segment-percentage"
              >
                {segment.percentage}%
              </text>
            {/if}
          </g>
        {/if}
      {/each}
      </g>

      <!-- Center white circle (non-rotating, on top) -->
      <circle cx="120" cy="120" r="20" fill="white" />
      <circle cx="120" cy="120" r="35" fill="white" fill-opacity="0.5" />    </svg>
  </div>

  <!-- Connecting branches from pie chart to blocks -->
  {#if segments.length > 0}
    {@const selectedColor = effectiveSelectedIndex >= 0 && effectiveSelectedIndex < segments.length
      ? segments[effectiveSelectedIndex].color
      : '#50CA54'}

    <div class="branches-container">
      <svg viewBox="0 0 300 60" class="branches-svg">
        <!-- Main vertical line from bottom of pie chart -->
        <line x1="150" y1="0" x2="150" y2="20" stroke={selectedColor} stroke-width="4" />

        <!-- Horizontal left branch (extended to the edge) -->
        <line x1="150" y1="20" x2="20" y2="20" stroke={selectedColor} stroke-width="4" />

        <!-- Horizontal right branch (extended to the edge) -->
        <line x1="150" y1="20" x2="280" y2="20" stroke={selectedColor} stroke-width="4" />

        <!-- Vertical line at left end (shorter) -->
        <line x1="20" y1="18" x2="20" y2="60" stroke={selectedColor} stroke-width="4" />

        <!-- Vertical line at right end (shorter) -->
        <line x1="280" y1="18" x2="280" y2="60" stroke={selectedColor} stroke-width="4" />
      </svg>
    </div>
  {/if}

  <!-- Block Values -->
  <div class="block-values">
    <div class="block-item {isBestMidBlock ? 'best-value' : ''}">
      <div class="block-label">MID<br/>BLOCK</div>
      <div class="block-value">{midBlockValue}</div>
    </div>
    <div class="block-item {isBestHighBlock ? 'best-value' : ''}">
      <div class="block-label">HIGH<br/>BLOCK</div>
      <div class="block-value">{highBlockValue}</div>
    </div>
  </div>
</div>

<style>
  .stat-chart {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    width: 100%;
    max-width: 300px;
  }

  .score-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
  }

  .score-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .score-value {
    font-size: 2rem;
    font-weight: 700;
    color: black;
    line-height: 1;
  }

  .score-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: black;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .chart-container-wrapper {
    width: 100%;
    max-width: 240px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .pie-chart {
    width: 100%;
    aspect-ratio: 1;
  }

  .chart-segment {
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .chart-segment:hover {
    opacity: 0.85;
  }

  .chart-segment.selected {
    filter: brightness(1.2);
  }

  .chart-rotation-group {
    pointer-events: all;
  }

  .label-group {
    pointer-events: none;
  }

  .segment-label {
    font-size: 0.5rem;
    font-weight: 600;
    fill: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: x 0.8s ease-in-out, y 0.8s ease-in-out;
    pointer-events: none;
  }

  .segment-percentage {
    font-size: 0.65rem;
    font-weight: 700;
    fill: white;
    transition: x 0.8s ease-in-out, y 0.8s ease-in-out;
    pointer-events: none;
  }

  .branches-container {
    width: 100%;
    max-width: 300px;
    margin-top: -1.5rem;
    margin-bottom: -0.5rem;
  }

  .branches-svg {
    width: 100%;
    height: auto;
  }

  .block-values {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    width: 100%;
    padding: 0 1rem;
    margin-top: -25px;
  }

  .block-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .block-label {
    font-size: 0.6rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    line-height: 1.2;
  }

  .block-value {
    font-size: 2rem;
    font-weight: 700;
    color: white;
  }

  .block-item.best-value .block-value {
    color: #5FEA5F;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .stat-chart {
      max-width: 100%;
    }

    .score-value {
      font-size: 1.75rem;
    }

    .block-value {
      font-size: 1.75rem;
    }
  }
</style>
