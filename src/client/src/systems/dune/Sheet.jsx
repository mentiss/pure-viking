// src/client/src/systems/dune/Sheet.jsx
// Shell de la fiche joueur Dune.
// Onglets : Fiche · Atouts · Journal · Historique
// Hamburger : Changer de perso · Config dés · GM · Déconnexion

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './theme.css';

import ThemeToggle          from '../../components/ui/ThemeToggle.jsx';
import ToastNotifications   from '../../components/layout/ToastNotifications.jsx';
import SessionPlayersBar    from '../../components/layout/SessionPlayersBar.jsx';
import JournalTab           from '../../components/tabs/JournalTab.jsx';
import HistoryPanel         from '../../components/layout/HistoryPanel.jsx';
import DiceConfigModal      from '../../components/modals/DiceConfigModal.jsx';
import CharacterListModal   from '../../components/modals/CharacterListModal.jsx';
import AvatarUploader       from '../../components/AvatarUploader.jsx';

import SkillRow             from './components/SkillRow.jsx';
import PrincipleRow         from './components/PrincipleRow.jsx';
import TalentsList          from './components/TalentsList.jsx';
import AtoutsList           from './components/AtoutsList.jsx';
import DeterminationTracker from './components/DeterminationTracker.jsx';
import SessionResourcesBar  from './components/SessionResourcesBar.jsx';
import VerticalGauge        from './components/VerticalGauge.jsx';
import DuneDiceModal        from './dice/DuneDiceModal.jsx';

import { useSession } from '../../context/SessionContext.jsx';
import { useAuth }    from '../../context/AuthContext.jsx';
import { useSocket }  from '../../context/SocketContext.jsx';
import { useSystem }  from '../../hooks/useSystem.js';
import { useFetch }   from '../../hooks/useFetch.js';
import { usePlayerSession } from '../../hooks/usePlayerSession.js';
import DiceHistoryPage from "../../components/layout/DiceHistoryPage.jsx";
import DuneHistoryEntry from "./components/DuneHistoryEntry.jsx";

// ── Onglets ───────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'fiche',      label: '📋 Fiche' },
    { id: 'atouts',     label: '💎 Atouts' },
    { id: 'journal',    label: '📓 Journal' },
    { id: 'historique', label: '📜 Historique' },
];

/**
 * @param {object}   props.character
 * @param {Function} props.onCharacterUpdate  - (updatedChar) => void
 * @param {Function} props.onLogout           - callback déco → PlayerPage repasse en 'selecting'
 * @param {number}   props.journalUnread
 * @param {Function} props.onJournalRead
 * @param {boolean}  props.darkMode
 * @param {Function} props.onToggleDarkMode
 */
