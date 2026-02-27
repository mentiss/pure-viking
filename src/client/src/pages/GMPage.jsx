// src/client/src/pages/GMPage.jsx
// Shell GM : auth + chargement dynamique de GMView via import.meta.glob.
// useGMSession gère les sockets génériques (session active, présence en ligne).

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useGMSession } from '../hooks/useGMSession.js';
import CodeModal from '../components/modals/CodeModal.jsx';

const SYSTEM_GM_APPS = import.meta.glob('../systems/*/GMApp.jsx');

const GMPage = () => {
    const { system }                     = useParams();
    const { darkMode, onToggleDarkMode } = useOutletContext();
    const { user }                       = useAuth();
    const [gmCharacter,    setGmCharacter]    = useState(null);
    const [showCodeModal,  setShowCodeModal]  = useState(false);

    const apiBase   = `/api/${system}`;
    const moduleKey = `../systems/${system}/GMApp.jsx`;
    const loader    = SYSTEM_GM_APPS[moduleKey];

    // ── Sockets génériques GM ────────────────────────────────────────────────
    const { activeSession, setActiveSession, onlineCharacters } = useGMSession({ apiBase });

    // ── Chargement du personnage GM pour l'auth ──────────────────────────────
    useEffect(() => {
        if (user?.isGM || !loader) return;

        fetch(`${apiBase}/characters/by-url/this-is-MJ`)
            .then(r => r.json())
            .then(character => { if (character?.id === -1) setGmCharacter(character); })
            .catch(err => console.error('[GMPage] Error loading GM character:', err));
    }, [system, user, loader, apiBase]);

    if (!loader) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">🎭</div>
                    <h1 className="text-2xl font-bold mb-2">Interface GM indisponible</h1>
                    <p className="text-gray-400">
                        Le système <code className="bg-gray-700 px-1 rounded">"{system}"</code> n'a pas d'interface GM.
                    </p>
                </div>
            </div>
        );
    }

    const SystemGMApp = React.lazy(loader);

    if (user?.isGM) {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <SystemGMApp
                    activeSession={activeSession}
                    onSessionChange={setActiveSession}
                    onlineCharacters={onlineCharacters}
                    darkMode={darkMode}
                    onToggleDarkMode={onToggleDarkMode}
                />
            </Suspense>
        );
    }

    if (!gmCharacter) return <LoadingScreen />;

    return (
        <>
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="max-w-md text-center p-6 bg-gray-800 rounded-lg border border-gray-600">
                    <div className="text-6xl mb-4">🎭</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Interface Maître de Jeu</h2>
                    <p className="text-gray-400 mb-6">Authentification requise pour accéder à la vue MJ</p>
                    <button
                        onClick={() => setShowCodeModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 w-full"
                    >
                        🔐 S'authentifier comme MJ
                    </button>
                    <a
                        href={`/${system}/`}
                        className="block mt-3 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-500 w-full text-center"
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

const LoadingScreen = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-2xl text-white animate-pulse">Chargement...</div>
    </div>
);

export default GMPage;