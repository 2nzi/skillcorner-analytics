<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  interface Props {
    width?: string;
    height?: string;
    color?: string;
    delay?: number;
  }

  let {
    width = '200px',
    height = '100px',
    color = 'var(--color-primary)',
    delay = 0
  }: Props = $props();
</script>

<div
  class="rectangle"
  style="width: {width}; height: {height}; background: {color};"
  in:fly={{ y: 20, duration: 600, delay, easing: cubicOut }}
>
  <slot />
</div>

<style>
  .rectangle {
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-white);
    font-weight: bold;
    font-size: var(--font-size-xl);
  }
</style>
