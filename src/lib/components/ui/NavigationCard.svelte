<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Snippet } from 'svelte';

  interface Props {
    // Navigation
    href: string;

    // Snippet pour le label (optionnel)
    label?: Snippet;

    // Personnalisation
    variant?: 'primary' | 'secondary' | 'accent';
    notchSize?: string;  // Taille du découpage (ex: "20px", "1.5rem")

    // Animation
    animationDelay?: number;

    // View Transition
    transitionName?: string;
  }

  let {
    href,
    label,
    variant = 'primary',
    notchSize = '20px',
    animationDelay = 0,
    transitionName
  }: Props = $props();
</script>

<a
{href}
class="card card--{variant}"
style="--notch: {notchSize}; {transitionName ? `view-transition-name: ${transitionName};` : ''}"
in:fly={{ y: 30, duration: 600, delay: animationDelay, easing: cubicOut }}
>
<!-- Label texte -->
{#if label}
<div class="label-container">
  {@render label()}
</div>
{/if}
</a>

<style>
  .card {
    /* ✅ Le composant se cale sur le parent (bonne pratique moderne) */
    width: 100%;
    height: 100%;

    /* Layout - centrer le SVG */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);

    /* Effet de bords coupés (notch) - coin haut droit et bas gauche */
    clip-path: polygon(
      0 0,                              /* Coin haut gauche */
      calc(100% - var(--notch)) 0,      /* Haut, avant le découpage */
      100% var(--notch),                /* Coin haut droit découpé */
      100% 100%,                        /* Coin bas droit */
      var(--notch) 100%,                /* Bas, après le découpage */
      0 calc(100% - var(--notch))       /* Coin bas gauche découpé */
    );

    /* Styles visuels intrinsèques au composant */
    /* background: var(--color-bg-primary); */
    /* background: rgba(255,255,255,0.05); */
    background: #D9D9D9;
    text-decoration: none;
    position: relative;

    /* Interactions */
    transition: all var(--transition-base);
    cursor: pointer;
  }

  /* Flèche sous la card (cachée par défaut) */
  .card::after {
    content: '';
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-top: 20px solid #D9D9D9;
    opacity: 0;
    transition: opacity var(--transition-base);
  }

  /* Effet de hover - seulement afficher la flèche */
  .card:hover::after {
    opacity: 1;
  }

  /* Couleurs selon le variant (bordure ou accent subtil) */
  /* .card--primary {
    border: 2px solid var(--color-primary);
  } */

  .card--secondary {
    border: 2px solid var(--color-accent);
  }

  .card--accent {
    border: 2px solid var(--color-skillcorner-green);
  }

  /* Container pour le label texte */
  .label-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 600;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
