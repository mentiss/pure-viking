// src/client/src/systems/cyberpunk/Sheet.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fiche joueur Cyberpunk — The Sprawl (adaptation 2d10)
//
// Layout :
//   Header  — identité + playbook + actions
//   Onglets — Fiche | Journal | Historique
//   Fiche   — colonne principale (stats hex + ressources + directives + relations
//             + cyberware + inventaire) + colonne droite fixe (moves)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

import './theme.css';

// Composants génériques
import ThemeToggle         from '../../components/ui/ThemeToggle.jsx';
import ToastNotifications  from '../../components/layout/ToastNotifications.jsx';
import SessionPlayersBar   from '../../components/layout/SessionPlayersBar.jsx';
import JournalTab          from '../../components/tabs/JournalTab.jsx';
import DiceHistoryPage     from '../../components/layout/DiceHistoryPage.jsx';
import DiceConfigModal     from '../../components/modals/DiceConfigModal.jsx';
import CharacterListModal  from '../../components/modals/CharacterListModal.jsx';
import AvatarUploader      from '../../components/AvatarUploader.jsx';

// Composants Cyberpunk
import MoveModal           from './components/modals/MoveModal.jsx';

import { useAuth }    from '../../context/AuthContext.jsx';
import { useSocket }  from '../../context/SocketContext.jsx';
import { useSystem }  from '../../hooks/useSystem.js';
import { useFetch }   from '../../hooks/useFetch.js';
import { useSession } from '../../context/SessionContext.jsx';
import {Tag, TagAdder} from "./components/layout/TagManager.jsx";
import {IdentityCard} from "./components/layout/IdentityCard.jsx";
import {Card} from "./components/layout/Card.jsx";
import {CyberwareRow, DirectiveRow, ItemRow, QuickAddItem, RelationRow} from "./components/layout/Rows.jsx";
import {StatCard} from "./components/layout/StatCard.jsx";
import {XPPanel} from "./components/modals/XPPanel.jsx";
import {MoveCard} from "./components/layout/MoveCard.jsx";
import {ResourceCounter} from "./components/layout/ResourceCounter.jsx";
import cyberpunkConfig, {CYBERWARE_ALL, ITEMS_ALL} from "./config.jsx";
import DiceEntryHistory from "./components/layout/DiceEntryHistory.jsx";
import BoltFarm from "./components/ui/BoltFarm.jsx";
import BrowseModal from "./components/modals/BrowseModal.jsx";

// ── Onglets ───────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'fiche',      label: '⬡ Fiche'      },
    { id: 'journal',    label: '⧉ Journal'    },
    { id: 'historique', label: '▤ Historique' },
];

const AccessKeyBadge = ({ code }) => {
    const [isClicking, setIsClicking] = React.useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 200);
    };

    return (
        <div
            onClick={copyToClipboard}
            className={`
                group cursor-pointer flex items-center gap-2 px-2 py-1 rounded border
                font-['CyberConsole'] transition-all duration-300
                bg-surface/10 border-primary/30 
                hover:bg-primary/10 hover:border-primary/100 hover:glow-primary-sm
                active:scale-95
                ${isClicking ? 'animate-glitch-quick border-accent/100 glow-accent-md' : ''}
            `}
        >
            <span className="text-[9px] uppercase text-primary/40 group-hover:text-accent/100 transition-colors">
                Access Key
            </span>
            <span className="text-xs font-bold tracking-widest text-primary/10 blur-[2px] group-hover:blur-0 group-hover:text-primary/100 group-hover:glow-primary-3xs transition-all duration-500">
                {code}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary/100 glow-primary-xs animate-pulse group-hover:bg-secondary group-hover:glow-secondary-xs" />
        </div>
    );
};

