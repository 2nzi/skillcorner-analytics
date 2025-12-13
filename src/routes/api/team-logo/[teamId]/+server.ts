/**
 * Endpoint API pour servir les logos des équipes
 * GET /api/team-logo/[teamId]
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

// Chemin vers les logos des équipes (à la racine du projet)
const LOGOS_PATH = join(process.cwd(), 'opendata', 'data', 'images', 'club');

export const GET: RequestHandler = async ({ params }) => {
  const { teamId } = params;

  try {
    // Construire le chemin vers le logo
    const logoPath = join(LOGOS_PATH, `${teamId}.png`);

    // Lire le fichier
    const imageBuffer = await readFile(logoPath);

    // Cache: pas de cache en dev, cache long en production
    const cacheControl = dev
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=31536000, immutable';

    // Retourner l'image avec le bon Content-Type
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': cacheControl
      }
    });
  } catch (err) {
    // Si le logo n'existe pas, retourner une erreur 404
    throw error(404, `Logo not found for team ${teamId}`);
  }
};
