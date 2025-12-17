<script lang="ts">
  import NotchedBox from '$lib/components/ui/NotchedBox.svelte';

  interface StatSegment {
    label: string;
    percentage: number;
    color: string;
  }

  interface Props {
    title?: string;
    score?: number;
    scoreLabel?: string;
    segments?: StatSegment[];
    highBlockValue?: number;
    midBlockValue?: number;
  }

  let {
    title = 'ON BALL ENGAGEMENTS',
    score = 64.6,
    scoreLabel = 'PER90 OTP',
    segments = [
      { label: 'PRESSING', percentage: 42, color: '#1a4d2e' },
      { label: 'PRESSURE', percentage: 22, color: '#2d5a3d' },
      { label: 'RECOVERY', percentage: 11, color: '#4a7c59' },
      { label: 'COUNTER PRESS', percentage: 9, color: '#6fa877' },
      { label: 'OTHER', percentage: 16, color: '#a8d5a3' }
    ],
    highBlockValue = 10.3,
    midBlockValue = 15.5
  }: Props = $props();

  // Calculate angles for pie chart segments
  const chartSegments = $derived.by(() => {
    let currentAngle = -90; // Start at top
    return segments.map(segment => {
      const angle = (segment.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      // Calculate path for the segment
      const radius = 100;
      const innerRadius = 45;

      const startRadians = (startAngle * Math.PI) / 180;
      const endRadians = (endAngle * Math.PI) / 180;

      const x1 = 120 + radius * Math.cos(startRadians);
      const y1 = 120 + radius * Math.sin(startRadians);
      const x2 = 120 + radius * Math.cos(endRadians);
      const y2 = 120 + radius * Math.sin(endRadians);

      const x3 = 120 + innerRadius * Math.cos(endRadians);
      const y3 = 120 + innerRadius * Math.sin(endRadians);
      const x4 = 120 + innerRadius * Math.cos(startRadians);
      const y4 = 120 + innerRadius * Math.sin(startRadians);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');

      // Calculate label position (middle of segment)
      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = (radius + innerRadius) / 2;
      const labelX = 120 + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = 120 + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      return {
        ...segment,
        path,
        labelX,
        labelY,
        angle: endAngle - startAngle
      };
    });
  });
</script>

<div class="stat-chart">
  <!-- Score Display -->
  <div class="score-section">
    <NotchedBox
      backgroundColor="#7FFF00"
      borderColor="transparent"
      padding="0.75rem 2rem"
      notchedCorners={{ topRight: true, bottomLeft: true }}
    >
      <div class="score-content">
        <div class="score-value">{score}</div>
        <div class="score-label">{scoreLabel}</div>
      </div>
    </NotchedBox>
    <div class="chart-title">{title}</div>
  </div>

  <!-- Pie Chart -->
  <div class="chart-container">
    <svg viewBox="0 0 240 240" class="pie-chart">
      <!-- Draw segments -->
      {#each chartSegments as segment}
        <path
          d={segment.path}
          fill={segment.color}
          class="chart-segment"
        />
      {/each}

      <!-- Center circle with logo -->
      <circle cx="120" cy="120" r="40" fill="#1a1a1a" />
      <text x="120" y="130" text-anchor="middle" class="center-logo">S</text>

      <!-- Labels -->
      {#each chartSegments as segment}
        {#if segment.angle > 15}
          <text
            x={segment.labelX}
            y={segment.labelY - 8}
            text-anchor="middle"
            class="segment-label"
          >
            {segment.label}
          </text>
          <text
            x={segment.labelX}
            y={segment.labelY + 8}
            text-anchor="middle"
            class="segment-percentage"
          >
            {segment.percentage}%
          </text>
        {/if}
      {/each}
    </svg>
  </div>

  <!-- Block Values -->
  <div class="block-values">
    <div class="block-item">
      <div class="block-label">HIGH<br/>BLOCK</div>
      <div class="block-value">{highBlockValue}</div>
    </div>
    <div class="block-item">
      <div class="block-label">MID<br/>BLOCK</div>
      <div class="block-value">{midBlockValue}</div>
    </div>
  </div>
</div>

<style>
  .stat-chart {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem;
    width: 100%;
    max-width: 300px;
  }

  .score-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
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

  .chart-title {
    font-size: 0.65rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
  }

  .chart-container {
    width: 100%;
    max-width: 240px;
    aspect-ratio: 1;
  }

  .pie-chart {
    width: 100%;
    height: 100%;
  }

  .chart-segment {
    transition: opacity 0.2s ease;
    cursor: pointer;
  }

  .chart-segment:hover {
    opacity: 0.8;
  }

  .center-logo {
    font-size: 2rem;
    font-weight: 700;
    fill: white;
    dominant-baseline: middle;
  }

  .segment-label {
    font-size: 0.5rem;
    font-weight: 600;
    fill: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .segment-percentage {
    font-size: 0.65rem;
    font-weight: 700;
    fill: white;
  }

  .block-values {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    width: 100%;
    padding: 0 1rem;
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
