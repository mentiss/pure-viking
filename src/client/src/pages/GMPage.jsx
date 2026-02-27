// src/client/src/pages/GMPage.jsx
// Page GM : gère l'authentification avant d'afficher le GMApp du système actif.
// Pour ajouter un système : une ligne d'import + une entrée dans SYSTEM_GM_APPS.

import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import CodeModal from '../components/shared/CodeModal.jsx';

import VikingsGMApp from '../systems/vikings/GMApp.jsx';
// import NoctisGMApp from '../systems/noctis/GMApp.jsx';

const SYSTEM_GM_APPS = {
    vikings: VikingsGMApp,
    // noctis: NoctisGMApp,
};

const GMPage = () => {
    const { system } = useParams();
    const { darkMode, onToggleDarkMode } = useOutletContext();
    const { user } = useAuth();
    const [gmCharacter, setGmCharacter] = useState(null);
    const [showCodeModal, setShowCodeModal] = useState(false);

    const SystemGMApp = SYSTEM_GM_APPS[system];

    useEffect(() => {
        if (!user?.isGM) {
            fetch(`/api/${system}/characters/by-url/this-is-MJ`)
                .then(r => r.json())
                .then(character => { if (character?.id === -1) setGmCharacter(character); })
                .catch(err => console.error('[GMPage] Error loading GM character:', err));
        }
    }, [system, user]);

    // Système inconnu
    if (!SystemGMApp) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">🎭</div>
                    <h1 className="text-2xl font-bold mb-2">Interface GM indisponible</h1>
                    <p className="text-gray-400">Le système <code>"{system}"</code> n'a pas d'interface GM.</p>
                </div>
            </div>
        );
    }

    // Utilisateur déjà authentifié comme GM
    if (user?.isGM) {
        return <SystemGMApp darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />;
    }

    // Chargement du personnage GM en cours
    if (!gmCharacter) {
        return (
            <div className="min-h-screen bg-viking-parchment dark:bg-gray-900 flex items-center justify-center">
                <div className="text-2xl text-viking-bronze">⚔️ Chargement...</div>
            </div>
        );
    }

    // Page de login GM
    return (
        <>
            <div className="min-h-screen bg-viking-parchment dark:bg-gray-900 flex items-center justify-center">
                <div className="max-w-md text-center p-6 bg-white dark:bg-viking-brown rounded-lg border-4 border-viking-bronze">
                    <div className="text-6xl mb-4">🎭</div>
                    <h2 className="text-2xl font-bold text-viking-brown dark:text-viking-parchment mb-4">
                        Interface Maître de Jeu
                    </h2>
                    <p className="text-viking-leather dark:text-viking-bronze mb-6">
                        Authentification requise pour accéder à la vue MJ
                    </p>
                    <button
                        onClick={() => setShowCodeModal(true)}
                        className="px-6 py-3 bg-viking-bronze text-viking-brown rounded-lg font-semibold hover:bg-viking-leather w-full"
                    >
                        🔐 S'authentifier comme MJ
                    </button>
                    <a
                        href={`/${system}/`}
                        className="block mt-3 px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 w-full text-center"
                    >
                        Retour à l'accueil
                    </a>
                </div>
            </div>

            <CodeModal
                isOpen={showCodeModal}
                onClose={() => setShowCodeModal(false)}
                character={gmCharacter}
                onSuccess={() => setShowCodeModal(false)}
            />
        </>
    );
};

export default GMPage;