// src/client/src/systems/cyberpunk/gm/GMView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Interface GM Cyberpunk — 5 onglets :
//   Session   → liste perso, gestion ressources (générique TabSession)
//   Clocks    → horloges de campagne + session
//   Threats   → menaces liées aux clocks
//   Manœuvres → validation des moves custom en attente
//   Journal   → journal GM (générique TabJournal)
// ─────────────────────────────────────────────────────────────────────────────

import React, {useState, useEffect, useCallback, useRef} from 'react';
import { useAuth }    from '../../../context/AuthContext.jsx';
import { useSocket }  from '../../../context/SocketContext.jsx';
import { useFetch }   from '../../../hooks/useFetch.js';
import { useSystem }  from '../../../hooks/useSystem.js';

import ToastNotifications   from '../../../components/layout/ToastNotifications.jsx';
import HistoryPanel         from '../../../components/layout/HistoryPanel.jsx';
import ThemeToggle          from '../../../components/ui/ThemeToggle.jsx';
import TableManagementModal from '../../../components/gm/modals/TableManagementModal.jsx';
import DiceConfigModal      from '../../../components/modals/DiceConfigModal.jsx';
import TabJournal           from '../../../components/gm/tabs/TabJournal.jsx';

import cyberpunkConfig, { STAT_LABELS } from '../config.jsx';
import TabSession from "./tabs/TabSession.jsx";
import TabClocks from "./tabs/TabClocks.jsx";
import TabThreats from "./tabs/TabThreats.jsx";
import TabMoves from "./tabs/TabMoves.jsx";
import DiceEntryHistory from "../components/layout/DiceEntryHistory.jsx";
import DiceHistoryPage from "../../../components/layout/DiceHistoryPage.jsx";

// ── Onglets GM ────────────────────────────────────────────────────────────────

const GM_TABS = [
    { id: 'session',   label: '⛶ Session'   },
    { id: 'clocks',    label: '⏱ Clocks'     },
    { id: 'threats',   label: '⚠ Menaces'    },
    { id: 'moves',     label: '⬡ Manœuvres'  },
    { id: 'history',   label: '▤ Historique'  },
    { id: 'journal',   label: '⧉ Journal'   },
];


// ── TabMoves — validation des moves custom ────────────────────────────────────

// ── GMView principal ──────────────────────────────────────────────────────────

