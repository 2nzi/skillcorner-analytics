<script lang="ts">
  import type { SkillCornerDynamicEvent, SkillCornerMatch } from '$types/skillcorner';
  import { formatTimestamp } from '$lib/utils/timeFormat';

  interface Props {
    events: SkillCornerDynamicEvent[];
    currentFrame: number;
    matchData?: SkillCornerMatch | null;
    onEventClick?: (event: SkillCornerDynamicEvent) => void;
  }

  let {
    events = [],
    currentFrame,
    onEventClick
  }: Props = $props();

  let containerRef: HTMLDivElement;

  // Trier les événements par index (calculé une seule fois)
  const sortedEvents = $derived.by(() => {
    if (events.length === 0) return [];
    return [...events].sort((a, b) => a.index - b.index);
  });

  // Événements actifs (qui se déroulent à la frame actuelle)
  const activeEventIds = $derived.by(() => {
    const ids = new Set<string>();
    for (const e of events) {
      if (currentFrame >= e.frame_start && currentFrame <= e.frame_end) {
        ids.add(e.event_id);
      }
    }
    return ids;
  });

  // Couleurs par type d'événement - Nuances de vert cohérentes avec le site
  const EVENT_COLORS: Record<string, string> = {
    'player_possession': '#3FFE69',      // Vert principal du site
    'passing_option': '#2dd45d',         // Vert moyen
    'off_ball_run': '#1fb04f',           // Vert foncé
    'pressing_action': '#16a34a',        // Vert très foncé
    'default': '#4ade80'                 // Vert clair par défaut
  };

  function getEventColor(eventType: string): string {
    return EVENT_COLORS[eventType] || EVENT_COLORS.default;
  }

  // Auto-scroll désactivé pendant le playback pour les performances
  // Réactivé uniquement lors d'un clic sur un event
  let previousActiveEventId: string | null = null;

  $effect(() => {
    if (containerRef && activeEventIds.size > 0) {
      const activeEventId = Array.from(activeEventIds)[0];
      // Ne scroll que si l'événement actif a changé (pas à chaque frame)
      if (activeEventId !== previousActiveEventId) {
        previousActiveEventId = activeEventId;
        const activeElement = containerRef.querySelector(`[data-event-id="${activeEventId}"]`);
        if (activeElement) {
          // Utiliser 'auto' au lieu de 'smooth' pour éviter l'animation coûteuse
          activeElement.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }
    }
  });
</script>

{#if events.length > 0}
  <div class="events-list-container" bind:this={containerRef}>
    {#each sortedEvents as evt (evt.event_id)}
      {@const isActive = activeEventIds.has(evt.event_id)}
      {@const color = getEventColor(evt.event_type)}

      <button
        class="event-item"
        class:active={isActive}
        data-event-id={evt.event_id}
        style="background-color: {color};"
        onclick={() => onEventClick?.(evt)}
      >
        <div class="event-header">
          <span class="event-time">{formatTimestamp(evt.time_start)}</span>
          <span class="event-index">#{evt.index}</span>
        </div>
        <div class="event-type">{evt.event_type}</div>
        {#if evt.player_name}
          <div class="event-player">{evt.player_name}</div>
        {/if}
        {#if evt.team_shortname}
          <div class="event-team">{evt.team_shortname}</div>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .events-list-container {
    height: calc(100vh - 2rem);
    overflow-y: auto;
    background: #f5f5f5;
    padding: 2rem 0.5rem;
  }

  .event-item {
    width: 100%;
    border: none;
    margin-bottom: 0.5rem;
    padding: 0.75rem 1rem;
    text-align: left;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: white;
    position: relative;
    opacity: 0.85;
    will-change: opacity, transform;
    /* Forme avec angles coupés (notched) comme les contrôles de playback */
    clip-path: polygon(
      10px 0,
      100% 0,
      100% calc(100% - 10px),
      calc(100% - 10px) 100%,
      0 100%,
      0 10px
    );
  }

  .event-item:hover {
    opacity: 1;
    transform: translateX(6px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .event-item.active {
    opacity: 1;
    border: 2px solid #000000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    transform: translateX(8px);
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .event-time {
    font-weight: 700;
    font-size: 0.85rem;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .event-index {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 700;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
  }

  .event-type {
    font-weight: 700;
    font-size: 0.95rem;
    text-transform: uppercase;
    color: white;
    margin-bottom: 0.2rem;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .event-player {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  .event-team {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
  }

  .events-list-container::-webkit-scrollbar {
    width: 8px;
  }

  .events-list-container::-webkit-scrollbar-track {
    background: #e0e0e0;
  }

  .events-list-container::-webkit-scrollbar-thumb {
    background: #c0c0c0;
    border-radius: 4px;
  }

  .events-list-container::-webkit-scrollbar-thumb:hover {
    background: #a0a0a0;
  }
</style>
