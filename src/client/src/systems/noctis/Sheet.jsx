import { useState, useEffect, useCallback } from 'react';
import { useSystem }       from '../../hooks/useSystem.js';
import { useFetch }        from '../../hooks/useFetch.js';
import { useSocket }       from '../../context/SocketContext.jsx';
import { useSession }      from '../../context/SessionContext.jsx';
import { useAuth }         from '../../context/AuthContext.jsx';
import ThemeToggle         from '../../components/ui/ThemeToggle.jsx';
import JournalTab          from '../../components/tabs/JournalTab.jsx';
import DiceHistoryPage     from '../../components/layout/DiceHistoryPage.jsx';
import CharacterListModal  from '../../components/modals/CharacterListModal.jsx';
import ToastNotifications  from '../../components/layout/ToastNotifications.jsx';
import IdentityCard        from './components/layout/IdentityCard.jsx';
import DomainCard          from './components/layout/DomainCard.jsx';
import ReserveCard         from './components/layout/ReserveCard.jsx';
import HealthCard          from './components/layout/HealthCard.jsx';
import EclatsCard          from './components/layout/EclatsCard.jsx';
import SpecialtiesCard     from './components/layout/SpecialtiesCard.jsx';
import InventoryCard       from './components/layout/InventoryCard.jsx';
import GroupReserveCard    from './components/layout/GroupReserveCard.jsx';
import DiceModal           from './components/modals/DiceModal.jsx';
import noctisConfig        from './config.jsx';

