// src/client/src/pages/PlayerPage.jsx
// Page joueur : charge l'App du système actif.
// Pour ajouter un système : une ligne d'import + une entrée dans SYSTEM_APPS.

import React from 'react';
import { useParams, useOutletContext } from 'react-router-dom';

import VikingsApp from '../systems/vikings/App.jsx';
// import NoctisApp from '../systems/noctis/App.jsx';

const SYSTEM_APPS = {
    vikings: VikingsApp,
    // noctis: NoctisApp,
};

const PlayerPage = () => {
    const { system } = useParams();
    const { darkMode, onToggleDarkMode } = useOutletContext();

    const SystemApp = SYSTEM_APPS[system];

    if (!SystemApp) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">⚔️</div>
                    <h1 className="text-2xl font-bold mb-2">Système indisponible</h1>
                    <p className="text-gray-400">Le système <code>"{system}"</code> n'est pas disponible.</p>
                </div>
            </div>
        );
    }

    return <SystemApp darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />;
};

export default PlayerPage;