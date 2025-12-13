<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  // Couleur de fond principale
  const BG_COLOR = '#001a0a';

  type Player = {
    id: number;
    name: string;
    surname: string;
    scores: Record<string, number>;
  };

  type Criterion = {
    id: string;
    name: string;
  };

  type Props = {
    selectedCriteria: Criterion[];
    players: Player[];
    hoveredPlayerId?: string | null;
    selectedPlayers?: Map<string, string>;
  };

  let {
    selectedCriteria,
    players,
    hoveredPlayerId = null,
    selectedPlayers = new Map()
  }: Props = $props();

  // Calculer les médianes et top 10% pour chaque critère
  const criteriaMedians = $derived.by(() => {
    const medians: Record<string, number> = {};
    selectedCriteria.forEach(criterion => {
      const scores = players
        .map(p => p.scores[criterion.id] || 0)
        .filter(score => !isNaN(score))
        .sort((a, b) => a - b);

      if (scores.length === 0) {
        medians[criterion.id] = 0.5;
      } else {
        const mid = Math.floor(scores.length / 2);
        medians[criterion.id] = scores.length % 2 === 0
          ? (scores[mid - 1] + scores[mid]) / 2
          : scores[mid];
      }
    });
    return medians;
  });

  // Calculer le top 5% (95e percentile) pour chaque critère
  const criteriaTop5 = $derived.by(() => {
    const top5: Record<string, number> = {};
    selectedCriteria.forEach(criterion => {
      const scores = players
        .map(p => p.scores[criterion.id] || 0)
        .filter(score => !isNaN(score))
        .sort((a, b) => a - b);

      if (scores.length === 0) {
        top5[criterion.id] = 0.95;
      } else {
        const index = Math.floor(scores.length * 0.95);
        top5[criterion.id] = scores[index];
      }
    });
    return top5;
  });

  let chartContainerRef: HTMLDivElement;

  function buildD3Chart() {
    if (!chartContainerRef || selectedCriteria.length === 0) return;

    d3.select(chartContainerRef).selectAll('*').remove();

    const width = 1000;
    const height = 450;
    const centerX = width / 2;
    const centerY = height - 40;
    const maxRadius = 320;

    const svg = d3.select(chartContainerRef)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'polygon-chart');

    // Polygone de fond (forme demi-cercle avec padding)
    const bgPadding = 40;
    const backgroundPoints = selectedCriteria.map((_, i) => {
      const angle = Math.PI - (Math.PI * i) / (selectedCriteria.length - 1);
      return [
        centerX + (maxRadius + bgPadding) * Math.cos(angle),
        centerY - (maxRadius + bgPadding) * Math.sin(angle)
      ];
    });

    svg.append('path')
      .attr('d', `M ${centerX} ${centerY + bgPadding} L ${backgroundPoints.map(p => p.join(',')).join(' L ')} Z`)
      .attr('fill', BG_COLOR)
      .attr('stroke', 'none');

    // Polygone fixe en pointillé (sans la ligne du bas)
    const polygonPoints = selectedCriteria.map((_, i) => {
      const angle = Math.PI - (Math.PI * i) / (selectedCriteria.length - 1);
      return [
        centerX + maxRadius * Math.cos(angle),
        centerY - maxRadius * Math.sin(angle)
      ];
    });

    svg.append('path')
      .attr('d', `M ${polygonPoints.map(p => p.join(',')).join(' L ')}`)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.4)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2');

    // Hémi-octogone en bas (même dimension que l'hémisphère du haut)
    const bottomOctagonPoints = Array.from({ length: 5 }, (_, i) => {
      // Créer un hémi-octogone vers le bas (seulement la moitié inférieure, 5 points = demi de 8)
      // Angle de 0 à π pour avoir un arc en bas
      const angle = (Math.PI * i) / 4; // 5 points espacés sur un arc de 180°
      return [
        centerX + maxRadius * Math.cos(angle),
        centerY + maxRadius * Math.sin(angle)
      ];
    });

    // Fond de l'hémi-octogone (avec padding)
    const bottomBgPoints = Array.from({ length: 5 }, (_, i) => {
      const angle = (Math.PI * i) / 4;
      return [
        centerX + (maxRadius + bgPadding) * Math.cos(angle),
        centerY + (maxRadius + bgPadding) * Math.sin(angle)
      ];
    });

    svg.append('path')
      .attr('d', `M ${centerX} ${centerY - bgPadding} L ${bottomBgPoints.map(p => p.join(',')).join(' L ')} Z`)
      .attr('fill', BG_COLOR)
      .attr('stroke', 'none');

    // Contour pointillé de l'hémi-octogone
    svg.append('path')
      .attr('d', `M ${bottomOctagonPoints.map(p => p.join(',')).join(' L ')}`)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.4)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2');

    // Préparer les points du polygone des médianes (sera dessiné après les points)
    const medianPolygonPoints = selectedCriteria.map((criterion, i) => {
      const angle = Math.PI - (Math.PI * i) / (selectedCriteria.length - 1);
      const median = criteriaMedians[criterion.id] || 0.5;
      return [
        centerX + maxRadius * median * Math.cos(angle),
        centerY - maxRadius * median * Math.sin(angle)
      ];
    });

    // Préparer les points du polygone top 5% (sera dessiné après les points)
    const top5PolygonPoints = selectedCriteria.map((criterion, i) => {
      const angle = Math.PI - (Math.PI * i) / (selectedCriteria.length - 1);
      const top5 = criteriaTop5[criterion.id] || 0.95;
      return [
        centerX + maxRadius * top5 * Math.cos(angle),
        centerY - maxRadius * top5 * Math.sin(angle)
      ];
    });

    // Dessiner les nuages de points
    selectedCriteria.forEach((criterion, i) => {
      const angle = Math.PI - (Math.PI * i) / (selectedCriteria.length - 1);

      // Augmenter la taille des points proportionnellement
      const basePointSize = 4;
      const selectedPointSize = 6;
      const hoveredPointSize = 8;

      // Nuage de points avec effet de densité

      // Fonction de hachage stable
      const hash = (str: string) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
          h = ((h << 5) - h) + str.charCodeAt(i);
          h = h & h;
        }
        return h;
      };

      // Calculer la densité par bins le long de l'axe
      const numBins = 20;
      const binCounts = new Array(numBins).fill(0);

      players.forEach(player => {
        const score = Math.min(1, Math.max(0, player.scores[criterion.id] || 0));
        const binIndex = Math.min(numBins - 1, Math.floor(score * numBins));
        binCounts[binIndex]++;
      });

      const maxDensity = Math.max(...binCounts, 1);

      // Récupérer les seuils pour ce critère
      const median = criteriaMedians[criterion.id] || 0.5;
      const top5 = criteriaTop5[criterion.id] || 0.95;

      // Collecter d'abord tous les points (normaux, sélectionnés, et survolés séparément)
      const normalPoints: any[] = [];
      const selectedPointsData: any[] = [];
      const hoveredPoints: any[] = [];

      players.forEach(player => {
        const score = Math.min(1, Math.max(0, player.scores[criterion.id] || 0)); // Clamp entre 0 et 1

        // Densité à cette position
        const binIndex = Math.min(numBins - 1, Math.floor(score * numBins));
        const density = binCounts[binIndex] / maxDensity;

        const seed = hash(player.id + criterion.id);
        const jitterDistance = ((seed % 100) / 100 - 0.5) * 10; // Jitter le long de l'axe
        const jitterPerpendicular = (((seed * 13) % 100) / 100 - 0.5) * density * 20; // Jitter perpendiculaire basé sur densité

        const distance = score * maxRadius + jitterDistance;
        const baseX = centerX + distance * Math.cos(angle);
        const baseY = centerY - distance * Math.sin(angle);

        // Décalage perpendiculaire à l'axe (rotation de 90°)
        const perpAngle = angle + Math.PI / 2;
        const pointX = baseX + jitterPerpendicular * Math.cos(perpAngle);
        const pointY = baseY - jitterPerpendicular * Math.sin(perpAngle);

        const isHovered = hoveredPlayerId === player.id;
        const isSelected = selectedPlayers.has(player.id);
        const selectionColor = selectedPlayers.get(player.id);

        // Déterminer la couleur selon la zone
        let fillColor, strokeColor;
        if (score < median) {
          // En dessous de la médiane - vert foncé
          fillColor = '#00804d';
          strokeColor = '#006640';
        } else if (score < top5) {
          // Entre médiane et top 5% - vert moyen
          fillColor = '#00cc66';
          strokeColor = '#00b359';
        } else {
          // Au-dessus du top 5% - vert clair/brillant
          fillColor = '#00ff88';
          strokeColor = '#00e673';
        }

        const pointData = {
          x: pointX,
          y: pointY,
          playerId: player.id,
          isHovered,
          isSelected,
          selectionColor,
          fillColor,
          strokeColor
        };

        if (isHovered) {
          hoveredPoints.push(pointData);
        } else if (isSelected) {
          selectedPointsData.push(pointData);
        } else {
          normalPoints.push(pointData);
        }
      });

      // Dessiner d'abord les points normaux (avec nuances de vert selon la zone)
      normalPoints.forEach(point => {
        svg.append('circle')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', basePointSize)
          .attr('fill', point.fillColor)
          .attr('stroke', point.strokeColor)
          .attr('stroke-width', 1.5)
          .attr('class', 'player-point')
          .attr('data-player-id', point.playerId)
          .style('opacity', hoveredPlayerId ? 0.3 : (selectedPlayers.size > 0 ? 0.3 : 1));
      });

      // Puis dessiner les points sélectionnés (plus gros, avec leur couleur)
      selectedPointsData.forEach(point => {
        svg.append('circle')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', selectedPointSize)
          .attr('fill', point.selectionColor)
          .attr('stroke', point.selectionColor)
          .attr('stroke-width', 3)
          .attr('class', 'player-point selected-point')
          .attr('data-player-id', point.playerId)
          .style('opacity', 1);

        // Calculer le rang du joueur pour ce critère
        const sortedPlayers = [...players].sort((a, b) =>
          (b.scores[criterion.id] || 0) - (a.scores[criterion.id] || 0)
        );
        const rank = sortedPlayers.findIndex(p => p.id === point.playerId) + 1;

        // Afficher le rang à côté du point
        svg.append('text')
          .attr('x', point.x + 12)
          .attr('y', point.y + 4)
          .attr('fill', point.selectionColor)
          .attr('font-size', 13)
          .attr('font-weight', 'bold')
          .text(`#${rank}`);
      });

      // Puis dessiner les points survolés (au-dessus)
      hoveredPoints.forEach(point => {
        svg.append('circle')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', hoveredPointSize)
          .attr('fill', 'white')
          .attr('stroke', 'rgba(255, 255, 255, 0.8)')
          .attr('stroke-width', 3)
          .attr('class', 'player-point')
          .attr('data-player-id', point.playerId);

        // Calculer le rang du joueur pour ce critère
        const sortedPlayers = [...players].sort((a, b) =>
          (b.scores[criterion.id] || 0) - (a.scores[criterion.id] || 0)
        );
        const rank = sortedPlayers.findIndex(p => p.id === point.playerId) + 1;

        // Afficher le rang à côté du point
        svg.append('text')
          .attr('x', point.x + 12)
          .attr('y', point.y + 4)
          .attr('fill', 'white')
          .attr('font-size', 13)
          .attr('font-weight', 'bold')
          .text(`#${rank}`);
      });

    });

    // Dessiner le polygone des médianes en pointillé blanc (au-dessus des points)
    svg.append('path')
      .attr('d', `M ${medianPolygonPoints.map(p => p.join(',')).join(' L ')}`)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    // Label "50%" sur le polygone médiane (positionné sur le critère central, vers l'intérieur)
    const medianCenterIndex = Math.floor(medianPolygonPoints.length / 2);
    const medianLabelPoint = medianPolygonPoints[medianCenterIndex];
    const medianAngle = Math.PI - (Math.PI * medianCenterIndex) / (selectedCriteria.length - 1);

    // Décaler vers l'intérieur du polygone (vers le centre)
    const medianOffset = 15;
    const medianLabelX = medianLabelPoint[0] - medianOffset * Math.cos(medianAngle);
    const medianLabelY = medianLabelPoint[1] + medianOffset * Math.sin(medianAngle);

    svg.append('text')
      .attr('x', medianLabelX)
      .attr('y', medianLabelY)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('opacity', 0.8)
      .style('text-shadow', '0 0 3px rgba(0, 26, 10, 0.8)')
      .text('50%');

    // Relier le critère de droite au 2ème sommet de l'hémi-octogone (médiane)
    const rightCriterionPointMedian = medianPolygonPoints[medianPolygonPoints.length - 1];
    const rightOctagonPoint = [centerX + maxRadius * Math.cos(Math.PI / 4), centerY + maxRadius * Math.sin(Math.PI / 4)];

    svg.append('line')
      .attr('x1', rightCriterionPointMedian[0])
      .attr('y1', rightCriterionPointMedian[1])
      .attr('x2', rightOctagonPoint[0])
      .attr('y2', rightOctagonPoint[1])
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    // Relier le critère de gauche à l'avant-dernier sommet de l'hémi-octogone (médiane)
    const leftCriterionPointMedian = medianPolygonPoints[0];
    const leftOctagonPoint = [centerX + maxRadius * Math.cos(3 * Math.PI / 4), centerY + maxRadius * Math.sin(3 * Math.PI / 4)];

    svg.append('line')
      .attr('x1', leftCriterionPointMedian[0])
      .attr('y1', leftCriterionPointMedian[1])
      .attr('x2', leftOctagonPoint[0])
      .attr('y2', leftOctagonPoint[1])
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    // Dessiner le polygone top 5% en pointillé blanc (au-dessus des points)
    svg.append('path')
      .attr('d', `M ${top5PolygonPoints.map(p => p.join(',')).join(' L ')}`)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    // Label "95%" sur le polygone top 5% (positionné sur le critère central, vers l'extérieur)
    const top5CenterIndex = Math.floor(top5PolygonPoints.length / 2);
    const top5LabelPoint = top5PolygonPoints[top5CenterIndex];
    const top5Angle = Math.PI - (Math.PI * top5CenterIndex) / (selectedCriteria.length - 1);

    // Décaler vers l'extérieur du polygone (loin du centre)
    const top5Offset = 15;
    const top5LabelX = top5LabelPoint[0] + top5Offset * Math.cos(top5Angle);
    const top5LabelY = top5LabelPoint[1] - top5Offset * Math.sin(top5Angle);

    svg.append('text')
      .attr('x', top5LabelX)
      .attr('y', top5LabelY)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('opacity', 0.8)
      .style('text-shadow', '0 0 3px rgba(0, 26, 10, 0.8)')
      .text('95%');

    // Relier le critère de droite au 2ème sommet de l'hémi-octogone (top 5%)
    const rightCriterionPointTop5 = top5PolygonPoints[top5PolygonPoints.length - 1];

    svg.append('line')
      .attr('x1', rightCriterionPointTop5[0])
      .attr('y1', rightCriterionPointTop5[1])
      .attr('x2', rightOctagonPoint[0])
      .attr('y2', rightOctagonPoint[1])
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    // Relier le critère de gauche à l'avant-dernier sommet de l'hémi-octogone (top 5%)
    const leftCriterionPointTop5 = top5PolygonPoints[0];

    svg.append('line')
      .attr('x1', leftCriterionPointTop5[0])
      .attr('y1', leftCriterionPointTop5[1])
      .attr('x2', leftOctagonPoint[0])
      .attr('y2', leftOctagonPoint[1])
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    // Dessiner les labels des critères
    selectedCriteria.forEach((criterion, i) => {
      const angle = Math.PI - (Math.PI * i) / (selectedCriteria.length - 1);
      const endX = centerX + maxRadius * Math.cos(angle);
      const endY = centerY - maxRadius * Math.sin(angle);

      // Label du critère avec rotation adaptée
      const angleDeg = angle * (180 / Math.PI);
      const rotationAngle = 90 - angleDeg;
      const labelOffset = 15;

      svg.append('text')
        .attr('x', endX + labelOffset * Math.cos(angle))
        .attr('y', endY - labelOffset * Math.sin(angle))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'alphabetic')
        .attr('fill', 'white')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('class', 'criterion-label')
        .attr('transform', rotationAngle !== 0 ? `rotate(${rotationAngle}, ${endX + labelOffset * Math.cos(angle)}, ${endY - labelOffset * Math.sin(angle)})` : null)
        .text(criterion.name);
    });
  }

  onMount(() => {
    buildD3Chart();
  });

  $effect(() => {
    selectedCriteria;
    players;
    hoveredPlayerId;
    selectedPlayers;
    if (chartContainerRef) {
      buildD3Chart();
    }
  });
</script>

<div class="radar-filter">
  <div class="chart-container" bind:this={chartContainerRef}></div>
</div>

<style>
  .radar-filter {
    width: 100%;
    max-width: 700px;
    background: transparent;
    text-align: center;
    position: relative;
    pointer-events: auto;
  }

  .chart-container {
    width: 100%;
  }

  :global(.radar-filter .polygon-chart) {
    width: 100%;
    height: auto;
  }

  :global(.radar-filter .player-point) {
    cursor: default;
  }

  :global(.radar-filter .criterion-label) {
    text-shadow: 0 0 4px rgba(0, 26, 10, 0.8);
  }
</style>
