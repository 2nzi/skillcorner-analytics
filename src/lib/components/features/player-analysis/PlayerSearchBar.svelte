<script lang="ts">
  type Props = {
    players: Array<{
      id: string;
      playerId: string;
      name: string;
      surname: string;
      position: string;
      team?: string;
    }>;
    onSelect: (playerId: string) => void;
  };

  let { players, onSelect }: Props = $props();

  let searchQuery = $state('');
  let showDropdown = $state(false);

  // Filtrer les joueurs selon la recherche
  const filteredPlayers = $derived(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return players
      .filter(p => {
        const fullName = `${p.name} ${p.surname}`.toLowerCase();
        const team = p.team?.toLowerCase() || '';
        return fullName.includes(query) || team.includes(query);
      })
      .slice(0, 8);
  });

  // Afficher le dropdown automatiquement quand on tape
  $effect(() => {
    showDropdown = searchQuery.length > 0 && filteredPlayers().length > 0;
  });

  function handleSelect(playerId: string) {
    const player = players.find(p => p.id === playerId);
    if (player) {
      searchQuery = `${player.name} ${player.surname}`;
      showDropdown = false;
      onSelect(playerId);
    }
  }

  function handleBlur() {
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }
</script>

<div class="search-container">
  <input
    bind:value={searchQuery}
    onblur={handleBlur}
    onfocus={() => showDropdown = searchQuery.length > 0 && filteredPlayers().length > 0}
    type="text"
    placeholder="Search player..."
    class="search-input"
  />

  {#if showDropdown && filteredPlayers().length > 0}
    <div class="dropdown">
      {#each filteredPlayers() as player (player.id)}
        <button
          class="dropdown-item"
          onclick={() => handleSelect(player.id)}
          type="button"
        >
          <div class="player-name">{player.name} {player.surname}</div>
          <div class="player-meta">{player.position}{#if player.team} • {player.team}{/if}</div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    max-width: 400px;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    font-family: inherit;
    outline: none;
    transition: all 0.2s ease;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .search-input:focus {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.08);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background: #1a1a1a;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    overflow: hidden;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    max-height: 300px;
    overflow-y: auto;
  }

  .dropdown-item {
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: white;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .player-name {
    font-size: 0.95rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .player-meta {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
  }
</style>
