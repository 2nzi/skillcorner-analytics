/**
 * Match Analysis State Store (Svelte 5)
 *
 * Store centralisé pour gérer l'état du match sélectionné et ses données.
 * Utilise les runes Svelte 5 pour la réactivité.
 */

import type {
  SkillCornerMatch,
  SkillCornerDynamicEvent,
  SkillCornerPhaseOfPlay,
  SkillCornerTrackingFrame
} from '$types/skillcorner';

/**
 * Interface pour l'état du match
 */
interface MatchState {
  selectedMatchId: number | null;
  matchData: SkillCornerMatch | null;
  eventsData: SkillCornerDynamicEvent[];
  phasesData: SkillCornerPhaseOfPlay[];
  trackingData: SkillCornerTrackingFrame[];
  isLoadingMatchData: boolean;
  currentFrameIndex: number;
}

/**
 * État initial
 */
const initialState: MatchState = {
  selectedMatchId: null,
  matchData: null,
  eventsData: [],
  phasesData: [],
  trackingData: [],
  isLoadingMatchData: false,
  currentFrameIndex: 0
};

/**
 * Créer le store d'état du match
 */
function createMatchState() {
  let state = $state<MatchState>({ ...initialState });

  return {
    // Getters réactifs
    get selectedMatchId() { return state.selectedMatchId; },
    get matchData() { return state.matchData; },
    get eventsData() { return state.eventsData; },
    get phasesData() { return state.phasesData; },
    get trackingData() { return state.trackingData; },
    get isLoadingMatchData() { return state.isLoadingMatchData; },
    get currentFrameIndex() { return state.currentFrameIndex; },

    // Actions
    setSelectedMatchId(id: number | null) {
      state.selectedMatchId = id;
    },

    setMatchData(data: SkillCornerMatch | null) {
      state.matchData = data;
    },

    setEventsData(events: SkillCornerDynamicEvent[]) {
      state.eventsData = events;
    },

    setPhasesData(phases: SkillCornerPhaseOfPlay[]) {
      state.phasesData = phases;
    },

    setTrackingData(tracking: SkillCornerTrackingFrame[]) {
      state.trackingData = tracking;
    },

    setLoadingState(isLoading: boolean) {
      state.isLoadingMatchData = isLoading;
    },

    setCurrentFrameIndex(index: number) {
      state.currentFrameIndex = index;
    },

    /**
     * Charger toutes les données d'un match
     */
    async loadMatchData(matchId: number): Promise<void> {
      this.setLoadingState(true);
      this.setSelectedMatchId(matchId);

      // Reset des données pendant le chargement
      this.setMatchData(null);
      this.setEventsData([]);
      this.setPhasesData([]);
      this.setTrackingData([]);
      this.setCurrentFrameIndex(0);

      try {
        const response = await fetch(`/api/match/${matchId}?includeTracking=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch match data');
        }
        const responseData = await response.json();

        this.setMatchData(responseData.match);
        this.setEventsData(responseData.events || []);
        this.setPhasesData(responseData.phases || []);
        this.setTrackingData(responseData.tracking || []);

        console.log('Match data loaded:', {
          match: responseData.match,
          events: responseData.events?.length || 0,
          phases: responseData.phases?.length || 0,
          tracking: responseData.tracking?.length || 0
        });
      } catch (error) {
        console.error('Error loading match data:', error);
        this.reset();
      } finally {
        this.setLoadingState(false);
      }
    },

    /**
     * Réinitialiser l'état
     */
    reset() {
      state = { ...initialState };
    }
  };
}

/**
 * Instance globale du store
 */
export const matchState = createMatchState();
