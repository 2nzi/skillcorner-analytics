<script lang="ts">
  import { onMount } from 'svelte';
  import DynamicScatterChart from '$lib/components/features/team-analysis/DynamicScatterChart.svelte';

  interface TeamPerformance {
    team_id: number;
    team_name: string;
    team_color: string;
    avg_possession: number;
    avg_pass_accuracy: number;
    avg_pass_volume: number;
    avg_total_xthreat: number;
    avg_obr_per_min: number;
    avg_lb_attempts: number;
    avg_lb_success_rate: number;
    avg_pressing_actions: number;
    avg_regain_rate: number;
    matches_played: number;
    matchups: any[];
  }

  interface MetricDef {
    id: string;
    label: string;
  }

  const AVAILABLE_METRICS: MetricDef[] = [
    { id: 'possession', label: 'Possession' },
    { id: 'pass_accuracy', label: 'Pass Accuracy' },
    { id: 'pass_volume', label: 'Pass Volume' },
    { id: 'total_xthreat', label: 'Total xThreat' },
    { id: 'obr_per_min', label: 'Off-Ball Runs / min' },
    { id: 'lb_attempts', label: 'Line Break Attempts' },
    { id: 'lb_success_rate', label: 'Line Break Success' },
    { id: 'pressing_actions', label: 'Pressing Actions' },
    { id: 'regain_rate', label: 'Regain Rate' }
  ];

  let teams = $state<TeamPerformance[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let selectedXMetric = $state('possession');
  let selectedYMetric = $state('pass_accuracy');

  async function loadTeamPerformance() {
    try {
      loading = true;
      error = null;

      const response = await fetch('/api/teams/performance');
      if (!response.ok) throw new Error('Failed to load team performance data');

      teams = await response.json();
    } catch (err) {
      console.error('Error loading team performance:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadTeamPerformance();
  });
</script>

<div class="team-analysis-page">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading team performance data...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p class="error-message">{error}</p>
      <button onclick={loadTeamPerformance} class="retry-button">Retry</button>
    </div>
  {:else}
    <div class="chart-with-selectors">
      <!-- X-axis metric selectors (top) -->
      <div class="x-metric-selectors">
        {#each AVAILABLE_METRICS as metric}
          <button
            class="metric-btn"
            class:active={selectedXMetric === metric.id}
            onclick={() => selectedXMetric = metric.id}
          >
            {metric.label}
          </button>
        {/each}
      </div>

      <!-- Chart and Y-axis selectors container -->
      <div class="chart-and-y-selectors">
        <!-- Chart -->
        <div class="chart-container">
          <DynamicScatterChart
            {teams}
            xMetricId={selectedXMetric}
            yMetricId={selectedYMetric}
            width={900}
            height={600}
          />
        </div>

        <!-- Y-axis metric selectors (right) -->
        <div class="y-metric-selectors">
          {#each AVAILABLE_METRICS as metric}
            <button
              class="metric-btn"
              class:active={selectedYMetric === metric.id}
              onclick={() => selectedYMetric = metric.id}
            >
              {metric.label}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .team-analysis-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    width: 100%;
    padding: 2rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 4rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #3FFE69;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 4rem 2rem;
  }

  .error-message {
    color: #ff6b6b;
    font-size: 1.1rem;
    margin: 0;
  }

  .retry-button {
    padding: 0.75rem 2rem;
    background: #3FFE69;
    color: black;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-button:hover {
    background: #50ff79;
    transform: translateY(-2px);
  }

  /* Chart with selectors layout */
  .chart-with-selectors {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 1200px;
    width: 100%;
  }

  /* X-axis metric selectors (horizontal at top) */
  .x-metric-selectors {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
    max-width: 100%;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }

  .x-metric-selectors::-webkit-scrollbar {
    height: 6px;
  }

  .x-metric-selectors::-webkit-scrollbar-track {
    background: transparent;
  }

  .x-metric-selectors::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  /* Chart and Y-axis container */
  .chart-and-y-selectors {
    display: flex;
    align-items: flex-start;
  }

  .chart-container {
    flex: 1;
  }

  /* Y-axis metric selectors (vertical on right) */
  .y-metric-selectors {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 600px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }

  .y-metric-selectors::-webkit-scrollbar {
    width: 6px;
  }

  .y-metric-selectors::-webkit-scrollbar-track {
    background: transparent;
  }

  .y-metric-selectors::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  /* Metric button styling - matching nav-tab styling */
  .metric-btn {
    --notch: 10px;

    width: 180px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 0;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.1s ease;
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
    position: relative;

    /* Notched corners: top-right and bottom-left (same as nav-tab) */
    clip-path: polygon(
      0 0,
      calc(100% - var(--notch)) 0,
      100% var(--notch),
      100% 100%,
      var(--notch) 100%,
      0 calc(100% - var(--notch))
    );
  }

  .metric-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.8);
  }

  .metric-btn.active {
    background: #fff;
    color: #000;
    font-weight: 600;
  }

  .metric-btn.active:hover {
    background: #fff;
  }

  /* Y-axis buttons rotated 180 degrees */
  .y-metric-selectors .metric-btn {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    width: 35px;
    height: 180px;
  }

  @media (max-width: 768px) {
    .team-analysis-page {
      padding: 1rem;
    }

    .chart-and-y-selectors {
      flex-direction: column;
    }

    .y-metric-selectors {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
    }

    .metric-btn {
      font-size: 0.75rem;
      padding: 0.4rem 0.8rem;
    }
  }
</style>
