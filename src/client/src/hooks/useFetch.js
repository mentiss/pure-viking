// src/client/src/hooks/useFetch.js
// Hook fetch avec JWT automatique + préfixage système automatique.
//
// Les URLs /api/<ressource> sont réécrites en /api/:system/<ressource>
// selon le système actif dans l'URL courante, sans rien changer dans les composants.
//
// Exemples :
//   fetchWithAuth('/api/characters/42')      →  /api/vikings/characters/42
//   fetchWithAuth('/api/sessions')           →  /api/vikings/sessions
//   fetchWithAuth('/api/online-characters')  →  inchangé (route globale)
//   fetchWithAuth('https://...')             →  inchangé (URL absolue)

import { useAuth } from '../context/AuthContext';
import { getSystemFromPath } from './useSystem';

// Routes montées sans préfixe système dans server.js
const GLOBAL_ROUTES = [
    '/api/online-characters',
    '/api/health',
];

/**
 * Préfixe une URL /api/<ressource> en /api/:system/<ressource>.
 * Laisse inchangées les URLs absolues et les routes globales.
 */
function toSystemUrl(url) {
    if (!url.startsWith('/api/')) return url;
    if (GLOBAL_ROUTES.some(r => url.startsWith(r))) return url;

    // Déjà préfixée ? ex: /api/vikings/... → on ne double pas
    const system = getSystemFromPath();
    if (url.startsWith(`/api/${system}/`)) return url;

    // /api/characters/42  →  /api/vikings/characters/42
    return `/api/${system}${url.substring(4)}`; // substring(4) = enlève '/api'
}

/**
 * Construit les headers avec le token fourni.
 * Séparé pour pouvoir reconstruire avec un nouveau token après refresh.
 */
function buildHeaders(options, token) {
    return {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
}

export const useFetch = () => {
    const { accessToken, refreshAccessToken } = useAuth();

    const fetchWithAuth = async (url, options = {}) => {
        const finalUrl = toSystemUrl(url);

        // Premier essai avec le token courant
        let response = await fetch(finalUrl, {
            ...options,
            headers: buildHeaders(options, accessToken),
        });

        // Token expiré → refresh, puis retry avec le NOUVEAU token
        if (response.status === 401) {
            try {
                const newToken = await refreshAccessToken(); // retourne le nouveau token directement

                if (!newToken) {
                    // Refresh échoué (session expirée côté serveur) → on laisse remonter
                    throw new Error('Session expired, please login again');
                }

                // Retry avec le nouveau token — pas de setTimeout, on a le token en main
                response = await fetch(finalUrl, {
                    ...options,
                    headers: buildHeaders(options, newToken),
                });
            } catch (error) {
                console.error('[useFetch] Refresh failed:', error);
                throw error;
            }
        }

        return response;
    };

    return fetchWithAuth;
};

// Export nommé pour les fetch() nus sans JWT (ex: état combat public)
export { toSystemUrl };