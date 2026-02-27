// src/client/src/hooks/useSystem.js
// Expose les infos du système actif depuis le param :system de la route.
// La validation du slug se fait via le contexte SystemsContext (source : backend).
// Plus aucune liste statique ici.
//
// Usage :
//   const { slug, label, apiBase, isValid } = useSystem();
//   fetch(`${apiBase}/characters/${id}`)  →  /api/vikings/characters/123

import { useParams } from 'react-router-dom';
import { useSystems } from '../context/SystemsContext.jsx';

export const DEFAULT_SYSTEM = 'vikings';

/**
 * Retourne les infos du système actif.
 * @returns {{ slug: string, label: string, apiBase: string, isValid: boolean, isLoading: boolean }}
 */
export function useSystem() {
    const { system } = useParams();
    const { systems } = useSystems();

    // Tant que le fetch n'est pas terminé
    if (!systems) {
        return { slug: system || DEFAULT_SYSTEM, label: null, apiBase: `/api/${system || DEFAULT_SYSTEM}`, isValid: false, isLoading: true };
    }

    const found = systems.find(s => s.slug === system);

    return {
        slug:      found?.slug  ?? DEFAULT_SYSTEM,
        label:     found?.label ?? null,
        apiBase:   `/api/${found?.slug ?? DEFAULT_SYSTEM}`,
        isValid:   !!found,
        isLoading: false,
    };
}

/**
 * Version sans hook (pour les contextes hors composant React, ex: useFetch utilitaire).
 * Lit le pathname directement — ne peut pas valider, juste extraire.
 * @returns {string} slug
 */
export function getSystemFromPath(pathname = window.location.pathname) {
    const parts = pathname.split('/').filter(Boolean);
    return parts[0] ?? DEFAULT_SYSTEM;
}

export default useSystem;