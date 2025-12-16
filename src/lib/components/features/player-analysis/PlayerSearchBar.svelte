<script lang="ts">
  import NotchedBox from '$lib/components/ui/NotchedBox.svelte';

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
  let hasSelectedPlayer = $state(false);

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
    console.log('handleSelect called with:', playerId);
    const player = players.find(p => p.id === playerId);
    console.log('Found player in search:', player);
    if (player) {
      searchQuery = '';
      showDropdown = false;
      hasSelectedPlayer = true;
      console.log('Calling onSelect with:', playerId);
      onSelect(playerId);
    }
  }

  function handleBlur() {
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }

  function clearAndFocus() {
    searchQuery = '';
    showDropdown = false;
    hasSelectedPlayer = false;
  }
</script>

<div class="search-container">
  <NotchedBox padding="0" backgroundColor="rgba(255, 255, 255, 0.05)">
    <div class="input-wrapper">
      <input
        bind:value={searchQuery}
        onblur={handleBlur}
        onfocus={() => showDropdown = searchQuery.length > 0 && filteredPlayers().length > 0}
        type="text"
        placeholder={hasSelectedPlayer ? "" : "Search player..."}
        class="search-input"
        class:has-selected={hasSelectedPlayer}
      />
      {#if hasSelectedPlayer && !searchQuery}
        <div class="custom-placeholder">
          Search <span class="neon-text">new</span> player...
        </div>
      {/if}
    </div>
  </NotchedBox>

  {#if showDropdown && filteredPlayers().length > 0}
    <NotchedBox padding="0" backgroundColor="#1a1a1a" borderColor="rgba(255, 255, 255, 0.2)" class="dropdown-box">
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
    </NotchedBox>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .search-container :global(.notched-box-border) {
    width: 100%;
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: black;
    font-size: 1rem;
    font-family: inherit;
    outline: none;
  }

  .search-input[readonly] {
    cursor: default;
  }

  .search-input::placeholder {
    color: rgba(0, 0, 0, 0.5);
  }

  .input-wrapper {
    position: relative;
    width: 100%;
  }

  .custom-placeholder {
    position: absolute;
    top: 50%;
    left: 1rem;
    transform: translateY(-50%);
    color: rgba(0, 0, 0, 0.5);
    font-size: 1rem;
    pointer-events: none;
    user-select: none;
  }

  .new-search-button {
    position: absolute;
    top: 50%;
    left: 1rem;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: black;
    font-size: 1rem;
    font-family: inherit;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    z-index: 10;
  }

  .neon-text {
    color: #000000;
    text-shadow:
      0 0 5px #000000,
      0 0 10px #000000,
      0 0 20px #000000,
      0 0 40px #000000;
    animation: neon-glow 0.9s ease-in-out infinite alternate;
  }

  @keyframes neon-glow {
    from {
      text-shadow:
        0 0 5px #000000,
        0 0 10px #000000,
        0 0 20px #000000,
        0 0 40px #000000;
    }
    to {
      text-shadow:
        0 0 10px #000000,
        0 0 20px #000000,
        0 0 30px #000000,
        0 0 50px #000000,
        0 0 60px #000000;
    }
  }

  .search-container :global(.dropdown-box) {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    z-index: 1000;
    width: 100%;
  }

  .dropdown {
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
