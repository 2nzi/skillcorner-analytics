/**
 * Route serveur pour la page d'analyse de match
 * Charge les données côté serveur (Node.js)
 */

import { getMatchesList } from '$lib/services/SkillCornerService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    // Récupère la liste des matchs disponibles
    const matches = await getMatchesList();

    return {
      matches
    };
  } catch (error) {
    console.error('Erreur lors du chargement des matchs:', error);
    return {
      matches: []
    };
  }
};
