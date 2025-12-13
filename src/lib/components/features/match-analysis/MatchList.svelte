<script lang="ts">
  import type { SkillCornerMatchListItem } from '$types/skillcorner/matches-list';
  import type { Team } from './TeamSelector.svelte';
  import NotchedBox from '../../ui/NotchedBox.svelte';

  interface Props {
    matches: SkillCornerMatchListItem[];
    homeTeam: Team | null;
    awayTeam: Team | null;
    onMatchSelect?: (match: SkillCornerMatchListItem) => void;
  }

  let { matches, homeTeam, awayTeam, onMatchSelect }: Props = $props();

  // État pour la pagination
  let currentPage = $state(0);
  const MATCHES_PER_PAGE = 3;

  // Filtrer les matchs selon les équipes sélectionnées
  const filteredMatches = $derived.by(() => {
    // Si aucune équipe n'est sélectionnée, afficher tous les matchs
    if (!homeTeam && !awayTeam) {
      return matches;
    }

    return matches.filter(match => {
      // Si les deux équipes sont sélectionnées
      if (homeTeam && awayTeam) {
        // Le match doit correspondre exactement (home vs away ou away vs home)
        return (
          (match.home_team.id === Number(homeTeam.id) && match.away_team.id === Number(awayTeam.id)) ||
          (match.home_team.id === Number(awayTeam.id) && match.away_team.id === Number(homeTeam.id))
        );
      }

      // Si seulement homeTeam est sélectionné
      if (homeTeam) {
        return match.home_team.id === Number(homeTeam.id) || match.away_team.id === Number(homeTeam.id);
      }

      // Si seulement awayTeam est sélectionné
      if (awayTeam) {
        return match.home_team.id === Number(awayTeam.id) || match.away_team.id === Number(awayTeam.id);
      }

      return false;
    });
  });

  // Calculer les matchs visibles pour la page actuelle
  const visibleMatches = $derived(
    filteredMatches.slice(currentPage * MATCHES_PER_PAGE, (currentPage + 1) * MATCHES_PER_PAGE)
  );

  // Calculer le nombre total de pages
  const totalPages = $derived(Math.ceil(filteredMatches.length / MATCHES_PER_PAGE));

  // Navigation
  const canNavigateLeft = $derived(currentPage > 0);
  const canNavigateRight = $derived(currentPage < totalPages - 1);

  function navigateLeft() {
    if (canNavigateLeft) {
      currentPage--;
    }
  }

  function navigateRight() {
    if (canNavigateRight) {
      currentPage++;
    }
  }

  // Réinitialiser la page quand les filtres changent
  $effect(() => {
    // Quand les équipes changent, réinitialiser à la page 0
    homeTeam, awayTeam;
    currentPage = 0;
  });

  // Formater la date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
</script>

<div class="match-list-wrapper">
  <!-- Conteneur principal pour header + rectangle -->
  <div class="match-list-container">
    <!-- Bande en haut avec coin coupé -->
    <NotchedBox
      backgroundColor="var(--color-white)"
      notchedCorners={{ topRight: true, bottomLeft: true }}
      padding="0"
      class="header-band"
    >
      <div class="header-content">
        <span class="match-count">{filteredMatches.length} match{filteredMatches.length > 1 ? 'es' : ''}</span>
      </div>
    </NotchedBox>

    <!-- Conteneur rectangulaire avec bordure blanche -->
    <div class="matches-container">
      <!-- Zone des 3 boxes -->
      <div class="matches-list">
        {#each visibleMatches as match (match.id)}
          <NotchedBox
            backgroundColor="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            borderWidth={1}
            notchedCorners={{ topRight: true, bottomLeft: true }}
            padding="0"
            class="match-box"
            onclick={() => onMatchSelect?.(match)}
          >
            <div class="match-content">
              <div class="match-date">{formatDate(match.date_time)}</div>
              <div class="match-teams">
                <div class="team">
                  <img
                    src={`/api/team-logo/${match.home_team.id}`}
                    alt={match.home_team.short_name}
                    class="team-logo"
                  />
                  <span class="team-name">{match.home_team.short_name}</span>
                </div>
                <span class="vs">vs</span>
                <div class="team">
                  <img
                    src={`/api/team-logo/${match.away_team.id}`}
                    alt={match.away_team.short_name}
                    class="team-logo"
                  />
                  <span class="team-name">{match.away_team.short_name}</span>
                </div>
              </div>
              <div class="match-status">{match.status}</div>
            </div>
          </NotchedBox>
        {/each}
      </div>

      <!-- Flèches de navigation si plus de 3 matchs -->
      {#if totalPages > 1}
        <div class="navigation">
          <button
            class="nav-arrow"
            onclick={navigateLeft}
            disabled={!canNavigateLeft}
            aria-label="Page précédente"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <span class="page-indicator">{currentPage + 1} / {totalPages}</span>

          <button
            class="nav-arrow"
            onclick={navigateRight}
            disabled={!canNavigateRight}
            aria-label="Page suivante"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .match-list-wrapper {
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Conteneur principal pour header + rectangle */
  .match-list-container {
    width: 100%;
    max-width: 800px;
    margin: 5vh auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Bande d'en-tête */
  .match-list-container :global(.header-band) {
    margin-bottom: -2px;
    width: 100%;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 1rem;
  }

  .match-count {
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
  }

  /* Conteneur rectangulaire avec bordure blanche - HAUTEUR FIXE */
  .matches-container {
    border: 2px solid var(--color-white);
    padding: 1.5rem;
    background: var(--color-bg-home);
    width: 100%;
    box-sizing: border-box;
    flex: 1;
    min-height: 0; /* IMPORTANT: permet au flex de contraindre la hauteur */
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden; /* Le container ne grandit jamais */
  }

  /* Liste des 3 matches - prend l'espace disponible */
  .matches-list {
    flex: 1;
    min-height: 0; /* IMPORTANT: les enfants sont contraints */
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Chaque NotchedBox prend 1/3 de l'espace disponible */
  .matches-list :global(.match-box) {
    flex: 1;
    min-height: 0; /* IMPORTANT: contraint par le parent */
    display: flex !important;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .matches-list :global(.match-box:hover) {
    transform: scale(1.02);
  }

  /* Inner div de la NotchedBox doit aussi respecter les dimensions */
  .matches-list :global(.match-box > div) {
    display: flex !important;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden; /* Contenu ne déborde pas */
  }

  /* Le contenu s'adapte à la box */
  .match-content {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: white;
  }

  /* Navigation */
  .navigation {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: rgba(255, 255, 255, 0.8);
    transition: all 0.2s ease;
    border-radius: 4px;
  }

  .nav-arrow:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .nav-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .page-indicator {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.875rem;
    font-weight: 500;
    min-width: 60px;
    text-align: center;
  }

  .match-date {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    text-align: center;
    flex-shrink: 0;
  }

  .match-teams {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 0.5rem;
    width: 100%;
    flex: 1;
    min-height: 0;
  }

  .team {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    flex: 1;
    min-width: 0;
  }

  .team-logo {
    width: 35px;
    height: 35px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .team-name {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.87);
    text-align: center;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .vs {
    color: rgba(0, 0, 0, 0.5);
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .match-status {
    font-size: 0.65rem;
    color: rgba(0, 0, 0, 0.5);
    text-align: center;
    text-transform: uppercase;
    flex-shrink: 0;
  }
</style>
