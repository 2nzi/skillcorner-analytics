<script lang="ts">
  import { onMount } from 'svelte';
  import RadarFilter from '$lib/components/features/player-search/RadarFilter.svelte';
  import PositionFilter from '$lib/components/features/player-search/PositionFilter.svelte';
  import CriterionWeightSlider from '$lib/components/features/player-search/CriterionWeightSlider.svelte';

  // Types pour les joueurs et critères
  type Player = {
    id: string; // Unique ID per player-position combination
    playerId: string; // Original player ID (same for all positions of a player)
    name: string;
    surname: string;
    age: number;
    position: string;
    scores: Record<string, number>; // critère -> score normalisé
    rawValues: Record<string, number>; // critère -> valeur brute
  };

  type Criterion = {
    id: string;
    name: string;
  };

  // Les 5 critères fixes
  let selectedCriteria = $state<Criterion[]>([
    { id: 'Total distance', name: 'Total distance' },
    { id: 'Sprint distance', name: 'Sprint distance' },
    { id: 'HSR distance', name: 'HSR distance' },
    { id: 'PSV99', name: 'PSV99' },
    { id: 'High accel count', name: 'High accel count' }
  ]);

  // Critères disponibles pour l'ajout
  const availableCriteria: Criterion[] = [
    { id: 'Minutes', name: 'Minutes' },
    { id: 'Total distance', name: 'Total distance' },
    { id: 'Sprint distance', name: 'Sprint distance' },
    { id: 'HSR distance', name: 'HSR distance' },
    { id: 'Running distance', name: 'Running distance' },
    { id: 'HI distance', name: 'HI distance' },
    { id: 'PSV99', name: 'PSV99' },
    { id: 'High accel count', name: 'High accel count' },
    { id: 'High decel count', name: 'High decel count' },
    { id: 'Sprint count', name: 'Sprint count' },
    { id: 'HSR count', name: 'HSR count' },
    { id: 'Meters per minute', name: 'Meters per minute' }
  ];

  // Joueurs chargés depuis l'API
  let players = $state<Player[]>([]);
  let loading = $state(true);

  // Joueur actuellement survolé
  let hoveredPlayerId = $state<string | null>(null);

  // Joueurs sélectionnés (cliqués) avec leurs couleurs
  let selectedPlayers = $state<Map<string, string>>(new Map());

  // Positions sélectionnées pour le filtre
  let selectedPositions = $state<Set<string>>(new Set());

  // Filtre actif ('radar' ou 'position')
  let activeFilter = $state<'radar' | 'position'>('radar');

  // Poids des critères (par défaut équitable)
  let criteriaWeights = $state<Record<string, number>>({});

  // Palette de couleurs pour les joueurs sélectionnés
  const SELECTION_COLORS = [
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ffff00', // Jaune
    '#ff6600', // Orange
    '#ff0066', // Rose
  ];

  // Nombre de joueurs à afficher
  let playersToShow = $state(5);

  // Gérer la sélection d'un joueur
  function togglePlayerSelection(playerId: string) {
    if (selectedPlayers.has(playerId)) {
      // Désélectionner
      const newMap = new Map(selectedPlayers);
      newMap.delete(playerId);
      selectedPlayers = newMap;
    } else {
      // Sélectionner avec la prochaine couleur disponible
      const colorIndex = selectedPlayers.size % SELECTION_COLORS.length;
      const newMap = new Map(selectedPlayers);
      newMap.set(playerId, SELECTION_COLORS[colorIndex]);
      selectedPlayers = newMap;
    }
  }

  // Gérer le toggle des positions
  function togglePosition(positionId: string) {
    const newSet = new Set(selectedPositions);
    if (newSet.has(positionId)) {
      newSet.delete(positionId);
    } else {
      newSet.add(positionId);
    }
    selectedPositions = newSet;
  }

  // Référence pour le contenu principal
  let searchContainerRef: HTMLDivElement;

  // Charger les données des joueurs
  async function loadPlayers() {
    try {
      const response = await fetch('/api/players/aggregates');
      if (!response.ok) throw new Error('Failed to load players');
      players = await response.json();
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      loading = false;
    }
  }

  // Auto-scroll au montage et charger les données
  onMount(() => {
    loadPlayers();

    if (searchContainerRef) {
      setTimeout(() => {
        searchContainerRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  });

  // Calculer le score global d'un joueur (moyenne pondérée des critères)
  function calculatePlayerScore(player: Player): number {
    let weightedScore = 0;
    let totalWeight = 0;

    selectedCriteria.forEach(criterion => {
      const score = player.scores[criterion.id] || 0;
      const weight = criteriaWeights[criterion.id] || (1 / selectedCriteria.length);
      weightedScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  // Gérer le changement d'un poids individuel
  function handleCriterionWeightChange(criterionId: string, newWeight: number) {
    const oldWeight = criteriaWeights[criterionId] || (1 / selectedCriteria.length);
    const delta = newWeight - oldWeight;

    // Créer les nouveaux poids
    const newWeights: Record<string, number> = { ...criteriaWeights };
    newWeights[criterionId] = newWeight;

    // Redistribuer la différence sur les autres critères
    const otherCriteria = selectedCriteria.filter(c => c.id !== criterionId);
    const otherTotalWeight = otherCriteria.reduce((sum, c) => sum + (criteriaWeights[c.id] || (1 / selectedCriteria.length)), 0);

    if (otherTotalWeight > 0 && otherCriteria.length > 0) {
      otherCriteria.forEach(c => {
        const proportion = (criteriaWeights[c.id] || (1 / selectedCriteria.length)) / otherTotalWeight;
        const adjustment = delta * proportion;
        newWeights[c.id] = Math.max(0, Math.min(1, (criteriaWeights[c.id] || (1 / selectedCriteria.length)) - adjustment));
      });
    } else if (otherCriteria.length > 0) {
      // Si tous les autres sont à 0, redistribuer équitablement
      const remainingWeight = Math.max(0, 1 - newWeight);
      const equalShare = remainingWeight / otherCriteria.length;
      otherCriteria.forEach(c => {
        newWeights[c.id] = equalShare;
      });
    }

    // Normaliser pour garantir que la somme = 1
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      Object.keys(newWeights).forEach(key => {
        newWeights[key] = newWeights[key] / total;
      });
    }

    criteriaWeights = newWeights;
  }

  // Joueurs filtrés par position puis triés par score global (meilleurs en premier)
  let rankedPlayers = $derived.by(() => {
    let filtered: Player[];

    // Si au moins une position est sélectionnée: filtrer et afficher stats par position
    if (selectedPositions.size > 0) {
      filtered = players.filter(player => selectedPositions.has(player.position));
    } else {
      // Aucun filtre: agréger toutes les positions par joueur
      const playerMap = new Map<string, Player>();

      players.forEach(player => {
        if (playerMap.has(player.playerId)) {
          // Joueur déjà existant: sommer les stats
          const existing = playerMap.get(player.playerId)!;

          // Sommer les valeurs brutes
          Object.keys(player.rawValues).forEach(key => {
            if (key === 'PSV99' || key === 'Meters per minute') {
              // Pour PSV99 et Meters per minute, prendre le max
              existing.rawValues[key] = Math.max(existing.rawValues[key] || 0, player.rawValues[key]);
            } else {
              // Pour les autres, sommer
              existing.rawValues[key] = (existing.rawValues[key] || 0) + player.rawValues[key];
            }
          });

          // Concatener les positions si différente
          if (!existing.position.includes(player.position)) {
            existing.position += `, ${player.position}`;
          }
        } else {
          // Premier enregistrement pour ce joueur
          playerMap.set(player.playerId, {
            ...player,
            id: player.playerId, // Utiliser playerId comme id unique
            rawValues: { ...player.rawValues }, // Clone
            position: player.position
          });
        }
      });

      // Recalculer les scores normalisés pour les joueurs agrégés
      const aggregatedPlayers = Array.from(playerMap.values());

      // Trouver min/max pour normalisation
      const criteriaKeys = Object.keys(aggregatedPlayers[0]?.rawValues || {});
      const minMax: Record<string, { min: number; max: number }> = {};

      criteriaKeys.forEach(key => {
        const values = aggregatedPlayers.map(p => p.rawValues[key]).filter(v => v > 0);
        minMax[key] = {
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });

      // Normaliser les scores (créer de nouveaux objets plutôt que de modifier)
      filtered = aggregatedPlayers.map(player => {
        const newScores: Record<string, number> = {};

        criteriaKeys.forEach(key => {
          const { min, max } = minMax[key];
          if (max === min) {
            newScores[key] = 0.5;
          } else {
            newScores[key] = (player.rawValues[key] - min) / (max - min);
          }
        });

        return {
          ...player,
          scores: newScores
        };
      });
    }

    // Trier par score
    return [...filtered].sort((a, b) => calculatePlayerScore(b) - calculatePlayerScore(a));
  });

  // Ajouter un critère
  function addCriterion(criterion: Criterion) {
    if (!selectedCriteria.find(c => c.id === criterion.id)) {
      selectedCriteria = [...selectedCriteria, criterion];
    }
  }

  // Retirer un critère
  function removeCriterion(criterionId: string) {
    selectedCriteria = selectedCriteria.filter(c => c.id !== criterionId);
  }

  // État du dropdown
  let dropdownOpen = $state(false);

  // Critères disponibles à ajouter (non encore sélectionnés)
  let availableToAdd = $derived(
    availableCriteria.filter(c => !selectedCriteria.find(sc => sc.id === c.id))
  );
</script>

<div class="search-container" bind:this={searchContainerRef}>
  <!-- Header avec logo -->
  <header class="search-header">
    <div class="logo">
      <span class="logo-sk">SK</span><span class="logo-py">Py</span>
    </div>
    <div class="tagline">create your metric</div>
  </header>

  <!-- Tableau joueurs × critères -->
  <div class="table-wrapper">
    <table class="players-table">
      <thead>
        <tr>
          <th class="player-col-header">Player</th>
          <th class="score-badge-header">Score</th>
          {#each selectedCriteria as criterion}
            <th class="criterion-col-header">
              <button
                class="criterion-header-btn"
                onclick={() => removeCriterion(criterion.id)}
                title="Cliquer pour retirer"
              >
                {criterion.name}
                <span class="remove-icon">×</span>
              </button>
              <CriterionWeightSlider
                weight={criteriaWeights[criterion.id] || (1 / selectedCriteria.length)}
                onWeightChange={(newWeight) => handleCriterionWeightChange(criterion.id, newWeight)}
              />
            </th>
          {/each}
          <th class="add-col-header">
            <div class="add-criterion-wrapper">
              <button
                class="add-criterion-btn"
                onclick={() => dropdownOpen = !dropdownOpen}
              >
                + Criteria
              </button>
              {#if dropdownOpen}
                <div class="criterion-dropdown">
                  {#if availableToAdd.length > 0}
                    {#each availableToAdd as criterion}
                      <button
                        class="criterion-option"
                        onclick={() => {
                          addCriterion(criterion);
                          dropdownOpen = false;
                        }}
                      >
                        {criterion.name}
                      </button>
                    {/each}
                  {:else}
                    <div class="no-criteria">Tous les critères sont déjà ajoutés</div>
                  {/if}
                </div>
              {/if}
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {#if loading}
          <tr>
            <td colspan={selectedCriteria.length + 2} style="text-align: center; padding: 2rem;">
              <div style="color: white;">Loading players...</div>
            </td>
          </tr>
        {:else}
          {#each rankedPlayers.slice(0, playersToShow) as player, index}
            {@const isSelected = selectedPlayers.has(player.id)}
            {@const selectionColor = selectedPlayers.get(player.id)}
            <tr class="player-row"
                onmouseenter={() => hoveredPlayerId = player.id}
                onmouseleave={() => hoveredPlayerId = null}
                onclick={() => togglePlayerSelection(player.id)}>
              <td class="player-cell">
                <div class="player-card-wrapper" class:selected={isSelected} style={isSelected ? `--selection-color: ${selectionColor};` : ''}>
                  <div class="player-card">
                    <div class="player-number">#{index + 1}</div>
                    <div class="player-info">
                      <div class="player-name">{player.name} {player.surname}</div>
                      <div class="player-meta">{player.age} ans | {player.position}</div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="score-badge-cell">
                <div class="score-badge">
                  {(calculatePlayerScore(player) * 100).toFixed(0)}
                </div>
              </td>
              {#each selectedCriteria as criterion}
                <td class="score-cell">
                  {player.rawValues[criterion.id] || 0}
                </td>
              {/each}
              <td></td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Bouton pour charger plus de joueurs -->
  {#if rankedPlayers.length > playersToShow}
    <button class="load-more-bar" onclick={() => playersToShow += 5}>
      +
    </button>
  {/if}

</div>

<!-- Section sticky en bas -->
<div class="bottom-sticky-section">
  {#if activeFilter === 'radar'}
    <RadarFilter
      {selectedCriteria}
      players={rankedPlayers}
      {hoveredPlayerId}
      {selectedPlayers}
    />
  {:else}
    <PositionFilter
      {selectedPositions}
      onTogglePosition={togglePosition}
    />
  {/if}
</div>

<!-- Barre de navigation pour changer de filtre -->
<div class="filter-navigation">
  <button class="filter-nav-btn" class:active={activeFilter === 'radar'} onclick={() => activeFilter = 'radar'} title="Radar Chart">
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1">
      <path d="M 7 18 L 4 9 L 12 4 L 20 9 L 17 18" />
      <path d="M 9.5 16 L 8 11 L 12 8 L 16 11 L 14.5 16" stroke-dasharray="1.5,1.5" opacity="0.5" />
    </svg>
  </button>

  <button class="filter-nav-btn" class:active={activeFilter === 'position'} onclick={() => activeFilter = 'position'} title="Position Field">
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1">
      <rect x="4" y="6" width="16" height="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <circle cx="12" cy="12" r="2.5" />
      <rect x="4" y="9" width="4" height="6" />
      <rect x="16" y="9" width="4" height="6" />
    </svg>
  </button>
</div>


<style>
  .search-container {
    width: 100%;
    min-height: 100vh;
    background: var(--color-bg-app);
    color: white;
    padding: 2rem;
    max-width: 100%;
    overflow-x: hidden;
  }

  /* ===== HEADER ===== */
  .search-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .logo {
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 0;
    line-height: 1;
  }

  .logo-sk {
    color: white;
  }

  .logo-py {
    color: #00ff64;
  }

  .tagline {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.7);
    text-align: justify;
    text-align-last: justify;
    white-space: nowrap;
    width: 10.5em;
    margin: -0.4rem auto 0;
  }

  .tagline::after {
    content: '';
    display: inline-block;
    width: 100%;
  }

  /* ===== TABLE ===== */
  .table-wrapper {
    max-width: 1400px;
    margin: 0 auto 0;
    overflow-x: auto;
    padding-bottom: 2rem;

    /* Scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 255, 100, 0.5) rgba(0, 255, 100, 0.1);
  }

  .table-wrapper::-webkit-scrollbar {
    height: 8px;
  }

  .table-wrapper::-webkit-scrollbar-track {
    background: rgba(0, 255, 100, 0.1);
    border-radius: 4px;
  }

  .table-wrapper::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 100, 0.5);
    border-radius: 4px;
  }

  .table-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 100, 0.7);
  }

  .players-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 1rem;
  }

  /* Headers */
  .players-table thead th {
    padding: 1rem;
    text-align: center;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .player-col-header {
    text-align: left;
    min-width: 250px;
    position: sticky;
    left: 0;
    background: var(--color-bg-app);
    z-index: 10;
  }

  .score-badge-header {
    text-align: center;
    width: 120px;
    position: sticky;
    left: 250px;
    background: var(--color-bg-app);
    z-index: 10;
    padding-left: 1rem;
  }

  .criterion-col-header {
    width: fit-content;
    white-space: nowrap;
  }

  .criterion-header-btn {
    background: transparent;
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .criterion-header-btn:hover {
    opacity: 0.7;
  }

  .remove-icon {
    font-size: 1.2rem;
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .criterion-header-btn:hover .remove-icon {
    opacity: 1;
  }

  .add-col-header {
    min-width: 150px;
  }

  .add-criterion-wrapper {
    position: relative;
    display: inline-block;
  }

  .add-criterion-btn {
    background: rgba(54, 54, 54);
    color: #ffffff;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-criterion-btn:hover {
    background: rgba(255, 255, 255, 0.2) }

  .criterion-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    background: #292929;
    border-radius: 8px;
    padding: 0.5rem;
    min-width: 150px;
    z-index: 1000;
  }

  .criterion-option {
    display: block;
    width: 100%;
    background: none;
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .criterion-option:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .no-criteria {
    padding: 0.5rem 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.85rem;
    text-align: center;
  }

  /* Rows */
  .player-row {
    transition: all 0.2s;
    position: relative;
    cursor: pointer;
  }

  /* Effet hover désactivé pour éviter confusion avec la sélection */

  /* Player Cell */
  .player-cell {
    padding: 0;
    position: sticky;
    left: 0;
    background: var(--color-bg-app);
    z-index: 2;
  }

  /* Score Badge Cell */
  .score-badge-cell {
    --notch: 15px;
    padding: 0;
    padding-left: 1rem;
    position: sticky;
    left: 250px;
    background: var(--color-bg-app);
    text-align: center;
    width: 120px;
    z-index: 2;
  }

  .score-badge-cell::after {
    content: '';
    position: absolute;
    top: 0;
    left: 1rem;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 0;

    clip-path: polygon(
      var(--notch) 0,
      100% 0,
      100% calc(100% - var(--notch)),
      calc(100% - var(--notch)) 100%,
      0 100%,
      0 var(--notch)
    );
  }

  .score-badge {
    background: transparent;
    padding: 0.75rem 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--color-bg-app);
    height: 100%;
    position: relative;
    z-index: 1;
  }

  .player-card-wrapper {
    position: relative;
  }

  .player-card-wrapper.selected::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    --notch: 10px;

    /* Même clip-path que la carte */
    clip-path: polygon(
      var(--notch) 0,
      100% 0,
      100% calc(100% - var(--notch)),
      calc(100% - var(--notch)) 100%,
      0 100%,
      0 var(--notch)
    );

    /* Contour de 2px */
    box-shadow: inset 0 0 0 2px var(--selection-color);
    pointer-events: none;
    z-index: 10;
  }

  .player-card {
    --notch: 10px;

    background: linear-gradient(135deg, #00ff64 0%, #00cc50 100%);
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    /* Coins coupés diagonaux */
    clip-path: polygon(
      var(--notch) 0,
      100% 0,
      100% calc(100% - var(--notch)),
      calc(100% - var(--notch)) 100%,
      0 100%,
      0 var(--notch)
    );
  }

  .player-number {
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--color-bg-app);
  }

  .player-info {
    flex: 1;
  }

  .player-name {
    font-size: 0.95rem;
    font-weight: bold;
    color: var(--color-bg-app);
    margin-bottom: 0.15rem;
  }

  .player-meta {
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--color-bg-app) 80%, transparent);
  }

  /* Score Cell */
  .score-cell {
    text-align: center;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    padding: 0.75rem;
    white-space: nowrap;
    opacity: 0.5;
    z-index: 1;
  }

  /* ===== LOAD MORE ===== */
  .load-more-bar {
    width: 100%;
    max-width: 1400px;
    margin: 1rem auto;
    display: block;
    background: transparent;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.5);
    padding: 0.75rem;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .load-more-bar:hover {
    border-top-color: rgba(0, 255, 100, 0.5);
    border-bottom-color: rgba(0, 255, 100, 0.5);
    color: #00ff64;
  }

  /* ===== BOTTOM STICKY SECTION ===== */
  .bottom-sticky-section {
    position: sticky;
    bottom: 50px;
    left: 0;
    width: 100%;
    background: transparent;
    z-index: 100;
    pointer-events: none;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }

  .bottom-sticky-section > :global(*) {
    pointer-events: auto;
    flex-shrink: 0;
  }


  /* ===== FILTER NAVIGATION BAR ===== */
  .filter-navigation {
    position: fixed;
    bottom: 0;
    left: 60px;
    right: 0;
    background: color-mix(in srgb, var(--color-bg-app) 95%, transparent);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding: 0.5rem;
    z-index: 10;
  }

  .filter-nav-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .filter-nav-btn:hover {
    color: rgba(255, 255, 255, 0.8);
  }

  .filter-nav-btn.active {
    color: #fff;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {
    .filter-navigation {
      left: 50px;
    }

    .bottom-sticky-section {
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 0 1rem 1rem;
    }

    .search-container {
      padding: 1rem;
    }

    .logo {
      font-size: 2rem;
    }

    .tagline {
      font-size: 0.75rem;
    }

    .table-wrapper {
      overflow-x: auto;
      padding-bottom: 1rem;
    }

    .players-table {
      border-spacing: 0 0.5rem;
    }

    .player-col-header {
      min-width: 180px;
      font-size: 0.85rem;
    }

    .score-badge-header {
      width: 80px;
      left: 180px;
      font-size: 0.85rem;
    }

    .player-cell {
      left: 0;
    }

    .score-badge-cell {
      left: 180px;
      width: 80px;
      padding-left: 0.5rem;
    }

    .score-badge-cell::after {
      left: 0.5rem;
    }

    .player-card {
      --notch: 8px;
      padding: 0.5rem 0.75rem;
      gap: 0.5rem;
      min-width: 180px;
    }

    .player-number {
      font-size: 0.9rem;
    }

    .player-name {
      font-size: 0.85rem;
    }

    .player-meta {
      font-size: 0.7rem;
    }

    .score-badge {
      padding: 0.5rem;
      font-size: 0.9rem;
    }

    .score-cell {
      font-size: 0.85rem;
      padding: 0.5rem;
    }

    .criterion-header-btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }

    .add-criterion-btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    .filter-navigation {
      left: 50px;
    }
  }
</style>
