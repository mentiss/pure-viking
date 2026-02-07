// AppRouter.js - Router principal

import React, {useState, useEffect} from "react";
import GMView from "./components/GMView";
import App from "./App";
import {loadTheme, saveTheme} from "./tools/utils";
import CodeModal from "./components/CodeModal.jsx";
import {useAuth} from "./context/AuthContext.jsx";

const AppRouter = () => {
    const { useState, useEffect } = React;
    const { user } = useAuth();
    const [darkMode, setDarkMode] = useState(false);
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    const [showGMCodeModal, setShowGMCodeModal] = useState(false);
    const [gmCharacter, setGmCharacter] = useState(null);
    
    useEffect(() => {
        // Charger le thème
        const savedTheme = loadTheme();
        setDarkMode(savedTheme);
        if (savedTheme) {
            document.documentElement.classList.add('dark');
        }
        
        // Listener changement URL
        const handlePopState = () => {
            setCurrentPath(window.location.pathname);
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (currentPath === '/mj' || currentPath === '/gm') {
            fetch('/api/characters/by-url/this-is-MJ')
                .then(res => res.json())
                .then(character => {
                    if (character?.id === -1) {
                        setGmCharacter(character);
                    }
                })
                .catch(err => console.error('Error loading GM character:', err));
        }
    }, [currentPath]);
    
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        saveTheme(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };
    
    // Route /mj → GMView
    if (currentPath === '/mj' || currentPath === '/gm') {
        if (!user || !user.isGM) {
            // Si le personnage GM n'est pas encore chargé
            if (!gmCharacter) {
                return (
                    <div className="min-h-screen bg-viking-parchment dark:bg-gray-900 flex items-center justify-center">
                        <div className="text-2xl text-viking-bronze">⚔️ Chargement...</div>
                    </div>
                );
            }

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
                                onClick={() => setShowGMCodeModal(true)}
                                className="px-6 py-3 bg-viking-bronze text-viking-brown rounded-lg font-semibold hover:bg-viking-leather w-full"
                            >
                                🔐 S'authentifier comme MJ
                            </button>
                            <button
                                onClick={() => {
                                    window.history.pushState({}, '', '/');
                                    setCurrentPath('/');
                                }}
                                className="mt-3 px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 w-full"
                            >
                                Retour à l'accueil
                            </button>
                        </div>
                    </div>

                    {/* Modal de code GM */}
                    <CodeModal
                        isOpen={showGMCodeModal}
                        onClose={() => setShowGMCodeModal(false)}
                        character={gmCharacter}
                        onSuccess={() => {
                            setShowGMCodeModal(false);
                            // Pas besoin de setState, le useAuth va se mettre à jour
                            // et le composant va re-render avec user.isGM = true
                        }}
                    />
                </>
            );
        }

        return <GMView darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
    }
    
    // Route / → App normal
    return <App darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
};

export default AppRouter;