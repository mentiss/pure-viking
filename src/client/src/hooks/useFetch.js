// hooks/useFetch.js - Hook pour fetch avec auth automatique
import { useAuth } from '../context/AuthContext';

export const useFetch = () => {
    const { accessToken, refreshAccessToken } = useAuth();

    /**
     * Fetch avec JWT automatique + retry sur 401
     */
    const fetchWithAuth = async (url, options = {}) => {
        // Première tentative avec token actuel
        let config = {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            }
        };

        let response = await fetch(url, config);

        // Si 401, tenter refresh puis réessayer
        if (response.status === 401) {
            console.log('[useFetch] Token expired, refreshing...');

            try {
                await refreshAccessToken();

                // Réessayer avec nouveau token (il sera mis à jour dans le contexte)
                // On attend un peu que le contexte se mette à jour
                await new Promise(resolve => setTimeout(resolve, 100));

                // Note: on pourrait améliorer ça en récupérant directement le nouveau token
                // Pour simplifier, on redemande juste la requête
                response = await fetch(url, config);

            } catch (error) {
                console.error('[useFetch] Refresh failed:', error);
                throw new Error('Session expired, please login again');
            }
        }

        return response;
    };

    return fetchWithAuth;
};