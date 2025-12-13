<script lang="ts">
  type Props = {
    selectedPositions?: Set<string>;
    onTogglePosition?: (position: string) => void;
  };

  let {
    selectedPositions = new Set(),
    onTogglePosition
  }: Props = $props();

  // Zones de position sur le terrain (horizontal, viewBox 150x100)
  // Hauteur totale: 90 (de y=5 à y=95)
  // Répartition horizontale: Défense 2/7 (~42.86), Milieu 3/7 (~64.29), Attaque 2/7 (~42.86)
  // Répartition verticale pour défense et attaque: 1/4 (22.5), 1/2 (45), 1/4 (22.5)
  const POSITION_ZONES = [
    // === ZONE DÉFENSE (gauche) - 2/7 ===
    { id: 'Full Back_top', label: 'Full Back', x: 0, y: 5, width: 42.86, height: 22.5 },  // 1/4 haut
    { id: 'Central Defender', label: 'Central Defender', x: 0, y: 27.5, width: 42.86, height: 45 },  // 1/2 centre
    { id: 'Full Back_bottom', label: 'Full Back', x: 0, y: 72.5, width: 42.86, height: 22.5 },  // 1/4 bas

    // === ZONE MILIEU (centre) - 3/7 ===
    { id: 'Midfield', label: 'Midfield', x: 42.86, y: 5, width: 64.29, height: 90 },  // Toute la hauteur

    // === ZONE ATTAQUE (droite) - 2/7 ===
    { id: 'Wide Attacker_top', label: 'Wide Attacker', x: 107.15, y: 5, width: 42.86, height: 22.5 },  // 1/4 haut
    { id: 'Center Forward', label: 'Center Forward', x: 107.15, y: 27.5, width: 42.86, height: 45 },  // 1/2 centre
    { id: 'Wide Attacker_bottom', label: 'Wide Attacker', x: 107.15, y: 72.5, width: 42.86, height: 22.5 },  // 1/4 bas
  ];

  function handlePositionClick(positionId: string) {
    onTogglePosition?.(positionId);
  }
</script>

<div class="position-filter">
  <svg viewBox="0 0 150 100" class="pitch-horizontal">
    <!-- Fond -->
    <rect x="0" y="0" width="150" height="100" fill="var(--color-bg-app)" />

    <!-- Zones de position -->
    {#each POSITION_ZONES as zone}
      {@const isSelected = selectedPositions.has(zone.label)}
      <g
        class="position-zone"
        class:selected={isSelected}
        onclick={() => handlePositionClick(zone.label)}
      >
        <rect
          x={zone.x}
          y={zone.y}
          width={zone.width}
          height={zone.height}
          fill={isSelected ? 'rgba(255, 255, 255, 0.3)' : 'transparent'}
          stroke="white"
          stroke-width="1.5"
        />
        <text
          x={zone.x + zone.width / 2}
          y={zone.y + zone.height / 2}
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white"
          font-size={zone.label === 'Midfield' ? '7' : '5'}
          font-weight={isSelected ? 'bold' : 'normal'}
        >
          {zone.label}
        </text>
      </g>
    {/each}
  </svg>
</div>

<style>
  .position-filter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
  }

  .pitch-horizontal {
    width: 100%;
    max-width: 500px;
    height: auto;
    margin-bottom: 20px;
  }

  .position-zone {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .position-zone:hover rect {
    fill: rgba(255, 255, 255, 0.2);
  }
</style>
