// src/client/src/systems/deltagreen/Sheet.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fiche joueur Delta Green — orchestrateur principal.
//
// Contrat props (plateforme) :
//   character          — objet complet chargé par PlayerPage
//   onCharacterUpdate  — (updatedChar) → PUT serveur
//   onLogout           — callback déconnexion → PlayerPage repasse en 'selecting'
//   journalUnread      — nombre de messages non lus
//   onJournalRead      — callback quand l'onglet journal est ouvert
//   darkMode           — booléen
//   onToggleDarkMode   — callback bascule thème
//
// Onglets (sans tiret dans le hash) :
//   page1      → Identité, statistiques, données psychologiques, compétences
//   page2      → Santé physique, équipement, remarques
//   journal    → Journal de session
//   historique → Historique des jets de dés
//
// Dégradation visuelle :
//   data-palier="N" sur .dg-sheet-wrapper, absent en editMode.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';

import { useSystem }  from '../../hooks/useSystem.js';
import { useSocket }  from '../../context/SocketContext.jsx';
import { useSession } from '../../context/SessionContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';


import './theme.css';
import {useAuth} from "../../context/AuthContext.jsx";
import IdentitySection from "./components/layout/IdentitySection.jsx";
import StatsSection from "./components/layout/StatsSection.jsx";
import DerivedSection from "./components/layout/DerivedSection.jsx";
import BondsSection from "./components/layout/BondSection.jsx";
import MotivationsSection from "./components/layout/MotivationsSection.jsx";
import SanLogSection from "./components/layout/SanLogSection.jsx";
import SkillsSection from "./components/layout/SkillsSection.jsx";
import InjuriesSection, {
    EquipmentSection,
    NotesSection,
    SpecialTrainingSection,
    WeaponsSection
} from "./components/layout/Page2Sections.jsx";
import JournalTab from "../../components/tabs/JournalTab.jsx";
import AvatarUploader from "../../components/AvatarUploader.jsx";
import DiceConfigModal from "../../components/modals/DiceConfigModal.jsx";
import SanModal from "./components/modals/SanModal.jsx";
import EvolveModal from "./components/modals/EvolveModal.jsx";
import DiceModal from "./components/modals/DiceModal.jsx";
import DiceHistoryPage from "../../components/layout/DiceHistoryPage.jsx";
import deltgreenConfig from "./config.jsx";
import ToastNotifications from "../../components/layout/ToastNotifications.jsx";
import SessionPlayersBar from "../../components/layout/SessionPlayersBar.jsx";
import CharacterListModal from "../../components/modals/CharacterListModal.jsx";

// ── Onglets ──────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'page1',      label: 'Dossier agent'  },
    { id: 'journal',    label: 'Journal'          },
    { id: 'historique', label: 'Historique'       },
];

// ── Composant principal ───────────────────────────────────────────────────────

