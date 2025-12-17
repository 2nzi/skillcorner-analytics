<script lang="ts">
  import NotchedBox from '../../ui/NotchedBox.svelte';

  /**
   * Interface générique pour une équipe
   * Peut être utilisée avec n'importe quelle source de données
   */
  export interface Team {
    id: string | number;  // Flexible: string ou number
    name: string;
    logoUrl: string;      // URL complète du logo (laisse la gestion au parent)
    opponents?: (string | number)[]; // IDs des équipes contre qui cette équipe a joué
  }

  interface Props {
    // Équipes actuellement sélectionnées
    homeTeam: Team | null;
    awayTeam: Team | null;

    // Liste des équipes disponibles pour la sélection (optionnel pour l'instant)
    availableTeams?: Team[];

    // Callbacks pour notifier les changements de sélection
    onHomeTeamChange?: (team: Team | null) => void;
    onAwayTeamChange?: (team: Team | null) => void;
    onClear?: () => void; // Callback pour effacer toutes les sélections
  }

  let {
    homeTeam = null,
    awayTeam = null,
    availableTeams = [],
    onHomeTeamChange,
    onAwayTeamChange,
    onClear
  }: Props = $props();

  // États pour gérer l'ouverture du dropdown
  let isHovering = $state(false);   // Hover temporaire
  let isPinned = $state(false);     // Épinglé par un clic
  let activeTeam = $state<'home' | 'away' | null>(null); // Équipe actuellement hover/sélectionnée

  // État pour le carousel
  let carouselIndex = $state(0); // Index de départ pour afficher 3 équipes
  const VISIBLE_TEAMS = 3; // Nombre d'équipes visibles à la fois

  // Le dropdown est visible si hovering OU pinned
  const showDropdown = $derived(isHovering || isPinned);

  // Au moins une équipe est sélectionnée
  const hasSelection = $derived(homeTeam !== null || awayTeam !== null);

  // Équipes filtrées selon l'équipe active et l'équipe déjà sélectionnée
  const filteredTeams = $derived.by(() => {
    if (!activeTeam) return availableTeams;

    // Déterminer l'équipe déjà sélectionnée (opposée à activeTeam)
    const selectedTeam = activeTeam === 'home' ? awayTeam : homeTeam;

    // Si aucune équipe n'est sélectionnée de l'autre côté, montrer toutes les équipes
    if (!selectedTeam) return availableTeams;

    // Si une équipe est sélectionnée, filtrer pour ne montrer que les équipes qui ont joué contre elle
    return availableTeams.filter(team => {
      // Ne pas montrer l'équipe déjà sélectionnée
      if (team.id === selectedTeam.id) return false;

      // Si l'équipe sélectionnée a une liste d'opponents, filtrer par ça
      if (selectedTeam.opponents && selectedTeam.opponents.length > 0) {
        return selectedTeam.opponents.includes(team.id);
      }

      // Si l'équipe courante a une liste d'opponents, vérifier si elle contient l'équipe sélectionnée
      if (team.opponents && team.opponents.length > 0) {
        return team.opponents.includes(selectedTeam.id);
      }

      // Par défaut, montrer l'équipe
      return true;
    });
  });

  // Équipes visibles dans le carousel (basé sur filteredTeams)
  const visibleTeams = $derived(
    filteredTeams.slice(carouselIndex, carouselIndex + VISIBLE_TEAMS)
  );

  // Peut naviguer vers la gauche/droite
  const canNavigateLeft = $derived(carouselIndex > 0);
  const canNavigateRight = $derived(carouselIndex + VISIBLE_TEAMS < filteredTeams.length);

  // Référence au wrapper pour détecter les clics en dehors
  let wrapperRef = $state<HTMLDivElement>();

  // Sélection d'une équipe
  function selectTeam(team: Team) {
    if (activeTeam === 'home') {
      onHomeTeamChange?.(team);
    } else if (activeTeam === 'away') {
      onAwayTeamChange?.(team);
    }
    isPinned = false; // Ferme le dropdown après sélection
  }

  // Navigation du carousel
  function navigateLeft() {
    if (canNavigateLeft) {
      carouselIndex = Math.max(0, carouselIndex - 1);
    }
  }

  function navigateRight() {
    if (canNavigateRight) {
      carouselIndex = Math.min(filteredTeams.length - VISIBLE_TEAMS, carouselIndex + 1);
    }
  }

  // Réinitialiser le carouselIndex quand les filteredTeams changent
  $effect(() => {
    carouselIndex = 0;
  });

  // Gestion du clic sur le TeamSelector : épingler/dépingler
  function handleClick() {
    isPinned = !isPinned;
  }

  // Gestion du clic sur le bouton clear
  function handleClear(event: MouseEvent) {
    event.stopPropagation(); // Empêche de déclencher le toggle du dropdown
    onClear?.();
  }

  // Gestion du clic en dehors
  function handleClickOutside(event: MouseEvent) {
    if (isPinned && wrapperRef && !wrapperRef.contains(event.target as Node)) {
      isPinned = false;
    }
  }

  // Gestion du clavier pour le trigger
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  // Ajouter/retirer le listener de clic global
  $effect(() => {
    if (isPinned) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div
  class="team-selector-wrapper"
  bind:this={wrapperRef}
  onmouseleave={() => { if (!isPinned) activeTeam = null; }}
  role="region"
  aria-label="Sélecteur d'équipes"
>
  <!-- Bouton clear : visible si au moins une équipe est sélectionnée -->
  {#if hasSelection}
    <button
      class="clear-button"
      onclick={handleClear}
      aria-label="Effacer la sélection"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  {/if}

  <!-- Sélecteur principal -->
  <!-- NotchedBox principale : contrôle l'ouverture du dropdown -->
  <div
    class="team-selector-trigger"
    onmouseenter={() => isHovering = true}
    onmouseleave={() => isHovering = false}
    onclick={handleClick}
    onkeydown={handleKeyDown}
    role="button"
    tabindex="0"
    aria-label="Ouvrir le sélecteur d'équipes"
  >
    <NotchedBox backgroundColor="var(--color-bg-home)">
      <div class="team-selector-content">
        <!-- Rectangle gauche invisible : 50% gauche -->
        <div
          class="team-zone team-zone-left"
          onmouseenter={() => activeTeam = 'home'}
          aria-hidden="true"
        ></div>

        <!-- Rectangle droit invisible : 50% droit -->
        <div
          class="team-zone team-zone-right"
          onmouseenter={() => activeTeam = 'away'}
          aria-hidden="true"
        ></div>

        <!-- Contenu visible par-dessus -->
        <div class="team-content-overlay">
          <div class="team-logo-container">
            {#if homeTeam}
              <img src={homeTeam.logoUrl} alt={homeTeam.name} class="team-logo" />
            {:else}
              <div class="placeholder-line"></div>
            {/if}
          </div>

          <span class="vs-text">Vs</span>

          <div class="team-logo-container">
            {#if awayTeam}
              <img src={awayTeam.logoUrl} alt={awayTeam.name} class="team-logo" />
            {:else}
              <div class="placeholder-line"></div>
            {/if}
          </div>
        </div>
      </div>
    </NotchedBox>
  </div>

  <!-- Indicateur polygonal pour l'équipe active -->
  {#if showDropdown && activeTeam}
    <div class="team-indicator team-indicator-{activeTeam}"></div>
  {/if}

  <!-- Dropdown : même taille et même style, collé en dessous -->
  {#if showDropdown}
    <NotchedBox
      class="team-dropdown"
      backgroundColor="white"
      notchedCorners={{ bottomLeft: true }}
      padding="0"
      onmouseenter={() => isHovering = true}
      onmouseleave={() => isHovering = false}
    >
      <div class="dropdown-content">
        <!-- Flèche gauche -->
        <button
          class="nav-arrow nav-arrow-left"
          onclick={navigateLeft}
          disabled={!canNavigateLeft}
          aria-label="Équipe précédente"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Logos des équipes -->
        <div class="teams-container">
          {#each visibleTeams as team (team.id)}
            <button
              class="team-card"
              onclick={() => selectTeam(team)}
            >
              <img src={team.logoUrl} alt={team.name} class="team-card-logo" />
            </button>
          {/each}
        </div>

        <!-- Flèche droite -->
        <button
          class="nav-arrow nav-arrow-right"
          onclick={navigateRight}
          disabled={!canNavigateRight}
          aria-label="Équipe suivante"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </NotchedBox>
  {/if}
</div>

<style>
  /* Wrapper pour positionner le dropdown */
  .team-selector-wrapper {
    position: relative;
    display: inline-block;
  }

  /* Bouton clear : coin haut-gauche */
  .clear-button {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: white;
    transition: opacity 0.2s ease;
    padding: 0;
  }

  .clear-button:hover {
    opacity: 0.7;
  }

  /* Trigger : gère l'ouverture du dropdown */
  .team-selector-trigger {
    cursor: pointer;
  }

  /* Dropdown : vraiment collé en dessous, même taille */
  .team-selector-wrapper :global(.team-dropdown) {
    position: absolute;
    top: calc(100% - 2px); /* Compense le border-width pour coller */
    left: 0;
    right: 0;
    animation: slideDown 0.2s ease-out;
  }

  .team-selector-wrapper :global(.team-dropdown:hover) {
    transform: none !important;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Indicateur polygonal pour l'équipe active */
  .team-indicator {
    position: absolute;
    top: calc(100% - 16px); /* Le bas du polygone touche le haut du dropdown */
    height: 16px; /* Hauteur de l'angle coupé */
    width: 50%; /* Du bord jusqu'au milieu */
    background: #ffffff;
    z-index: 5;
    pointer-events: none;
    transition: all 0.2s ease;
  }

  /* Home : de gauche au milieu, coin coupé en bas à GAUCHE ===\ */
  .team-indicator-home {
    left: 0;
    clip-path: polygon(
      0 0,         /* Haut-gauche */
      calc(100% - 16px) 0,      /* Haut-droit (milieu) */
      100% 100%,   /* Bas-droit */
      0 100%    /* Bas-gauche avec angle coupé */
    );
  }

  /* Away : du milieu à droite, coin coupé en bas à DROITE \=== */
  .team-indicator-away {
    right: 0;
    clip-path: polygon(
      16px 0,                    /* Haut-gauche (milieu) */
      100% 0,                 /* Haut-droit */
      100% 100%, /* Bas-droit avec angle coupé */
      0 100%                  /* Bas-gauche */
    );
  }

  /* Contenu du sélecteur : container relatif */
  .team-selector-content {
    position: relative;
    width: 100%;
  }

  /* 2 rectangles invisibles qui divisent la NotchedBox en 50%-50% */
  .team-zone {
    position: absolute;
    /* Étend pour couvrir le padding aussi */
    top: -1rem;
    bottom: -1rem;
    width: calc(50% + 1.5rem); /* 50% + moitié du padding horizontal */
    z-index: 1;
    /* Invisible mais détecte les hovers */
  }

  .team-zone-left {
    left: -1.5rem; /* Commence au bord gauche incluant padding */
  }

  .team-zone-right {
    right: -1.5rem; /* Commence au bord droit incluant padding */
  }

  /* Contenu visible par-dessus les zones */
  .team-content-overlay {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    pointer-events: none; /* Les événements passent aux zones en dessous */
  }

  .team-logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
  }

  .team-logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  /* Trait blanc horizontal pour les équipes non sélectionnées */
  .placeholder-line {
    width: 30px;
    height: 3px;
    background: white;
    border-radius: 2px;
  }

  .vs-text {
    position: relative;
    color: var(--color-white);
    padding: 0 0.5rem;
    font-weight: 600;
    font-size: 1rem;
    flex-shrink: 0; /* Ne rétrécit pas */
    z-index: 2; /* Au-dessus des zones */
  }

  /* Contenu du dropdown : flèches + logos */
  .dropdown-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0;
    box-sizing: border-box;
    gap: 0.5rem;
    min-height: 50px; /* Hauteur fixe pour éviter les variations */
  }

  /* Conteneur des équipes */
  .teams-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    gap: 0.5rem;
  }

  /* Flèches de navigation */
  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--color-text-primary, #333);
    transition: opacity 0.2s ease;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  .nav-arrow svg {
    width: 18px;
    height: 18px;
  }

  .nav-arrow:hover:not(:disabled) {
    opacity: 0.7;
  }

  .nav-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Carte d'équipe */
  .team-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    flex: 1; /* Prend l'espace disponible */
    max-width: 33.33%; /* Maximum 1/3 de la largeur */
    height: 40px; /* Hauteur fixe pour maintenir la hauteur du dropdown */
  }

  .team-card-logo {
    width: 100%; /* Relatif à la carte */
    max-width: 35px; /* Taille maximale */
    max-height: 35px; /* Hauteur maximale fixe */
    height: auto;
    object-fit: contain;
  }

</style>
