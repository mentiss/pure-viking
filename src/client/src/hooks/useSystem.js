// src/client/src/hooks/useSystem.js
// Expose les infos du système actif depuis l'URL (:system param de React Router).
// Tous les appels fetch doivent utiliser apiBase au lieu de /api en dur.
//
// Usage :
//   const { slug, label, apiBase } = useSystem();
//   fetch(`${apiBase}/characters/${id}`)  →  /api/vikings/characters/123

import { useParams } from 'react-router-dom';

// Registre frontend — doit rester en phase avec src/server/systems/*/config.js
const SYSTEMS = {
    vikings: { slug: 'vikings', label: 'Pure Vikings' },
    // noctis: { slug: 'noctis', label: 'Noctis Solis' },
};

export const DEFAULT_SYSTEM = 'vikings';

/**
 * Retourne les infos du système actif depuis le param :system de la route.
 * @returns {{ slug: string, label: string, apiBase: string, isValid: boolean }}
 */
export function useSystem() {
    const { system } = useParams();
    const slug = system && SYSTEMS[system] ? system : DEFAULT_SYSTEM;
    const config = SYSTEMS[slug];

    return {
        slug,
        label: config.label,
        apiBase: `/api/${slug}`,
        isValid: !!SYSTEMS[system],
    };
}

/**
 * Version sans hook (pour les contextes hors composant React, ex: useFetch).
 * Lit le pathname directement.
 * @returns {string} slug
 */
export function getSystemFromPath(pathname = window.location.pathname) {
    const parts = pathname.split('/').filter(Boolean);
    return parts[0] && SYSTEMS[parts[0]] ? parts[0] : DEFAULT_SYSTEM;
}

export default useSystem;