<script lang="ts">
  import type { SkillCornerMatch } from '$types/skillcorner';
  import NotchedBox from '../../../ui/NotchedBox.svelte';

  interface Props {
    match: SkillCornerMatch;
  }

  let { match }: Props = $props();

  // Formater la date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Calculer le pourcentage de possession
  const homePossession = $derived(
    (match.home_team_playing_time.minutes_tip /
    (match.home_team_playing_time.minutes_tip + match.away_team_playing_time.minutes_tip) * 100).toFixed(0)
  );
</script>

<div class="match-overview">
  <!-- En-tête du match avec score -->
  <NotchedBox
    backgroundColor="rgba(255, 255, 255, 0.05)"
    borderColor="rgba(255, 255, 255, 0.2)"
    borderWidth={1}
    notchedCorners={{ topRight: true, bottomLeft: true }}
    padding="1.5rem 2rem"
  >
    <div class="match-header">
      <div class="team home-team">
        <img
          src={`/api/team-logo/${match.home_team.id}`}
          alt={match.home_team.name}
          class="team-logo"
        />
        <div class="team-info">
          <span class="team-name">{match.home_team.name}</span>
          <span class="team-acronym">{match.home_team.acronym}</span>
        </div>
      </div>

      <div class="score-container">
        <div class="score">
          <span class="score-home">{match.home_team_score}</span>
          <span class="separator">-</span>
          <span class="score-away">{match.away_team_score}</span>
        </div>
        <div class="match-status">{match.status}</div>
      </div>

      <div class="team away-team">
        <div class="team-info">
          <span class="team-name">{match.away_team.name}</span>
          <span class="team-acronym">{match.away_team.acronym}</span>
        </div>
        <img
          src={`/api/team-logo/${match.away_team.id}`}
          alt={match.away_team.name}
          class="team-logo"
        />
      </div>
    </div>
  </NotchedBox>

  <!-- Grille d'informations -->
  <div class="info-grid">
    <NotchedBox
      backgroundColor="rgba(255, 255, 255, 0.03)"
      borderColor="rgba(255, 255, 255, 0.1)"
      borderWidth={1}
      notchedCorners={{ topRight: true, bottomLeft: true }}
      padding="1rem"
    >
      <div class="info-card">
        <span class="info-label">Date</span>
        <span class="info-value">{formatDate(match.date_time)}</span>
      </div>
    </NotchedBox>

    <NotchedBox
      backgroundColor="rgba(255, 255, 255, 0.03)"
      borderColor="rgba(255, 255, 255, 0.1)"
      borderWidth={1}
      notchedCorners={{ topRight: true, bottomLeft: true }}
      padding="1rem"
    >
      <div class="info-card">
        <span class="info-label">Stade</span>
        <span class="info-value">{match.stadium.name}</span>
        <span class="info-subvalue">{match.stadium.city}</span>
      </div>
    </NotchedBox>

    <NotchedBox
      backgroundColor="rgba(255, 255, 255, 0.03)"
      borderColor="rgba(255, 255, 255, 0.1)"
      borderWidth={1}
      notchedCorners={{ topRight: true, bottomLeft: true }}
      padding="1rem"
    >
      <div class="info-card">
        <span class="info-label">Compétition</span>
        <span class="info-value">{match.competition_edition.competition.name}</span>
        <span class="info-subvalue">{match.competition_edition.season.name}</span>
      </div>
    </NotchedBox>

    <NotchedBox
      backgroundColor="rgba(255, 255, 255, 0.03)"
      borderColor="rgba(255, 255, 255, 0.1)"
      borderWidth={1}
      notchedCorners={{ topRight: true, bottomLeft: true }}
      padding="1rem"
    >
      <div class="info-card">
        <span class="info-label">Tour</span>
        <span class="info-value">{match.competition_round.name}</span>
      </div>
    </NotchedBox>
  </div>

  <!-- Stats de possession -->
  <NotchedBox
    backgroundColor="rgba(255, 255, 255, 0.03)"
    borderColor="rgba(255, 255, 255, 0.1)"
    borderWidth={1}
    notchedCorners={{ topRight: true, bottomLeft: true }}
    padding="1.5rem"
  >
    <div class="possession-section">
      <h4 class="section-title">Possession</h4>
      <div class="possession-stats">
        <div class="possession-team">
          <span class="possession-name">{match.home_team.short_name}</span>
          <span class="possession-value">{homePossession}%</span>
        </div>
        <div class="possession-bar">
          <div class="possession-fill home" style="width: {homePossession}%"></div>
        </div>
        <div class="possession-team away">
          <span class="possession-value">{100 - Number(homePossession)}%</span>
          <span class="possession-name">{match.away_team.short_name}</span>
        </div>
      </div>
    </div>
  </NotchedBox>

  <!-- Périodes de jeu -->
  <NotchedBox
    backgroundColor="rgba(255, 255, 255, 0.03)"
    borderColor="rgba(255, 255, 255, 0.1)"
    borderWidth={1}
    notchedCorners={{ topRight: true, bottomLeft: true }}
    padding="1.5rem"
  >
    <div class="periods-section">
      <h4 class="section-title">Périodes</h4>
      <div class="periods-grid">
        {#each match.match_periods as period}
          <div class="period-item">
            <span class="period-name">{period.name.replace('_', ' ')}</span>
            <span class="period-duration">{period.duration_minutes.toFixed(0)} min</span>
          </div>
        {/each}
      </div>
    </div>
  </NotchedBox>
</div>

<style>
  .match-overview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* En-tête avec équipes et score */
  .match-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .team {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .home-team {
    justify-content: flex-start;
  }

  .away-team {
    justify-content: flex-end;
  }

  .team-logo {
    width: 50px;
    height: 50px;
    object-fit: contain;
  }

  .team-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .away-team .team-info {
    text-align: right;
  }

  .team-name {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--color-white);
  }

  .team-acronym {
    font-size: var(--font-size-sm);
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }

  .score-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .score {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--color-white);
  }

  .separator {
    color: rgba(255, 255, 255, 0.5);
  }

  .match-status {
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    color: var(--color-skillcorner-green);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  /* Grille d'informations */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .info-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-label {
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .info-value {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-white);
  }

  .info-subvalue {
    font-size: var(--font-size-xs);
    color: rgba(255, 255, 255, 0.6);
  }

  /* Section titre */
  .section-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-white);
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Stats de possession */
  .possession-stats {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .possession-team {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 80px;
  }

  .possession-team.away {
    text-align: right;
  }

  .possession-name {
    font-size: var(--font-size-xs);
    color: rgba(255, 255, 255, 0.6);
  }

  .possession-value {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-white);
  }

  .possession-bar {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .possession-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .possession-fill.home {
    background: var(--color-skillcorner-green);
  }

  /* Périodes */
  .periods-grid {
    display: flex;
    gap: 1rem;
  }

  .period-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
  }

  .period-name {
    font-size: var(--font-size-xs);
    color: rgba(255, 255, 255, 0.6);
    text-transform: capitalize;
  }

  .period-duration {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--color-white);
  }
</style>
