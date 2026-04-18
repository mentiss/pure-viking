import { useState } from 'react';
import { useAuth }   from '../../../context/AuthContext.jsx';
import { useSocket } from '../../../context/SocketContext.jsx';
import { useSystem } from '../../../hooks/useSystem.js';
import ThemeToggle           from '../../../components/ui/ThemeToggle.jsx';
import ToastNotifications    from '../../../components/layout/ToastNotifications.jsx';
import DiceHistoryPage       from '../../../components/layout/DiceHistoryPage.jsx';
import TableManagementModal  from '../../../components/gm/modals/TableManagementModal.jsx';
import TabJournal            from '../../../components/gm/tabs/TabJournal.jsx';
import TabSession            from './tabs/TabSession.jsx';
import TabReserveGroupe      from './tabs/TabReserveGroupe.jsx';

const GM_TABS = [
    { id: 'session',   label: '⛶ Session'    },
    { id: 'groupe',    label: '✦ Réserve'    },
    { id: 'journal',   label: '⧉ Journal'    },
    { id: 'historique',label: '🎲 Historique' },
];

const GMView = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    const { logout }  = useAuth();
    const { apiBase } = useSystem();
    const socket      = useSocket();

    const [activeTab,  setActiveTab]  = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return GM_TABS.some(t => t.id === hash) ? hash : 'session';
    });
    const [showTableModal, setShowTableModal] = useState(false);
    const [showMenu,       setShowMenu]       = useState(false);

    const changeTab = (id) => {
        setActiveTab(id);
        window.location.hash = id;
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = `/${apiBase.replace('/api/', '')}/gm`;
    };

    return (
        <div
            className="min-h-screen bg-bg text-default flex flex-col"
            data-theme={darkMode ? 'dark' : ''}
        >
            {/* ── Header ───────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-surface border-b border-default px-4 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-primary font-bold tracking-wide">
                        ✦ Noctis Solis — GM
                    </span>
                    {activeSession && (
                        <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/30">
                            {activeSession.name}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowTableModal(true)}
                        className="px-3 py-1.5 rounded border border-default text-muted text-sm"
                        title="Gérer la table"
                    >
                        ⚙ Table
                    </button>

                    <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(m => !m)}
                            className="px-3 py-1.5 rounded border border-default text-muted text-lg"
                        >
                            ⋮
                        </button>
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div className="absolute right-0 mt-2 w-48 bg-surface border border-default rounded-lg shadow-2xl z-20 overflow-hidden">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-surface-alt flex items-center gap-2"
                                    >
                                        🚪 Déconnexion
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <nav className="flex border-b border-default bg-surface px-4 overflow-x-auto">
                {GM_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => changeTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                            activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted hover:text-default'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* ── Contenu ──────────────────────────────────────────────── */}
            <main className="flex-1 overflow-auto">

                {activeTab === 'session' && (
                    <TabSession
                        activeSession={activeSession}
                        onlineCharacters={onlineCharacters}
                    />
                )}

                {activeTab === 'groupe' && (
                    <TabReserveGroupe socket={socket} />
                )}

                {activeTab === 'journal' && (
                    <div className="max-w-4xl mx-auto p-4">
                        <TabJournal characterId={-1} />
                    </div>
                )}

                {activeTab === 'historique' && (
                    <div className="max-w-4xl mx-auto p-4">
                        <DiceHistoryPage
                            character={{ id: -1 }}
                            renderHistoryEntry={null}
                            sessionId={activeSession?.id ?? null}
                        />
                    </div>
                )}

            </main>

            {/* ── Overlays ─────────────────────────────────────────────── */}
            <ToastNotifications sessionId={activeSession?.id} />

            {showTableModal && (
                <TableManagementModal
                    activeSession={activeSession}
                    onSessionChange={onSessionChange}
                    onClose={() => setShowTableModal(false)}
                />
            )}
        </div>
    );
};

export default GMView;