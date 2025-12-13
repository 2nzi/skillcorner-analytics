import { writable } from 'svelte/store';

/**
 * Store pour tracker si l'animation d'intro a déjà été jouée
 * Persiste pendant toute la session (tant que l'onglet est ouvert)
 */
export const hasPlayedIntroAnimation = writable(false);
