// src/client/src/pages/PlayerPage.jsx
// Orchestrateur joueur — machine d'états : selecting → creating → playing.
// Reproduit la cinématique de App.jsx Vikings de façon générique.
// Délègue Sheet et Creation au système via import.meta.glob.

import React, { useState, useEffect, Suspense } from 'react';
import {useParams, useOutletContext, useNavigate} from 'react-router-dom';
import { useAuth }          from '../context/AuthContext.jsx';
import { useFetch }         from '../hooks/useFetch.js';
import { usePlayerSession } from '../hooks/usePlayerSession.js';
import CharacterListModal   from '../components/modals/CharacterListModal.jsx';
import CodeModal            from '../components/modals/CodeModal.jsx';
import DiceAnimationOverlay from "../components/shared/DiceAnimationOverlay.jsx";
import LoadingScreen from "../components/gm/layout/LoadingScreen.jsx";

const SHEETS    = import.meta.glob('../systems/*/Sheet.jsx');
const THEMES    = import.meta.glob('../systems/*/theme.css');

const lazyCache = {};
const getLazyComponent = (glob, key) => {
    if (!lazyCache[key]) {
        lazyCache[key] = React.lazy(glob[key]);
    }
    return lazyCache[key];
};

const PlayerPage = () => {
    const { system, accessUrl }          = useParams();
    const { darkMode, onToggleDarkMode } = useOutletContext();
    const { user, loading: authLoading, logout } = useAuth();
    const fetchWithAuth = useFetch();
    const navigate = useNavigate();

    const apiBase = `/api/${system}`;

    // ── Machine d'états ──────────────────────────────────────────────────────
    const [appState,  setAppState]  = useState('loading');
    const [character, setCharacter] = useState(null);

    // ── État local pour la cinématique de sélection ──────────────────────────
    const [showCharacterList,  setShowCharacterList]  = useState(false);
    const [selectedCharForCode, setSelectedCharForCode] = useState(null);
    const [showCodeModal,       setShowCodeModal]       = useState(false);

    useEffect(() => {
        const key = `../systems/${system}/theme.css`;
        if (THEMES[key]) THEMES[key]();
    }, [system]);

    // ── Résolution initiale (auth + accessUrl) ───────────────────────────────
    useEffect(() => {
        if (authLoading) return;
        if (appState !== 'loading') return;
        let cancelled = false;

        const resolve = async () => {
            // 1. Token valide — utilisateur déjà connecté
            //console.log(user, user.character);
            if (user?.character) {
                if (!accessUrl || user?.character?.accessUrl === accessUrl) {
                    if (!cancelled) {
                        setCharacter(user.character);
                        setAppState('playing');
                        window.history.replaceState({}, '', `/${system}/${user.character.accessUrl}${window.location.hash}`);
                    }
                    return;
                }
            }

            // 2. accessUrl dans l'URL → charger le perso et ouvrir CodeModal
            if (accessUrl) {
                try {
                    const res = await fetch(`${apiBase}/characters/by-url/${accessUrl}`);
                    if (res.ok) {
                        const char = await res.json();
                        if (!cancelled) {
                            setSelectedCharForCode(char);
                            setShowCodeModal(true);
                            setAppState('selecting');
                        }
                    } else {
                        if (!cancelled) setAppState('selecting');
                    }
                } catch {
                    if (!cancelled) setAppState('selecting');
                }
                return;
            }

            // 3. Rien → écran d'accueil
            if (!cancelled) setAppState('selecting');
        };

        resolve();
        return () => { cancelled = true; };
    }, [authLoading, user, system, accessUrl, apiBase]);

    // ── Persistance générique ────────────────────────────────────────────────
    const handleCharacterUpdate = (updatedOrFn) => {
        setCharacter(prev => {
            const updated = typeof updatedOrFn === 'function' ? updatedOrFn(prev) : updatedOrFn;
            fetchWithAuth(`${apiBase}/characters/${updated.id}`, {
                method: 'PUT',
                body: JSON.stringify(updated),
            }).catch(err => console.error('[PlayerPage] PUT failed:', err));
            return updated;
        });
    };

    const handleCharacterHasUpdated = (updatedOrFn) => {
        setCharacter(prev => {
            const updates = typeof updatedOrFn === 'function' ? updatedOrFn(prev) : updatedOrFn;
            return { ...prev, ...updates };
        });
    } ;

    const handleCharacterReload = async () => {
        if (!character?.id) return;
        try {
            const res = await fetchWithAuth(`${apiBase}/characters/${character.id}`);
            if (res.ok) setCharacter(await res.json());
        } catch (err) {
            console.error('[PlayerPage] Reload failed:', err);
        }
    };

    // ── Sockets génériques ───────────────────────────────────────────────────
    const { journalUnread, resetJournalUnread } = usePlayerSession({
        character:          appState === 'playing' ? character : null,
        onCharacterUpdate:      handleCharacterUpdate,
        onCharacterHasUpdated:  handleCharacterHasUpdated,
        onCharacterReload:      handleCharacterReload,
        apiBase,
    });

    // ── Cinématique sélection → CodeModal → playing ──────────────────────────
    const handleCharacterListSelect = (char) => {
        setSelectedCharForCode(char);
        setShowCodeModal(true);
    };

    const handleCodeSuccess = (loggedCharacter) => {
        setShowCodeModal(false);
        setSelectedCharForCode(null);
        setCharacter(loggedCharacter);
        setAppState('playing');
        window.history.pushState({}, '', `/${system}/${loggedCharacter.accessUrl}`);
    };

    // ── Handlers navigation ──────────────────────────────────────────────────
    const handleCreated = (newCharacter) => {
        setCharacter(newCharacter);
        setAppState('playing');
        window.history.pushState({}, '', `/${system}/${newCharacter.accessUrl}`);
    };

    const handleLogout = async () => {
        await logout();
        setCharacter(null);
        setAppState('selecting');
        window.history.pushState({}, '', `/${system}/`);
    };

    // ── Vérification composants système ─────────────────────────────────────
    const sheetKey    = `../systems/${system}/Sheet.jsx`;

    if (!SHEETS[sheetKey]) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-4">⚔️</div>
                    <h1 className="text-2xl font-bold mb-2">Système incomplet</h1>
                    <p className="text-gray-400">
                        Le système <code className="bg-gray-700 px-1 rounded">"{system}"</code> n'a pas tous ses composants (Sheet, Creation).
                    </p>
                </div>
            </div>
        );
    }

    const SystemSheet    = getLazyComponent(SHEETS, sheetKey);

    // ── Rendu ────────────────────────────────────────────────────────────────
    if (appState === 'loading') return <LoadingScreen />;

    if (appState === 'selecting') {
        return (
            <>
                {/* Écran d'accueil générique */}
                <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                    <div className="text-center space-y-4">
                        <div className="text-5xl mb-6">🎲</div>
                        <button
                            onClick={() => navigate(`/${system}/creation`)}
                            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors block"
                        >
                            ⚔️ Créer un nouveau personnage
                        </button>
                        <button
                            onClick={() => setShowCharacterList(true)}
                            className="w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg transition-colors block"
                        >
                            📋 Se connecter
                        </button>
                    </div>
                </div>

                {/* Modale liste — comportement identique à App.jsx */}
                <CharacterListModal
                    isOpen={showCharacterList}
                    onClose={() => setShowCharacterList(false)}
                    onSelect={handleCharacterListSelect}
                />

                {/* CodeModal — comportement identique à App.jsx */}
                <CodeModal
                    isOpen={showCodeModal}
                    onClose={() => { setShowCodeModal(false); setSelectedCharForCode(null); }}
                    character={selectedCharForCode}
                    onSuccess={handleCodeSuccess}
                />
            </>
        );
    }

    // appState === 'playing'
    return (
        <>
            <Suspense fallback={<LoadingScreen />}>
                <SystemSheet
                    character={character}
                    onCharacterUpdate={handleCharacterUpdate}
                    onLogout={handleLogout}
                    journalUnread={journalUnread}
                    onJournalRead={resetJournalUnread}
                    darkMode={darkMode}
                    onToggleDarkMode={onToggleDarkMode}
                />
                <DiceAnimationOverlay />
            </Suspense>

            {/* CodeModal disponible en mode playing aussi (changer de perso depuis Sheet) */}
            <CodeModal
                isOpen={showCodeModal}
                onClose={() => { setShowCodeModal(false); setSelectedCharForCode(null); }}
                character={selectedCharForCode}
                onSuccess={handleCodeSuccess}
            />
            <CharacterListModal
                isOpen={showCharacterList}
                currentCharId={character?.id}
                onClose={() => setShowCharacterList(false)}
                onSelect={handleCharacterListSelect}
            />
        </>
    );
};

export default PlayerPage;