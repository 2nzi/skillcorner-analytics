<script lang="ts">
  import WipeTransition, { type TextPart, type AnimationConfig } from '../lib/components/ui/WipeTransition.svelte';
  import NavigationCard from '../lib/components/ui/NavigationCard.svelte';
  import FieldBackground from '../lib/components/ui/FieldBackground.svelte';
  import { hasPlayedIntroAnimation } from '../lib/stores/animation-state.js';
  import skillcornerLogo from '../assets/skillcorner_logo.png';
  import pysportLogo from '../assets/pysport_logo.png';


  // Premier texte : SKILLCORNER
  const firstText: TextPart[] = [
    { text: 'SKILL', color: 'var(--color-white)' },
    { text: 'CORNER', color: 'var(--color-skillcorner-green)' }
  ];

  // Second texte : PySport
  const secondText: TextPart[] = [
    { text: 'Py', color: 'var(--color-white)' },
    { text: 'Sport', color: 'var(--color-pysport-blue)' }
  ];

  // Configuration de l'animation
  const animationConfig: AnimationConfig = {
    duration: 1000,
    pauseDuration: 1500,
    barWidth: '3px'
  };

  // État pour contrôler l'affichage des cartes de navigation
  // Utilise un store pour l'état initial, puis peut être modifié localement
  let showNavigationCards = $state(false);

  // Initialiser depuis le store au chargement
  $effect(() => {
    if ($hasPlayedIntroAnimation) {
      showNavigationCards = true;
    }
  });

  // Callback appelé quand la montée verticale commence
  function handleVerticalMoveStart() {
    showNavigationCards = true;
  }

  // Callback appelé quand l'animation est complète
  function handleAnimationComplete() {
    // Marquer que l'animation a été jouée
    hasPlayedIntroAnimation.set(true);
  }
</script>

<div class="home-container">
  <!-- Terrain de football en perspective -->
  <FieldBackground opacity={0.2} />

  <!-- Overlay gradient de transparent à noir (milieu vers bas) -->
  <div class="gradient-overlay"></div>

  <WipeTransition
    {firstText}
    {secondText}
    leftLogo={skillcornerLogo}
    rightLogo={pysportLogo}
    config={animationConfig}
    skipAnimation={$hasPlayedIntroAnimation}
    onVerticalMoveStart={handleVerticalMoveStart}
    onAnimationComplete={handleAnimationComplete}
  />

  <!-- Cartes de navigation : Collective et Individual -->
  {#if showNavigationCards}
  <div class="navigation-container">
    <NavigationCard href="/match-analysis" transitionName="nav-collective">
      {#snippet label()}
        Collective
      {/snippet}
    </NavigationCard>

    <NavigationCard href="/player-search" transitionName="nav-individual">
      {#snippet label()}
        Individual
      {/snippet}
    </NavigationCard>
  </div>
  {/if}
</div>

<style>
  .home-container {
    width: 100vw;
    height: 100vh;
    background: var(--color-bg-home);
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  /* Overlay gradient de transparent à noir (milieu vers bas) */
  .gradient-overlay {
    position: absolute;
    top: 50%;  /* Commence à la moitié de l'écran */
    left: 0;
    right: 0;
    bottom: 0;  /* Jusqu'en bas */

    /* Gradient de transparent à noir */
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 0, 0, 0.7) 60%,
      rgba(0, 0, 0, 1) 80%
    );

    /* Z-index pour être au-dessus du background mais sous le contenu */
    z-index: 1;
    pointer-events: none;  /* Ne bloque pas les clics */
  }

  /* Container pour les cartes de navigation - 2 cards au lieu de 3 */
  .navigation-container {
    position: absolute;
    bottom: 10%;
    left: 50%;
    transform: translateX(-50%);

    display: flex;
    gap: var(--spacing-xxl);

    width: 80vw;
    max-width: 900px;
    height: 55svh;
  }

  /* Chaque NavigationCard prend 1/2 de l'espace disponible */
  .navigation-container > :global(*) {
    flex: 1;
    min-width: 300px;
  }

  /* Effet de groupe : quand une card est hover, l'autre a un effet glassmorphism */
  .navigation-container:has(:global(a:hover)) > :global(*:not(:hover)) {
    opacity: 0.4;
    backdrop-filter: blur(10px);
  }

  /* Appliquer le background semi-transparent sur la card elle-même */
  .navigation-container:has(:global(a:hover)) > :global(*:not(:hover) a) {
    background: rgba(217, 217, 217, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Responsive : stack sur mobile */
  @media (max-width: 768px) {
    .navigation-container {
      flex-direction: column;
      bottom: 20px;
      gap: var(--spacing-md);
      width: 90vw;
    }
  }
</style>
