<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import TeamSelector, { type Team } from '$lib/components/features/match-analysis/TeamSelector.svelte';
  import MatchList from '$lib/components/features/match-analysis/MatchList.svelte';
  import { FootballField, type PlayerPosition, type BallPosition, type TeamInfo, type PhaseData } from '$lib/components/features/match-analysis/football-field';
  import MatchTimeline from '$lib/components/features/match-analysis/MatchTimeline.svelte';
  import PlaybackControls from '$lib/components/features/match-analysis/PlaybackControls.svelte';
  import XGChart from '$lib/components/features/match-analysis/XGChart.svelte';
  import EventsList from '$lib/components/features/match-analysis/EventsList.svelte';
  import type {
    SkillCornerMatch,
    SkillCornerDynamicEvent,
    SkillCornerPhaseOfPlay,
    SkillCornerTrackingFrame
  } from '$types/skillcorner';

  // Utilitaires d'analyse de match
  import {
    convertTrackingPlayersToFieldPositions,
    convertTrackingBallToFieldPosition,
    buildTeamInfoFromMatch,
    findPhaseAtFrame,
    buildPhaseDataForField,
    createPlaybackController,
    createTimelineNavigator,
    findFirstValidFrameIndex
  } from '$lib/utils/match-analysis';

  let { data }: { data: PageData } = $props();

  // Référence pour le contenu principal
  let mainContentRef: HTMLDivElement;

  // Auto-scroll au montage du composant
  onMount(() => {
    if (mainContentRef) {
      setTimeout(() => {
        mainContentRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  });

  // Sélection par défaut : AUCUN match (null au départ)
  let selectedMatch = $state<typeof data.matches[0] | null>(null);

  // Données complètes du match sélectionné (4 fichiers)
  let matchData = $state<SkillCornerMatch | null>(null);
  let eventsData = $state<SkillCornerDynamicEvent[]>([]);
  let phasesData = $state<SkillCornerPhaseOfPlay[]>([]);
  let trackingData = $state<SkillCornerTrackingFrame[]>([]);
  let isLoadingMatchData = $state(false);

  // Largeur du SVG du terrain (pour la timeline)
  let fieldSvgWidth = $state<number | null>(null);

  // Référence au conteneur du terrain pour le scroll auto
  let fieldSectionRef: HTMLDivElement;

  // Frame actuelle pour le tracking
  let currentFrameIndex = $state(0);

  // État de la section infos du match
  let isMatchInfoOpen = $state(false);

  // Frame actuelle
  const currentFrame = $derived(trackingData[currentFrameIndex] || null);

  // Numéro de frame actuel (pour la timeline)
  const currentFrameNumber = $derived(currentFrame?.frame ?? 0);

  // Créer le contrôleur de playback
  const playbackController = createPlaybackController(
    () => currentFrameIndex,
    () => trackingData,
    (newIndex) => { currentFrameIndex = newIndex; }
  );

  // Créer le navigateur de timeline
  const timelineNavigator = createTimelineNavigator(
    () => trackingData,
    (newIndex) => { currentFrameIndex = newIndex; }
  );

  // Handler pour la timeline avec pause automatique
  function handleTimelineFrameChange(frameNumber: number) {
    playbackController.pause();
    timelineNavigator.navigateToFrame(frameNumber);
  }

  // Phase de jeu active selon la frame actuelle
  const activePhase = $derived<SkillCornerPhaseOfPlay | null>(
    findPhaseAtFrame(phasesData, currentFrameNumber)
  );

  // Sens d'attaque de la phase active (ou "left-to-right" par défaut)
  const currentAttackingSide = $derived<string>(
    activePhase?.attacking_side || 'left-to-right'
  );

  // Debug: Logger le sens d'attaque
  $effect(() => {
    if (activePhase) {
      console.log('Attacking side:', currentAttackingSide, 'Phase:', activePhase.team_in_possession_phase_type);
    }
  });

  // Convertir les positions des joueurs
  const playerPositions = $derived<PlayerPosition[]>(
    convertTrackingPlayersToFieldPositions(currentFrame, currentAttackingSide)
  );

  // Convertir la position du ballon
  const ballPosition = $derived<BallPosition>(
    convertTrackingBallToFieldPosition(currentFrame, currentAttackingSide)
  );

  // Cache pour les phases transformées (évite de recalculer à chaque frame)
  let phaseCache = new Map<number, PhaseData>();

  // Phase data pour le terrain (avec passes et traces)
  const phaseData = $derived.by<PhaseData | null>(() => {
    if (!activePhase) {
      return null;
    }

    // Utiliser l'index de la phase + attacking_side comme clé de cache
    const phaseKey = `${activePhase.index}-${activePhase.attacking_side}`;

    // Si déjà dans le cache, récupérer et mettre à jour seulement currentFrame
    if (phaseCache.has(phaseKey as any)) {
      const cached = phaseCache.get(phaseKey as any)!;
      return { ...cached, currentFrame: currentFrameNumber };
    }

    // Sinon, calculer la phase complète
    if (!matchData) return null;

    const newPhaseData = buildPhaseDataForField(
      activePhase,
      eventsData,
      trackingData,
      matchData,
      currentFrameNumber
    );
    if (newPhaseData) {
      phaseCache.set(phaseKey as any, newPhaseData);
    }

    return newPhaseData;
  });

  // Infos des équipes pour colorer les joueurs
  const homeTeamInfo = $derived<TeamInfo | undefined>(
    matchData ? buildTeamInfoFromMatch('home', matchData) : undefined
  );

  const awayTeamInfo = $derived<TeamInfo | undefined>(
    matchData ? buildTeamInfoFromMatch('away', matchData) : undefined
  );

  // États pour les équipes sélectionnées (indépendants du match)
  let homeTeam = $state<Team | null>(null);
  let awayTeam = $state<Team | null>(null);

  // Convertir toutes les équipes disponibles avec leurs adversaires
  const availableTeams = $derived.by<Team[]>(() => {
    // Créer un Map pour stocker les adversaires de chaque équipe
    const opponentsMap = new Map<number, Set<number>>();

    // Parcourir tous les matchs pour construire la liste des adversaires
    data.matches.forEach(match => {
      const homeId = match.home_team.id;
      const awayId = match.away_team.id;

      // Ajouter away comme adversaire de home
      if (!opponentsMap.has(homeId)) {
        opponentsMap.set(homeId, new Set());
      }
      opponentsMap.get(homeId)!.add(awayId);

      // Ajouter home comme adversaire de away
      if (!opponentsMap.has(awayId)) {
        opponentsMap.set(awayId, new Set());
      }
      opponentsMap.get(awayId)!.add(homeId);
    });

    // Créer la liste des équipes avec leurs adversaires
    const teams = data.matches.flatMap(match => [
      {
        id: match.home_team.id,
        name: match.home_team.short_name,
        logoUrl: `/api/team-logo/${match.home_team.id}`,
        opponents: Array.from(opponentsMap.get(match.home_team.id) || [])
      },
      {
        id: match.away_team.id,
        name: match.away_team.short_name,
        logoUrl: `/api/team-logo/${match.away_team.id}`,
        opponents: Array.from(opponentsMap.get(match.away_team.id) || [])
      }
    ]);

    // Filtrer les doublons
    return teams.filter((team, index, self) =>
      index === self.findIndex(t => t.id === team.id)
    );
  });

  // Callbacks pour les changements de sélection
  function handleHomeTeamChange(team: Team | null) {
    console.log('Home team changed:', team);
    homeTeam = team;
  }

  function handleAwayTeamChange(team: Team | null) {
    console.log('Away team changed:', team);
    awayTeam = team;
  }

  function handleClear() {
    console.log('Clearing all selections');
    homeTeam = null;
    awayTeam = null;
  }

  // Callback pour la sélection d'un événement
  function handleEventClick(event: SkillCornerDynamicEvent) {
    console.log('Événement sélectionné:', event);
    handleTimelineFrameChange(event.frame_start);
  }

  // Callback pour la sélection d'un match
  async function handleMatchSelect(match: typeof data.matches[0]) {
    console.log('Match sélectionné:', match);
    selectedMatch = match;

    // Arrêter la lecture en cours
    playbackController.pause();

    // Scroll immédiat vers le terrain (avant chargement des données)
    setTimeout(() => {
      fieldSectionRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Reset des données
    matchData = null;
    eventsData = [];
    phasesData = [];
    trackingData = [];
    phaseCache.clear();

    // Charger toutes les données du match
    isLoadingMatchData = true;
    try {
      const response = await fetch(`/api/match/${match.id}?includeTracking=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch match data');
      }
      const responseData = await response.json();

      matchData = responseData.match;
      eventsData = responseData.events || [];
      phasesData = responseData.phases || [];
      trackingData = responseData.tracking || [];

      // Trouver la première frame avec des données de joueurs
      currentFrameIndex = findFirstValidFrameIndex(trackingData);

      console.log('Données chargées:', {
        match: matchData,
        events: eventsData.length,
        phases: phasesData.length,
        tracking: trackingData.length,
        firstValidFrameIndex: currentFrameIndex
      });
    } catch (error) {
      console.error('Error loading match data:', error);
      matchData = null;
      eventsData = [];
      phasesData = [];
      trackingData = [];
    } finally {
      isLoadingMatchData = false;
    }
  }

  // Nettoyer le contrôleur de playback lors de la destruction du composant
  onMount(() => {
    return () => {
      playbackController.cleanup();
    };
  });
</script>

<div class="match-analysis-container">
  {#if data.matches.length === 0}
    <p class="no-data">Aucun match disponible</p>
  {:else}
    <div class="content-wrapper" bind:this={mainContentRef}>
      <!-- Sélecteur d'équipes -->
      <div class="filter-section">
        <TeamSelector
          {homeTeam}
          {awayTeam}
          {availableTeams}
          onHomeTeamChange={handleHomeTeamChange}
          onAwayTeamChange={handleAwayTeamChange}
          onClear={handleClear}
        />
      </div>

      <!-- Liste des matchs filtrés -->
      <MatchList
        matches={data.matches}
        {homeTeam}
        {awayTeam}
        onMatchSelect={handleMatchSelect}
      />
    </div>
  {/if}

  <!-- Section contentMatch : affichée uniquement si un match est sélectionné -->
  {#if selectedMatch}
    <!-- Infos du match en haut (toute la largeur) -->
    {#if matchData}
      <div class="match-info-header">
        <div class="match-info">
          <div class="team-score">
            <div class="jersey-color" style="background-color: {matchData.home_team_kit?.jersey_color || '#ff4444'}"></div>
            <img
              src="/api/team-logo/{matchData.home_team.id}"
              alt="{matchData.home_team.short_name}"
              class="team-logo"
            />
            <span class="team-name">{matchData.home_team.short_name}</span>
            <span class="score">{matchData.home_team_score}</span>
          </div>
          <div class="match-details">
            <div class="score-separator">-</div>
            {#if matchData.stadium}
              <div class="stadium-info">{matchData.stadium.name}</div>
            {/if}
          </div>
          <div class="team-score">
            <span class="score">{matchData.away_team_score}</span>
            <span class="team-name">{matchData.away_team.short_name}</span>
            <img
              src="/api/team-logo/{matchData.away_team.id}"
              alt="{matchData.away_team.short_name}"
              class="team-logo"
            />
            <div class="jersey-color" style="background-color: {matchData.away_team_kit?.jersey_color || '#4444ff'}"></div>
          </div>
        </div>
      </div>
    {/if}

    <div class="content-match-wrapper">
      <!-- Contenu principal du match à gauche (50%) -->
      <div class="content-match">

        <!-- Terrain de football (affiché immédiatement dès la sélection du match) -->
        <div class="field-section" bind:this={fieldSectionRef}>
        <div class="field-wrapper">
          <!-- Barre de contrôle avec score et timer (au-dessus du terrain) -->
          <PlaybackControls
            {matchData}
            {currentFrame}
            isPlaying={playbackController.isPlaying}
            playbackSpeed={playbackController.playbackSpeed}
            isLoading={isLoadingMatchData}
            hasTrackingData={trackingData.length > 0}
            onPlayPause={playbackController.togglePlayPause}
            onJumpBackward={playbackController.jumpBackward}
            onJumpForward={playbackController.jumpForward}
            onSpeedChange={playbackController.setPlaybackSpeed}
          />

          <!-- Terrain, timeline et graphique -->
          <div class="field-container">
            <FootballField
              pitchLength={matchData?.pitch_length}
              pitchWidth={matchData?.pitch_width}
              players={playerPositions}
              ball={ballPosition}
              playerInPossessionId={currentFrame?.possession?.player_id ?? null}
              homeTeam={homeTeamInfo}
              awayTeam={awayTeamInfo}
              phase={phaseData}
              showBall={true}
              onSvgResize={(width) => fieldSvgWidth = width}
              isLoading={isLoadingMatchData}
            />
          </div>

          <!-- Timeline de navigation -->
          <MatchTimeline
            periods={matchData?.match_periods ?? []}
            currentFrame={currentFrameNumber}
            onFrameChange={handleTimelineFrameChange}
            width={fieldSvgWidth}
            isLoading={isLoadingMatchData}
          />

          <!-- Graphique xThreat cumulé -->
          {#if matchData && homeTeamInfo && awayTeamInfo}
            <XGChart
              periods={matchData.match_periods}
              events={eventsData}
              currentFrame={currentFrameNumber}
              homeTeamId={matchData.home_team.id}
              awayTeamId={matchData.away_team.id}
              homeTeamColor={homeTeamInfo.color}
              awayTeamColor={awayTeamInfo.color}
              onFrameChange={handleTimelineFrameChange}
              width={fieldSvgWidth}
              isLoading={isLoadingMatchData}
            />
          {/if}
        </div>
        </div>
      </div>

      <!-- Liste des événements à droite (50%) -->
      <div class="events-sidebar">
        <EventsList
          events={eventsData}
          currentFrame={currentFrameNumber}
          {matchData}
          onEventClick={handleEventClick}
        />
      </div>
    </div>
    <!-- Footer spacer -->
    <div class="footer-spacer"></div>
    {/if}

</div>

<style>
  .match-analysis-container {
    display: flex;
    flex-direction: column;
    max-width: 1400px;
    margin: 0 auto;
    overflow-y: auto;
  }

  .content-wrapper {
    display: flex;
    flex-direction: column;
    min-height: calc(100svh - 12rem);
    flex-shrink: 0;
  }

  .no-data {
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    padding: var(--spacing-xxl);
  }

  .filter-section {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    margin-bottom: 2rem;
  }

  /* Match info header (toute la largeur en haut) */
  .match-info-header {
    width: 100%;
    background: white;
    padding: 1rem var(--spacing-lg);
    margin-bottom: 0;
  }

  /* Wrapper pour content-match + events sidebar */
  .content-match-wrapper {
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 0;
    align-items: flex-start;
    background: white;
    position: relative;
    z-index: 1;
  }

  /* Section contentMatch (colonne gauche - 65%) */
  .content-match {
    flex: 0 0 65%;
    min-width: 0;
    padding: 0 var(--spacing-lg);
  }

  /* Section du terrain */
  .field-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Wrapper terrain + timeline */
  .field-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    position: relative;
    gap: 0;
  }

  /* Conteneur du terrain */
  .field-container {
    width: 100%;
    max-width: 900px;
    height: 450px;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }

  /* Barre latérale des événements (colonne droite - 35%) */
  .events-sidebar {
    flex: 0 0 35%;
    min-width: 0;
    overflow: hidden;
    border-left: 1px solid #ddd;
  }

  /* Infos du match (score, logos, stade) */
  .match-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .team-score {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .team-score:first-child {
    justify-content: flex-start;
  }

  .team-score:last-child {
    justify-content: flex-end;
  }

  .jersey-color {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .team-logo {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  .team-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #333;
  }

  .score {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1a472a;
    min-width: 2.5rem;
    text-align: center;
  }

  .match-details {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .score-separator {
    font-size: 1.5rem;
    font-weight: 500;
    color: #999;
  }

  .stadium-info {
    font-size: 0.75rem;
    color: #666;
    text-align: center;
    white-space: nowrap;
  }

  /* Footer spacer */
  .footer-spacer {
    height: 8rem;
    flex-shrink: 0;
    background: white;
  }
</style>
