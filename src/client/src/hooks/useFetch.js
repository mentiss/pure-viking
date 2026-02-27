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

export const useFetch = () => {
    const { accessToken, refreshAccessToken } = useAuth();

    const fetchWithAuth = async (url, options = {}) => {
        const finalUrl = toSystemUrl(url);

        const config = {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            }
        };

        let response = await fetch(finalUrl, config);

        // Token expiré → refresh puis retry
        if (response.status === 401) {
            try {
                await refreshAccessToken();
                await new Promise(resolve => setTimeout(resolve, 100));
                response = await fetch(finalUrl, config);
            } catch (error) {
                console.error('[useFetch] Refresh failed:', error);
                throw new Error('Session expired, please login again');
            }
        }

        return response;
    };

    return fetchWithAuth;
};

// Export nommé pour les fetch() nus sans JWT (ex: état combat public)
export { toSystemUrl };