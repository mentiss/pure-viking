// src/client/src/context/SystemsContext.jsx
// Charge la liste des systèmes disponibles depuis le backend au démarrage.
// Source de vérité unique — plus aucune liste statique côté frontend.
// Consommé par useSystem() et SystemLayout.

import React, { createContext, useContext, useState, useEffect } from 'react';

const SystemsContext = createContext(null);

export const SystemsProvider = ({ children }) => {
    const [systems, setSystems]   = useState(null); // null = chargement en cours
    const [error, setError]       = useState(null);

    useEffect(() => {
        fetch('/api/systems')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => setSystems(data))
            .catch(err => {
                console.error('[SystemsProvider] Failed to load systems:', err);
                setError(err.message);
                setSystems([]); // on débloque le rendu même en cas d'erreur
            });
    }, []);

    return (
        <SystemsContext.Provider value={{ systems, error }}>
            {children}
        </SystemsContext.Provider>
    );
};

/**
 * @returns {{ systems: Array<{slug, label}>|null, error: string|null }}
 */
export const useSystems = () => useContext(SystemsContext);