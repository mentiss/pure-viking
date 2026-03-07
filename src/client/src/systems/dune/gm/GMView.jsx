// src/client/src/systems/dune/gm/GMView.jsx
import React, { useState, useEffect } from 'react';
import { useParams }    from 'react-router-dom';
import { useAuth }      from '../../../context/AuthContext.jsx';
import { useSocket }    from '../../../context/SocketContext.jsx';
import { useFetch }     from '../../../hooks/useFetch.js';
import { useSystem }    from '../../../hooks/useSystem.js';

import ToastNotifications   from '../../../components/layout/ToastNotifications.jsx';
import HistoryPanel         from '../../../components/layout/HistoryPanel.jsx';
import ThemeToggle          from '../../../components/ui/ThemeToggle.jsx';
import TableManagementModal from '../../../components/gm/modals/TableManagementModal.jsx';
import DiceConfigModal      from '../../../components/modals/DiceConfigModal.jsx';

import TabSession   from './tabs/TabSession.jsx';
import TabResources from './tabs/TabResources.jsx';
import TabJournal   from '../../../components/gm/tabs/TabJournal.jsx';
import GMDiceModal  from './modals/GMDiceModal.jsx';

const GM_TABS = [
    { id: 'session',    label: '📜 Session' },
    { id: 'ressources', label: '🏺 Ressources' },
    { id: 'journal',    label: '📓 Journal' },
];

const GMView = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    const { system }    = useParams();
    const { logout }    = useAuth();
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();
    const socket        = useSocket();

    // ── Tab actif ────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return GM_TABS.some(t => t.id === hash) ? hash : 'session';
    });

    const changeTab = (id) => {
        setActiveTab(id);
        window.location.hash = id;
    };

    // ── Ressources courantes ──────────────────────────────────────────────────
    const [resources, setResources] = useState({ impulsions: 0, menace: 0, complications: 0 });

    // Chargement initial HTTP — évite d'avoir menace=0 si la page est rechargée
    // après que le socket ait déjà émis ses derniers événements
    useEffect(() => {
        if (!activeSession?.id) return;
        fetchWithAuth(`${apiBase}/session-resources/${activeSession.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setResources(prev => ({ ...prev, ...data })); })
            .catch(console.error);
    }, [activeSession?.id, apiBase]);

    // Mise à jour socket temps réel
    useEffect(() => {
        if (!socket) return;
        const onUpdate = data => setResources(prev => ({ ...prev, ...data }));
        socket.on('session-resources-gm-update', onUpdate);
        socket.on('session-resources-update',    onUpdate);
        return () => {
            socket.off('session-resources-gm-update', onUpdate);
            socket.off('session-resources-update',    onUpdate);
        };
    }, [socket]);

    // ── Modales globales ──────────────────────────────────────────────────────
    const [showDiceModal,  setShowDiceModal]  = useState(false);
    const [showTableMgmt,  setShowTableMgmt]  = useState(false);
    const [showHistory,    setShowHistory]    = useState(false);
    const [showDiceConfig, setShowDiceConfig] = useState(false);
    const [showMenu,       setShowMenu]       = useState(false);

    // ── Déconnexion ───────────────────────────────────────────────────────────
    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
        window.location.href = `/${system}/`;
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--dune-bg)', color: 'var(--dune-text)' }}>
            <ToastNotifications sessionId={activeSession?.id} />

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 shadow-md"
                    style={{ background: 'var(--dune-dark)', borderBottom: '2px solid var(--dune-gold)' }}>
                <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">

                    {/* Titre + table active */}
                    <div className="flex-shrink-0">
                        <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                            🎭 MJ — Dune
                        </div>
                        {activeSession && (
                            <div className="text-[10px]" style={{ color: 'var(--dune-sand)' }}>
                                {activeSession.name}
                                {resources.menace > 0 && (
                                    <span className="ml-2 font-bold" style={{ color: 'var(--dune-red)' }}>
                                        ⚠ Menace {resources.menace}
                                    </span>
                                )}
                                {resources.complications > 0 && (
                                    <span className="ml-2" style={{ color: 'var(--dune-red)' }}>
                                        · {resources.complications} compl.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tabs centraux */}
                    <nav className="flex gap-1 flex-1 justify-center">
                        {GM_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => changeTab(tab.id)}
                                className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                                style={{
                                    background: activeTab === tab.id ? 'var(--dune-gold)' : 'transparent',
                                    color:      activeTab === tab.id ? 'var(--dune-dark)' : 'var(--dune-sand)',
                                    border:     activeTab === tab.id ? 'none' : '1px solid transparent',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {/* Actions header */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setShowDiceModal(true)}
                            className="text-xs px-2 py-1 rounded font-semibold"
                            style={{ background: 'var(--dune-ochre)', color: 'white' }}
                            title="Lancer des dés (MJ)"
                        >
                            🎲 Dés
                        </button>

                        <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                        {/* Menu hamburger */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(v => !v)}
                                className="w-8 h-8 flex items-center justify-center rounded font-bold text-lg"
                                style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-gold)' }}
                                title="Menu"
                            >
                                ☰
                            </button>

                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                    <div
                                        className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden"
                                        style={{ background: 'var(--dune-surface)', border: '1px solid var(--dune-border)' }}
                                    >
                                        {[
                                            { icon: '📋', label: 'Gérer les tables',    action: () => setShowTableMgmt(true) },
                                            { icon: '📜', label: 'Historique des jets', action: () => setShowHistory(true) },
                                            { icon: '🎲', label: 'Config dés',          action: () => setShowDiceConfig(true) },
                                        ].map(item => (
                                            <button
                                                key={item.label}
                                                onClick={() => { setShowMenu(false); item.action(); }}
                                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors"
                                                style={{ color: 'var(--dune-text)' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--dune-surface-alt)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {item.icon} {item.label}
                                            </button>
                                        ))}
                                        <div style={{ borderTop: '1px solid var(--dune-border)' }} />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
                                            style={{ color: 'var(--dune-red)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--dune-surface-alt)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            🚪 Déconnexion
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── CONTENU ─────────────────────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 py-4">
                {activeTab === 'session' && (
                    <TabSession activeSession={activeSession} onlineCharacters={onlineCharacters} />
                )}
                {activeTab === 'ressources' && (
                    <TabResources activeSession={activeSession} />
                )}
                {activeTab === 'journal' && (
                    <TabJournal />
                )}
            </main>

            {/* ── MODALES GLOBALES ────────────────────────────────────────── */}
            {showTableMgmt && (
                <TableManagementModal
                    isOpen={showTableMgmt}
                    onClose={() => setShowTableMgmt(false)}
                    onSelectTable={session => { onSessionChange(session); setShowTableMgmt(false); }}
                    activeSessionId={activeSession?.id}
                />
            )}

            {showDiceModal && (
                <GMDiceModal
                    onClose={() => setShowDiceModal(false)}
                    sessionId={activeSession?.id}
                    menaceDisponible={resources.menace}
                />
            )}

            {showDiceConfig && (
                <DiceConfigModal onClose={() => setShowDiceConfig(false)} />
            )}

            <HistoryPanel
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                sessionId={activeSession?.id}
            />

            <button
                onClick={() => setShowHistory(true)}
                className="fixed bottom-4 right-4 w-10 h-10 rounded-full shadow-lg z-30 flex items-center justify-center text-lg border-2"
                style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)', borderColor: 'var(--dune-ochre)' }}
                title="Historique des jets"
            >
                📜
            </button>
        </div>
    );
};

export default GMView;