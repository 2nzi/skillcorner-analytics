<script lang="ts">
  import { onMount } from 'svelte';

  export interface TextPart {
    text: string;
    color: string;
  }

  export interface AnimationConfig {
    duration?: number;
    pauseDuration?: number;
    barWidth?: string;
    barGap?: number;
    wipeDelay?: number;
    revealDelay?: number;
    verticalMoveDuration?: number;
  }

  interface Props {
    // Contenu de l'animation
    firstText: TextPart[];
    secondText: TextPart[];
    leftLogo: string;
    rightLogo: string;

    // Configuration de l'animation
    config?: AnimationConfig;

    // Skip l'animation et aller directement à l'état final
    skipAnimation?: boolean;

    // Callbacks pour synchroniser avec d'autres animations
    onAnimationStart?: () => void;
    onVerticalMoveStart?: () => void;
    onAnimationComplete?: () => void;
  }

  // Valeurs par défaut de la configuration
  const DEFAULT_CONFIG: Required<AnimationConfig> = {
    duration: 1000,
    pauseDuration: 500,
    barWidth: '2px',
    barGap: 15,
    wipeDelay: 20,
    revealDelay: 120,
    verticalMoveDuration: 300
  };

  let {
    firstText,
    secondText,
    leftLogo,
    rightLogo,
    config = {},
    skipAnimation = false,
    onAnimationStart,
    onVerticalMoveStart,
    onAnimationComplete
  }: Props = $props();

  // Merge de la config fournie avec les valeurs par défaut
  const {
    duration,
    pauseDuration,
    barWidth,
    barGap,
    wipeDelay,
    revealDelay,
    verticalMoveDuration
  } = { ...DEFAULT_CONFIG, ...config };

  // États pour les animations de clip-path
  let clipRightPercentage = $state(0);   // 0-100: masquage du premier texte (SKILLCORNER)
  let clipLeftPercentage = $state(100);  // 100-0: révélation du second texte (PySport)
  let clipLeftWipePercentage = $state(0); // 0-100: effacement du second texte de gauche à droite
  let clipLeftLogoPercentage = $state(100);   // 100-0: révélation du logo de gauche
  let clipRightLogoPercentage = $state(100);  // 100-0: révélation du logo de droite
  let barPositionX = $state(0);          // Position X de la barre en pixels
  let verticalPosition = $state(50);     // Position verticale en vh (50 = centré)

  // Références aux éléments DOM
  let firstTextElement = $state<HTMLElement>(undefined!);
  let secondTextElement = $state<HTMLElement>(undefined!);
  let leftLogoElement = $state<HTMLElement>(undefined!);
  let rightLogoElement = $state<HTMLElement>(undefined!);

  // Dimensions mesurées
  let firstTextWidth = 0;
  let secondTextWidth = 0;
  let leftLogoWidth = 0;
  let rightLogoWidth = 0;

  // Tracking des timeouts et animations pour cleanup
  let timeoutIds: number[] = [];
  let animationFrameId: number | null = null;

  /**
   * Utilitaire pour créer un délai avec Promise (pour async/await)
   */
  function delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const id = setTimeout(resolve, ms) as unknown as number;
      timeoutIds.push(id);
    });
  }

  /**
   * Skip l'animation et aller directement à l'état final
   * (utilisé quand l'utilisateur revient sur la page)
   */
  function skipToFinalState() {
    // Mettre tous les états à leur valeur finale
    clipRightPercentage = 100;        // Premier texte complètement masqué
    clipLeftPercentage = 100;          // Second texte non visible
    clipLeftWipePercentage = 100;      // Second texte complètement effacé
    clipLeftLogoPercentage = 0;        // Logo gauche complètement révélé
    clipRightLogoPercentage = 0;       // Logo droit complètement révélé
    barPositionX = 0;                  // Barre au centre
    verticalPosition = 10;             // Position finale en haut

    // Appeler tous les callbacks immédiatement
    onAnimationStart?.();
    onVerticalMoveStart?.();
    onAnimationComplete?.();
  }

  onMount(() => {
    measureTextWidths();
    initializeBarPosition();

    // Si skipAnimation est true, aller directement à l'état final
    if (skipAnimation) {
      skipToFinalState();
    } else {
      startAnimationSequence();
    }

    // Cleanup : annuler tous les timeouts et animations quand le composant est détruit
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  });

  /**
   * Mesure la largeur des deux textes et des logos
   */
  function measureTextWidths() {
    if (firstTextElement) {
      firstTextWidth = firstTextElement.offsetWidth;
    }
    if (secondTextElement) {
      secondTextWidth = secondTextElement.offsetWidth;
    }
    if (leftLogoElement) {
      leftLogoWidth = leftLogoElement.offsetWidth;
    }
    if (rightLogoElement) {
      rightLogoWidth = rightLogoElement.offsetWidth;
    }
  }

  /**
   * Positionne la barre à droite du premier texte
   */
  function initializeBarPosition() {
    barPositionX = (firstTextWidth / 2) + barGap;
  }

  /**
   * Démarre la séquence d'animations avec les délais appropriés
   * Utilise async/await pour une meilleure lisibilité
   */
  async function startAnimationSequence() {
    // 🔔 Notifier le début de l'animation
    onAnimationStart?.();

    // 1. Effacer le premier texte
    animateFirstTextWipe();

    // 2. Animer la barre après un court délai
    await delay(wipeDelay);
    animateBar();

    // 3. Révéler le second texte
    await delay(revealDelay);
    animateSecondTextReveal();

    // 4. Attendre que la révélation soit complète
    await delay(duration);

    // 5. Effacer le second texte et ramener la barre au centre (en parallèle)
    animateSecondTextWipe();
    animateBarReturn();

    // 6. Révéler le logo de gauche (immédiatement)
    animateLeftLogoReveal();

    // 7. Révéler le logo de droite (légèrement après)
    await delay(duration / 3);
    animateRightLogoReveal();

    // 8. Une fois les deux logos révélés, remonter verticalement
    await delay(duration);

    // 🔔 Notifier le début de la montée verticale (AVANT de démarrer l'animation)
    onVerticalMoveStart?.();

    animateVerticalMove();

    // 9. Attendre la fin de la montée verticale
    await delay(verticalMoveDuration);

    // 🔔 Notifier la fin de toute l'animation
    onAnimationComplete?.();
  }

  /**
   * Fonction d'easing cubic pour des transitions fluides
   */
  function easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Fonction d'easing out expo pour une transition très fluide et rapide
   */
  function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /**
   * Crée une animation générique avec requestAnimationFrame
   * Retourne l'ID de l'animation pour permettre le cleanup
   */
  function createAnimation(updateFn: (progress: number) => void, animationDuration: number = duration, easingFn = easeInOutCubic) {
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easedProgress = easingFn(progress);

      updateFn(easedProgress);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        animationFrameId = null;
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Anime l'effacement du premier texte de droite à gauche
   */
  function animateFirstTextWipe() {
    createAnimation((progress) => {
      clipRightPercentage = progress * 100;
    });
  }

  /**
   * Anime la révélation du second texte de gauche à droite
   */
  function animateSecondTextReveal() {
    createAnimation((progress) => {
      clipLeftPercentage = 100 - (progress * 100);
    });
  }

  /**
   * Anime la barre du bord droit du premier texte au bord gauche du second
   */
  function animateBar() {
    const startPos = (firstTextWidth / 2) + barGap;
    const endPos = -(secondTextWidth / 2) - barGap;
    const distance = startPos - endPos;

    createAnimation((progress) => {
      barPositionX = startPos - (progress * distance);
    });
  }

  /**
   * Anime l'effacement du second texte (PySport) de gauche à droite
   */
  function animateSecondTextWipe() {
    createAnimation((progress) => {
      clipLeftWipePercentage = progress * 100;
    });
  }

  /**
   * Anime le retour de la barre vers le centre de l'écran
   */
  function animateBarReturn() {
    const startPos = -(secondTextWidth / 2) - barGap; // Gauche de PySport
    const endPos = 0;    // Centre de l'écran
    const distance = endPos - startPos;

    createAnimation((progress) => {
      barPositionX = startPos + (progress * distance);
    });
  }

  /**
   * Anime la révélation du logo de gauche (de droite à gauche)
   */
  function animateLeftLogoReveal() {
    createAnimation((progress) => {
      clipLeftLogoPercentage = 100 - (progress * 100);
    });
  }

  /**
   * Anime la révélation du logo de droite (de gauche à droite)
   */
  function animateRightLogoReveal() {
    createAnimation((progress) => {
      clipRightLogoPercentage = 100 - (progress * 100);
    });
  }

  /**
   * Anime le déplacement vertical de l'ensemble vers 10vh
   */
  function animateVerticalMove() {
    createAnimation((progress) => {
      verticalPosition = 50 - (progress * 40); // De 50vh à 10vh
    }, verticalMoveDuration, easeOutExpo);
  }
</script>

<div class="wipe-container">
  <div class="text-with-bar" style="top: {verticalPosition}vh;">
    <div class="text-wrapper">
      <!-- Premier texte : s'efface de droite à gauche -->
      <span
        bind:this={firstTextElement}
        class="text-content text-first"
        style="clip-path: inset(0 {clipRightPercentage}% 0 0);"
      >
        {#each firstText as part}
          <span style="color: {part.color};">{part.text}</span>
        {/each}
      </span>

      <!-- Second texte : se révèle de gauche à droite puis s'efface -->
      <span
        bind:this={secondTextElement}
        class="text-content text-second"
        style="clip-path: inset(0 0 0 {Math.max(clipLeftPercentage, clipLeftWipePercentage)}%);"
      >
        {#each secondText as part}
          <span style="color: {part.color};">{part.text}</span>
        {/each}
      </span>

      <!-- Logo de gauche : se révèle de gauche à droite (effet rideau) -->
      <img
        bind:this={leftLogoElement}
        src={leftLogo}
        alt="Logo gauche"
        class="logo-content logo-left"
        style="clip-path: inset(0 {clipLeftLogoPercentage}% 0 0);"
      />

      <!-- Logo de droite : se révèle de droite à gauche (effet rideau) -->
      <img
        bind:this={rightLogoElement}
        src={rightLogo}
        alt="Logo droit"
        class="logo-content logo-right"
        style="clip-path: inset(0 {clipRightLogoPercentage}% 0 0);"
      />

      <!-- Barre de transition animée -->
      <span
        class="bar-wrapper"
        style="transform: translateY(-50%) translateX({barPositionX}px);"
      >
        <span class="vertical-bar" style="width: {barWidth};"></span>
      </span>
    </div>
  </div>
</div>

<style>
  .wipe-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .text-with-bar {
    display: flex;
    align-items: center;
    position: absolute;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
  }

  .text-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 120px;
  }

  .text-content {
    font-size: 4rem;
    font-weight: bold;
    user-select: none;
    position: absolute;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
  }

  .text-content span {
    display: inline;
  }

  .text-first {
    z-index: 2;
  }

  .text-second {
    z-index: 1;
  }

  .bar-wrapper {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translateY(-50%);
    z-index: 100;
  }

  .vertical-bar {
    display: inline-block;
    height: 5em;
    background: #ffffff;
    border-radius: 10px;
    vertical-align: middle;
  }

  .logo-content {
    position: absolute;
    max-height: 100px;
    object-fit: contain;
    z-index: 1;
  }

  .logo-left {
    right: 50%;
    margin-right: 15px;
  }

  .logo-right {
    left: 50%;
    margin-left: 15px;
  }
</style>
