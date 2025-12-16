<script lang="ts">
  import PlayerSearchBar from '$lib/components/features/player-analysis/PlayerSearchBar.svelte';
  import PlayerInfoCard from '$lib/components/features/player-analysis/PlayerInfoCard.svelte';
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
  const MAX_PLAYERS = 3;

  // Charger les joueurs depuis l'API
  async function loadPlayers() {
    try {
      loading = true;
      error = null;

      const response = await fetch('/api/players/aggregates');
      if (!response.ok) {
        throw new Error('Failed to load players');
      }

      const data = await response.json();

      // Mapper team_name vers team pour compatibilité
      players = data.map((p: any) => ({
        ...p,
        team: p.team_name
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
      // Vérifier si le joueur n'est pas déjà sélectionné
      if (!selectedPlayers.find(p => p.id === playerId)) {
        selectedPlayers = [...selectedPlayers, player];
      }
    }
  }

  function handleRemovePlayer(playerId: string) {
    selectedPlayers = selectedPlayers.filter(p => p.id !== playerId);
  }

  onMount(() => {
    loadPlayers();
  });
</script>

<div class="player-analysis-page">
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
        <p class="error-message">� {error}</p>
        <button onclick={loadPlayers} class="retry-button">Retry</button>
      </div>
    {:else if selectedPlayers.length > 0}
      <div class="player-cards-grid">
        {#each selectedPlayers as player (player.id)}
          <PlayerInfoCard {player} onRemove={() => handleRemovePlayer(player.id)} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .player-analysis-page {
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    gap: 2.5rem;
  }

  .page-header {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  .page-content {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    flex: 0 0 auto;
  }

  .player-cards-grid {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    align-items: flex-start;
    flex-wrap: wrap;
    width: 100%;
    max-width: 1400px;
  }

  /* Loading state */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 4rem 2rem;
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
    to {
      transform: rotate(360deg);
    }
  }

  /* Error state */
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

  /* Responsive */
  @media (max-width: 768px) {
    .player-analysis-page {
      padding: 1rem;
      gap: 2rem;
    }

    .page-header {
      padding-top: 0.5rem;
    }

    .player-cards-grid {
      flex-direction: column;
      align-items: center;
    }
  }
</style>
