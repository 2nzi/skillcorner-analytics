<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Composant réutilisable pour créer des boîtes avec coins coupés à 45°
   * Supporte différentes configurations : border, fond, taille des coins, etc.
   */

  export interface NotchedCorners {
    topLeft?: boolean;
    topRight?: boolean;
    bottomRight?: boolean;
    bottomLeft?: boolean;
  }

  interface Props {
    // Taille du coin coupé en pixels
    notchSize?: number;

    // Contrôle des coins coupés (par défaut: topRight et bottomLeft)
    notchedCorners?: NotchedCorners;

    // Couleur et épaisseur du border
    borderColor?: string;
    borderWidth?: number;
    hasBorder?: boolean;

    // Couleur de fond
    backgroundColor?: string;

    // Padding interne
    padding?: string;

    // Classes CSS supplémentaires
    class?: string;

    // Événements
    onclick?: (e: MouseEvent) => void;
    onmouseenter?: (e: MouseEvent) => void;
    onmouseleave?: (e: MouseEvent) => void;

    // Children (Svelte 5 snippet)
    children?: Snippet;
  }

  let {
    notchSize = 16,
    notchedCorners = { topRight: true, bottomLeft: true },
    borderColor = 'white',
    borderWidth = 2,
    hasBorder = true,
    backgroundColor = 'transparent',
    padding = '1rem 1.5rem',
    class: className = '',
    onclick,
    onmouseenter,
    onmouseleave,
    children
  }: Props = $props();

  // Générer le clip-path dynamiquement en fonction des coins coupés
  const clipPath = $derived.by(() => {
    const { topLeft, topRight, bottomRight, bottomLeft } = notchedCorners;

    // Points du polygone pour les coins coupés (sens horaire depuis top-left)
    const points: string[] = [];

    // Coin haut-gauche
    if (topLeft) {
      points.push(`${notchSize}px 0`);
      points.push(`0 ${notchSize}px`);
    } else {
      points.push('0 0');
    }

    // Côté gauche vers coin haut-droit
    if (!topRight) {
      points.push('100% 0');
    } else {
      points.push(`calc(100% - ${notchSize}px) 0`);
      points.push(`100% ${notchSize}px`);
    }

    // Côté droit vers coin bas-droit
    if (!bottomRight) {
      points.push('100% 100%');
    } else {
      points.push(`100% calc(100% - ${notchSize}px)`);
      points.push(`calc(100% - ${notchSize}px) 100%`);
    }

    // Côté bas vers coin bas-gauche
    if (!bottomLeft) {
      points.push('0 100%');
    } else {
      points.push(`${notchSize}px 100%`);
      points.push(`0 calc(100% - ${notchSize}px)`);
    }

    return `polygon(${points.join(', ')})`;
  });
</script>

{#if hasBorder}
  <!-- Version avec border : double conteneur -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="notched-box-border {className}"
    style="
      background: {borderColor};
      padding: {borderWidth}px;
      clip-path: {clipPath};
    "
    {onclick}
    {onmouseenter}
    {onmouseleave}
    role={onclick ? 'button' : undefined}
    tabindex={onclick ? 0 : undefined}
  >
    <div
      class="notched-box-inner"
      style="
        background: {backgroundColor};
        padding: {padding};
        clip-path: {clipPath};
      "
    >
      {@render children?.()}
    </div>
  </div>
{:else}
  <!-- Version sans border : simple conteneur -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="notched-box-simple {className}"
    style="
      background: {backgroundColor};
      padding: {padding};
      clip-path: {clipPath};
    "
    {onclick}
    {onmouseenter}
    {onmouseleave}
    role={onclick ? 'button' : undefined}
    tabindex={onclick ? 0 : undefined}
  >
    {@render children?.()}
  </div>
{/if}

<style>
  .notched-box-border,
  .notched-box-simple {
    display: inline-block;
    box-sizing: border-box;
  }

  .notched-box-inner {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }

  .notched-box-simple {
    width: 100%;
  }

  /* Styles de base pour l'interactivité */
  [role="button"] {
    cursor: pointer;
    transition: transform 0.2s ease;
  }

</style>
