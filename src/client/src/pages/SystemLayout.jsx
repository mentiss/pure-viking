// src/client/src/pages/SystemLayout.jsx
// Shell racine pour toutes les routes d'un système.
// Valide le slug via SystemsContext (plus de KNOWN_SYSTEMS statique).
// Affiche un loader pendant le fetch initial des systèmes.

import React from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useSystems } from '../context/SystemsContext.jsx';

const SystemLayout = ({ darkMode, onToggleDarkMode }) => {
    const { system } = useParams();
    const { systems, error } = useSystems();

    // Chargement initial
    if (systems === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-2xl animate-pulse">Chargement...</div>
            </div>
        );
    }

    // Erreur de chargement
    if (error && systems.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold mb-2">Serveur indisponible</h1>
                    <p className="text-gray-400">Impossible de charger les systèmes de jeu.</p>
                </div>
            </div>
        );
    }

    const isKnown = systems.some(s => s.slug === system);

    if (!isKnown) {
        const first = systems[0];
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">⚔️</div>
                    <h1 className="text-2xl font-bold mb-2">Système inconnu</h1>
                    <p className="text-gray-400 mb-6">
                        Le système <code className="bg-gray-700 px-1 rounded">"{system}"</code> n'est pas disponible.
                    </p>
                    {first && (
                        <a
                        href={`/${first.slug}/`}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 inline-block"
                        >
                        Aller sur {first.label}
                        </a>
                        )}
                </div>
            </div>
        );
    }

    return <Outlet context={{ darkMode, onToggleDarkMode }} />;
};

export default SystemLayout;