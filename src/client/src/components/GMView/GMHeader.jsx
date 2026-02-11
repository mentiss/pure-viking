// components/GMView/GMHeader.jsx - Header GM avec tabs intégrés, menu hamburger et sélecteur de table
import React, { useState } from 'react';
import ThemeToggle from '../shared/ThemeToggle.jsx';

const GM_TABS = [
    { id: 'combat', label: '⚔️ Combat' },
    { id: 'session', label: '📜 Session' },
];

const GMHeader = ({
                      darkMode,
                      onToggleDarkMode,
                      activeSession,
                      activeTab,
                      onTabChange,
                      onManageTables,
                      onGoHome,
                      onLogout,
                      onOpenDice
                  }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <header className="bg-viking-bronze border-b-4 border-viking-leather shadow-lg sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    {/* Titre + Table active */}
                    <div className="shrink-0">
                        <h1 className="text-2xl font-bold text-viking-brown">🎭 Interface MJ</h1>
                        {activeSession && (
                            <div className="text-sm text-viking-brown/70">
                                Table : <span className="font-semibold">{activeSession.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Tabs centraux */}
                    <div className="flex gap-1 mx-4">
                        {GM_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-viking-brown text-viking-parchment shadow-inner'
                                        : 'bg-viking-leather/30 text-viking-brown hover:bg-viking-leather/50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onOpenDice}
                            className="px-3 py-1 bg-viking-success text-white rounded text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                            🎲 Lancer dés
                        </button>

                        <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                        {/* Menu hamburger */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="px-3 py-2 bg-viking-leather text-viking-parchment rounded font-semibold hover:bg-viking-brown"
                            >
                                ☰
                            </button>

                            {showMenu && (
                                <>
                                    {/* Overlay pour fermer le menu */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowMenu(false)}
                                    />

                                    {/* Menu */}
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-viking-brown rounded-lg shadow-xl border-2 border-viking-bronze z-50">
                                        <button
                                            onClick={() => {
                                                onManageTables();
                                                setShowMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-viking-parchment dark:hover:bg-gray-800 border-b border-viking-leather/30 dark:border-viking-bronze/30 text-viking-brown dark:text-viking-parchment rounded-t-lg"
                                        >
                                            📋 Gérer les tables
                                        </button>

                                        <button
                                            onClick={() => {
                                                onGoHome();
                                                setShowMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-viking-parchment dark:hover:bg-gray-800 border-b border-viking-leather/30 dark:border-viking-bronze/30 text-viking-brown dark:text-viking-parchment"
                                        >
                                            🏠 Retour à l'accueil
                                        </button>

                                        <button
                                            onClick={() => {
                                                onLogout();
                                                setShowMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-viking-parchment dark:hover:bg-gray-800 text-red-600 dark:text-red-400 rounded-b-lg"
                                        >
                                            🚪 Déconnexion
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default GMHeader;