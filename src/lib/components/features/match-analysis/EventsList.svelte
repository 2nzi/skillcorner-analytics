<script lang="ts">
  import { tick } from 'svelte';
  import type { SkillCornerDynamicEvent, SkillCornerMatch } from '$types/skillcorner';
  import { formatTimestamp } from '$lib/utils/timeFormat';
  import { resolvePlayerJerseyNumber } from '$lib/utils/match-analysis';

  interface Props {
    events: SkillCornerDynamicEvent[];
    currentFrame: number;
    matchData?: SkillCornerMatch | null;
    onEventClick?: (event: SkillCornerDynamicEvent) => void;
  }

  let {
    events = [],
    currentFrame,
    matchData = null,
    onEventClick
  }: Props = $props();

  let containerRef: HTMLDivElement;

  // Événement actif basé sur la frame actuelle
  const activeEvent = $derived<SkillCornerDynamicEvent | null>(
    events.find(e => currentFrame >= e.frame_start && currentFrame <= e.frame_end) || null
  );

  // Auto-scroll vers l'événement actif (instantané)
  $effect(() => {
    if (activeEvent && containerRef) {
      tick().then(() => {
        const activeElement = containerRef.querySelector('.active');
        if (activeElement) {
          activeElement.scrollIntoView({
            behavior: 'instant',
            block: 'nearest'
          });
        }
      });
    }
  });
</script>

{#if events.length > 0}
  <div class="events" bind:this={containerRef}>
    {#each events as event (event.index)}
      {@const isActive = activeEvent?.index === event.index}
      <div
        class="event"
        class:active={isActive}
        onclick={() => onEventClick?.(event)}
        onkeydown={(e) => e.key === 'Enter' && onEventClick?.(event)}
        role="button"
        tabindex="0"
      >
        {formatTimestamp(event.time_start)} - {event.event_type}{#if event.event_subtype} ({event.event_subtype}){/if}
        {#if event.player_name}
          {@const playerNumber = resolvePlayerJerseyNumber(event.player_id, matchData)}
          {#if playerNumber != null}
            - #{playerNumber} {event.player_name}
          {:else}
            - {event.player_name}
          {/if}
        {/if}
        {#if event.xthreat != null} - xT:{event.xthreat.toFixed(3)}{/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .events {
    height: calc(100vh - 2rem);
    overflow-y: auto;
    background: #fff;
    border: 1px solid #ddd;
    font-family: monospace;
    font-size: 11px;
  }

  .event {
    padding: 4px 8px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
  }

  .event:hover {
    background: #f5f5f5;
  }

  .event.active {
    background: #3b82f6;
    color: white;
  }

  .events::-webkit-scrollbar {
    width: 4px;
  }

  .events::-webkit-scrollbar-thumb {
    background: #ccc;
  }
</style>