const GMView = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    const { logout }    = useAuth();
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();
    const socket        = useSocket();

    const [activeTab,          setActiveTab]          = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return GM_TABS.some(t => t.id === hash) ? hash : 'session';
    });
    const [showMenu,           setShowMenu]           = useState(false);
    const [showTableMgmt,      setShowTableMgmt]      = useState(false);
    const [showDiceConfig,     setShowDiceConfig]     = useState(false);
    const [historyPanelOpen,   setHistoryPanelOpen]   = useState(false);
    const pendingExpandThreatRef = useRef(null);

    const changeTab = (id) => {
        setActiveTab(id);
        window.location.hash = id;
        setShowMenu(false);
    };

    // Compte des moves en attente (badge sur l'onglet)
    const [pendingMovesCount, setPendingMovesCount] = useState(0);
    useEffect(() => {
        if (!apiBase) return;
        fetchWithAuth(`${apiBase}/moves`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setPendingMovesCount((data ?? []).filter(m => m.type === 'custom' && !m.isApproved).length))
            .catch(() => {});
    }, [apiBase, activeTab]); // refresh quand on revient sur cet onglet

    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
    };

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            data-theme={darkMode ? 'dark' : undefined}
        >
            <ToastNotifications
                sessionId={activeSession?.id}
                renderDiceToast={(entry) => {
                    return (<DiceEntryHistory roll={entry}  />)
                }}
            />

            {/* ── Header ───────────────────────────────────────────────── */}
            <header
                className="flex items-center justify-between px-4 py-3 sticky top-0 z-30"
                style={{
                    background:   'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)',
                    boxShadow:    '0 2px 12px rgba(0,0,0,0.5)',
                }}
            >

                <div className="text-center ml-2 gap-0 min-w-0">
                    <div className="text-[38px] cp-font-title text-accent tracking-widest cp-neon-glow">
                        CyberPunk
                    </div>
                    <div className="mt-0.5 mb-0.5 cp-divider"></div>
                    {activeSession ? (
                        <p
                            className="text-xs cp-font-ui uppercase tracking-widest text-muted"
                        >
                            Session : <b>{activeSession.name}</b>
                        </p>
                    ) : (
                        <p className="text-xs cp-font-ui uppercase tracking-widest text-muted">
                            The Sprawl — édition Ré²
                        </p>
                    )}

                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                    {/* Hamburger */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(v => !v)}
                            className="w-9 h-9 flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-alt hover:cp-neon-glow-el hover:bg-surface border border-base hover:border-accent"
                        >
                            <span className="w-4 h-0.5 rounded" style={{ background: 'var(--color-text)' }} />
                            <span className="w-4 h-0.5 rounded" style={{ background: 'var(--color-text)' }} />
                            <span className="w-4 h-0.5 rounded" style={{ background: 'var(--color-text)' }} />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div
                                    className="absolute right-0 top-11 rounded-xl overflow-hidden z-50 shadow-2xl"
                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', minWidth: '180px' }}
                                >
                                    {[
                                        { label: '🗂 Gestion sessions', action: () => { setShowTableMgmt(true); setShowMenu(false); } },
                                        { label: '🎲 Config dés',       action: () => { setShowDiceConfig(true); setShowMenu(false); } },
                                        { label: '📜 Historique jets',  action: () => { setHistoryPanelOpen(true); setShowMenu(false); } },
                                        { label: '🔒 Déconnexion',      action: handleLogout },
                                    ].map(item => (
                                        <button
                                            key={item.label}
                                            onClick={item.action}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-surface-alt transition-colors"
                                            style={{ color: 'var(--color-text)' }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </>

                        )}
                    </div>
                </div>
            </header>

            {/* ── Nav onglets ───────────────────────────────────────────── */}
            <nav
                className="flex border-b overflow-x-auto"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
                {GM_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => changeTab(tab.id)}
                        className={`group relative flex-1 py-3 text-sm font-semibold cp-font-ui uppercase tracking-wide transition-colors
                         ${activeTab === tab.id ? 'text-primary' : 'text-muted'}
                         bg-none border-none cursor-pointer
                         `}
                    >
                        <span className={`transition-all duration-200 ${activeTab === tab.id ? '' : 'group-hover:text-default group-hover:cp-neon-glow'}`}>
                            {tab.label}
                        </span>
                        {/* Badge moves en attente */}
                        {tab.id === 'moves' && pendingMovesCount > 0 && (
                            <span
                                className="absolute top-2 right-1 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                                style={{ background: 'var(--cp-neon-amber)', color: 'var(--color-bg)' }}
                            >
                                {pendingMovesCount}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <span
                                className="absolute bottom-0 left-0 right-0 h-0.5"
                                style={{ background: 'var(--color-primary)', boxShadow: 'var(--cp-glow-cyan)' }}
                            />
                        )}
                    </button>
                ))}
            </nav>

            {/* ── Contenu ───────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto cp-scroll max-w-full w-full mx-auto">

                {activeTab === 'session' && (
                    <TabSession
                        activeSession={activeSession}
                        onlineCharacters={onlineCharacters}
                        onSessionChange={onSessionChange}
                    />
                )}

                {activeTab === 'clocks' && (
                    <TabClocks
                        activeSession={activeSession}
                        fetchWithAuth={fetchWithAuth}
                        apiBase={apiBase}
                        onGoToThreat={(threatId) => {
                            changeTab('threats');
                            // Stocké dans un ref pour que TabThreats puisse lire à son mount
                            pendingExpandThreatRef.current = threatId;
                        }}
                    />
                )}

                {activeTab === 'threats' && (
                    <TabThreats
                        activeSession={activeSession}
                        fetchWithAuth={fetchWithAuth}
                        apiBase={apiBase}
                        expandThreatId={pendingExpandThreatRef.current}
                        onExpandConsumed={() => { pendingExpandThreatRef.current = null; }}
                    />
                )}

                {activeTab === 'moves' && (
                    <TabMoves
                        fetchWithAuth={fetchWithAuth}
                        apiBase={apiBase}
                    />
                )}

                {activeTab === 'journal' && (
                    <div className="m-1">
                        <TabJournal characterId={-1} />
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="m-1">
                        <DiceHistoryPage
                            sessionId={activeSession?.id}
                            renderHistoryEntry={cyberpunkConfig.dice.renderHistoryEntry}
                        />
                    </div>
                )}
            </main>

            {/* ── Modales globales ──────────────────────────────────────── */}
            {showTableMgmt && (
                <TableManagementModal
                    isOpen
                    onClose={() => setShowTableMgmt(false)}
                    onSelectTable={(session) => { onSessionChange?.(session); setShowTableMgmt(false); }}
                    activeSessionId={activeSession?.id}
                />
            )}
            {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}


            <HistoryPanel
                isOpen={historyPanelOpen}
                onClose={() => setHistoryPanelOpen(false)}
                sessionId={activeSession?.id}
                renderHistoryEntry={cyberpunkConfig.dice.renderHistoryEntry}
            />
        </div>
    );
};

export default GMView;