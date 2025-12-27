<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  // Types
  interface MatchupData {
    opponent_id: number;
    possession: number;
    pass_accuracy: number;
    pass_volume: number;
    total_xthreat: number;
    obr_per_min: number;
    lb_attempts: number;
    lb_success_rate: number;
    pressing_actions: number;
    regain_rate: number;
  }

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
    teams: TeamPerformance[];
    xMetricId: string;
    yMetricId: string;
    width?: number;
    height?: number;
  }

  let { teams, xMetricId, yMetricId, width = 900, height = 600 }: Props = $props();

  // SVG ref
  let svgContainer = $state<HTMLDivElement>();

  // Chart margins
  const margin = { top: 40, right: 40, bottom: 60, left: 90 };
  const chartWidth = $derived(width - margin.left - margin.right);
  const chartHeight = $derived(height - margin.top - margin.bottom);

  // Get selected metrics
  const xMetric = $derived(AVAILABLE_METRICS.find(m => m.id === xMetricId) || AVAILABLE_METRICS[0]);
  const yMetric = $derived(AVAILABLE_METRICS.find(m => m.id === yMetricId) || AVAILABLE_METRICS[1]);

  // Calculate averages
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

  // D3 scales
  const xScale = $derived.by(() => {
    if (teams.length === 0) return null;
    const values = teams.map(t => xMetric.accessor(t));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const maxDeviation = Math.max(Math.abs(maxValue - avgX), Math.abs(minValue - avgX));
    const padding = maxDeviation * 0.15;
    return d3.scaleLinear()
      .domain([avgX - maxDeviation - padding, avgX + maxDeviation + padding])
      .range([0, chartWidth]);
  });

  const yScale = $derived.by(() => {
    if (teams.length === 0) return null;
    const values = teams.map(t => yMetric.accessor(t));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const maxDeviation = Math.max(Math.abs(maxValue - avgY), Math.abs(minValue - avgY));
    const padding = maxDeviation * 0.15;
    return d3.scaleLinear()
      .domain([avgY - maxDeviation - padding, avgY + maxDeviation + padding])
      .range([chartHeight, 0]);
  });

  const logoSize = 30;

  function getOpponentIds(teamId: number): Set<number> {
    const team = teams.find(t => t.team_id === teamId);
    if (!team) return new Set();
    return new Set(team.matchups.map(m => m.opponent_id));
  }

  function getMatchupValue(teamId: number, opponentId: number, metricId: string): number | null {
    const team = teams.find(t => t.team_id === teamId);
    if (!team) return null;
    const matchup = team.matchups.find(m => m.opponent_id === opponentId);
    if (!matchup) return null;

    // Map metric IDs to matchup properties
    switch (metricId) {
      case 'possession': return matchup.possession;
      case 'pass_accuracy': return matchup.pass_accuracy;
      case 'pass_volume': return matchup.pass_volume;
      case 'total_xthreat': return matchup.total_xthreat;
      case 'obr_per_min': return matchup.obr_per_min;
      case 'lb_attempts': return matchup.lb_attempts;
      case 'lb_success_rate': return matchup.lb_success_rate;
      case 'pressing_actions': return matchup.pressing_actions;
      case 'regain_rate': return matchup.regain_rate;
      default: return null;
    }
  }

  function renderChart() {
    if (!svgContainer || !xScale || !yScale || teams.length === 0) return;

    d3.select(svgContainer).select('svg').remove();

    const svg = d3.select(svgContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const glowGroup = g.append('g').attr('class', 'glow-layer');
    const logoGroup = g.append('g').attr('class', 'logo-layer');
    const labelGroup = g.append('g').attr('class', 'label-layer');

    // Main axes
    g.append('line')
      .attr('x1', xScale(avgX))
      .attr('x2', xScale(avgX))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', 'rgba(255, 255, 255, 0.5)')
      .attr('stroke-width', 2);

    g.append('line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', yScale(avgY))
      .attr('y2', yScale(avgY))
      .attr('stroke', 'rgba(255, 255, 255, 0.5)')
      .attr('stroke-width', 2);

    // Axes ticks
    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d => `${d}`);
    g.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${xScale(avgX)},0)`)
      .call(yAxis)
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '11px');

    g.select('.y-axis').selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.3)');
    g.select('.y-axis').select('.domain').remove();

    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d}`);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${yScale(avgY)})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '11px');

    g.select('.x-axis').selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.3)');
    g.select('.x-axis').select('.domain').remove();

    // Axis labels
    const xLabel = `${xMetric.label.toUpperCase()}${xMetric.unit ? ` (${xMetric.unit})` : ''}`;
    const yLabel = `${yMetric.label.toUpperCase()}${yMetric.unit ? ` (${yMetric.unit})` : ''}`;

    g.append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'end')
      .attr('x', chartWidth - 5)
      .attr('y', yScale(avgY) - 8)
      .attr('fill', 'rgba(255, 255, 255, 0.8)')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text(xLabel);

    g.append('text')
      .attr('class', 'axis-label')
      .attr('text-anchor', 'end')
      .attr('x', 0)
      .attr('y', xScale(avgX) + 15)
      .attr('transform', `rotate(-90)`)
      .attr('fill', 'rgba(255, 255, 255, 0.8)')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text(yLabel);

    // Team logos
    logoGroup.selectAll('image.team-logo')
      .data(teams)
      .enter()
      .append('image')
      .attr('class', 'team-logo')
      .attr('xlink:href', d => `/api/team-logo/${d.team_id}`)
      .attr('x', d => xScale(xMetric.accessor(d)) - logoSize / 2)
      .attr('y', d => yScale(yMetric.accessor(d)) - logoSize / 2)
      .attr('width', logoSize)
      .attr('height', logoSize)
      .style('cursor', 'pointer')
      .style('opacity', 0.85)
      .on('mouseenter', function(_event, d) {
        const opponentIds = getOpponentIds(d.team_id);

        logoGroup.selectAll('image.team-logo')
          .transition()
          .duration(200)
          .style('opacity', function(teamData: any) {
            if (teamData.team_id === d.team_id) return 1;
            if (opponentIds.has(teamData.team_id)) return 0.85;
            return 0.3;
          });

        labelGroup.selectAll('.matchup-label').remove();
        glowGroup.selectAll('.matchup-glow').remove();
        labelGroup.selectAll('.team-name-label').remove();
        svg.selectAll('defs radialGradient.matchup-gradient').remove();

        let defs = svg.select('defs');
        if (defs.empty()) {
          defs = svg.append('defs');
        }

        // Display matchup stats
        opponentIds.forEach(opponentId => {
          const opponent = teams.find(t => t.team_id === opponentId);
          if (!opponent) return;

          const hoveredXValue = getMatchupValue(d.team_id, opponentId, xMetricId);
          const hoveredYValue = getMatchupValue(d.team_id, opponentId, yMetricId);
          const opponentXValue = getMatchupValue(opponentId, d.team_id, xMetricId);
          const opponentYValue = getMatchupValue(opponentId, d.team_id, yMetricId);

          const opponentX = xScale(xMetric.accessor(opponent));
          const opponentY = yScale(yMetric.accessor(opponent));
          const bubbleDistance = logoSize / 2 + 25;
          const diffuseRadius = 50;

          // Gradients for glows
          const hoveredGradientId = `gradient-hovered-${d.team_id}-${opponentId}`;
          const hoveredGradient = defs.append('radialGradient')
            .attr('id', hoveredGradientId)
            .attr('class', 'matchup-gradient')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '70%');

          hoveredGradient.append('stop').attr('offset', '0%').attr('stop-color', d.team_color).attr('stop-opacity', 0.15);
          hoveredGradient.append('stop').attr('offset', '60%').attr('stop-color', d.team_color).attr('stop-opacity', 0.05);
          hoveredGradient.append('stop').attr('offset', '100%').attr('stop-color', d.team_color).attr('stop-opacity', 0);

          const opponentGradientId = `gradient-opponent-${d.team_id}-${opponentId}`;
          const opponentGradient = defs.append('radialGradient')
            .attr('id', opponentGradientId)
            .attr('class', 'matchup-gradient')
            .attr('cx', '50%')
            .attr('cy', '50%')
            .attr('r', '70%');

          opponentGradient.append('stop').attr('offset', '0%').attr('stop-color', opponent.team_color).attr('stop-opacity', 0.15);
          opponentGradient.append('stop').attr('offset', '60%').attr('stop-color', opponent.team_color).attr('stop-opacity', 0.05);
          opponentGradient.append('stop').attr('offset', '100%').attr('stop-color', opponent.team_color).attr('stop-opacity', 0);

          // Semi-circle glows
          const hoveredStartAngle = 5 * Math.PI / 4;
          const hoveredEndAngle = 9 * Math.PI / 4;
          const hoveredStartX = opponentX + diffuseRadius * Math.cos(hoveredStartAngle);
          const hoveredStartY = opponentY + diffuseRadius * Math.sin(hoveredStartAngle);
          const hoveredEndX = opponentX + diffuseRadius * Math.cos(hoveredEndAngle);
          const hoveredEndY = opponentY + diffuseRadius * Math.sin(hoveredEndAngle);

          const hoveredPath = `M ${opponentX} ${opponentY} L ${hoveredStartX} ${hoveredStartY} A ${diffuseRadius} ${diffuseRadius} 0 1 1 ${hoveredEndX} ${hoveredEndY} Z`;

          glowGroup.append('path')
            .attr('class', 'matchup-glow')
            .attr('d', hoveredPath)
            .attr('fill', `url(#${hoveredGradientId})`)
            .style('pointer-events', 'none')
            .style('filter', 'blur(15px)');

          const opponentStartAngle = Math.PI / 4;
          const opponentEndAngle = 5 * Math.PI / 4;
          const opponentStartX = opponentX + diffuseRadius * Math.cos(opponentStartAngle);
          const opponentStartY = opponentY + diffuseRadius * Math.sin(opponentStartAngle);
          const opponentEndX = opponentX + diffuseRadius * Math.cos(opponentEndAngle);
          const opponentEndY = opponentY + diffuseRadius * Math.sin(opponentEndAngle);

          const opponentPath = `M ${opponentX} ${opponentY} L ${opponentStartX} ${opponentStartY} A ${diffuseRadius} ${diffuseRadius} 0 1 1 ${opponentEndX} ${opponentEndY} Z`;

          glowGroup.append('path')
            .attr('class', 'matchup-glow')
            .attr('d', opponentPath)
            .attr('fill', `url(#${opponentGradientId})`)
            .style('pointer-events', 'none')
            .style('filter', 'blur(15px)');

          // Labels (only if values are available)
          if (hoveredXValue !== null) {
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
              .text(xMetric.unit ? `${hoveredXValue.toFixed(1)}${xMetric.unit}` : hoveredXValue.toFixed(1));
          }

          if (opponentXValue !== null) {
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
              .text(xMetric.unit ? `${opponentXValue.toFixed(1)}${xMetric.unit}` : opponentXValue.toFixed(1));
          }

          if (hoveredYValue !== null) {
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
              .text(yMetric.unit ? `${hoveredYValue.toFixed(1)}${yMetric.unit}` : hoveredYValue.toFixed(1));
          }

          if (opponentYValue !== null) {
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
              .text(yMetric.unit ? `${opponentYValue.toFixed(1)}${yMetric.unit}` : opponentYValue.toFixed(1));
          }
        });

        // Team name label
        labelGroup.append('text')
          .attr('class', 'team-name-label')
          .attr('x', xScale(xMetric.accessor(d)))
          .attr('y', yScale(yMetric.accessor(d)) - logoSize / 2 - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '13px')
          .attr('font-weight', '700')
          .style('pointer-events', 'none')
          .text(d.team_name);
      })
      .on('mouseleave', function() {
        labelGroup.selectAll('.matchup-label').remove();
        glowGroup.selectAll('.matchup-glow').remove();
        labelGroup.selectAll('.team-name-label').remove();
        svg.selectAll('defs radialGradient.matchup-gradient').remove();

        logoGroup.selectAll('image.team-logo')
          .transition()
          .duration(200)
          .style('opacity', 0.85);
      });
  }

  $effect(() => {
    if (teams.length > 0 && svgContainer) {
      renderChart();
    }
  });
</script>

<div class="chart-wrapper" bind:this={svgContainer}></div>

<style>
  .chart-wrapper {
    width: 100%;
  }
</style>