const Sheet = ({
                   character,
                   onCharacterUpdate,
                   onLogout,
                   journalUnread,
                   onJournalRead,
                   darkMode,
                   onToggleDarkMode,
               }) => {
    const { apiBase, slug }   = useSystem();
    const { logout }    = useAuth();
    const socket        = useSocket();
    const fetchWithAuth = useFetch();
    const { activeGMSession, activeSessionName } = useSession();

    // ── État UI ───────────────────────────────────────────────────────────────

    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.some(t => t.id === hash) ? hash : 'page1';
    });

    const [editMode,     setEditMode]     = useState(false);
    const [editableChar, setEditableChar] = useState(character);

    // Modales
    const [showMenu,       setShowMenu]       = useState(false);
    const [showDiceConfig, setShowDiceConfig] = useState(false);
    const [showAvatar,     setShowAvatar]     = useState(false);
    const [showSanModal,   setShowSanModal]   = useState(false);
    const [showEvolve,     setShowEvolve]     = useState(false);
    const [showCharList,   setShowCharList]   = useState(false);
    const [diceModal,      setDiceModal]      = useState(null);
    // diceModal : { diceType, targetScore, rollLabel, onSuccess? }

    // ── Sync character → editable (push serveur reçu) ─────────────────────────
    // Si editMode actif, on ne réinitialise pas — le joueur est en train d'éditer.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!editMode) setEditableChar(character);
    }, [character, editMode]);

    // ── Socket — mises à jour temps réel ─────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // character:updated → reçu quand le GM modifie le personnage
        // On met à jour l'état local SANS déclencher un PUT (onCharacterHasUpdated pattern)
        const onUpdated = (data) => {
            if (data?.id === character?.id) {
                setEditableChar(prev => ({ ...prev, ...data }));
                // Si pas en édition, le character prop sera mis à jour par PlayerPage
                // via le même event — on ne fait rien de plus ici.
            }
        };

        socket.on('character:updated', onUpdated);
        return () => socket.off('character:updated', onUpdated);
    }, [socket, character?.id]);

    // ── Navigation ────────────────────────────────────────────────────────────

    const changeTab = useCallback((tab) => {
        setActiveTab(tab);
        window.location.hash = tab;
        if (tab === 'journal') onJournalRead?.();
    }, [onJournalRead]);

    // ── Édition ───────────────────────────────────────────────────────────────

    const handleSave = useCallback(() => {
        onCharacterUpdate(editableChar);
        setEditMode(false);
    }, [editableChar, onCharacterUpdate]);

    const handleCancel = useCallback(() => {
        setEditableChar(character);
        setEditMode(false);
    }, [character]);

    // Setter partiel — met à jour un champ de editableChar
    const set = useCallback((field, value) => {
        setEditableChar(prev => ({ ...prev, [field]: value }));
    }, []);

    // Setter pour sous-tableaux (bonds, motivations, skills, languages, equipment)
    const setArr = useCallback((field, value) => {
        setEditableChar(prev => ({ ...prev, [field]: value }));
    }, []);

    // ── Patch immédiat (bypass editMode) ─────────────────────────────────────
    // Pour les champs qui doivent être sauvegardés immédiatement même hors édition :
    // hp_current, wp_current, san_current, bonds (is_damaged), adapted_*
    const patchImmediate = useCallback((patch) => {
        const updated = { ...character, ...patch };
        onCharacterUpdate(updated);
    }, [character, onCharacterUpdate]);

    // ── Déconnexion ───────────────────────────────────────────────────────────

    const handleLogout = useCallback(async () => {
        setShowMenu(false);
        await logout();
        onLogout?.();
    }, [logout, onLogout]);

    // ── Upload avatar ─────────────────────────────────────────────────────────

    const handleAvatarUploaded = useCallback((url) => {
        setShowAvatar(false);
        onCharacterUpdate({ ...character, avatar: url });
    }, [character, onCharacterUpdate]);

    // ── Jet de SAN appliqué ───────────────────────────────────────────────────

    const handleSanLossApplied = useCallback(async ({ situationLabel, lossSuccess, lossFailure, lossApplied, sessionId }) => {
        try {
            const res = await fetchWithAuth(`${apiBase}/characters/${character.id}/san-loss`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ situationLabel, lossSuccess, lossFailure, lossApplied, sessionId }),
            });
            if (!res.ok) return;
            const data = await res.json();
            // Mise à jour locale immédiate (le socket broadcast viendra confirmer)
            onCharacterUpdate({
                ...character,
                sanCurrent: data.sanCurrent,
                sr:         data.sr,
                sanLog:     [data.logEntry, ...(character.sanLog ?? [])],
            });
        } catch (err) {
            console.error('[deltagreen] san-loss:', err);
        }
    }, [character, apiBase, fetchWithAuth, onCharacterUpdate]);

    // ── Évolution post-session ────────────────────────────────────────────────

    const handleEvolveSubmit = useCallback(async (results) => {
        try {
            const res = await fetchWithAuth(`${apiBase}/characters/${character.id}/evolve`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ results }),
            });
            if (!res.ok) return;
            const updated = await res.json();
            onCharacterUpdate(updated);
            setShowEvolve(false);
        } catch (err) {
            console.error('[deltagreen] evolve:', err);
        }
    }, [character.id, onCharacterUpdate]);

    const handleSelectChar = (selectedChar) => {
        setShowCharList(false);
        // On navigue vers l'URL du perso sélectionné — PlayerPage gère la suite
        window.location.href = `/${slug}/${selectedChar.accessUrl}`;
    };

    // ── Données affichées ─────────────────────────────────────────────────────
    // En édition : editableChar ; en lecture : character (données confirmées serveur)
    const char = editMode ? editableChar : character;

    // Palier de dégradation — absent en editMode
    const palierAttr = editMode ? {} : { 'data-palier': char.degradationPalier ?? 0 };

    // Fiche en lecture seule totale (palier 4)
    const isLocked = !editMode && (char.degradationPalier ?? 0) >= 4;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen bg-default text-default"
            data-theme={darkMode ? 'dark' : 'light'}
            {...palierAttr}
        >


            <ToastNotifications
                sessionId={activeGMSession}
                renderDiceToast={deltgreenConfig.dice.renderHistoryEntry}
            />


            <div className="sticky top-0 z-50">
                {/* ── En-tête Delta Green ──────────────────────────────────────── */}
                <header className="dg-header px-4 py-2 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        {/* Logo / titre */}
                        <h1 className="dg-font-delta text-4xl font-black tracking-widest uppercase text-white">
                            DELTA GREEN
                        </h1>
                        {/* Nom de l'agent */}
                        <span className="text-xs text-gray-400 dg-font-admin uppercase tracking-wider hidden sm:block">
                            {char.nom || '—'} {char.alias ? `/ ${char.alias}` : ''}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Session active */}
                        {activeGMSession && (
                            <span className="hidden sm:block text-xs font-mono text-gray-400 border border-gray-600 px-2 py-0.5">
                                SESSION ACTIVE
                            </span>
                        )}

                        {/* Bascule dark mode */}
                        <button
                            onClick={onToggleDarkMode}
                            className="text-gray-400 hover:text-white text-xs font-mono px-2 py-1 border border-gray-700 hover:border-gray-500 transition-colors"
                            title="Basculer le thème"
                        >
                            {darkMode ? '◑' : '○'}
                        </button>

                        {/* Menu hamburger */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(v => !v)}
                                className="text-gray-400 hover:text-white text-lg px-2"
                                title="Menu"
                            >
                                ☰
                            </button>
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 bg-surface border border-default shadow-lg z-50 min-w-40">
                                        <button
                                            onClick={() => { setShowMenu(false); setShowAvatar(true); }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-alt text-default font-mono"
                                        >
                                            Avatar
                                        </button>
                                        {!isLocked && (
                                            <button
                                                onClick={() => { setShowMenu(false); setShowEvolve(true); }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-surface-alt text-default font-mono"
                                            >
                                                Évolution post-session
                                            </button>
                                        )}
                                        <hr className="border-default my-1" />
                                        {/* Créer un personnage */}
                                        <button
                                            onClick={() => { setShowMenu(false); window.location.href = `/${system}/creation`; }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-alt text-default font-mono"
                                        >
                                            Créer un personnage
                                        </button>

                                        {/* Changer de personnage */}
                                        <button
                                            onClick={() => { setShowMenu(false); setShowCharList(true); }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-alt text-default font-mono"
                                        >
                                            Changer de personnage
                                        </button>
                                        <button
                                            onClick={() => { setShowMenu(false); window.location.href = `/${system}/gm`; }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-alt text-default font-mono"
                                        >
                                            Interface GM
                                        </button>
                                        <hr className="border-default my-1" />

                                        <button
                                            onClick={() => { setShowMenu(false); setShowDiceConfig(true); }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-alt text-default font-mono"
                                        >
                                            Configuration des Dés
                                        </button>
                                        <hr className="border-default my-1" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-alt text-danger font-mono"
                                        >
                                            Déconnexion
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── Navigation onglets ───────────────────────────────────────── */}
                <nav className="flex items-center justify-between border-b border-default bg-surface px-1">
                    <div className="flex">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => changeTab(tab.id)}
                                className={[
                                    'px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors relative',
                                    activeTab === tab.id
                                        ? 'text-default border-b-2 border-accent'
                                        : 'text-muted hover:text-default',
                                ].join(' ')}
                            >
                                {tab.label}
                                {/* Badge journal non lu */}
                                {tab.id === 'journal' && journalUnread > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {journalUnread > 9 ? '9+' : journalUnread}
                                </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 pr-2">
                        {/* ── Barre d'actions édition ───────────────────────────────────── */}
                        {!isLocked && (activeTab === 'page1' || activeTab === 'page2') && (
                            <>
                                {editMode ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSave}
                                            className="px-4 py-1 bg-success text-white text-xs font-mono uppercase tracking-wider hover:opacity-90"
                                        >
                                            Sauvegarder
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-1 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setEditableChar(character); setEditMode(true); }}
                                        className="px-4 py-1 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default hover:border-accent transition-colors"
                                    >
                                        Modifier
                                    </button>
                                )}
                            </>
                        )}

                        {/* Bouton jet de SAN */}
                        {!isLocked && (
                            <button
                                onClick={() => setShowSanModal(true)}
                                className="px-4 py-1 bg-danger text-white text-xs font-mono uppercase tracking-wider hover:opacity-90"
                            >
                                Jet de SAN
                            </button>
                        )}
                    </div>
                </nav>
            </div>

            <main className="flex flex-1 ">
                {/* ── SessionPlayersBar ─────────────────────────────────────── */}
                {activeGMSession && (
                    <SessionPlayersBar
                        sessionName={activeSessionName}
                        noWidthWhenCollapsed={true}
                        bottomHeight={10}
                        sessionId={activeGMSession}
                        character={character}
                    />
                )}

                {/* ══════════════════════════════════════════════════════════════
                    CONTENU DES ONGLETS
                ══════════════════════════════════════════════════════════════ */}

                {/* ── Page 1 — Dossier agent ────────────────────────────────── */}
                {activeTab === 'page1' && (
                    <div className={`dg-sheet-wrapper ${char.degradationPalier >= 4 ? 'max-w-4xl' : ''} mx-auto px-4 py-6 space-y-6`}>
                        {/* Tampon palier GM (si palier > 0 et pas en édition) */}
                        {!editMode && (char.degradationPalier ?? 0) >= 4 && (
                            <>
                                <div className="dg-stamp dg-stamp-red text-center text-lg mb-4">
                                    AGENT COMPROMIS — DOSSIER CLOS
                                </div>
                                {/* Avatar + identité */}
                                <div className="flex gap-4">
                                    {/* Avatar */}
                                    <div
                                        className="shrink-0 w-24 h-24 border border-default cursor-pointer overflow-hidden bg-surface-alt"
                                        onClick={() => !isLocked && setShowAvatar(true)}
                                        title="Changer l'avatar"
                                    >
                                        {char.avatar
                                            ? <img src={char.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-muted text-3xl">☰</div>
                                        }
                                    </div>

                                    {/* Section identité */}
                                    <div className="flex-1 dg-identity-section">
                                        <IdentitySection
                                            char={char}
                                            editMode={editMode && !isLocked}
                                            set={set}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        {char.degradationPalier < 4 && (
                            <div className="grid grid-cols-8 gap-4">
                                <div className="col-span-2">
                                    {/* Caractéristiques + attributs dérivés */}
                                    <StatsSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        set={set}
                                        onRoll={(ctx) => setDiceModal(ctx)}
                                    />

                                    <hr className="dg-divider" />

                                    <DerivedSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        set={set}
                                        onPatchImmediate={patchImmediate}
                                    />

                                    <hr className="dg-divider" />
                                    {/* Section 14 — Blessures et maladies */}
                                    <InjuriesSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        set={set}
                                        onPatchImmediate={patchImmediate}
                                    />
                                </div>
                                <div className="col-span-3">
                                    {/* Compétences */}
                                    <SkillsSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        setArr={setArr}
                                        onRoll={(ctx) => setDiceModal(ctx)}
                                        onPatchImmediate={patchImmediate}
                                    />
                                    <hr className="dg-divider" />

                                    {/* Section 15 — Armure et matériel (inventaire libre) */}
                                    <EquipmentSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        setArr={setArr}
                                    />

                                    <hr className="dg-divider" />

                                    {/* Section 16 — Tableau d'armes (slots a→g) */}
                                    <WeaponsSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        setArr={setArr}
                                        onRoll={(ctx) => setDiceModal(ctx)}
                                    />
                                </div>

                                <div className="col-span-3">
                                    {/* Avatar + identité */}
                                    <div className="flex gap-4">
                                        {/* Avatar */}
                                        <div
                                            className="shrink-0 w-24 h-24 border border-default cursor-pointer overflow-hidden bg-surface-alt"
                                            onClick={() => !isLocked && setShowAvatar(true)}
                                            title="Changer l'avatar"
                                        >
                                            {char.avatar
                                                ? <img src={char.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-muted text-3xl">☰</div>
                                            }
                                        </div>

                                        {/* Section identité */}
                                        <div className="flex-1 dg-identity-section">
                                            <IdentitySection
                                                char={char}
                                                editMode={editMode && !isLocked}
                                                set={set}
                                            />
                                        </div>
                                    </div>
                                    <hr className="dg-divider" />

                                    {/* Données psychologiques */}
                                    <div className="dg-bonds-section">
                                        <BondsSection
                                            char={char}
                                            editMode={editMode && !isLocked}
                                            setArr={setArr}
                                            onPatchImmediate={patchImmediate}
                                        />
                                    </div>

                                    <hr className="dg-divider" />
                                    <MotivationsSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        setArr={setArr}
                                    />

                                    <hr className="dg-divider" />

                                    {/* Log SAN — Section 13 */}
                                    <div className="dg-san-section">
                                        <SanLogSection
                                            sanLog={char.sanLog ?? []}
                                            editMode={editMode && !isLocked}
                                        />
                                    </div>


                                    <hr className="dg-divider" />

                                    {/* Sections 17-18 — Notes TipTap */}
                                    <NotesSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        set={set}
                                    />

                                    <hr className="dg-divider" />

                                    {/* Section 19 — Entraînement spécial */}
                                    <SpecialTrainingSection
                                        char={char}
                                        editMode={editMode && !isLocked}
                                        set={set}
                                        onRoll={(ctx) => setDiceModal(ctx)}
                                    />
                                </div>
                            </div>
                        )}

                        <hr className="dg-divider" />

                        {/* Sections 20-21 — Officier responsable / Signature */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="dg-section-label mb-1">21. Officier responsable</p>
                                {editMode && !isLocked
                                    ? <input
                                        className="dg-field-input w-full px-2 py-1"
                                        value={char.officerResponsible ?? ''}
                                        onChange={e => set('officerResponsible', e.target.value)}
                                    />
                                    : <p className="dg-form-line py-1 text-6xl dg-font-signature">
                                        {char.officerResponsible || '\u00A0'}
                                    </p>
                                }
                            </div>
                            <div>
                                <p className="dg-section-label mb-1">22. Signature de l'agent</p>
                                {editMode && !isLocked
                                    ? <input
                                        className="dg-field-input w-full px-2 py-1"
                                        value={char.agentSignature ?? ''}
                                        onChange={e => set('agentSignature', e.target.value)}
                                    />
                                    : <p className="dg-form-line py-1 text-6xl dg-font-signature">
                                        {char.agentSignature || '\u00A0'}
                                    </p>
                                }
                            </div>
                        </div>


                        {/* Pied de page formulaire */}
                        <footer className="dg-footer text-center py-3 m-0 mt-8 sticky-footer bottom-0">
                            DD FORMULAIRE ÉTATS-UNIS 315 — SECRET DÉFENSE//ORCON//AUTORISATION SPÉCIALE
                            REQUISE_DELTA GREEN — FICHE DE RENSEIGNEMENT D'AGENT — 112382
                        </footer>
                    </div>
                )}

                {/* ── Page 2 — Terrain ─────────────────────────────────────── */}
                {activeTab === 'page2' && (
                    <div className="dg-sheet-wrapper max-w-4xl mx-auto px-4 py-6 space-y-6">
                        {!editMode && (char.degradationPalier ?? 0) >= 4 && (
                            <div className="dg-stamp dg-stamp-red text-center text-lg mb-4">
                                AGENT COMPROMIS — DOSSIER CLOS
                            </div>
                        )}

                        {/* Pied de page */}
                        <footer className="dg-footer text-center py-3 mt-8">
                            DD FORMULAIRE ÉTATS-UNIS 315 — SECRET DÉFENSE//ORCON//AUTORISATION SPÉCIALE
                            REQUISE_DELTA GREEN — FICHE DE RENSEIGNEMENT D'AGENT — 112382
                        </footer>
                    </div>
                )}

                {/* ── Journal ───────────────────────────────────────────────── */}
                {activeTab === 'journal' && (
                    <div className="max-w-4xl mx-auto px-4 py-6">
                        <JournalTab
                            characterId={character.id}
                            sessionId={activeGMSession}
                        />
                    </div>
                )}

                {/* ── Historique des jets ───────────────────────────────────── */}
                {activeTab === 'historique' && (
                    <div className="max-w-4xl mx-auto px-4 py-6">
                        <DiceHistoryPage
                            sessionId={activeGMSession}
                            renderHistoryEntry={deltgreenConfig.dice.renderHistoryEntry}
                        />
                    </div>
                )}
            </main>

            {/* ══════════════════════════════════════════════════════════════
                MODALES
            ══════════════════════════════════════════════════════════════ */}

            {/* Avatar */}
            {showAvatar && (
                <AvatarUploader
                    currentAvatar={character.avatar}
                    onAvatarChange={handleAvatarUploaded}
                    onClose={() => setShowAvatar(false)}
                />
            )}

            {/* Configuration dés */}
            {showDiceConfig && (
                <DiceConfigModal onClose={() => setShowDiceConfig(false)} />
            )}

            {/* Jet de SAN */}
            {showSanModal && (
                <SanModal
                    character={char}
                    sessionId={activeGMSession}
                    onApply={handleSanLossApplied}
                    onClose={() => setShowSanModal(false)}
                />
            )}

            {/* Évolution post-session */}
            {showEvolve && (
                <EvolveModal
                    character={char}
                    onSubmit={handleEvolveSubmit}
                    onClose={() => setShowEvolve(false)}
                />
            )}

            {/* Jet de dés générique (compétence, carac, dommages) */}
            {diceModal && (
                <DiceModal
                    ctx={diceModal}
                    character={char}
                    sessionId={activeGMSession}
                    onClose={() => setDiceModal(null)}
                    onSkillFailed={(skillId, languageId) => {
                        // Coche automatiquement la case d'échec de la compétence concernée
                        if (skillId) {
                            const updatedSkills = (char.skills ?? []).map(s =>
                                s.id === skillId ? { ...s, failedCheck: true } : s
                            );
                            patchImmediate({ skills: updatedSkills });
                        } else if (languageId) {
                            const updatedLangs = (char.languages ?? []).map(l =>
                                l.id === languageId ? { ...l, failedCheck: true } : l
                            );
                            patchImmediate({ languages: updatedLangs });
                        }
                    }}
                />
            )}
            {showCharList   && <CharacterListModal
                isOpen={showCharList}
                currentCharId={character?.id}
                onClose={() => setShowCharList(false)}
                onSelect={handleSelectChar}
            />}
        </div>
    );
};

export default Sheet;