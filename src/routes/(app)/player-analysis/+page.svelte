<script lang="ts">
  import PlayerSearchBar from '$lib/components/features/player-analysis/PlayerSearchBar.svelte';
  import PlayerInfoCard from '$lib/components/features/player-analysis/PlayerInfoCard.svelte';
  import PlayerAnalysisFilters from '$lib/components/features/player-analysis/PlayerAnalysisFilters.svelte';
  import EventStatChart from '$lib/components/features/player-analysis/EventStatChart.svelte';
  import type { FilterState } from '$lib/components/features/player-analysis/PlayerAnalysisFilters.svelte';
  import { onMount } from 'svelte';

  type Player = {
    id: string;
    playerId: string;
    name: string;
    surname: string;
    age: number;
    position: string;
    scores: Record<string, number>;
    rawValues: Record<string, number>;
    team?: string;
  };

  let players = $state<Player[]>([]);
  let selectedPlayers = $state<Player[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let filtersOpen = $state(false);
  let currentFilters = $state<FilterState>({
    selectedClubs: [],
    timeWindows: [
      { id: 'current_week', label: 'Week', value: '' },
      { id: 'current_month', label: 'Month', value: '' },
      { id: 'current_season', label: 'Year', value: '' }
    ]
  });

  let analysisSection: HTMLElement;
  const MAX_PLAYERS = 3;

  // Shared state for synchronized chart selection across all players
  // Use category name instead of index to handle different segment sets per player
  let sharedSelectedCategory = $state<string | null>(null);

  // Extract unique clubs from players
  const availableClubs = $derived.by(() => {
    const clubs = new Set<string>();
    players.forEach(p => {
      if (p.team) clubs.add(p.team);
    });
    return Array.from(clubs).sort();
  });

  async function loadPlayers() {
    try {
      loading = true;
      error = null;
      const response = await fetch('/api/players/enriched');
      if (!response.ok) throw new Error('Failed to load players');
      const data = await response.json();
      players = data.map((p: any) => ({
        ...p,
        team: p.teamName,
        // Keep compatibility with existing structure
        scores: {},
        rawValues: {}
      }));
    } catch (err) {
      console.error('Error loading players:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  function handlePlayerSelect(playerId: string) {
    const player = players.find(p => p.id === playerId);
    if (player && selectedPlayers.length < MAX_PLAYERS) {
      if (!selectedPlayers.find(p => p.id === playerId)) {
        selectedPlayers = [...selectedPlayers, player];
      }
    }
  }

  function handleRemovePlayer(playerId: string) {
    selectedPlayers = selectedPlayers.filter(p => p.id !== playerId);
  }

  function scrollToAnalysis() {
    if (analysisSection) {
      analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function toggleFilters() {
    filtersOpen = !filtersOpen;
  }

  function handleFilterChange(filters: FilterState) {
    currentFilters = filters;
    console.log('Filters updated:', filters);
    // TODO: Apply filters to data/analysis
  }

  onMount(() => {
    loadPlayers();
  });
</script>

<div class="player-analysis-page {selectedPlayers.length > 0 ? 'has-content' : ''}">
  
  <div class="page-header">
    <PlayerSearchBar
      {players}
      onSelect={handlePlayerSelect}
    />
  </div>

  <div class="page-content">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading players...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p class="error-message">{error}</p>
        <button onclick={loadPlayers} class="retry-button">Retry</button>
      </div>
    {:else if selectedPlayers.length > 0}
      <div class="content-wrapper">
        <div class="player-cards-grid">
          {#each selectedPlayers as player (player.id)}
            <PlayerInfoCard {player} onRemove={() => handleRemovePlayer(player.id)} />
          {/each}
        </div>
        
        <button 
          class="scroll-indicator" 
          aria-label="Scroll down to analysis"
          onclick={scrollToAnalysis}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
          </svg>
        </button>

        <div class="analysis-section" bind:this={analysisSection}>
            <div class="analysis-grid columns-{selectedPlayers.length}">
                {#each selectedPlayers as player (player.id)}
                    <div class="analysis-column">
                        <div class="column-header">
                            <div class="notched-name-tag">
                                <span class="player-name">{player.name} {player.surname}</span>
                            </div>
                        </div>
                        <div class="column-content">
                          <!-- Event stats chart with real data -->
                          <EventStatChart
                            playerId={player.playerId}
                            eventType="on-ball-engagements"
                            selectedCategory={sharedSelectedCategory}
                            onCategorySelect={(category) => { sharedSelectedCategory = category; }}
                          />
                        </div>
                    </div>
                {/each}
            </div>
            
            <!-- Filters Overlay -->
            <div class="filters-overlay">
                <PlayerAnalysisFilters
                  {availableClubs}
                  isOpen={filtersOpen}
                  onFilterChange={handleFilterChange}
                />
            </div>

            <div class="central-footer">
                <button
                  class="plus-button {filtersOpen ? 'active' : ''}"
                  aria-label="Toggle filters"
                  onclick={toggleFilters}
                >
                    {filtersOpen ? '×' : '+'}
                </button>
            </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .player-analysis-page {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
    justify-content: flex-start;
    padding-top: 35vh; 
    transition: padding-top 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .player-analysis-page.has-content {
    padding-top: 3rem;
  }

  .content-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: fadeIn 0.8s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .page-header {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    transition: all 0.3s ease;
  }

  .page-content {
    display: flex;
    flex-direction: column; 
    align-items: center;
    width: 100%;
    flex: 0 0 auto;
  }

  .analysis-section {
    width: 100%;
    max-width: 1400px;
    min-height: 85vh; 
    margin-top: 4rem; 
    display: flex;
    flex-direction: column;
    /* Position relative pour gérer le layout interne */
    position: relative;
  }

  .analysis-grid {
      display: grid;
      width: 100%;
      flex: 1; /* Prend toute la hauteur disponible moins le footer */
      min-height: 500px; 
  }

  .columns-1 { grid-template-columns: 1fr; }
  .columns-2 { grid-template-columns: 1fr 1fr; }
  .columns-3 { grid-template-columns: 1fr 1fr 1fr; }

  .analysis-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      /* Le trait de séparation blanc transparent */
      border-right: 1px solid rgba(255, 255, 255, 0.2); 
      padding: 0 1rem;
  }

  /* Retire le trait pour la dernière colonne */
  .analysis-column:last-child {
      border-right: none;
  }

  .column-header {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
  }

  .notched-name-tag {
      background: white;
      color: black;
      padding: 0.5rem 1.5rem;
      font-weight: 700;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      clip-path: polygon(
          0 0, 
          calc(100% - 12px) 0, 
          100% 12px, 
          100% 100%, 
          12px 100%, 
          0 calc(100% - 12px)
      );
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .column-content {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      padding: 1rem 0;
  }

  /* Footer centré pour le bouton + */
  .central-footer {
      position: sticky;
      bottom: 0;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 0;
      background: transparent;
      z-index: 50;
  }

  /* Filters Overlay */
  .filters-overlay {
      position: sticky;
      bottom: 80px;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100;
      pointer-events: none;
  }

  .filters-overlay :global(.filters-container) {
      pointer-events: auto;
  }

  .plus-button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: white;
      color: black;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: bold;
      cursor: pointer;
      opacity: 0.9;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 10;
  }

  .plus-button:hover {
      opacity: 1;
      box-shadow: 0 6px 20px rgba(255,255,255,0.2);
      transform: scale(1.05);
  }

  .plus-button.active {
      background: #ff3b30;
      color: white;
      transform: rotate(45deg);
      box-shadow: 0 6px 20px rgba(255, 59, 48, 0.4);
  }

  .plus-button.active:hover {
      transform: rotate(45deg) scale(1.05);
  }

  /* RESTE DU CSS (Grille de cartes, etc.) */
  .player-cards-grid {
      display: flex;
      gap: 1.5rem;
      justify-content: center; 
      flex-wrap: nowrap;
      width: 100%;
      overflow-x: auto;
      align-items: stretch; 
  }

  .player-cards-grid > :global(.player-info-card) { 
      display: flex;
      flex-direction: column; 
      height: 100%; 
      flex: 0 0 350px; 
      width: 350px; 
      max-width: 350px; 
  }

  .scroll-indicator {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      margin-top: 2rem;
      color: white;
      animation: bounce 2s infinite;
      opacity: 0.8;
      display: flex;
      transition: opacity 0.3s;
  }
  
  .scroll-indicator:hover {
      opacity: 1;
  }

  .scroll-indicator svg {
    width: 40px;
    height: 40px;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: -2rem; 
    color: rgba(255, 255, 255, 0.7);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--color-pysport-blue);
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
    background: var(--color-pysport-blue);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-button:hover {
    background: color-mix(in srgb, var(--color-pysport-blue) 80%, white);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .player-analysis-page {
      padding: 1rem;
      gap: 2rem;
      padding-top: 30vh; 
    }
    .player-analysis-page.has-content {
      padding-top: 1rem;
    }
    .page-header {
      padding-top: 0.5rem;
    }
    .player-cards-grid {
      flex-direction: column;
      align-items: center;
    } 
    .analysis-grid {
        grid-template-columns: 1fr !important;
        gap: 2rem;
    }
    .analysis-column {
        border-right: none;
        border-bottom: 1px solid rgba(255,255,255,0.2);
        padding-bottom: 2rem;
    }
  }
</style>