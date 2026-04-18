import { useState, useEffect, useCallback } from 'react';
import { useSystem }          from '../../hooks/useSystem.js';
import { useFetch }           from '../../hooks/useFetch.js';
import { useSocket }          from '../../context/SocketContext.jsx';
import { useSession }         from '../../context/SessionContext.jsx';
import { useAuth }            from '../../context/AuthContext.jsx';
import ThemeToggle            from '../../components/ui/ThemeToggle.jsx';
import JournalTab             from '../../components/tabs/JournalTab.jsx';
import CharacterListModal     from '../../components/modals/CharacterListModal.jsx';
import ToastNotifications     from '../../components/layout/ToastNotifications.jsx';
import IdentityCard           from './components/layout/IdentityCard.jsx';
import CharacteristicsCard    from './components/layout/CharacteristicsCard.jsx';
import ReservesCard           from './components/layout/ReservesCard.jsx';
import HealthCard             from './components/layout/HealthCard.jsx';
import EclatsCard             from './components/layout/EclatsCard.jsx';
import SpecialtiesCard        from './components/layout/SpecialtiesCard.jsx';
import InventoryCard          from './components/layout/InventoryCard.jsx';
import GroupReserveCard       from './components/layout/GroupReserveCard.jsx';
import DiceModal              from './components/modals/DiceModal.jsx';

const TABS = [
    { id: 'fiche',    label: 'Fiche' },
    { id: 'journal',  label: 'Journal' },
];