const TABS = [
    { id: 'fiche',      label: 'Fiche' },
    { id: 'historique', label: 'Historique' },
    { id: 'journal',    label: 'Journal' },
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
    const { apiBase }         = useSystem();
    const fetchWithAuth       = useFetch();
    const socket              = useSocket();
    const { activeGMSession } = useSession();
    const { logout }          = useAuth();

    const [activeTab,    setActiveTab]    = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.some(t => t.id === hash) ? hash : 'fiche';
    });
    const [editMode,     setEditMode]     = useState(false);
    const [editableChar, setEditableChar] = useState(character);
    const [isSaving,     setIsSaving]     = useState(false);
    const [showMenu,     setShowMenu]     = useState(false);
    const [showCharList, setShowCharList] = useState(false);
    // dicePreset : null | { stat?: string, specialty?: object }
    const [dicePreset,   setDicePreset]   = useState(null);

    // ── Sync prop → state hors édition ───────────────────────────────────────
    useEffect(() => {
        if (!editMode) setEditableChar(character);
    }, [character, editMode]);

    // ── char est TOUJOURS editableChar ────────────────────────────────────────
    // Le useEffect ci-dessus le maintient synchronisé depuis la prop hors édition.
    const char = editableChar;

    // ── Édition ───────────────────────────────────────────────────────────────
    const set = useCallback((field, value) => {
        setEditableChar(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = useCallback(() => {
        setIsSaving(true);
        onCharacterUpdate(editableChar);
        setEditMode(false);
        setIsSaving(false);
    }, [editableChar, onCharacterUpdate]);

    const handleCancel = useCallback(() => {
        setEditableChar(character);
        setEditMode(false);
    }, [character]);

    // ── Patch immédiat ────────────────────────────────────────────────────────
    const handlePatch = useCallback(async (fields) => {
        const res = await fetchWithAuth(`${apiBase}/characters/${character.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(fields),
        });
        if (res.ok) {
            const updated = await res.json();
            // Merge sur editableChar — préserve specialties/ombres/items non renvoyés par PATCH
            setEditableChar(prev => ({ ...prev, ...updated }));
        }
    }, [apiBase, character?.id]); // fetchWithAuth absent intentionnellement

    // ── Raccourcis dés ────────────────────────────────────────────────────────
    const openDiceModal = useCallback((stat = null, specialty = null) => {
        setDicePreset({ stat, specialty });
    }, []);

    const closeDiceModal = useCallback(() => {
        setDicePreset(null);
    }, []);

    // ── Navigation ────────────────────────────────────────────────────────────
    const changeTab = useCallback((tab) => {
        setActiveTab(tab);
        window.location.hash = tab;
        if (tab === 'journal') onJournalRead?.();
    }, [onJournalRead]);

    // ── Déconnexion ───────────────────────────────────────────────────────────
    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
        onLogout?.();
    };

    return (
        <div className="ns-page" data-theme={darkMode ? 'dark' : ''}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <header className="ns-header px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-3 min-w-0">
                        <h1 className="text-lg font-semibold truncate shrink-0"
                            style={{ fontFamily: 'var(--ns-font-title)',
                                color: 'var(--ns-ornament)', letterSpacing: '0.06em' }}>
                            {char.prenom} {char.nom}
                        </h1>
                        {char.activite && (
                            <span className="text-xs truncate hidden sm:block"
                                  style={{ color: 'color-mix(in srgb, var(--ns-ornament) 60%, var(--color-bg))',
                                      fontStyle: 'italic', fontFamily: 'var(--ns-font-body)' }}>
                                {char.activite}
                            </span>
                        )}
                        {activeGMSession && (
                            <span className="text-xs px-2 py-0.5 rounded-sm shrink-0"
                                  style={{ color: 'var(--color-success)',
                                      border: '1px solid color-mix(in srgb, var(--color-success) 40%, transparent)',
                                      background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
                                      fontFamily: 'var(--ns-font-title)', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                                SESSION
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
                        <button onClick={() => openDiceModal()} className="ns-btn-primary">
                            ⬡ Dés
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowMenu(v => !v)} className="ns-btn-ghost px-2">≡</button>
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 rounded shadow-lg z-50 min-w-36"
                                     style={{ background: 'var(--color-surface)',
                                         border: '1px solid var(--ns-ornament)',
                                         borderTop: '2px solid var(--ns-ornament)' }}>
                                    <button
                                        onClick={() => { setShowCharList(true); setShowMenu(false); }}
                                        className="w-full text-left px-3 py-2 text-muted hover:text-default
                                                   hover:bg-surface-alt transition-colors text-xs"
                                    >
                                        Changer de personnage
                                    </button>
                                    <hr style={{ borderColor: 'var(--color-border)', margin: '0.25rem 0' }} />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 py-2 text-danger hover:bg-surface-alt
                                                   transition-colors text-xs"
                                    >
                                        Se déconnecter
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Tab bar ──────────────────────────────────────────────────── */}
            <nav className="ns-tabbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => changeTab(tab.id)}
                        className={`ns-tab ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                        {tab.id === 'journal' && journalUnread > 0 && (
                            <span className="ns-tab-badge">{journalUnread}</span>
                        )}
                    </button>
                ))}

                {activeTab === 'fiche' && (
                    <div className="ml-auto flex items-center gap-2 py-1">
                        {editMode ? (
                            <>
                                <button onClick={handleCancel} className="ns-btn-ghost">Annuler</button>
                                <button onClick={handleSave} disabled={isSaving} className="ns-btn-primary">
                                    {isSaving ? 'Sauvegarde…' : '✓ Sauvegarder'}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditMode(true)} className="ns-btn-ghost">
                                ⚙ Éditer
                            </button>
                        )}
                    </div>
                )}
            </nav>

            {/* ── Contenu ──────────────────────────────────────────────────── */}
            <main className="px-4 py-4 space-y-4">

                {activeTab === 'fiche' && (
                    <>
                        {/* Identité + Éclats & Santé */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <IdentityCard character={char} editMode={editMode} onChange={set} />
                            </div>
                            <div className="flex flex-col gap-4">
                                <EclatsCard character={char} onPatch={handlePatch} />
                                <HealthCard character={char} onPatch={handlePatch} />
                            </div>
                        </div>

                        {/* Domaines + Réserves */}
                        <div className="grid grid-cols-3 gap-3">
                            <DomainCard domaine="physique" character={char} editMode={editMode}
                                        onChange={set} onRoll={editMode ? null : stat => openDiceModal(stat)} />
                            <DomainCard domaine="manuel"   character={char} editMode={editMode}
                                        onChange={set} onRoll={editMode ? null : stat => openDiceModal(stat)} />
                            <ReserveCard type="effort"    character={char} onPatch={handlePatch} />
                            <DomainCard domaine="mental"  character={char} editMode={editMode}
                                        onChange={set} onRoll={editMode ? null : stat => openDiceModal(stat)} />
                            <DomainCard domaine="social"  character={char} editMode={editMode}
                                        onChange={set} onRoll={editMode ? null : stat => openDiceModal(stat)} />
                            <ReserveCard type="sangfroid" character={char} onPatch={handlePatch} />
                        </div>

                        {/* Spécialités */}
                        <SpecialtiesCard
                            character={char}
                            editMode={editMode}
                            onChange={specialties => set('specialties', specialties)}
                            onRoll={editMode ? null : spec => openDiceModal(null, spec)}
                        />

                        {/* Réserve de groupe */}
                        <GroupReserveCard character={char} />

                        {/* Inventaire */}
                        <InventoryCard
                            character={char}
                            editMode={editMode}
                            onChange={items => set('items', items)}
                        />
                    </>
                )}

                {activeTab === 'historique' && (
                    <DiceHistoryPage
                        sessionId={activeGMSession ?? null}
                        renderHistoryEntry={noctisConfig.dice.renderHistoryEntry}
                    />
                )}

                {activeTab === 'journal' && (
                    <JournalTab characterId={character.id} />
                )}
            </main>

            {/* ── Overlays ─────────────────────────────────────────────────── */}
            <ToastNotifications sessionId={activeGMSession} />

            {dicePreset !== null && (
                <DiceModal
                    character={char}
                    activeSession={activeGMSession}
                    preset={dicePreset}
                    onClose={closeDiceModal}
                />
            )}

            {showCharList && (
                <CharacterListModal
                    isOpen
                    currentCharId={character.id}
                    onClose={() => setShowCharList(false)}
                    onSelect={c => {
                        window.location.href = `/${window.location.pathname.split('/')[1]}/${c.accessUrl}`;
                    }}
                />
            )}
        </div>
    );
};

export default Sheet;