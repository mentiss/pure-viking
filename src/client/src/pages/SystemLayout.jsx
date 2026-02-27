// src/client/src/pages/SystemLayout.jsx
// Layout racine pour toutes les routes d'un système.
// Responsabilités :
//   - Vérifier que le slug système est connu
//   - Afficher une page d'erreur si inconnu
//   - Passer darkMode / onToggleDarkMode aux pages enfants via Outlet context

import React from 'react';
import { useParams, Outlet } from 'react-router-dom';

const KNOWN_SYSTEMS = ['vikings'];

const SystemLayout = ({ darkMode, onToggleDarkMode }) => {
    const { system } = useParams();

    if (!KNOWN_SYSTEMS.includes(system)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">⚔️</div>
                    <h1 className="text-2xl font-bold mb-2">Système inconnu</h1>
                    <p className="text-gray-400 mb-6">
                        Le système <code className="bg-gray-700 px-1 rounded">"{system}"</code> n'est pas disponible.
                    </p>
                    <a
                        href="/vikings/"
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 inline-block"
                    >
                        Retour à Pure Vikings
                    </a>
                </div>
            </div>
        );
    }

    return <Outlet context={{ darkMode, onToggleDarkMode }} />;
};

export default SystemLayout;