const Sheet = ({
                   character,
                   onCharacterUpdate,
                   onLogout,
                   journalUnread,
                   onJournalRead,
                   darkMode,
                   onToggleDarkMode,
               }) => {
    const { apiBase }             = useSystem();
    const fetchWithAuth           = useFetch();
    const socket                  = useSocket();
    const { activeGMSession }     = useSession();
    const { logout }              = useAuth();

    const [activeTab,    setActiveTab]    = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.some(t => t.id === hash) ? hash : 'fiche';
    });
    const [editMode,     setEditMode]     = useState(false);
    const [editableChar, setEditableChar] = useState(character);
    const [isSaving,     setIsSaving]     = useState(false);
    const [showMenu,     setShowMenu]     = useState(false);
    const [showCharList, setShowCharList] = useState(false);
    const [diceOpen,     setDiceOpen]     = useState(false);

    // Sync depuis serveur uniquement hors édition
    useEffect(() => {
        if (!editMode) setEditableChar(character);
    }, [character, editMode]);

    // ── Navigation tabs ───────────────────────────────────────────────────────

    const changeTab = (tab) => {
        setActiveTab(tab);
        window.location.hash = tab;
        if (tab === 'journal') onJournalRead?.();
    };

    // ── Édition ───────────────────────────────────────────────────────────────

    const set = useCallback((field, value) => {
        setEditableChar(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await onCharacterUpdate(editableChar);
            setEditMode(false);
        } finally {
            setIsSaving(false);
        }
    }, [editableChar, onCharacterUpdate]);

    const handleCancel = useCallback(() => {
        setEditableChar(character);
        setEditMode(false);
    }, [character]);

    // ── Patch immédiat (éclats, santé, réserves) ──────────────────────────────

    const handlePatch = useCallback(async (fields) => {
        const res = await fetchWithAuth(`${apiBase}/characters/${character.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(fields),
        });
        if (res.ok) {
            const updated = await res.json();
            setEditableChar(prev => ({ ...prev, ...updated }));
        }
    }, [character?.id]);

    // ── Déconnexion ───────────────────────────────────────────────────────────

    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
        onLogout?.();
    };

    const char = editMode ? editableChar : character;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className="min-h-screen bg-bg text-default"
            data-theme={darkMode ? 'dark' : ''}
        >
            {/* ── Header ───────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-surface border-b border-default px-4 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-primary font-bold text-lg">
                        {char.prenom} {char.nom}
                    </span>
                    {activeGMSession && (
                        <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/30">
                            En session
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                    {/* Bouton dés */}
                    <button
                        onClick={() => setDiceOpen(true)}
                        className="px-3 py-1.5 rounded bg-primary text-accent font-bold text-sm"
                        title="Lancer les dés"
                    >
                        ⬡ Dés
                    </button>

                    {/* Menu hamburger */}
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
                                <div className="absolute right-0 mt-2 w-52 bg-surface border border-default rounded-lg shadow-2xl z-20 overflow-hidden">
                                    <button
                                        onClick={() => { setShowMenu(false); setShowCharList(true); }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-default hover:bg-surface-alt flex items-center gap-2"
                                    >
                                        🗂️ Changer de personnage
                                    </button>
                                    {activeTab === 'fiche' && !editMode && (
                                        <button
                                            onClick={() => { setShowMenu(false); setEditMode(true); }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-default hover:bg-surface-alt flex items-center gap-2"
                                        >
                                            ⚙ Éditer la fiche
                                        </button>
                                    )}
                                    <div className="border-t border-default" />
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

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <nav className="flex border-b border-default bg-surface px-4">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => changeTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
                            activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted hover:text-default'
                        }`}
                    >
                        {tab.label}
                        {tab.id === 'journal' && journalUnread > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-bg text-xs flex items-center justify-center font-bold">
                                {journalUnread}
                            </span>
                        )}
                    </button>
                ))}

                {/* Boutons édition dans la tab bar */}
                {activeTab === 'fiche' && (
                    <div className="ml-auto flex items-center gap-2 py-1">
                        {editMode ? (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="px-3 py-1 rounded border border-default text-muted text-xs"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-3 py-1 rounded bg-primary text-accent font-bold text-xs disabled:opacity-50"
                                >
                                    {isSaving ? 'Sauvegarde…' : '✓ Sauvegarder'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-3 py-1 rounded border border-default text-muted text-xs"
                            >
                                ⚙ Éditer
                            </button>
                        )}
                    </div>
                )}
            </nav>

            {/* ── Contenu ──────────────────────────────────────────────────── */}
            <main className="max-w-4xl mx-auto p-4 space-y-4">

                {/* ── TAB FICHE ──────────────────────────────────────────── */}
                {activeTab === 'fiche' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <IdentityCard
                                    character={char}
                                    editMode={editMode}
                                    onChange={set}
                                />
                            </div>
                            <div className="flex flex-col gap-4">
                                <EclatsCard character={char} onPatch={handlePatch} />
                                <HealthCard character={char} onPatch={handlePatch} />
                            </div>
                        </div>

                        <CharacteristicsCard
                            character={char}
                            editMode={editMode}
                            onChange={set}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReservesCard character={char} onPatch={handlePatch} />
                            <GroupReserveCard
                                character={char}
                            />
                        </div>

                        <SpecialtiesCard
                            character={char}
                            editMode={editMode}
                            onChange={specialties => set('specialties', specialties)}
                        />

                        <InventoryCard
                            character={char}
                            editMode={editMode}
                            onChange={items => set('items', items)}
                        />
                    </>
                )}

                {/* ── TAB JOURNAL ────────────────────────────────────────── */}
                {activeTab === 'journal' && (
                    <JournalTab characterId={character.id} />
                )}

            </main>

            {/* ── Overlays ─────────────────────────────────────────────────── */}
            <ToastNotifications sessionId={activeGMSession} />

            {diceOpen && (
                <DiceModal
                    character={char}
                    activeSession={activeGMSession}
                    onClose={() => setDiceOpen(false)}
                />
            )}

            {showCharList && (
                <CharacterListModal
                    isOpen
                    currentCharId={character.id}
                    onClose={() => setShowCharList(false)}
                    onSelect={c => { window.location.href = `/${window.location.pathname.split('/')[1]}/${c.accessUrl}`; }}
                />
            )}
        </div>
    );
};

export default Sheet;