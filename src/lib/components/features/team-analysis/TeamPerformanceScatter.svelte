<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  // Head-to-head match data between two teams
  interface MatchupData {
    opponent_id: number;
    possession_percentage: number;
    pass_accuracy: number;
  }

  // Team performance data type
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
    matchups: MatchupData[];
  }

  // Available metrics for axes
  interface MetricDef {
    id: string;
    label: string;
    unit?: string;
    accessor: (team: TeamPerformance) => number;
  }

  const AVAILABLE_METRICS: MetricDef[] = [
    { id: 'possession', label: 'Possession', unit: '%', accessor: (t) => t.avg_possession },
    { id: 'pass_accuracy', label: 'Pass Accuracy', unit: '%', accessor: (t) => t.avg_pass_accuracy },
    { id: 'pass_volume', label: 'Pass Volume', accessor: (t) => t.avg_pass_volume },
    { id: 'total_xthreat', label: 'Total xThreat', accessor: (t) => t.avg_total_xthreat },
    { id: 'obr_per_min', label: 'Off-Ball Runs / min', accessor: (t) => t.avg_obr_per_min },
    { id: 'lb_attempts', label: 'Line Break Attempts', accessor: (t) => t.avg_lb_attempts },
    { id: 'lb_success_rate', label: 'Line Break Success', unit: '%', accessor: (t) => t.avg_lb_success_rate },
    { id: 'pressing_actions', label: 'Pressing Actions', accessor: (t) => t.avg_pressing_actions },
    { id: 'regain_rate', label: 'Regain Rate', unit: '%', accessor: (t) => t.avg_regain_rate }
  ];

  // Props
  interface Props {
    width?: number;
    height?: number;
    xMetricId?: string;
    yMetricId?: string;
  }

  let { width = 800, height = 600, xMetricId = 'possession', yMetricId = 'pass_accuracy' }: Props = $props();

  // Data
  let teams = $state<TeamPerformance[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let showLegend = $state(false);

  // SVG ref
  let svgContainer = $state<HTMLDivElement>();

  // Chart margins (following pattern from XGChart)
  const margin = { top: 40, right: 40, bottom: 60, left: 70 };
  const chartWidth = $derived(width - margin.left - margin.right);
  const chartHeight = $derived(height - margin.top - margin.bottom);

  // Get selected metrics
  const xMetric = $derived(AVAILABLE_METRICS.find(m => m.id === xMetricId) || AVAILABLE_METRICS[0]);
  const yMetric = $derived(AVAILABLE_METRICS.find(m => m.id === yMetricId) || AVAILABLE_METRICS[1]);

  // Calculate averages for centering (based on selected metrics)
  const avgX = $derived.by(() => {
    if (teams.length === 0) return 0;
    const total = teams.reduce((sum, t) => sum + xMetric.accessor(t), 0);
    return total / teams.length;
  });

  const avgY = $derived.by(() => {
    if (teams.length === 0) return 0;
    const total = teams.reduce((sum, t) => sum + yMetric.accessor(t), 0);
    return total / teams.length;
  });

  // D3 scales centered on averages (quadrant chart pattern)
  const xScale = $derived.by(() => {
    if (teams.length === 0) return null;

    const values = teams.map(t => xMetric.accessor(t));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Calculate symmetric range around average
    const maxDeviation = Math.max(
      Math.abs(maxValue - avgX),
      Math.abs(minValue - avgX)
    );

    // Add 15% padding
    const padding = maxDeviation * 0.15;

    return d3.scaleLinear()
      .domain([
        avgX - maxDeviation - padding,
        avgX + maxDeviation + padding
      ])
      .range([0, chartWidth]);
  });

  const yScale = $derived.by(() => {
    if (teams.length === 0) return null;

    const values = teams.map(t => yMetric.accessor(t));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Calculate symmetric range around average
    const maxDeviation = Math.max(
      Math.abs(maxValue - avgY),
      Math.abs(minValue - avgY)
    );

    // Add 15% padding
    const padding = maxDeviation * 0.15;

    return d3.scaleLinear()
      .domain([
        avgY - maxDeviation - padding,
        avgY + maxDeviation + padding
      ])
      .range([chartHeight, 0]);  // Inverted for SVG
  });

  // Logo size (fixed)
  const logoSize = 30;

  // Get opponent IDs for a given team
  function getOpponentIds(teamId: number): Set<number> {
    const team = teams.find(t => t.team_id === teamId);
    if (!team) return new Set();
    return new Set(team.matchups.map(m => m.opponent_id));
  }

  // Get matchup stats for a specific matchup
  function getMatchupStats(teamId: number, opponentId: number): { possession: number, passAccuracy: number } | null {
    const team = teams.find(t => t.team_id === teamId);
    if (!team) return null;
    const matchup = team.matchups.find(m => m.opponent_id === opponentId);
    return matchup ? { possession: matchup.possession_percentage, passAccuracy: matchup.pass_accuracy } : null;
  }

  // Load data
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

  // Render chart with D3 (following pattern from field-renderer.ts)
  function renderChart() {
    if (!svgContainer || !xScale || !yScale || teams.length === 0) return;

    // Clear previous chart
    d3.select(svgContainer).select('svg').remove();

    // Create SVG
    const svg = d3.select(svgContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create main group with margins
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create a group for glows (behind everything)
    const glowGroup = g.append('g').attr('class', 'glow-layer');

    // Create a group for logos (in front of glows)
    const logoGroup = g.append('g').attr('class', 'logo-layer');

    // Create a group for text labels (in front of logos)
    const labelGroup = g.append('g').attr('class', 'label-layer');

    // Create legend group (will be shown/hidden via class)
    const circleRadius = 10;
    const textDistance = 25; // Distance du texte au centre du cercle
    const legendOffset = 50; // Décalage du coin pour que tout soit visible

    const legendGroup = svg.append('g')
      .attr('class', 'legend-svg')
      .attr('transform', `translate(${margin.left + legendOffset},${margin.top + legendOffset})`)
      .style('opacity', 0)
      .style('display', 'none');

    // Add legend content - cercle au centre
    legendGroup.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', circleRadius)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

    // Text gauche (horizontal, à gauche du cercle)
    const leftText = legendGroup.append('text')
      .attr('x', -(circleRadius + textDistance))
      .attr('y', 3)
      .attr('fill', 'white')
      .attr('font-size', '8px')
      .attr('text-anchor', 'middle')
      .attr('opacity', 0.8);
    leftText.append('tspan').attr('x', -(circleRadius + textDistance)).attr('dy', 0).text('TEAM 1');
    leftText.append('tspan').attr('x', -(circleRadius + textDistance)).attr('dy', 10).text('Possession');

    // Text droite (horizontal, à droite du cercle)
    const rightText = legendGroup.append('text')
      .attr('x', circleRadius + textDistance)
      .attr('y', 3)
      .attr('fill', 'white')
      .attr('font-size', '8px')
      .attr('text-anchor', 'middle')
      .attr('opacity', 0.8);
    rightText.append('tspan').attr('x', circleRadius + textDistance).attr('dy', 0).text('TEAM 2');
    rightText.append('tspan').attr('x', circleRadius + textDistance).attr('dy', 10).text('Possession');

    // Text bas (vertical, en bas du cercle)
    const bottomText = legendGroup.append('text')
      .attr('x', 0)
      .attr('y', circleRadius + textDistance)
      .attr('fill', 'white')
      .attr('font-size', '8px')
      .attr('text-anchor', 'middle')
      .attr('transform', `rotate(-90, 0, ${circleRadius + textDistance})`)
      .attr('opacity', 0.8);
    bottomText.append('tspan').attr('x', 0).attr('dy', 0).text('TEAM 1');
    bottomText.append('tspan').attr('x', 0).attr('dy', 10).text('Pass Accuracy');

    // Text haut (vertical, en haut du cercle)
    const topText = legendGroup.append('text')
      .attr('x', 0)
      .attr('y', -(circleRadius + textDistance))
      .attr('fill', 'white')
      .attr('font-size', '8px')
      .attr('text-anchor', 'middle')
      .attr('transform', `rotate(-90, 0, ${-(circleRadius + textDistance)})`)
      .attr('opacity', 0.8);
    topText.append('tspan').attr('x', 0).attr('dy', 0).text('TEAM 2');
    topText.append('tspan').attr('x', 0).attr('dy', 10).text('Pass Accuracy');

    // Add main axes (cross at center) - these are the PRIMARY axes
    // Vertical axis (Y-axis for pass accuracy) - at the average possession
    g.append('line')
      .attr('x1', xScale(avgPossession))
      .attr('x2', xScale(avgPossession))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', 'rgba(255, 255, 255, 0.5)')
      .attr('stroke-width', 2);

    // Horizontal axis (X-axis for possession) - at the average pass accuracy
    g.append('line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', yScale(avgPassAccuracy))
      .attr('y2', yScale(avgPassAccuracy))
      .attr('stroke', 'rgba(255, 255, 255, 0.5)')
      .attr('stroke-width', 2);

    // Add Y-axis ticks and labels (along the vertical centerline)
    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => `${d}`);

    g.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${xScale(avgPossession)},0)`)
      .call(yAxis)
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '11px');

    // Style Y axis ticks
    g.select('.y-axis')
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.3)');

    g.select('.y-axis')
      .select('.domain')
      .remove(); // Remove the domain line, we already have the main axis

    // Add X-axis ticks and labels (along the horizontal centerline)
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d => `${d}`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${yScale(avgPassAccuracy)})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '11px');

    // Style X axis ticks
    g.select('.x-axis')
      .selectAll('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.3)');

    g.select('.x-axis')
      .select('.domain')
      .remove(); // Remove the domain line, we already have the main axis

    // Add X axis label (horizontally along the axis at the right end)
    g.append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'end')
      .attr('x', chartWidth - 5)
      .attr('y', yScale(avgPassAccuracy) - 8)
      .attr('fill', 'rgba(255, 255, 255, 0.8)')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text('POSSESSION (%)');

    // Add Y axis label (vertically along the axis at the top, offset to the right)
    g.append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'end')
      .attr('transform', `rotate(-90, ${xScale(avgPossession) + 12}, 5)`)
      .attr('x', xScale(avgPossession) - 5)
      .attr('y', 17)
      .attr('fill', 'rgba(255, 255, 255, 0.8)')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text('PASS ACCURACY (%)');

    // Add data points (team logos as SVG images) in the logo layer
    logoGroup.selectAll('image.team-logo')
      .data(teams)
      .enter()
      .append('image')
      .attr('class', 'team-logo')
      .attr('xlink:href', d => `/api/team-logo/${d.team_id}`)
      .attr('x', d => xScale(d.avg_possession) - logoSize / 2)
      .attr('y', d => yScale(d.avg_pass_accuracy) - logoSize / 2)
      .attr('width', logoSize)
      .attr('height', logoSize)
      .style('cursor', 'pointer')
      .style('opacity', 0.85)
      .on('mouseenter', function(_event, d) {
        // Show legend on hover
        svg.select('.legend-svg')
          .style('display', 'block')
          .transition()
          .duration(200)
          .style('opacity', 1);

        // Get opponent IDs for this team
        const opponentIds = getOpponentIds(d.team_id);

        // Update all logos based on whether they are opponents
        logoGroup.selectAll('image.team-logo')
          .transition()
          .duration(200)
          .style('opacity', function(teamData: any) {
            if (teamData.team_id === d.team_id) return 1; // Hovered team
            if (opponentIds.has(teamData.team_id)) return 0.85; // Opponent teams
            return 0.5; // Non-opponent teams (50% transparent)
          })
          .attr('width', function(teamData: any) {
            return teamData.team_id === d.team_id ? logoSize * 1.3 : logoSize;
          })
          .attr('height', function(teamData: any) {
            return teamData.team_id === d.team_id ? logoSize * 1.3 : logoSize;
          })
          .attr('x', function(teamData: any) {
            const size = teamData.team_id === d.team_id ? logoSize * 1.3 : logoSize;
            return xScale(teamData.avg_possession) - size / 2;
          })
          .attr('y', function(teamData: any) {
            const size = teamData.team_id === d.team_id ? logoSize * 1.3 : logoSize;
            return yScale(teamData.avg_pass_accuracy) - size / 2;
          });

        // Remove any existing labels and gradients
        labelGroup.selectAll('.matchup-label').remove();
        glowGroup.selectAll('.matchup-glow').remove();
        labelGroup.selectAll('.team-name-label').remove();
        svg.selectAll('defs radialGradient.matchup-gradient').remove();

        // Create a defs element if it doesn't exist
        let defs = svg.select('defs');
        if (defs.empty()) {
          defs = svg.append('defs');
        }

        // Display stats for each team above opponent's logo
        opponentIds.forEach(opponentId => {
          const opponent = teams.find(t => t.team_id === opponentId);
          if (!opponent) return;

          // Get hovered team's stats when playing against this opponent
          const hoveredTeamStats = getMatchupStats(d.team_id, opponentId);
          // Get opponent's stats when playing against the hovered team
          const opponentStats = getMatchupStats(opponentId, d.team_id);

          if (!hoveredTeamStats || !opponentStats) return;

          const opponentX = xScale(opponent.avg_possession);
          const opponentY = yScale(opponent.avg_pass_accuracy);

          const bubbleDistance = logoSize / 2 + 25;
          const diffuseRadius = 50; // Rayon de la zone diffuse

          // Create radial gradient for hovered team (diffuse effect)
          const hoveredGradientId = `gradient-hovered-${d.team_id}-${opponentId}`;

          const hoveredGradient = defs.append('radialGradient')
            .attr('id', hoveredGradientId)
            .attr('class', 'matchup-gradient')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '70%');

          hoveredGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', d.team_color)
            .attr('stop-opacity', 0.15);

          hoveredGradient.append('stop')
            .attr('offset', '60%')
            .attr('stop-color', d.team_color)
            .attr('stop-opacity', 0.05);

          hoveredGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', d.team_color)
            .attr('stop-opacity', 0);

          // Create radial gradient for opponent team (diffuse effect)
          const opponentGradientId = `gradient-opponent-${d.team_id}-${opponentId}`;

          const opponentGradient = defs.append('radialGradient')
            .attr('id', opponentGradientId)
            .attr('class', 'matchup-gradient')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '70%');

          opponentGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', opponent.team_color)
            .attr('stop-opacity', 0.15);

          opponentGradient.append('stop')
            .attr('offset', '60%')
            .attr('stop-color', opponent.team_color)
            .attr('stop-opacity', 0.05);

          opponentGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', opponent.team_color)
            .attr('stop-opacity', 0);

          // Demi-cercle pour l'équipe hover (gauche-bas, séparé par diagonale y=-x)
          // Arc de 5π/4 à 9π/4 (ou -3π/4), passant par la gauche et le bas
          const hoveredStartAngle = 5 * Math.PI / 4; // Bas-gauche sur la diagonale
          const hoveredEndAngle = 9 * Math.PI / 4; // Retour au bas-gauche (tour complet divisé en 2)

          const hoveredStartX = opponentX + diffuseRadius * Math.cos(hoveredStartAngle);
          const hoveredStartY = opponentY + diffuseRadius * Math.sin(hoveredStartAngle);
          const hoveredEndX = opponentX + diffuseRadius * Math.cos(hoveredEndAngle);
          const hoveredEndY = opponentY + diffuseRadius * Math.sin(hoveredEndAngle);

          const hoveredPath = `
            M ${opponentX} ${opponentY}
            L ${hoveredStartX} ${hoveredStartY}
            A ${diffuseRadius} ${diffuseRadius} 0 1 1 ${hoveredEndX} ${hoveredEndY}
            Z
          `;

          // Append glow to the glow layer (behind logos)
          glowGroup.append('path')
            .attr('class', 'matchup-glow')
            .attr('d', hoveredPath)
            .attr('fill', `url(#${hoveredGradientId})`)
            .style('pointer-events', 'none')
            .style('filter', 'blur(15px)');

          // Demi-cercle pour l'équipe adverse (haut-droite, séparé par diagonale y=-x)
          // Arc de π/4 à 5π/4, passant par le haut et la droite
          const opponentStartAngle = Math.PI / 4; // Haut-droite sur la diagonale
          const opponentEndAngle = 5 * Math.PI / 4; // Bas-gauche sur la diagonale

          const opponentStartX = opponentX + diffuseRadius * Math.cos(opponentStartAngle);
          const opponentStartY = opponentY + diffuseRadius * Math.sin(opponentStartAngle);
          const opponentEndX = opponentX + diffuseRadius * Math.cos(opponentEndAngle);
          const opponentEndY = opponentY + diffuseRadius * Math.sin(opponentEndAngle);

          const opponentPath = `
            M ${opponentX} ${opponentY}
            L ${opponentStartX} ${opponentStartY}
            A ${diffuseRadius} ${diffuseRadius} 0 1 1 ${opponentEndX} ${opponentEndY}
            Z
          `;

          // Append glow to the glow layer (behind logos)
          glowGroup.append('path')
            .attr('class', 'matchup-glow')
            .attr('d', opponentPath)
            .attr('fill', `url(#${opponentGradientId})`)
            .style('pointer-events', 'none')
            .style('filter', 'blur(15px)');

          // Left (horizontal) - hovered team's possession
          labelGroup.append('text')
            .attr('class', 'matchup-label')
            .attr('x', opponentX - bubbleDistance)
            .attr('y', opponentY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .style('pointer-events', 'none')
            .text(`${hoveredTeamStats.possession}%`);

          // Right (horizontal) - opponent's possession
          labelGroup.append('text')
            .attr('class', 'matchup-label')
            .attr('x', opponentX + bubbleDistance)
            .attr('y', opponentY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .style('pointer-events', 'none')
            .text(`${opponentStats.possession}%`);

          // Bottom (vertical) - hovered team's pass accuracy
          labelGroup.append('text')
            .attr('class', 'matchup-label')
            .attr('x', opponentX)
            .attr('y', opponentY + bubbleDistance)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('transform', `rotate(-90, ${opponentX}, ${opponentY + bubbleDistance})`)
            .style('pointer-events', 'none')
            .text(`${hoveredTeamStats.passAccuracy}%`);

          // Top (vertical) - opponent's pass accuracy
          labelGroup.append('text')
            .attr('class', 'matchup-label')
            .attr('x', opponentX)
            .attr('y', opponentY - bubbleDistance)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('transform', `rotate(-90, ${opponentX}, ${opponentY - bubbleDistance})`)
            .style('pointer-events', 'none')
            .text(`${opponentStats.passAccuracy}%`);
        });

        // Add team name label above the hovered logo
        labelGroup.append('text')
          .attr('class', 'team-name-label')
          .attr('x', xScale(d.avg_possession))
          .attr('y', yScale(d.avg_pass_accuracy) - logoSize / 2 - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '13px')
          .attr('font-weight', '700')
          .style('pointer-events', 'none')
          .text(d.team_name);
      })
      .on('mouseleave', function() {
        // Hide legend
        svg.select('.legend-svg')
          .transition()
          .duration(200)
          .style('opacity', 0)
          .on('end', function() {
            d3.select(this).style('display', 'none');
          });

        // Remove all hover labels and shapes
        labelGroup.selectAll('.matchup-label').remove();
        glowGroup.selectAll('.matchup-glow').remove();
        labelGroup.selectAll('.team-name-label').remove();
        svg.selectAll('defs radialGradient.matchup-gradient').remove();

        // Reset all logos to default state
        logoGroup.selectAll('image.team-logo')
          .transition()
          .duration(200)
          .style('opacity', 0.85)
          .attr('width', logoSize)
          .attr('height', logoSize)
          .attr('x', (d: any) => xScale(d.avg_possession) - logoSize / 2)
          .attr('y', (d: any) => yScale(d.avg_pass_accuracy) - logoSize / 2);
      });
  }

  // Reactively re-render when data or dimensions change
  $effect(() => {
    if (teams.length > 0 && svgContainer) {
      renderChart();
    }
  });

  onMount(() => {
    loadTeamPerformance();
  });
</script>

<div class="scatter-container">
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
    <div class="chart-wrapper" bind:this={svgContainer}></div>
  {/if}
</div>

<style>
  .scatter-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .chart-wrapper {
    width: 100%;
    max-width: 900px;
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
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-button:hover {
    background: #50ff79;
    transform: translateY(-2px);
  }


  /* Responsive */
  @media (max-width: 768px) {
    .scatter-container {
      padding: 1rem;
    }
  }
</style>
