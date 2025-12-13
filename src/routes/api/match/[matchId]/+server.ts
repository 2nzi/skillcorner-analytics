import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getMatch,
	getDynamicEvents,
	getPhasesOfPlay,
	getTrackingData
} from '$lib/services/SkillCornerService';

/**
 * GET /api/match/[matchId]
 * Récupère toutes les données d'un match
 *
 * Query params:
 * - includeTracking: boolean (default: false) - Inclure les données de tracking
 * - trackingLimit: number - Limite le nombre de frames de tracking
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const { matchId } = params;

	if (!matchId) {
		throw error(400, 'Match ID is required');
	}

	try {
		// Récupérer les paramètres de query
		const includeTracking = url.searchParams.get('includeTracking') === 'true';
		const trackingLimit = url.searchParams.get('trackingLimit');

		// Récupérer les données en parallèle (sauf tracking car lourd)
		const [matchData, dynamicEvents, phasesOfPlay] = await Promise.all([
			getMatch(matchId),
			getDynamicEvents(matchId),
			getPhasesOfPlay(matchId)
		]);

		// Récupérer le tracking seulement si demandé
		let trackingData = null;
		if (includeTracking) {
			const limit = trackingLimit ? parseInt(trackingLimit) : undefined;
			trackingData = await getTrackingData(matchId, limit);
		}

		return json({
			match: matchData,
			events: dynamicEvents,
			phases: phasesOfPlay,
			tracking: trackingData
		});
	} catch (err) {
		console.error(`Error fetching match ${matchId}:`, err);
		throw error(500, `Failed to fetch match data: ${err}`);
	}
};