const Sheet = ({
                   character,
                   onCharacterUpdate,
                   onLogout,
                   journalUnread,
                   onJournalRead,
                   darkMode,
                   onToggleDarkMode,
               }) => {
    const { system }  = useParams();
    const { apiBase } = useSystem();
    const { logout, user }  = useAuth();
    const socket      = useSocket();
    const fetchWithAuth = useFetch();
    const { activeGMSession, activeSessionName } = useSession();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [activeTab,       setActiveTab]       = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.some(t => t.id === hash) ? hash : 'fiche';
    });
    const [editMode,        setEditMode]        = useState(false);
    const [editableChar,    setEditableChar]    = useState(character);

    // Modales
    const [diceModal,                  setDiceModal]          = useState(null);
    const [showDiceModal,              setShowDiceModal]      = useState(null);
    const [showMenu,           setShowMenu]           = useState(false);
    const [showDiceConfig,     setShowDiceConfig]     = useState(false);
    const [showCharList,       setShowCharList]       = useState(false);
    const [showAvatarUploader, setShowAvatarUploader] = useState(false);

    // Ressources session (pour DuneDiceModal)
    const [sessionResources, setSessionResources] = useState({ impulsions: 0, menace: 0 });

    // ── Chargement initial des ressources de session ─────────────────────────
    useEffect(() => {
        if (!activeGMSession) return;
        fetchWithAuth(`${apiBase}/session-resources/${activeGMSession}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setSessionResources(data); })
            .catch(err => console.error('[Sheet/dune] Erreur chargement ressources:', err));
    }, [activeGMSession, apiBase]);

    // ── Écoute socket ressources ──────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const onUpdate = data => setSessionResources(prev => ({ ...prev, ...data }));
        socket.on('session-resources-update', onUpdate);
        return () => socket.off('session-resources-update', onUpdate);
    }, [socket]);

    // ── Mise à jour ressources (optimiste) ────────────────────────────────────
    const updateResource = useCallback((field, delta) => {
        if (!socket || !activeGMSession) return;
        // Mise à jour locale immédiate — le serveur confirme via session-resources-update
        setSessionResources(prev => ({
            ...prev,
            [field]: field === 'impulsions'
                ? Math.max(0, Math.min(6, (prev[field] ?? 0) + delta))
                : Math.max(0, (prev[field] ?? 0) + delta),
        }));
        socket.emit('update-session-resources', { sessionId: activeGMSession, field, delta });
    }, [socket, activeGMSession]);

    // ── Sync si le personnage est mis à jour de l'extérieur ──────────────────
    useEffect(() => {
        if (!editMode) setEditableChar(character);
    }, [character, editMode]);

    // ── Sauvegarde / Annulation ───────────────────────────────────────────────
    const handleSave = useCallback(() => {
        onCharacterUpdate(editableChar);
        setEditMode(false);
    }, [editableChar, onCharacterUpdate]);

    const handleCancel = useCallback(() => {
        setEditableChar(character);
        setEditMode(false);
    }, [character]);

    // ── Helpers de mise à jour locale ────────────────────────────────────────
    const updateField = (field, value) =>
        setEditableChar(prev => ({ ...prev, [field]: value }));

    const updateCompetence = updated =>
        setEditableChar(prev => ({
            ...prev,
            competences: prev.competences.map(c => c.key === updated.key ? updated : c),
        }));

    const updatePrincipe = updated =>
        setEditableChar(prev => ({
            ...prev,
            principes: prev.principes.map(p => p.key === updated.key ? updated : p),
        }));

    // Référence en lecture (version confirmée ou en cours d'édition)
    const char = editMode ? editableChar : character;

    // ── Déconnexion ───────────────────────────────────────────────────────────
    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
        onLogout?.();
    };

    // ── Changer de perso ──────────────────────────────────────────────────────
    const handleSelectChar = (selectedChar) => {
        setShowCharList(false);
        // On navigue vers l'URL du perso sélectionné — PlayerPage gère la suite
        window.location.href = `/${system}/${selectedChar.accessUrl}`;
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--dune-bg)', color: 'var(--dune-text)' }}>
            <ToastNotifications />

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <header
                className="sticky top-0 z-20 px-4 py-2 flex items-center justify-between shadow-md"
                style={{ background: 'var(--dune-dark)', borderBottom: '2px solid var(--dune-gold)' }}
            >
                {/* Identité */}
                <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                        {char.prenom || ''} {char.nom || ''}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--dune-sand)' }}>
                        {char.playerName}{char.statutSocial ? ` · ${char.statutSocial}` : ''}
                    </div>
                </div>

                {/* Code d'accès — masqué sur mobile */}
                <div className="text-center">
                    <div className="dune-label dune-font" style={{ color: 'var(--dune-sand)', fontSize: '25px' }}>DUNE</div>
                </div>

                {/* Actions header */}
                <div className="flex items-center gap-2">
                    <div className="text-center hidden sm:block">
                        <div className="dune-label" style={{ color: 'var(--dune-sand)', fontSize: '9px' }}>Code</div>
                        <div className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--dune-gold)' }}>
                            {char.accessCode}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDiceModal(true)}
                        className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: 'var(--dune-ochre)', color: 'white' }}
                        title="Lancer des dés"
                    >
                        🎲 Dés
                    </button>

                    <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                    {/* Menu hamburger */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(v => !v)}
                            className="w-8 h-8 flex items-center justify-center rounded font-bold text-base"
                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-gold)' }}
                            title="Menu"
                        >
                            ☰
                        </button>

                        {showMenu && (
                            <>
                                {/* Overlay pour fermer */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div
                                    className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden"
                                    style={{
                                        background: 'var(--dune-surface)',
                                        border: '1px solid var(--dune-border)',
                                    }}
                                >
                                    {/* Créer un personnage */}
                                    <button
                                        onClick={() => { setShowMenu(false); window.location.href = `/${system}/`; }}
                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
                                        style={{ color: 'var(--dune-text)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dune-surface-alt)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        ✨ Créer un personnage
                                    </button>

                                    {/* Changer de personnage */}
                                    <button
                                        onClick={() => { setShowMenu(false); setShowCharList(true); }}
                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
                                        style={{ color: 'var(--dune-text)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dune-surface-alt)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        🗂️ Changer de personnage
                                    </button>

                                    {/* Config animations dés */}
                                    <button
                                        onClick={() => { setShowMenu(false); setShowDiceConfig(true); }}
                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
                                        style={{ color: 'var(--dune-text)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dune-surface-alt)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        🎲 Config animations dés
                                    </button>

                                    {/* Accès interface GM — si le compte a le droit */}
                                    <button
                                        onClick={() => { setShowMenu(false); window.location.href = `/${system}/gm`; }}
                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
                                        style={{ color: 'var(--dune-text)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dune-surface-alt)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        🎭 Interface GM
                                    </button>

                                    {/* Séparateur */}
                                    <div style={{ borderTop: '1px solid var(--dune-border)', margin: '2px 0' }} />

                                    {/* Déconnexion */}
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
            </header>

            {/* ── CORPS PRINCIPAL ──────────────────────────────────────────── */}
            <div className="flex flex-1">

                {/* ── CENTRE : navigation + contenu ─────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* ── NAVIGATION ────────────────────────────────────── */}
                    <nav
                        className="flex overflow-x-auto border-b px-2"
                        style={{ borderColor: 'var(--dune-border)', background: 'var(--dune-surface)' }}
                    >
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    window.location.hash = tab.id;
                                    if (tab.id === 'journal') onJournalRead?.();
                                }}
                                className="px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors relative"
                                style={{
                                    color:        activeTab === tab.id ? 'var(--dune-gold)' : 'var(--dune-text-muted)',
                                    borderBottom: activeTab === tab.id ? '2px solid var(--dune-gold)' : '2px solid transparent',
                                }}
                            >
                                {tab.label}
                                {tab.id === 'journal' && journalUnread > 0 && (
                                    <span
                                        className="ml-1 px-1 py-0.5 text-[9px] rounded-full font-bold"
                                        style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}
                                    >
                                        {journalUnread}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* ── CONTENU ────────────────────────────────────────── */}
                    <div className="flex flex-1">
                        <SessionPlayersBar
                            character={character}
                            sessionId={activeGMSession}
                            sessionName={activeSessionName}
                        />

                        {/* Zone centrale avec jauges encadrantes */}
                        <div className="flex-1 flex justify-center px-2 py-4">
                            {/* Carte unifiée qui enveloppe jauges + contenu */}
                            <div
                                className="flex w-full"
                                style={{
                                    background:   'var(--dune-surface)',
                                    border:       '1px solid var(--dune-border)',
                                    borderRadius: 12,
                                    overflow:     'hidden',
                                    maxWidth:     activeGMSession ? '1400px' : '1200px',
                                }}
                            >
                                {/* Jauge Impulsions — à gauche du contenu */}
                                {activeGMSession && (
                                    <div
                                        className="flex-shrink-0 flex flex-col items-center px-2 py-4 sticky top-14 self-start"
                                        style={{
                                            width: 60,
                                            borderRight: '1px solid var(--dune-border)',
                                        }}
                                    >
                                        <VerticalGauge
                                            label="Imp."
                                            value={sessionResources.impulsions ?? 0}
                                            max={6}
                                            filledColor="var(--dune-gold)"
                                            emptyColor="var(--dune-surface-alt)"
                                            borderColor="var(--dune-ochre)"
                                            onInc={() => updateResource('impulsions', 1)}
                                            onDec={() => updateResource('impulsions', -1)}
                                        />
                                    </div>
                                )}

                                {/* Contenu principal */}
                                <div className="flex-1 p-4 min-w-0" style={{ background: 'var(--dune-bg)' }}>

                                    {/* ── TAB FICHE ──────────────────────────────────────── */}
                                    {activeTab === 'fiche' && (
                                        <>
                                            {/* ── Barre d'actions édition ────────────────────────────── */}
                                            <div className="flex justify-end gap-2 mb-4">
                                                {editMode ? (
                                                    <>
                                                        <button onClick={handleCancel} className="dune-btn-secondary text-xs">
                                                            Annuler
                                                        </button>
                                                        <button onClick={handleSave} className="dune-btn-primary text-xs">
                                                            ✓ Sauvegarder
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setEditMode(true)} className="dune-btn-secondary text-xs">
                                                        ⚙️ Édition
                                                    </button>
                                                )}
                                            </div>

                                            {/* ── BANNIÈRE IDENTITÉ — pleine largeur ─────────────────── */}
                                            <div className="dune-card mb-4">
                                                {editMode ? (
                                                    /* ── MODE ÉDITION ─────────────────────────────────── */
                                                    <div className="flex flex-col gap-4">

                                                        {/* Ligne 1 : Avatar + champs principaux */}
                                                        <div className="flex gap-4 items-start">

                                                            {/* Avatar */}
                                                            <div
                                                                onClick={() => setShowAvatarUploader(true)}
                                                                className="relative group cursor-pointer flex-shrink-0"
                                                                title={char.avatar ? "Modifier l'avatar" : 'Ajouter un avatar'}
                                                            >
                                                                {char.avatar ? (
                                                                    <>
                                                                        <img
                                                                            src={char.avatar}
                                                                            alt="Avatar"
                                                                            className="w-24 h-24 rounded-full object-cover group-hover:opacity-75 transition-opacity"
                                                                            style={{ border: '3px solid var(--dune-gold)' }}
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full">
                                                                            <span className="text-2xl">📸</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div
                                                                        className="w-24 h-24 rounded-full flex items-center justify-center group-hover:opacity-75 transition-opacity"
                                                                        style={{ background: 'var(--dune-surface-alt)', border: '3px dashed var(--dune-border)' }}
                                                                    >
                                                                        <span className="text-2xl">📸</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Nom / Prénom / Joueur / Statut */}
                                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <div>
                                                                    <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Prénom</div>
                                                                    <input
                                                                        value={char.prenom ?? ''}
                                                                        onChange={e => updateField('prenom', e.target.value)}
                                                                        className="dune-input text-sm font-bold w-full"
                                                                        placeholder="Prénom…"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Nom du personnage</div>
                                                                    <input
                                                                        value={char.nom ?? ''}
                                                                        onChange={e => updateField('nom', e.target.value)}
                                                                        className="dune-input text-sm w-full"
                                                                        placeholder="Nom…"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Nom du joueur</div>
                                                                    <input
                                                                        value={char.playerName ?? ''}
                                                                        onChange={e => updateField('playerName', e.target.value)}
                                                                        className="dune-input text-xs w-full"
                                                                        placeholder="Joueur…"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Statut social</div>
                                                                    <input
                                                                        value={char.statutSocial ?? ''}
                                                                        onChange={e => updateField('statutSocial', e.target.value)}
                                                                        className="dune-input text-xs w-full"
                                                                        placeholder="Statut social…"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Ligne 2 : Stats physiques */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            <div>
                                                                <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Âge</div>
                                                                <input
                                                                    type="number"
                                                                    value={char.age ?? ''}
                                                                    onChange={e => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                                                                    className="dune-input text-xs w-full"
                                                                    placeholder="—"
                                                                    min={0}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Taille (cm)</div>
                                                                <input
                                                                    type="number"
                                                                    value={char.taille ?? ''}
                                                                    onChange={e => updateField('taille', e.target.value ? parseInt(e.target.value) : null)}
                                                                    className="dune-input text-xs w-full"
                                                                    placeholder="—"
                                                                    min={0}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Poids (kg)</div>
                                                                <input
                                                                    type="number"
                                                                    value={char.poids ?? ''}
                                                                    onChange={e => updateField('poids', e.target.value ? parseInt(e.target.value) : null)}
                                                                    className="dune-input text-xs w-full"
                                                                    placeholder="—"
                                                                    min={0}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Sexe</div>
                                                                <input
                                                                    value={char.sexe ?? ''}
                                                                    onChange={e => updateField('sexe', e.target.value)}
                                                                    className="dune-input text-xs w-full"
                                                                    placeholder="—"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Ligne 3 : Motto + Description */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <div>
                                                                <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Devise / Motto</div>
                                                                <input
                                                                    value={char.motto ?? ''}
                                                                    onChange={e => updateField('motto', e.target.value)}
                                                                    className="dune-input text-xs w-full italic"
                                                                    placeholder="« … »"
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Description</div>
                                                                <textarea
                                                                    value={char.description ?? ''}
                                                                    onChange={e => updateField('description', e.target.value)}
                                                                    className="dune-input text-xs w-full"
                                                                    rows={2}
                                                                    placeholder="Description libre…"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Ligne 4 : Détermination + Code d'accès */}
                                                        <div className="flex flex-wrap gap-4 items-start">
                                                            <div className="flex-shrink-0">
                                                                <DeterminationTracker
                                                                    determination={char.determination}
                                                                    determinationMax={char.determinationMax ?? 9999}
                                                                    editMode={editMode}
                                                                    noCard
                                                                    onChange={({ determination, determinationMax }) => {
                                                                        setEditableChar(prev => ({ ...prev, determination, determinationMax }));
                                                                    }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] mb-1" style={{ color: 'var(--dune-text-muted)' }}>Code d'accès</div>
                                                                <input
                                                                    value={char.accessCode ?? ''}
                                                                    onChange={e => updateField('accessCode', e.target.value.toUpperCase().slice(0, 6))}
                                                                    className="dune-input text-xs font-mono tracking-widest"
                                                                    placeholder="CODE"
                                                                    maxLength={6}
                                                                    style={{ width: 80 }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                ) : (
                                                    /* ── MODE LECTURE ──────────────────────────────────── */
                                                    <div className="grid gap-4" style={{ gridTemplateColumns: 'auto 1fr auto' }}>

                                                        <div className="flex gap-3 items-start" style={{ minWidth: 200 }}>
                                                            {char.avatar ? (
                                                                <img
                                                                    src={char.avatar}
                                                                    alt={char.nom}
                                                                    className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                                                                    style={{ border: '2px solid var(--dune-gold)' }}
                                                                    onError={e => { e.target.style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                                                                    style={{ background: 'var(--dune-surface-alt)', border: '2px solid var(--dune-border)' }}
                                                                >
                                                                    👤
                                                                </div>
                                                            )}
                                                            <div className="space-y-1 min-w-0">
                                                                <div>
                                                                    {char.prenom && (
                                                                        <span className="font-bold text-base" style={{ color: 'var(--dune-gold)' }}>
                                                                            {char.prenom}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-sm ml-1" style={{ color: 'var(--dune-text-muted)' }}>
                                                                        {char.nom}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                                                                    {char.playerName}
                                                                    {char.statutSocial && <span> · {char.statutSocial}</span>}
                                                                </div>
                                                                {char.motto && (
                                                                    <div className="text-xs italic pt-1" style={{ color: 'var(--dune-ochre)' }}>
                                                                        « {char.motto} »
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>


                                                        <div
                                                            className="flex flex-col justify-between py-1 px-4"
                                                            style={{ borderLeft: '1px solid var(--dune-border)', borderRight: '1px solid var(--dune-border)' }}
                                                        >
                                                            {/* Stats physiques en grille 2×2 */}
                                                            {(char.age || char.taille || char.poids || char.sexe) && (
                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3">
                                                                    {char.age && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs" style={{ color: 'var(--dune-text-muted)', minWidth: 48 }}>Âge</span>
                                                                            <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{char.age} ans</span>
                                                                        </div>
                                                                    )}
                                                                    {char.taille && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs" style={{ color: 'var(--dune-text-muted)', minWidth: 48 }}>Taille</span>
                                                                            <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{char.taille} cm</span>
                                                                        </div>
                                                                    )}
                                                                    {char.poids && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs" style={{ color: 'var(--dune-text-muted)', minWidth: 48 }}>Poids</span>
                                                                            <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{char.poids} kg</span>
                                                                        </div>
                                                                    )}
                                                                    {char.sexe && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs" style={{ color: 'var(--dune-text-muted)', minWidth: 48 }}>Sexe</span>
                                                                            <span className="text-xs font-semibold" style={{ color: 'var(--dune-sand)' }}>{char.sexe}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Description — prend le reste de la hauteur */}
                                                            {char.description && (
                                                                <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--dune-text)' }}>
                                                                    {char.description}
                                                                </div>
                                                            )}
                                                        </div>


                                                        <div className="flex items-center justify-center" style={{ minWidth: 120 }}>
                                                            <DeterminationTracker
                                                                determination={char.determination}
                                                                determinationMax={char.determinationMax ?? 9999}
                                                                editMode={false}
                                                                noCard
                                                                onChange={({ determination, determinationMax }) => {
                                                                    onCharacterUpdate({ ...character, determination, determinationMax });
                                                                }}
                                                            />
                                                        </div>

                                                    </div>
                                                )}
                                            </div>
                                            {/* ── FIN BANNIÈRE ────────────────────────────────────────── */}

                                            {/* ── Principes | Compétences ─────────────────────────────── */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                <div className="dune-card">
                                                    <div className="dune-label dune-font mb-2">Principes</div>
                                                    {(char.principes ?? []).map(p => (
                                                        <PrincipleRow
                                                            key={p.key}
                                                            principe={p}
                                                            editMode={editMode}
                                                            onChange={updatePrincipe}
                                                            onRoll={p => setDiceModal({ type: 'principe', key: p.key })}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="dune-card">
                                                    <div className="dune-label dune-font mb-2">Competences</div>
                                                    {(char.competences ?? []).map(c => (
                                                        <SkillRow
                                                            key={c.key}
                                                            competence={c}
                                                            editMode={editMode}
                                                            onChange={updateCompetence}
                                                            onRoll={c => setDiceModal({ type: 'competence', key: c.key })}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ── Talents ─────────────────────────────────────────────── */}
                                            <div className="mt-4">
                                                <TalentsList
                                                    talents={char.talents}
                                                    editMode={editMode}
                                                    onChange={v => updateField('talents', v)}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* ── TAB ATOUTS ─────────────────────────────────────── */}
                                    {activeTab === 'atouts' && (
                                        <>
                                            {/* Barre d'actions édition */}
                                            <div className="flex justify-end gap-2 mb-4">
                                                {editMode ? (
                                                    <>
                                                        <button onClick={handleCancel} className="dune-btn-secondary text-xs">
                                                            Annuler
                                                        </button>
                                                        <button onClick={handleSave} className="dune-btn-primary text-xs">
                                                            ✓ Sauvegarder
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setEditMode(true)} className="dune-btn-secondary text-xs">
                                                        ⚙️ Édition
                                                    </button>
                                                )}
                                            </div>

                                            <AtoutsList
                                                items={char.items}
                                                editMode={editMode}
                                                onChange={v => {
                                                    if (editMode) {
                                                        updateField('items', v);
                                                    } else {
                                                        onCharacterUpdate({ ...character, items: v });
                                                    }
                                                }}
                                            />
                                        </>
                                    )}

                                    {/* ── TAB JOURNAL ────────────────────────────────────── */}
                                    {activeTab === 'journal' && (
                                        <JournalTab characterId={character.id} />
                                    )}

                                    {/* ── TAB HISTORIQUE ─────────────────────────────────── */}
                                    {activeTab === 'historique' && (
                                        <DiceHistoryPage
                                            character={character}
                                            renderEntry={(roll) => <DuneHistoryEntry roll={roll} />}
                                            sessionId={activeGMSession ?? null}
                                        />
                                    )}
                                    {/* Fin contenu principal */}
                                </div>

                                {/* Jauge Menace — à droite du contenu */}
                                {activeGMSession && (
                                    <div
                                        className="shrink-0 flex items-stretch px-2 py-4 sticky top-14 self-start h-100 "
                                        style={{
                                            width: 60,
                                            borderLeft: '1px solid var(--dune-border)',
                                        }}
                                    >
                                        <VerticalGauge
                                            label="Menace"
                                            value={sessionResources.menace ?? 0}
                                            max={12}
                                            filledColor="var(--dune-red)"
                                            emptyColor="var(--dune-surface-alt)"
                                            borderColor="var(--dune-red)"
                                            readonly={true}
                                        />
                                    </div>
                                )}

                                {/* Fin carte */}
                            </div>
                            {/* Fin zone centrale */}
                        </div>
                        {/* Fin flex contenu */}
                    </div>
                    {/* Fin centre */}
                </div>
                {/* Fin corps principal */}
            </div>

            {/* ── MODALE DÉS ────────────────────────────────────────────── */}
            {(diceModal || showDiceModal) && (
                <DuneDiceModal
                    character={character}
                    preselect={diceModal}
                    onClose={() => {
                        setDiceModal(null);
                        setShowDiceModal(false);
                    }}
                    onCharacterUpdate={onCharacterUpdate}
                    sessionResources={sessionResources}
                />
            )}

            {/* ── CONFIG DÉS ────────────────────────────────────────────── */}
            {showDiceConfig && (
                <DiceConfigModal onClose={() => setShowDiceConfig(false)} />
            )}

            {/* ── CHANGER DE PERSO ──────────────────────────────────────── */}
            <CharacterListModal
                isOpen={showCharList}
                currentCharId={character?.id}
                onClose={() => setShowCharList(false)}
                onSelect={handleSelectChar}
            />

            {/* ── AVATAR UPLOADER ───────────────────────────────────────── */}
            {showAvatarUploader && (
                <AvatarUploader
                    currentAvatar={editableChar.avatar}
                    onAvatarChange={(newAvatar) => {
                        setEditableChar(prev => ({ ...prev, avatar: newAvatar }));
                    }}
                    onClose={() => setShowAvatarUploader(false)}
                />
            )}
        </div>
    );
};

export default Sheet;