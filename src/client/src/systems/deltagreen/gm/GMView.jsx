// src/client/src/systems/deltagreen/gm/GMView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Interface GM Delta Green.
// Onglets : Session (agents) + Journal.
// Pas de TabCombat en v1 — initiative légère dans TabSession.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useAuth }   from '../../../context/AuthContext.jsx';

import ToastNotifications   from '../../../components/layout/ToastNotifications.jsx';
import TableManagementModal from '../../../components/gm/modals/TableManagementModal.jsx';
import TabJournal           from '../../../components/gm/tabs/TabJournal.jsx';
import TabSession from "./tabs/TabSession.jsx";
import DiceHistoryPage from "../../../components/layout/DiceHistoryPage.jsx";
import deltgreenConfig from "../config.jsx";

const GM_TABS = [
    { id: 'session', label: 'Agents'   },
    { id: 'journal', label: 'Journal'  },
    { id: 'historique', label: 'Historique'  },
];

const GMView = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    const { logout }    = useAuth();

    const [activeTab,      setActiveTab]      = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return GM_TABS.some(t => t.id === hash) ? hash : 'session';
    });
    const [showTableModal, setShowTableModal] = useState(false);

    const changeTab = (id) => {
        setActiveTab(id);
        // eslint-disable-next-line react-hooks/immutability
        window.location.hash = id;
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div
            className="min-h-screen flex flex-col bg-default text-default"
            data-theme={darkMode ? 'dark' : 'light'}
        >
            <ToastNotifications
                sessionId={activeSession.id}
                renderDiceToast={deltgreenConfig.dice.renderHistoryEntry}
            />

            {/* ── En-tête GM ──────────────────────────────────────────────── */}
            <header className="dg-header px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="dg-font-admin text-lg font-black tracking-widest uppercase text-white">
                        DELTA GREEN — HANDLER
                    </h1>
                    {activeSession && (
                        <span className="text-xs font-mono text-gray-400 border border-gray-700 px-2 py-0.5">
                            {activeSession.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowTableModal(true)}
                        className="text-xs font-mono border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-3 py-1 transition-colors"
                    >
                        Table
                    </button>
                    <button
                        onClick={onToggleDarkMode}
                        className="text-gray-400 hover:text-white text-xs font-mono px-2 py-1 border border-gray-700 hover:border-gray-500 transition-colors"
                    >
                        {darkMode ? '◑' : '○'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-xs font-mono border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 px-3 py-1 transition-colors"
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            {/* ── Navigation ──────────────────────────────────────────────── */}
            <nav className="flex border-b border-default bg-surface">
                {GM_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => changeTab(tab.id)}
                        className={[
                            'px-5 py-2 text-xs font-mono uppercase tracking-wider transition-colors',
                            activeTab === tab.id
                                ? 'text-default border-b-2 border-accent'
                                : 'text-muted hover:text-default',
                        ].join(' ')}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* ── Contenu ─────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
                {activeTab === 'session' && (
                    <TabSession
                        activeSession={activeSession}
                        onlineCharacters={onlineCharacters}
                    />
                )}
                {activeTab === 'journal' && (
                    <div className="max-w-4xl mx-auto px-4 py-6">
                        <TabJournal characterId={-1} />
                    </div>
                )}
                {activeTab === 'historique' && (
                    <div className="max-w-4xl mx-auto px-4 py-6">
                        <DiceHistoryPage
                            sessionId={activeSession.id}
                            renderHistoryEntry={deltgreenConfig.dice.renderHistoryEntry}
                        />
                    </div>
                )}
            </main>

            {/* ── Modale gestion table ─────────────────────────────────────── */}
            {showTableModal && (
                <TableManagementModal
                    isOpen
                    activeSession={activeSession}
                    onSelectTable={(session) => { onSessionChange?.(session); setShowTableModal(false); }}
                    onClose={() => setShowTableModal(false)}
                />
            )}
        </div>
    );
};

export default GMView;