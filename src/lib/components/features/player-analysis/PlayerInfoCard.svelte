<script lang="ts">
  import NotchedBox from '$lib/components/ui/NotchedBox.svelte';

  type Props = {
    player?: {
      id: string;
      playerId: string;
      name: string;
      surname: string;
      age: number;
      position: string;
      team?: string;
      rawValues: Record<string, number>;
    } | null;
  };

  let { player }: Props = $props();

  // Debug log
  $effect(() => {
    console.log('PlayerInfoCard received player:', player);
  });

  // Stats clés à afficher
  const keyStats = $derived(() => {
    if (!player) return [];

    return [
      {
        label: 'Matches',
        value: player.rawValues['Minutes'] ? Math.round(player.rawValues['Minutes'] / 90) : 0,
        unit: ''
      },
      {
        label: 'Minutes',
        value: player.rawValues['Minutes'] || 0,
        unit: 'min'
      },
      {
        label: 'Distance',
        value: player.rawValues['Total distance']
          ? (player.rawValues['Total distance'] / 1000).toFixed(1)
          : 0,
        unit: 'km'
      },
      {
        label: 'Top Speed',
        value: player.rawValues['PSV99'] || 0,
        unit: 'km/h'
      }
    ];
  });
</script>

{#if player}
  <NotchedBox>
    <div class="player-card">
      <!-- Photo placeholder -->
      <div class="photo-placeholder">
        <div class="initials">{player.name[0]}{player.surname[0]}</div>
      </div>

      <!-- Infos principales -->
      <div class="player-identity">
        <h2 class="player-name">{player.name} {player.surname}</h2>
        <div class="player-meta">
          <span class="position">{player.position}</span>
          <span class="separator">•</span>
          <span class="age">{player.age} years</span>
          {#if player.team}
            <span class="separator">•</span>
            <span class="team">{player.team}</span>
          {/if}
        </div>
      </div>

      <!-- Stats clés -->
      <div class="stats-grid">
        {#each keyStats() as stat}
          <div class="stat-card">
            <div class="stat-value">{stat.value}{#if stat.unit}<span class="unit">{stat.unit}</span>{/if}</div>
            <div class="stat-label">{stat.label}</div>
          </div>
        {/each}
      </div>
    </div>
  </NotchedBox>
{:else}
  <NotchedBox>
    <div class="player-card empty">
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-message">Select a player to view their profile</p>
      </div>
    </div>
  </NotchedBox>
{/if}

<style>
  .player-card {
    padding: 1rem;
    min-height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin: 0 auto;
    max-width: 400px;
  }

  .player-card.empty {
    justify-content: center;
  }

  /* Photo placeholder */
  .photo-placeholder {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  .initials {
    font-size: 1.4rem;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.8);
    letter-spacing: 0.05em;
  }

  /* Identité joueur */
  .player-identity {
    text-align: center;
  }

  .player-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: black;
    margin: 0 0 0.25rem 0;
    letter-spacing: 0.02em;
  }

  .player-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: rgba(0, 0, 0, 0.7);
  }

  .separator {
    color: rgba(0, 0, 0, 0.4);
  }

  .position {
    font-weight: 600;
    color: #1e40af;
  }

  /* Stats grid */
  .stats-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem;
    border-radius: 8px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: black;
    margin-bottom: 0.2rem;
  }

  .unit {
    font-size: 0.7rem;
    font-weight: 400;
    color: rgba(0, 0, 0, 0.6);
    margin-left: 0.25rem;
  }

  .stat-label {
    font-size: 0.7rem;
    color: rgba(0, 0, 0, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .empty-icon {
    font-size: 4rem;
    opacity: 0.3;
  }

  .empty-message {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .player-card {
      padding: 1.5rem;
      min-height: 350px;
    }

    .photo-placeholder {
      width: 100px;
      height: 100px;
    }

    .initials {
      font-size: 2rem;
    }

    .player-name {
      font-size: 1.5rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
