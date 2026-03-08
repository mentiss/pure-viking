// src/client/src/pages/HomePage.jsx
// Page d'accueil du VTT — liste les systèmes disponibles.
// Utilise SystemsContext (déjà chargé au boot) — aucun fetch supplémentaire.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSystems } from '../context/SystemsContext.jsx';

// Emojis décoratifs par slug — fallback générique si slug inconnu
const SLUG_ICONS = {
    vikings: '⚔️',
    dune:    '🏜️',
    noctis:  '🌑',
    wod:     '🐺',
    cthulhu: '🐙',
    cyberpunk: '🤖',
};

const HomePage = ({ darkMode, onToggleDarkMode }) => {
    const { systems, error } = useSystems();
    const navigate = useNavigate();

    // ── Loading ───────────────────────────────────────────────────────────────
    if (systems === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-2xl animate-pulse">Chargement...</div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: '#1a1a2e', color: '#e0e0e0' }}
        >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)' }}
            >
                <div>
                    <h1 className="text-2xl font-bold tracking-wide" style={{ color: '#e8c96e' }}>
                        Mentiss VTT
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Plateforme de jeu de rôle en ligne
                    </p>
                </div>

                {/* Toggle dark mode */}
                <button
                    onClick={onToggleDarkMode}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-opacity hover:opacity-75"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                    title={darkMode ? 'Mode jour' : 'Mode nuit'}
                >
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </header>

            {/* ── Corps ──────────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

                <div className="text-5xl mb-4">🎲</div>
                <h2 className="text-3xl font-bold mb-2 text-center" style={{ color: '#e8c96e' }}>
                    Choisissez votre système
                </h2>
                <p className="text-sm mb-10 text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Sélectionnez un système de jeu pour accéder à votre fiche personnage
                </p>

                {/* ── Erreur de chargement ──────────────────────────────────── */}
                {error && (
                    <div
                        className="mb-6 px-4 py-3 rounded-lg text-sm"
                        style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', color: '#fca5a5' }}
                    >
                        ⚠️ Impossible de contacter le serveur — {error}
                    </div>
                )}

                {/* ── Liste des slugs ───────────────────────────────────────── */}
                {systems.length === 0 && !error ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Aucun système disponible.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
                        {systems.map(system => (
                            <button
                                key={system.slug}
                                onClick={() => navigate(`/${system.slug}/`)}
                                className="group flex flex-col items-center gap-3 p-6 rounded-2xl text-center transition-all duration-200"
                                style={{
                                    background:  'rgba(255,255,255,0.05)',
                                    border:      '1.5px solid rgba(255,255,255,0.1)',
                                    cursor:      'pointer',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background    = 'rgba(232,201,110,0.1)';
                                    e.currentTarget.style.borderColor   = 'rgba(232,201,110,0.5)';
                                    e.currentTarget.style.transform     = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow     = '0 8px 24px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background    = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.transform     = 'translateY(0)';
                                    e.currentTarget.style.boxShadow     = 'none';
                                }}
                            >
                                <span className="text-4xl">
                                    {SLUG_ICONS[system.slug] ?? '🎭'}
                                </span>
                                <div>
                                    <div className="font-bold text-lg" style={{ color: '#e8c96e' }}>
                                        {system.label}
                                    </div>
                                    <div className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                        /{system.slug}
                                    </div>
                                </div>
                                <div
                                    className="text-xs px-3 py-1 rounded-full mt-1 transition-colors"
                                    style={{
                                        background: 'rgba(255,255,255,0.07)',
                                        color:      'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    Accéder →
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer
                className="px-6 py-3 text-center text-xs border-t"
                style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}
            >
                Mentiss VTT — {systems?.length ?? 0} système{systems?.length !== 1 ? 's' : ''} disponible{systems?.length !== 1 ? 's' : ''}
            </footer>
        </div>
    );
};

export default HomePage;