// ── Sheet ─────────────────────────────────────────────────────────────────────
const Sheet = ({
                   character,
                   onCharacterUpdate,
                   onLogout,
                   darkMode,
                   onToggleDarkMode,
                   journalUnread,
                   onJournalRead,
               }) => {
    const { system }    = useParams();
    const { apiBase }   = useSystem();
    const { logout }    = useAuth();
    const socket        = useSocket();
    const fetchWithAuth = useFetch();
    const { activeGMSession, activeSessionName } = useSession();

    // ── État UI ───────────────────────────────────────────────────────────────
    const [activeTab,      setActiveTab]      = useState(() => {
        const h = window.location.hash.replace('#', '');
        return TABS.some(t => t.id === h) ? h : 'fiche';
    });
    const [editMode,       setEditMode]       = useState(false);
    const [editableChar,           setEditableChar]   = useState(character);
    const [showMenu,       setShowMenu]       = useState(false);
    const [showDiceConfig, setShowDiceConfig] = useState(false);
    const [showCharList,   setShowCharList]   = useState(false);
    const [showAvatar,     setShowAvatar]     = useState(false);
    const [showXPPanel,    setShowXPPanel]    = useState(false);

    const [tagAdderToggleRelation, setTagAdderToggleRelation] = useState(false);
    const [tagAdderToggleCyberware, setTagAdderToggleCyberware] = useState(false);
    const [tagAdderToggleItems, setTagAdderToggleItems] = useState(false);
    const [tagAdderToggleCharacter, setTagAdderToggleCharacter] = useState(false);

    // Moves
    const [movesTab,       setMovesTab]       = useState('playbook'); // 'base' | 'playbook'
    const [allMoves,       setAllMoves]       = useState([]);
    const [movesLoading,   setMovesLoading]   = useState(false);
    const [moveModal,      setMoveModal]      = useState(null); // { mode, move?, statKey? }
    const [browseModal, setBrowseModal] = useState(null);

    // Tags en édition
    const [newTagText,    setNewTagText]    = useState('');
    const [newTagVariant, setNewTagVariant] = useState('neutral');
    const [tagTarget,     setTagTarget]     = useState({ type: 'character', id: character?.id });

    // ── Sync character → editable ─────────────────────────────────────────────
    useEffect(() => {
        if (!editMode) setEditableChar(character);
    }, [character, editMode]);

    // ── Chargement des moves ──────────────────────────────────────────────────
    useEffect(() => {
        if (!apiBase) return;
        setMovesLoading(true);
        fetchWithAuth(`${apiBase}/moves`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setAllMoves(Array.isArray(data) ? data : []))
            .catch(() => setAllMoves([]))
            .finally(() => setMovesLoading(false));
    }, [apiBase]);

    // ── Socket — mises à jour light ───────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            if (data.characterId === character?.id) {
                // onCharacterHasUpdated : pas de PUT (évite la boucle)
                // On met juste à jour l'état local
                setEditableChar(prev => ({ ...prev, ...data.updates }));
            }
        };
        socket.on('character-light-update', handler);
        return () => socket.off('character-light-update', handler);
    }, [socket, character?.id]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const changeTab = (tab) => {
        setActiveTab(tab);
        window.location.hash = tab;
        if (tab === 'journal') onJournalRead?.();
    };

    const char = editMode ? editableChar : character;

    const set = useCallback((field, value) => {
        setEditableChar(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = useCallback(() => {
        onCharacterUpdate(editableChar);
        setEditMode(false);
    }, [editableChar, onCharacterUpdate]);

    const handleCancel = useCallback(() => {
        setEditableChar(character);
        setEditMode(false);
    }, [character]);

    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
        onLogout?.();
    };

    // Mise à jour rapide d'une ressource (Cred, info, matos, retenue)
    const patchResource = useCallback(async (field, newVal) => {
        const map = { cred: 'cred', infoTokens: 'infoTokens', matosTokens: 'matosTokens', retenue: 'retenue' };
        onCharacterUpdate({ ...character, [field]: newVal });
    }, [character, onCharacterUpdate]);

    // ── Moves filtrés ─────────────────────────────────────────────────────────
    const charMoveIds          = new Set((char?.moves ?? []).map(m => m.id));
    const hasAdvancementUnlocked= (char?.baseAdvancements ?? 0) >= 5;

    // Hors édition : seulement les moves débloqués. En édition : tous.
    const baseMovesAll         = allMoves.filter(m => m.playbook === null && m.type === 'official');

    const playbookMovesAll     = allMoves.filter(m => m.playbook === char?.playbook);
    const playbookMovesFiltered = editMode
        ? playbookMovesAll
        : playbookMovesAll.filter(m => charMoveIds.has(m.id));

    const advancementMovesAll  = allMoves.filter(
        m => m.type === 'official'
            && m.playbook !== null
            && m.playbook !== char?.playbook
            && !charMoveIds.has(m.id)   // non débloqués uniquement
    );

    const advancementMovesFiltered = (char?.moves ?? [])
        .filter(m => m.playbook !== null && m.playbook !== char?.playbook)
        .map(acquiredMove => allMoves.find(m => m.id === acquiredMove.id) ?? acquiredMove);

    const advancementMovesDisplay = editMode
        ? advancementMovesAll
        : advancementMovesFiltered;

    const movesDisplay = movesTab === 'base'
        ? baseMovesAll
        : movesTab === 'playbook'
            ? playbookMovesFiltered
            : advancementMovesDisplay;

    const showAdvancementTab = advancementMovesFiltered.length > 0 || (editMode && hasAdvancementUnlocked);

    const handleSelectChar = (selectedChar) => {
        setShowCharList(false);
        // On navigue vers l'URL du perso sélectionné — PlayerPage gère la suite
        window.location.href = `/${system}/${selectedChar.accessUrl}`;
    };

    // ── Tags helpers ──────────────────────────────────────────────────────────
    const addTag = useCallback((entityType, entityId, text, variant) => {
        const current = editableChar;
        const newTag = { tag_text: text, tag_variant: variant };
        let next = current;
        if (entityType === 'character') {
            next = { ...current, tags: [...(current.tags ?? []), newTag] };
        } else if (entityType === 'cyberware') {
            next = { ...current, cyberware: current.cyberware.map(c =>
                    c.id === entityId ? { ...c, tags: [...(c.tags ?? []), newTag] } : c
                )};
        } else if (entityType === 'relation') {
            next = { ...current, relations: current.relations.map(r =>
                    r.id === entityId ? { ...r, tags: [...(r.tags ?? []), newTag] } : r
                )};
        } else if (entityType === 'item') {
            next = { ...current, items: current.items.map(i =>
                    i.id === entityId ? { ...i, tags: [...(i.tags ?? []), newTag] } : i
                )};
        }
        setEditableChar(next);
        if (!editMode) onCharacterUpdate(next);
    }, [editableChar, editMode, onCharacterUpdate]);

    const removeTag = useCallback((entityType, entityId, tagId) => {
        const current = editableChar;
        let next = current;
        if (entityType === 'character') {
            next = { ...current, tags: (current.tags ?? []).filter((_, i) => i !== tagId) };
        } else if (entityType === 'cyberware') {
            next = { ...current, cyberware: current.cyberware.map(c =>
                    c.id === entityId ? { ...c, tags: (c.tags ?? []).filter((_, i) => i !== tagId) } : c
                )};
        } else if (entityType === 'relation') {
            next = { ...current, relations: current.relations.map(r =>
                    r.id === entityId ? { ...r, tags: (r.tags ?? []).filter((_, i) => i !== tagId) } : r
                )};
        } else if (entityType === 'item') {
            next = { ...current, items: current.items.map(i =>
                    i.id === entityId ? { ...i, tags: (i.tags ?? []).filter((_, i2) => i2 !== tagId) } : i
                )};
        }
        setEditableChar(next);
        if (!editMode) onCharacterUpdate(next);
    }, [editableChar, editMode, onCharacterUpdate]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            data-theme={darkMode ? 'dark' : undefined}
        >
            <ToastNotifications
                sessionId={activeGMSession}
                renderDiceToast={(entry) => {
                    return (<DiceEntryHistory roll={entry}  />)
                }}
            />

            {/* ── SessionPlayersBar ─────────────────────────────────────── */}
            {activeGMSession && (
                <SessionPlayersBar sessionName={activeSessionName} />
            )}

            {/* ── Header ───────────────────────────────────────────────── */}
            <header
                className="flex items-center justify-between px-2 py-1 sticky top-0 z-30"
                style={{
                    background:   'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)',
                    boxShadow:    '0 2px 12px rgba(0,0,0,0.4)',
                }}
            >
                <div className="text-center ml-3 gap-0 min-w-0 group relative flex flex-col items-center">

                    <div  className="relative logo-chromatic-glitch logo-neon-pulse">
                        <BoltFarm />

                        <div className="text-[38px] cp-font-title text-accent tracking-widest logo-title-base relative z-10">
                            CyberPunk
                        </div>
                    </div>

                    <div className="relative mt-0.5 mb-0.5 cp-divider w-full opacity-70"></div>
                    <p className="relative text-xs cp-font-ui uppercase tracking-widest text-muted">
                        The Sprawl — édition Ré²
                    </p>
                </div>

                {/* Actions droite */}
                <div className="flex items-center gap-2">
                    <AccessKeyBadge code={character.accessCode} />

                    <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                    {editMode ? (
                        <>
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                                style={{
                                    background: 'var(--color-surface-alt)',
                                    color:      'var(--color-text-muted)',
                                    border:     '1px solid var(--color-border)',
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-3 py-1.5 rounded-lg text-sm font-bold cp-font-ui uppercase"
                                style={{
                                    background: 'var(--color-primary)',
                                    color:      'var(--color-bg)',
                                    border:     'none',
                                    boxShadow:  'var(--cp-glow-cyan)',
                                }}
                            >
                                Sauvegarder
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-surface-alt text-base border-1 border-base hover:cp-neon-glow-el hover:bg-surface hover:border-accent"
                        >
                            ✏️ Édition
                        </button>
                    )}

                    <button
                        onClick={() => setShowXPPanel(true)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-surface-alt text-base border-1 border-base hover:cp-neon-glow-el hover:bg-surface hover:border-accent"
                        title="Dépenser de l'XP"
                    >
                        ✦ XP
                    </button>

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
                        {/* Menu dropdown */}
                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div
                                    className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-50 bg-surface border border-base overflow-hidden"
                                    style={{ minWidth:   '180px', }}
                                >
                                    {/* Créer un personnage */}
                                    <button
                                        onClick={() => { setShowMenu(false); window.location.href = `/${system}/creation`; }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-surface-alt transition-colors"
                                    >
                                        ✨ Créer un personnage
                                    </button>

                                    {/* Changer de personnage */}
                                    <button
                                        onClick={() => { setShowMenu(false); setShowCharList(true); }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-surface-alt transition-colors"
                                    >
                                        👤 Changer de personnage
                                    </button>
                                    <div className="cp-divider" />
                                    <button
                                        onClick={() => { setShowMenu(false); setShowDiceConfig(true); }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-surface-alt transition-colors"
                                    >
                                        🎲 Config animations dés
                                    </button>
                                    <div className="cp-divider" />
                                    <button
                                        onClick={() => { setShowMenu(false); window.location.href = `/${system}/gm`; }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-surface-alt transition-colors"
                                    >
                                        🎭 Interface GM
                                    </button>
                                    <div className="cp-divider" />
                                    {/* Déconnexion */}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-surface-alt transition-colors"
                                    >
                                        🔒 Déconnexion
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                </div>


            </header>

            {/* ── Onglets ───────────────────────────────────────────────── */}
            <nav
                className="flex border-b"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
                {TABS.map(tab => (
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
                        {tab.id === 'journal' && journalUnread > 0 && (
                            <span
                                className="absolute top-2 right-2 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                                style={{ background: 'var(--color-danger)', color: 'white' }}
                            >
                                {journalUnread}
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
            <main className="flex flex-1 ">
                <SessionPlayersBar
                    character={character}
                    sessionId={activeGMSession}
                    sessionName={activeSessionName}
                    headerHeight={125}
                    noWidthWhenCollapsed={true}
                />
                <div className="flex-1 overflow-hidden">
                    {/* ── FICHE ──────────────────────────────────────────────── */}
                    {activeTab === 'fiche' && (
                        <div className="flex h-full" style={{ maxHeight: 'calc(100vh - 112px)' }}>

                            {/* Colonne principale — scrollable */}
                            <div
                                className="flex-1 overflow-y-auto cp-scroll p-4 flex flex-col gap-4"
                            >
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-2">
                                        {/* ── IDENTITY ───────────────────────────── */}
                                        <IdentityCard
                                            char={char}
                                            editMode={editMode}
                                            set={set}
                                            showAvatar={showAvatar}
                                            setShowAvatar={setShowAvatar}
                                        />

                                        {/* ── RESSOURCES ──────────────────────────── */}
                                        <Card title="Ressources">
                                            <div className="flex flex-wrap gap-2 justify-around">
                                                <ResourceCounter
                                                    label="Cred"
                                                    value={char?.cred ?? 0}
                                                    color="var(--cp-cred-color)"
                                                    onChange={v => editMode ? set('cred', v) : patchResource('cred', v)}
                                                    editMode={true}
                                                />
                                                <div className="w-0.5 h-full cp-divider-h" />
                                                <ResourceCounter
                                                    label="[info]"
                                                    value={char?.infoTokens ?? 0}
                                                    color="var(--cp-info-color)"
                                                    onChange={v => editMode ? set('infoTokens', v) : patchResource('infoTokens', v)}
                                                    editMode={true}
                                                />
                                                <ResourceCounter
                                                    label="[matos]"
                                                    value={char?.matosTokens ?? 0}
                                                    color="var(--cp-matos-color)"
                                                    onChange={v => editMode ? set('matosTokens', v) : patchResource('matosTokens', v)}
                                                    editMode={true}
                                                />
                                                <ResourceCounter
                                                    label="Retenue"
                                                    value={char?.retenue ?? 0}
                                                    color="var(--cp-retenue-color)"
                                                    onChange={v => editMode ? set('retenue', v) : patchResource('retenue', v)}
                                                    editMode={true}
                                                />
                                                <div className="w-0.5 h-full cp-divider-h" />
                                                <ResourceCounter
                                                    label="XP"
                                                    value={char?.xp ?? 0}
                                                    color="var(--cp-xp-color)"
                                                    onChange={v => editMode ? set('xp', v) : patchResource('xp', v)}
                                                    editMode={true}
                                                    char={char}
                                                    colorLabel={hasAdvancementUnlocked ? "var(--color-accent)" : "var(--color-text-muted)"}
                                                />
                                            </div>
                                        </Card>

                                        {/* ── TAGS PERSONNAGE ──────────────────────── */}
                                        <Card
                                            title="États narratifs"
                                            action={
                                                <button
                                                    onClick={() => setTagAdderToggleCharacter(v => !v)}
                                                    className={`text-xs px-2 py-0.5 rounded bg-none border-none cursor-pointer ${tagAdderToggleCharacter ? 'text-secondary' : 'text-primary'}`}
                                                    title="Editer les tags"
                                                >
                                                    ⎚
                                                </button>
                                            }
                                        >
                                            {(char?.tags ?? []).length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {(char?.tags ?? []).map((tag, i) => (
                                                        <Tag
                                                            key={i}
                                                            tag={tag}
                                                            editMode={editMode}
                                                            onRemove={() => removeTag('character', char.id, i)}
                                                            alwaysRemovable={true}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Aucun état actif.</p>
                                            )}
                                            {tagAdderToggleCharacter && <TagAdder
                                                existingTags={char?.tags ?? []}
                                                onAdd={(text, variant) => {
                                                    setEditableChar(prev => ({
                                                        ...prev,
                                                        tags: [...(prev.tags ?? []), { tag_text: text, tag_variant: variant }],
                                                    }));
                                                    // Sauvegarder immédiatement si on n'est pas en mode édition
                                                    if (!editMode) {
                                                        onCharacterUpdate({
                                                            ...character,
                                                            tags: [...(character?.tags ?? []), { tag_text: text, tag_variant: variant }],
                                                        });
                                                    }
                                                }}
                                                entityType="character"
                                            />}
                                        </Card>
                                    </div>

                                    {/* ── STATS HEX ───────────────────────────── */}
                                    <StatCard
                                        editMode={editMode}
                                        char={char}
                                        editableChar={editableChar}
                                        setMoveModal={setMoveModal}
                                        set={set}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {/* ── CYBERWARE ────────────────────────────── */}
                                    <Card
                                        title="Cyberware"
                                        action={
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    onClick={() => setTagAdderToggleCyberware(v => !v)}
                                                    className={`text-xs px-2 py-0.5 rounded bg-none border-none cursor-pointer ${tagAdderToggleCyberware ? 'text-secondary' : 'text-primary'}`}
                                                    title="Editer les tags"
                                                >
                                                    ⎚
                                                </button>
                                                <button
                                                    onClick={() => setBrowseModal('cyberware')}
                                                    className="text-xs px-2 py-0.5 rounded text-primary bg-none border-none cursor-pointer"
                                                    title="Parcourir le cyberware"
                                                >
                                                    ⊞
                                                </button>
                                            </div>
                                        }
                                    >
                                        {(char?.cyberware ?? []).length === 0 && !editMode && (
                                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Aucun implant.</p>
                                        )}
                                        {(editMode ? editableChar : char)?.cyberware?.map((c, idx) => (
                                            <CyberwareRow
                                                key={c.id ?? `new_${idx}`}
                                                item={editMode ? (editableChar?.cyberware?.[idx] ?? c) : c}
                                                editMode={editMode}
                                                onChange={(updated) => {
                                                    const base = editMode ? editableChar : char;
                                                    const next = {
                                                        ...base,
                                                        cyberware: base.cyberware.map((x, i) =>
                                                            (c.id ? x.id === c.id : i === idx)
                                                                ? { ...x, ...updated }
                                                                : x
                                                        ),
                                                    };
                                                    setEditableChar(next);
                                                }}
                                                onRemove={() => {
                                                    const base = editMode ? editableChar : char;
                                                    const next = {
                                                        ...base,
                                                        cyberware: base.cyberware.filter((x, i) =>
                                                            c.id ? x.id !== c.id : i !== idx
                                                        ),
                                                    };
                                                    setEditableChar(next);
                                                }}
                                                onRemoveTag={(tagIdx) => removeTag('cyberware', c.id, tagIdx)}
                                                onAddTag={(text, variant) => addTag('cyberware', c.id, text, variant)}
                                                toggleTagAdder={tagAdderToggleCyberware}
                                            />
                                        ))}
                                        {editMode && (
                                            <button
                                                onClick={() => setEditableChar(prev => ({
                                                    ...prev,
                                                    cyberware: [...(prev.cyberware ?? []), { name: '', option_text: '', notes: '', tags: [] }],
                                                }))}
                                                className="text-sm py-1.5 w-full rounded-lg"
                                                style={{
                                                    color:      'var(--color-primary)',
                                                    background: 'var(--color-surface-alt)',
                                                    border:     '1px dashed var(--color-border)',
                                                }}
                                            >
                                                + Ajouter un implant
                                            </button>
                                        )}
                                    </Card>

                                    {/* ── INVENTAIRE ───────────────────────────── */}
                                    <Card
                                        title="Matos"
                                        action={
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    onClick={() => setTagAdderToggleItems(v => !v)}
                                                    className={`text-xs px-2 py-0.5 rounded bg-none border-none cursor-pointer ${tagAdderToggleItems ? 'text-secondary' : 'text-primary'}`}
                                                    title="Editer les tags"
                                                >
                                                    ⎚
                                                </button>
                                                <button
                                                    onClick={() => setBrowseModal('items')}
                                                    className="text-xs px-2 py-0.5 rounded text-primary bg-none border-none cursor-pointer"
                                                    title="Parcourir l'inventaire"
                                                >
                                                    ⊞
                                                </button>
                                            </div>
                                        }
                                    >
                                        {(char?.items ?? []).length === 0 && !editMode && (
                                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Inventaire vide.</p>
                                        )}
                                        {(char?.items ?? []).map((item, idx) => (
                                            <ItemRow
                                                key={item.id ?? `new_${idx}`}
                                                item={editMode ? (editableChar?.items?.[idx] ?? item) : item}
                                                editMode={editMode}
                                                onChange={(updated) => {
                                                    const base = editMode ? editableChar : char;
                                                    const nextItems = base.items.map((x, i) =>
                                                        (item.id ? x.id === item.id : i === idx)
                                                            ? { ...x, ...updated }
                                                            : x
                                                    );
                                                    const next = { ...base, items: nextItems };
                                                    setEditableChar(next);
                                                    if (!editMode) onCharacterUpdate(next);
                                                }}
                                                onRemove={() => {
                                                    const base = editMode ? editableChar : char;
                                                    const nextItems = base.items.filter((x, i) =>
                                                        item.id ? x.id !== item.id : i !== idx
                                                    );
                                                    const next = { ...base, items: nextItems };
                                                    setEditableChar(next);
                                                    if (!editMode) onCharacterUpdate(next);
                                                }}
                                                onRemoveTag={(tagIdx) => removeTag('item', item.id, tagIdx)}
                                                onAddTag={(text, variant) => addTag('item', item.id, text, variant)}
                                                toggleTagAdder={tagAdderToggleItems}
                                            />
                                        ))}

                                        {/* Bouton ajout — toujours visible */}
                                        <QuickAddItem
                                            onAdd={(newItem) => {
                                                const base = editMode ? editableChar : char;
                                                const next = { ...base, items: [...(base.items ?? []), newItem] };
                                                setEditableChar(next);
                                                if (!editMode) onCharacterUpdate(next);
                                            }}
                                        />
                                    </Card>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* ── DIRECTIVES ───────────────────────────── */}
                                    <Card title="Directives">
                                        {/* Personnelles */}
                                        <div className="flex flex-col gap-2">
                                    <span className="text-xs cp-font-ui uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                                        Personnelles
                                    </span>
                                            {(char?.directives ?? [])
                                                .filter(d => d.type === 'personal')
                                                .map((d, i) => (
                                                    <DirectiveRow
                                                        key={d.id ?? i}
                                                        directive={d}
                                                        editMode={editMode}
                                                        onChange={(updated) => {
                                                            setEditableChar(prev => ({
                                                                ...prev,
                                                                directives: prev.directives.map(x =>
                                                                    (x.id ?? x) === (d.id ?? d) ? { ...x, ...updated } : x
                                                                ),
                                                            }));
                                                        }}
                                                    />
                                                ))
                                            }
                                            {editMode && (
                                                <button
                                                    onClick={() => setEditableChar(prev => ({
                                                        ...prev,
                                                        directives: [...(prev.directives ?? []), { type: 'personal', text: '', blankValue: '', completed: false }],
                                                    }))}
                                                    className="text-xs py-1"
                                                    style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                >
                                                    + Ajouter
                                                </button>
                                            )}
                                        </div>

                                        <div className="cp-divider" />

                                        {/* Mission */}
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs cp-font-ui uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                                                De Mission
                                            </span>
                                            {(char?.directives ?? [])
                                                .filter(d => d.type === 'mission')
                                                .map((d, i) => (
                                                    <DirectiveRow
                                                        key={d.id ?? i}
                                                        directive={d}
                                                        editMode={editMode}
                                                        onChange={(updated) => {
                                                            setEditableChar(prev => ({
                                                                ...prev,
                                                                directives: prev.directives.map(x =>
                                                                    (x.id ?? x) === (d.id ?? d) ? { ...x, ...updated } : x
                                                                ),
                                                            }));
                                                        }}
                                                    />
                                                ))
                                            }
                                            {editMode && (
                                                <button
                                                    onClick={() => setEditableChar(prev => ({
                                                        ...prev,
                                                        directives: [...(prev.directives ?? []), { type: 'mission', text: '', blankValue: '', completed: false }],
                                                    }))}
                                                    className="text-xs py-1"
                                                    style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                >
                                                    + Ajouter
                                                </button>
                                            )}
                                        </div>
                                    </Card>

                                    {/* ── RELATIONS ────────────────────────────── */}
                                    <Card
                                        title="Relations"
                                        action={
                                            <button
                                                onClick={() => setTagAdderToggleRelation(v => !v)}
                                                className={`text-xs px-2 py-0.5 rounded bg-none border-none cursor-pointer ${tagAdderToggleRelation ? 'text-secondary' : 'text-primary'}`}
                                                title="Editer les tags"
                                            >
                                                ⎚
                                            </button>
                                        }
                                    >
                                        {(char?.relations ?? []).map((r, i) => (
                                            <RelationRow
                                                key={r.id ?? i}
                                                relation={r}
                                                editMode={editMode}
                                                onChange={(updated) => {
                                                    setEditableChar(prev => ({
                                                        ...prev,
                                                        relations: prev.relations.map(x => x.id === r.id ? { ...x, ...updated } : x),
                                                    }));
                                                }}
                                                onRemoveTag={(tagIdx) => removeTag('relation', r.id, tagIdx)}
                                                onAddTag={(text, variant) => addTag('relation', r.id, text, variant)}
                                                onRemove={() => setEditableChar(prev => ({
                                                    ...prev,
                                                    relations: prev.relations.filter(x => (x.id ?? x) !== (r.id ?? r)),
                                                }))}
                                                toggleTagAdder={tagAdderToggleRelation}
                                            />
                                        ))}
                                        {editMode && (
                                            <button
                                                onClick={() => setEditableChar(prev => ({
                                                    ...prev,
                                                    relations: [...(prev.relations ?? []), { name: '', description: '', link_score: 1, tags: [] }],
                                                }))}
                                                className="text-sm py-1.5 w-full rounded-lg"
                                                style={{
                                                    color:      'var(--color-primary)',
                                                    background: 'var(--color-surface-alt)',
                                                    border:     '1px dashed var(--color-border)',
                                                }}
                                            >
                                                + Ajouter une relation
                                            </button>
                                        )}
                                    </Card>
                                </div>

                                {/* ── NOTES ──────────────────────────────────
                                <Card title="Notes">
                                    {editMode ? (
                                        <textarea
                                            value={editableChar?.notes ?? ''}
                                            onChange={e => set('notes', e.target.value)}
                                            rows={4}
                                            placeholder="Notes libres…"
                                            className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                                            style={{
                                                background: 'var(--color-surface-alt)',
                                                border:     '1px solid var(--color-border)',
                                                color:      'var(--color-text)',
                                                outline:    'none',
                                            }}
                                        />
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
                                            {char?.notes || 'Aucune note.'}
                                        </p>
                                    )}
                                </Card>*/}
                            </div>

                            {/* ── Colonne droite — Moves ─────────────────────── */}
                            <aside
                                className="flex flex-col overflow-hidden flex-shrink-0"
                                style={{
                                    width:        '280px',
                                    borderLeft:   '1px solid var(--color-border)',
                                    background:   'var(--cp-move-bg)',
                                }}
                            >
                                {/* Header moves */}
                                <div
                                    className="px-3 py-3 flex flex-col gap-2"
                                    style={{ borderBottom: '1px solid var(--color-border)' }}
                                >
                                    <h2 className="text-xs font-bold cp-font-ui uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                                        Manœuvres
                                    </h2>
                                    {/* Micro-onglets */}
                                    <div
                                        className="flex rounded-lg overflow-hidden"
                                        style={{ background: 'var(--color-surface-alt)' }}
                                    >
                                        {[
                                            { id: 'base',     label: 'De base' },
                                            { id: 'playbook', label: char?.playbook ?? 'Playbook' },
                                            ...(showAdvancementTab
                                                    ? [{ id: 'advancement', label: '★ Avance.' }]
                                                    : []
                                            ),
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setMovesTab(t.id)}
                                                className="flex-1 py-1.5 text-xs font-semibold cp-font-ui uppercase tracking-wide transition-all relative"
                                                style={{
                                                    background: movesTab === t.id ? 'var(--color-primary)' : 'transparent',
                                                    color:      movesTab === t.id ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                                    border:     'none',
                                                    cursor:     'pointer',
                                                    boxShadow:  movesTab === t.id ? 'var(--cp-glow-cyan)' : 'none',
                                                }}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Liste moves scrollable */}
                                <div className="flex-1 overflow-y-auto cp-scroll p-2 flex flex-col gap-1">
                                    {movesLoading && (
                                        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                                            Chargement…
                                        </p>
                                    )}
                                    {!movesLoading && movesDisplay.map(move => {
                                        const isAcquired = charMoveIds.has(move.id);

                                        const handleClick = () => {
                                            if (editMode) {
                                                if (isAcquired) {
                                                    // Retirer le move
                                                    setEditableChar(prev => ({
                                                        ...prev,
                                                        moves: (prev.moves ?? []).filter(m => m.id !== move.id),
                                                    }));
                                                } else {
                                                    // Ajouter le move (sans coût XP — c'est l'édition libre)
                                                    setEditableChar(prev => ({
                                                        ...prev,
                                                        moves: [...(prev.moves ?? []), { id: move.id, name: move.name, stat: move.stat, description: move.description, playbook: move.playbook, type: move.type, isApproved: true }],
                                                    }));
                                                }
                                            } else if (move.stat) {
                                                // Hors édition : ouvrir la MoveModal si le move a une stat
                                                setMoveModal({ mode: 'move', move });
                                            }
                                        };

                                        return (
                                            <MoveCard
                                                key={move.id}
                                                move={move}
                                                isUnlocked={isAcquired || move.playbook === null}
                                                isAcquired={isAcquired}
                                                isEditMode={editMode}
                                                showFull={movesTab === 'advancement'}
                                                onClick={handleClick}
                                            />
                                        );
                                    })}
                                    {!movesLoading && movesDisplay.length === 0 && (
                                        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                                            Aucune manœuvre.
                                        </p>
                                    )}
                                </div>
                            </aside>
                        </div>
                    )}

                    {/* ── JOURNAL ────────────────────────────────────────────── */}
                    {activeTab === 'journal' && (
                        <div className="h-full overflow-y-auto cp-scroll p-4">
                            <JournalTab
                                characterId={character.id}
                            />
                        </div>
                    )}

                    {/* ── HISTORIQUE ─────────────────────────────────────────── */}
                    {activeTab === 'historique' && (
                        <div className="h-full overflow-y-auto cp-scroll p-4">
                            <DiceHistoryPage
                                sessionId={activeGMSession}
                                renderHistoryEntry={cyberpunkConfig.dice.renderHistoryEntry}
                            />
                        </div>
                    )}
                </div>

            </main>

            {/* ── Modales ───────────────────────────────────────────────── */}
            {moveModal && (
                <MoveModal
                    mode={moveModal.mode}
                    move={moveModal.move}
                    statKey={moveModal.statKey}
                    character={character}
                    sessionId={activeGMSession}
                    onClose={() => setMoveModal(null)}
                />
            )}
            {showXPPanel && (
                <XPPanel
                    character={character}
                    onUpdate={(updated) => {
                        onCharacterUpdate(updated);
                        setShowXPPanel(false);
                    }}
                    onClose={() => setShowXPPanel(false)}
                />
            )}
            {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}
            {showCharList   && <CharacterListModal
                isOpen={showCharList}
                currentCharId={character?.id}
                onClose={() => setShowCharList(false)}
                onSelect={handleSelectChar}
            />}
            {showAvatar     && (
                <AvatarUploader
                    currentAvatar={char.avatar}
                    onAvatarChange={(newAvatar) => {
                        setEditableChar(prev => ({ ...prev, avatar: newAvatar }));
                    }}
                    onClose={() => setShowAvatar(false)}
                />
            )}
            {browseModal === 'cyberware' && (
                <BrowseModal
                    title="Cyberware"
                    items={CYBERWARE_ALL}
                    groupKey="category"
                    onAdd={(cw) => {
                        const base = editMode ? editableChar : char;
                        const next = {
                            ...base,
                            cyberware: [...(base.cyberware ?? []), {
                                name:        cw.name,
                                option_text: '',
                                notes:       '',
                                tags:        cw.tags.map(t => ({ tag_text: t.text, tag_variant: t.variant })),
                            }],
                        };
                        setEditableChar(next);
                        if (!editMode) onCharacterUpdate(next);
                    }}
                    onClose={() => setBrowseModal(null)}
                />
            )}

            {browseModal === 'items' && (
                <BrowseModal
                    title="Inventaire"
                    items={ITEMS_ALL}
                    groupKey="category"
                    onAdd={(it) => {
                        const base = editMode ? editableChar : char;
                        const next = {
                            ...base,
                            items: [...(base.items ?? []), {
                                name:        it.name,
                                description: '',
                                quantity:    1,
                                tags:        it.tags.map(t => ({ tag_text: t.text, tag_variant: t.variant })),
                            }],
                        };
                        setEditableChar(next);
                        if (!editMode) onCharacterUpdate(next);
                    }}
                    onClose={() => setBrowseModal(null)}
                />
            )}
        </div>
    );
};

export default Sheet;