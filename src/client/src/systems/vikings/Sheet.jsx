// src/client/src/systems/vikings/Sheet.jsx
// Shell complet de l'interface joueur Vikings.
// Contient : header, tabs, navigation, dark mode, menu hamburger.
// Reçoit character + callbacks depuis PlayerPage (orchestrateur générique).
// onCharacterUpdate remplace onUpdate (normalisé avec PlayerPage).

import React, { useState, useEffect } from 'react';
import './theme.css';
import { formatExplosion, formatFullName, formatSkillName, getBestCharacteristic, getBlessureMalus, getFatigueMalus, getSuccessThreshold } from '../../tools/utils.js';
import { CARACNAMES, TRAITS } from '../../tools/data.js';
import ThemeToggle      from '../../components/ui/ThemeToggle.jsx';
import DiceModal        from './components/modals/DiceModal.jsx';
import EditModals       from './components/modals/EditModals.jsx';
import Experience       from './Experience.jsx';
import AvatarUploader   from '../../components/AvatarUploader.jsx';
import RunesTab         from './components/tabs/RunesTab.jsx';
import InventoryTab     from '../../components/tabs/InventoryTab.jsx';
import JournalTab       from '../../components/tabs/JournalTab.jsx';
import Combat           from './Combat.jsx';
import ToastNotifications from '../../components/layout/ToastNotifications.jsx';
import HistoryPanel     from '../../components/layout/HistoryPanel.jsx';
import SessionPlayersBar from '../../components/layout/SessionPlayersBar.jsx';
import DiceConfigModal  from '../../components/modals/DiceConfigModal.jsx';
import CharacterListModal from '../../components/modals/CharacterListModal.jsx';
import { useSession }   from '../../context/SessionContext.jsx';
import { useAuth }      from '../../context/AuthContext.jsx';
import { useFetch }     from '../../hooks/useFetch.js';
import { useParams }    from 'react-router-dom';

// Titres en runes qui tournent dans le header
const RUNE_TITLES = ['ᛟᛞᛁᚾ', 'ᚢᛁᚲᛁᛜ', 'ᛃᚨᚱᛚ', 'ᚢᛟᛚᚢᚨ', 'ᛊᚲᚨᛚᛞ', 'ᛈᚢᚱᛖ'];

const Sheet = ({
                   character,
                   onCharacterUpdate,  // callback pur — PlayerPage fait le PUT
                   onLogout,
                   journalUnread,
                   onJournalRead,
                   darkMode,
                   onToggleDarkMode,
               }) => {
    const { system }  = useParams();
    const { logout }  = useAuth();
    const fetchWithAuth = useFetch();
    const { activeGMSession } = useSession();

    // ── Header ──────────────────────────────────────────────────────────────
    const [runeTitle] = useState(() => RUNE_TITLES[Math.floor(Math.random() * RUNE_TITLES.length)]);
    const [linkCopied, setLinkCopied]     = useState(false);
    const [showCharMenu, setShowCharMenu] = useState(false);
    const [showCharacterList, setShowCharacterList] = useState(false);
    const [showDeleteModal, setShowDeleteModal]     = useState(false);
    const [showDiceConfig, setShowDiceConfig]       = useState(false);
    const [historyPanelOpen, setHistoryPanelOpen]   = useState(false);

    // ── Tabs ─────────────────────────────────────────────────────────────────
    const TABS = ['fiche', 'dice', 'runes', 'inventaire', 'journal', 'historique'];
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.substring(1);
        return TABS.includes(hash) ? hash : 'fiche';
    });

    const handleChangeTab = (tab) => {
        if (tab === 'historique') {
            setHistoryPanelOpen(true);
            return;
        }
        setActiveTab(tab);
        window.location.hash = tab;
        if (tab === 'journal') onJournalRead?.();
    };

    // ── Session active name ──────────────────────────────────────────────────
    const [activeSessionName, setActiveSessionName] = useState('');
    useEffect(() => {
        if (!activeGMSession) { setActiveSessionName(''); return; }
        fetchWithAuth(`/api/${system}/sessions/${activeGMSession}`)
            .then(r => r.json())
            .then(s => setActiveSessionName(s.name))
            .catch(() => {});
    }, [activeGMSession, system]);

    // ── Fiche — état local ───────────────────────────────────────────────────
    const [editMode, setEditMode]           = useState(false);
    const [editableChar, setEditableChar]   = useState({ ...character });
    const [showDiceModal, setShowDiceModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [showEvolutionModal, setShowEvolutionModal] = useState(false);
    const [showAvatarUploader, setShowAvatarUploader] = useState(false);
    const [diceContext, setDiceContext]     = useState(null);

    const char = editMode ? editableChar : character;

    const toggleEditMode = () => {
        if (editMode) onCharacterUpdate(editableChar);
        else setEditableChar({ ...character });
        setEditMode(!editMode);
    };

    const toggleToken = (type, index) => {
        const key = type === 'blessure' ? 'tokensBlessure' : 'tokensFatigue';
        const max = type === 'blessure' ? 5 : 9;
        const curr = character[key];
        onCharacterUpdate({ ...character, [key]: index < curr ? index : Math.min(index + 1, max) });
    };

    const adjustSaga = (delta) => {
        const newSaga = Math.max(0, Math.min(5, character.sagaActuelle + delta));
        onCharacterUpdate({ ...character, sagaActuelle: newSaga });
    };

    const recoverSkillPoints = (skill) => {
        const newSkills = character.skills.map(s =>
            (s.name === skill.name && s.specialization === skill.specialization) ? { ...s, currentPoints: s.level } : s
        );
        onCharacterUpdate({ ...character, skills: newSkills });
    };

    const recoverAllSkillPoints = () => {
        onCharacterUpdate({ ...character, skills: character.skills.map(s => ({ ...s, currentPoints: s.level })) });
    };

    const openDiceRoller = (type, data) => {
        setDiceContext({ type, data });
        setShowDiceModal(true);
    };

    const blessureMalus = getBlessureMalus(character.tokensBlessure);
    const fatigueMalus  = getFatigueMalus(character.tokensFatigue);

    useEffect(() => {
        if (!editMode) {
            setEditableChar({ ...character });
        } else {
            setEditableChar(prev => ({
                ...prev,
                tokensFatigue:  character.tokensFatigue,
                tokensBlessure: character.tokensBlessure,
            }));
        }
    }, [character, editMode]);

    // ── Suppression ──────────────────────────────────────────────────────────
    const handleDelete = async () => {
        try {
            await fetchWithAuth(`/api/${system}/characters/${character.id}`, { method: 'DELETE' });
            onLogout();
        } catch (err) {
            console.error('[Sheet] Delete failed:', err);
        }
    };

    // ── Status tags ──────────────────────────────────────────────────────────
    const renderStatusTags = () => {
        const tags = [];
        if (character.tokensBlessure === 5) tags.push({ text: '⚠️ KO / Mourant', color: 'bg-red-600 text-white' });
        else if (blessureMalus > 0) tags.push({ text: `-${blessureMalus}d10`, color: 'bg-viking-danger text-white' });
        if (character.tokensFatigue === 9) tags.push({ text: '⚠️ Épuisé', color: 'bg-amber-600 text-white' });
        else if (fatigueMalus > 0) tags.push({ text: `+${fatigueMalus} succès`, color: 'bg-viking-leather text-white' });
        return tags.length > 0 ? (
            <div className="flex gap-2">
                {tags.map((tag, i) => (
                    <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tag.color}`}>{tag.text}</div>
                ))}
            </div>
        ) : null;
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-viking-parchment dark:bg-gray-900 transition-colors">

            {/* ── HEADER ── */}
            <header className="bg-viking-brown dark:bg-gray-800 text-viking-parchment p-4 shadow-lg sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    {/* Titre + nom */}
                    <div className="flex items-center gap-3 font-viking">
                        <span className="text-3xl font-bold tracking-wider text-viking-parchment">{runeTitle}</span>
                        <span className="text-lg font-normal opacity-75">— {formatFullName(character)}</span>
                    </div>

                    {/* Actions header */}
                    <div className="flex gap-2 items-center">
                        {character.accessCode && (
                            <div className="text-xs bg-viking-bronze px-3 py-1 rounded text-viking-brown font-mono font-bold">
                                Code: {character.accessCode}
                            </div>
                        )}
                        {character.accessUrl && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/${system}/${character.accessUrl}`);
                                    setLinkCopied(true);
                                    setTimeout(() => setLinkCopied(false), 2000);
                                }}
                                className="px-3 py-1 bg-viking-bronze hover:bg-viking-leather text-viking-brown rounded text-xs font-semibold transition-colors"
                            >
                                {linkCopied ? '✅ Copié !' : '📋 Copier lien'}
                            </button>
                        )}
                        <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />

                        {/* Menu hamburger */}
                        <div className="relative">
                            <button
                                onClick={() => setShowCharMenu(!showCharMenu)}
                                className="px-3 py-2 bg-viking-leather hover:bg-viking-bronze text-viking-parchment rounded font-semibold text-lg transition-colors"
                                title="Menu personnage"
                            >
                                ⋮
                            </button>
                            {showCharMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowCharMenu(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-viking-bronze z-20">
                                        <button
                                            onClick={() => { setShowCharMenu(false); setShowCharacterList(true); }}
                                            className="w-full px-4 py-2 text-left hover:bg-viking-parchment dark:hover:bg-gray-700 flex items-center gap-2 text-sm transition-colors rounded-t-lg text-viking-text dark:text-viking-parchment"
                                        >
                                            🗂️ Changer de personnage
                                        </button>
                                        <button
                                            onClick={() => { setShowCharMenu(false); setShowDiceConfig(true); }}
                                            className="w-full px-4 py-2 text-left hover:bg-viking-parchment dark:hover:bg-gray-700 flex items-center gap-2 text-sm transition-colors text-viking-text dark:text-viking-parchment"
                                        >
                                            🎲 Config dés
                                        </button>
                                        <button
                                            onClick={async () => { setShowCharMenu(false); await logout(); onLogout(); }}
                                            className="w-full px-4 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 text-sm transition-colors rounded-b-lg text-red-600"
                                        >
                                            🚪 Déconnexion
                                        </button>
                                        <button
                                            onClick={() => { setShowCharMenu(false); setShowDeleteModal(true); }}
                                            className="w-full px-4 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 text-sm transition-colors text-red-600"
                                        >
                                            🗑️ Supprimer ce personnage
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Session active */}
                {activeSessionName && (
                    <div className="max-w-7xl mx-auto mt-1 text-xs text-viking-bronze opacity-75">
                        Session : {activeSessionName}
                    </div>
                )}
            </header>

            {/* ── TABS ── */}
            <nav className="bg-white dark:bg-gray-800 border-b border-viking-leather dark:border-viking-bronze sticky top-[72px] z-30">
                <div className="max-w-7xl mx-auto flex gap-1 p-2">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleChangeTab(tab)}
                            className={`px-4 py-2 rounded text-sm font-semibold transition-colors relative ${
                                activeTab === tab
                                    ? 'bg-viking-bronze text-viking-brown'
                                    : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment hover:bg-viking-bronze/30'
                            }`}
                        >
                            {tab === 'fiche' && '📋 Ma Fiche'}
                            {tab === 'dice' && '🎲 Lanceur de dés'}
                            {tab === 'runes' && '🔮 Runes'}
                            {tab === 'inventaire' && '🎒 Inventaire'}
                            {tab === 'journal' && <>📓 Journal
                                {journalUnread > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-viking-bronze text-viking-brown rounded-full font-bold">
                                        {journalUnread}
                                    </span>
                                )}
                            </>}
                            {tab === 'historique' && '📜 Historique' }
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── CONTENU PRINCIPAL ── */}
            <div className="flex">
                {/* SessionPlayersBar latérale */}
                <SessionPlayersBar
                    character={character}
                    sessionId={activeGMSession}
                    sessionName={activeSessionName}
                />

                <div className="flex-1 max-w-7xl mx-auto p-4">

                    {/* Tab : fiche */}
                    {activeTab === 'fiche' && (
                        <>
                            {/* Status + Actions */}
                            <div className="flex justify-between items-center mb-4">
                                {renderStatusTags()}
                                <div className="flex gap-2 ml-auto">
                                    {!editMode && (
                                        <button onClick={() => setShowEvolutionModal(true)} className="px-4 py-2 rounded text-xs font-semibold bg-viking-bronze text-viking-brown hover:bg-viking-leather transition-colors">
                                            💎 Évolution
                                        </button>
                                    )}
                                    <button onClick={toggleEditMode} className={`px-4 py-2 rounded text-xs font-semibold ${editMode ? 'bg-viking-success text-white' : 'bg-viking-leather text-viking-parchment'}`}>
                                        {editMode ? '✓ Sauvegarder' : '⚙️ Édition'}
                                    </button>
                                    {editMode && (
                                        <>
                                            <button onClick={() => onCharacterUpdate({ ...character, tokensBlessure: 0 })} className="px-3 py-2 bg-viking-success text-white rounded text-xs">Soigner</button>
                                            <button onClick={() => onCharacterUpdate({ ...character, tokensFatigue: 0 })} className="px-3 py-2 bg-viking-bronze text-viking-brown rounded text-xs">Repos</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Grid Layout — contenu original de Sheet.jsx */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ gridAutoRows: 'min-content' }}>
                                {/* ── COLONNE 1 ── */}
                                <div className="space-y-3">
                                    {/* Info Générale */}
                                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                                        <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment mb-2">Informations</h3>
                                        {editMode ? (
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div onClick={() => setShowAvatarUploader(true)} className="relative group cursor-pointer flex-shrink-0" title={editableChar.avatar ? "Modifier l'avatar" : 'Ajouter un avatar'}>
                                                        {editableChar.avatar ? (
                                                            <>
                                                                <img src={editableChar.avatar} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-viking-bronze group-hover:opacity-75 transition-opacity" />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full"><span className="text-2xl">📸</span></div>
                                                            </>
                                                        ) : (
                                                            <div className="w-20 h-20 rounded-full border-4 border-dashed border-viking-leather dark:border-viking-bronze bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors"><span className="text-2xl">📸</span></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div>
                                                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Prénom *</label>
                                                            <input type="text" value={editableChar.prenom} onChange={e => setEditableChar({ ...editableChar, prenom: e.target.value })} className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Surnom</label>
                                                            <input type="text" value={editableChar.surnom || ''} onChange={e => setEditableChar({ ...editableChar, surnom: e.target.value })} className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" placeholder="Le Brave" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <input value={editableChar.nomParent} onChange={e => setEditableChar({ ...editableChar, nomParent: e.target.value })} placeholder="Parent" className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    <input type="number" value={editableChar.age} onChange={e => setEditableChar({ ...editableChar, age: parseInt(e.target.value) || 25 })} placeholder="Âge" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                                    <input type="number" value={editableChar.taille || ''} onChange={e => setEditableChar({ ...editableChar, taille: parseInt(e.target.value) || undefined })} placeholder="Taille" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                                    <input type="number" value={editableChar.poids || ''} onChange={e => setEditableChar({ ...editableChar, poids: parseInt(e.target.value) || undefined })} placeholder="Poids" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                                </div>
                                                <input value={editableChar.activite || ''} onChange={e => setEditableChar({ ...editableChar, activite: e.target.value })} placeholder="Activité" className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                                <input value={editableChar.playerName || ''} onChange={e => setEditableChar({ ...editableChar, playerName: e.target.value })} placeholder="Nom du joueur" className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3">
                                                {char.avatar ? (
                                                    <img src={char.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-4 border-viking-bronze flex-shrink-0" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-full border-4 border-dashed border-viking-leather dark:border-viking-bronze bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><span className="text-2xl">⚔️</span></div>
                                                )}
                                                <div className="text-xs text-viking-text dark:text-viking-parchment space-y-0.5">
                                                    <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">{formatFullName(char)}</div>
                                                    <div>{char.playerName}</div>
                                                    <div>{char.sexe === 'homme' ? 'Homme' : 'Femme'}, {char.age} ans</div>
                                                    {char.activite && <div className="italic">{char.activite}</div>}
                                                    {char.taille && <div>{char.taille}cm{char.poids ? ` — ${char.poids}kg` : ''}</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Caractéristiques */}
                                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                                        <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment mb-2">Caractéristiques</h3>
                                        <div className="space-y-2">
                                            {Object.entries(CARACNAMES).map(([key, label]) => {
                                                const lv = char[key] || 1;
                                                return (
                                                    <div key={key} className="bg-viking-parchment dark:bg-gray-800 rounded p-2">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-1.5 flex-1">
                                                                <span className="font-semibold text-xs text-viking-brown dark:text-viking-parchment">{label}</span>
                                                                {editMode && (
                                                                    <>
                                                                        <button onClick={() => lv > 1 && setEditableChar({ ...editableChar, [key]: lv - 1 })} disabled={lv <= 1} className="w-4 h-4 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown">-</button>
                                                                        <button onClick={() => lv < 5 && setEditableChar({ ...editableChar, [key]: lv + 1 })} disabled={lv >= 5} className="w-4 h-4 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown">+</button>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full border ${i <= lv ? 'bg-viking-bronze border-viking-bronze' : 'bg-transparent border-viking-leather dark:border-viking-bronze'}`} />)}</div>
                                                                {!editMode && <button onClick={() => openDiceRoller('carac', key)} className="text-xs px-1 py-0.5 bg-viking-bronze rounded text-viking-brown hover:bg-viking-leather transition-colors ml-1">🎲</button>}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-viking-leather dark:text-viking-bronze italic mt-0.5">Expl: {formatExplosion(lv)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Compétences */}
                                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment">Compétences</h3>
                                            <div className="flex gap-1">
                                                {editMode && <button onClick={() => setShowEditModal('addSkill')} className="text-xs px-2 py-1 bg-viking-bronze text-viking-brown rounded hover:bg-viking-leather transition-colors">+ Ajout</button>}
                                                {!editMode && <button onClick={recoverAllSkillPoints} className="text-xs px-2 py-1 bg-viking-success text-white rounded hover:bg-green-700 transition-colors">Récup tous</button>}
                                            </div>
                                        </div>
                                        <div className="space-y-1 max-h-80 overflow-y-auto">
                                            {char.skills.map(skill => {
                                                const bc = getBestCharacteristic(char, skill);
                                                const th = getSuccessThreshold(skill.level);
                                                return (
                                                    <div key={`${skill.name}-${skill.specialization || 'default'}`} className="p-1.5 bg-viking-parchment dark:bg-gray-800 rounded">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1 text-xs text-viking-text dark:text-viking-parchment">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-semibold">{formatSkillName(skill)} (Niv {skill.level})</span>
                                                                    {editMode && (
                                                                        <>
                                                                            <button onClick={() => { const ns = editableChar.skills.map(s => (s.name !== skill.name || s.specialization !== skill.specialization) ? s : { ...s, level: Math.max(0, s.level - 1), currentPoints: Math.max(0, s.level - 1) }); setEditableChar({ ...editableChar, skills: ns }); }} disabled={skill.level <= 0} className="w-3 h-3 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown flex items-center justify-center leading-none">-</button>
                                                                            <button onClick={() => { const ns = editableChar.skills.map(s => (s.name !== skill.name || s.specialization !== skill.specialization) ? s : { ...s, level: Math.min(5, s.level + 1), currentPoints: Math.min(5, s.level + 1) }); setEditableChar({ ...editableChar, skills: ns }); }} disabled={skill.level >= 5} className="w-3 h-3 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown flex items-center justify-center leading-none">+</button>
                                                                            <button onClick={() => { const ns = editableChar.skills.filter(s => s.name !== skill.name || s.specialization !== skill.specialization); setEditableChar({ ...editableChar, skills: ns }); }} className="text-xs px-1 bg-red-600 text-white rounded leading-none">✕</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="text-viking-leather dark:text-viking-bronze">{CARACNAMES[bc.name]} | Seuil: {th}+ | Expl: {formatExplosion(bc.level)}</div>
                                                            </div>
                                                            {!editMode && <button onClick={() => openDiceRoller('skill', skill)} className="text-xs px-1 py-0.5 bg-viking-bronze rounded text-viking-brown hover:bg-viking-leather transition-colors">🎲</button>}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs mt-1">
                                                            <div className="flex gap-0.5">{[...Array(skill.level)].map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i < skill.currentPoints ? 'bg-viking-success' : 'bg-gray-400 dark:bg-gray-600'}`} />)}</div>
                                                            {!editMode && skill.currentPoints < skill.level && <button onClick={() => recoverSkillPoints(skill)} className="px-1 py-0.5 bg-viking-success text-white rounded text-xs hover:bg-green-700 transition-colors">Récup</button>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* ── COLONNE 2 ── */}
                                <div className="space-y-3">
                                    {/* SAGA + Tokens */}
                                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                                        <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment mb-2">SAGA & État physique</h3>
                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-viking-leather dark:border-viking-bronze">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => adjustSaga(-1)} disabled={character.sagaActuelle <= 0} className="w-6 h-6 bg-viking-bronze rounded-full font-bold text-sm disabled:opacity-30 text-viking-brown hover:bg-viking-leather transition-colors">-</button>
                                                <span className="text-3xl font-bold text-viking-bronze">{char.sagaActuelle}</span>
                                                <button onClick={() => adjustSaga(1)} disabled={character.sagaActuelle >= 5} className="w-6 h-6 bg-viking-bronze rounded-full font-bold text-sm disabled:opacity-30 text-viking-brown hover:bg-viking-leather transition-colors">+</button>
                                            </div>
                                            <div className="text-xs text-viking-text dark:text-viking-parchment">
                                                <span className="font-semibold">Réput:</span>
                                                {editMode ? (
                                                    <input type="number" value={editableChar.sagaTotale} onChange={e => setEditableChar({ ...editableChar, sagaTotale: parseInt(e.target.value) || 0 })} className="ml-1 w-14 px-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                                ) : (
                                                    <span className="ml-1 font-bold">{char.sagaTotale}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Blessures */}
                                            <div>
                                                <div className="text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">BLESSURES</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {[0,1,2,3,4].map(i => (
                                                        <div key={i} onClick={() => toggleToken('blessure', i)} className={`w-7 h-7 rounded border-2 cursor-pointer transition-all ${i < character.tokensBlessure ? i === 4 ? 'bg-viking-danger border-amber-800' : 'bg-viking-danger border-viking-danger' : i === 0 ? 'border-dashed border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger' : i === 4 ? 'border-amber-800 hover:border-viking-danger dark:hover:border-viking-danger' : 'border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger'}`} title={i === 0 ? 'Gratuit' : i === 4 ? 'KO' : ''} />
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Fatigue */}
                                            <div>
                                                <div className="text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">FATIGUE</div>
                                                <div className="space-y-0.5">
                                                    <div className="flex gap-1 justify-center">
                                                        {[0,1,2,4,6,8].map(i => (
                                                            <div key={i} onClick={() => toggleToken('fatigue', i)} className={`w-6 h-6 rounded border-2 cursor-pointer transition-all ${i < character.tokensFatigue ? i === 8 ? 'bg-viking-leather border-amber-800' : 'bg-viking-leather border-viking-leather' : i === 0 ? 'border-dashed border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger' : i === 8 ? 'border-solid border-amber-800 hover:border-viking-danger dark:hover:border-viking-danger' : 'border-solid border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger'}`} title={i === 0 ? 'Gratuit (buffer)' : i === 8 ? 'Épuisé (+5 succès)' : `+${getFatigueMalus(i)} succès requis`} />
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-1 justify-center">
                                                        <div className="w-6 h-6" /><div className="w-6 h-6" />
                                                        {[3,5,7].map(i => (
                                                            <div key={i} onClick={() => toggleToken('fatigue', i)} className={`w-6 h-6 rounded border-2 cursor-pointer transition-all ${i < character.tokensFatigue ? 'bg-viking-leather border-viking-leather' : 'border-solid border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger'}`} title={`+${getFatigueMalus(i)} succès requis`} />
                                                        ))}
                                                        <div className="w-6 h-6" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Traits */}
                                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment">Traits & Backgrounds</h3>
                                            {editMode && <button onClick={() => setShowEditModal('addTrait')} className="text-xs px-2 py-1 bg-viking-bronze text-viking-brown rounded hover:bg-viking-leather transition-colors">+ Ajout</button>}
                                        </div>
                                        <div className="space-y-1.5">
                                            {char.traits.map(trait => {
                                                const td = TRAITS.find(t => t.name === trait.name);
                                                return (
                                                    <div key={trait.name} className="p-1.5 bg-viking-parchment dark:bg-gray-800 rounded text-xs">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="font-semibold text-viking-brown dark:text-viking-parchment">{trait.name}</div>
                                                                <div className="text-viking-text dark:text-viking-parchment">{td?.description}</div>
                                                                {td?.effects && <div className="text-viking-success mt-0.5">{td.effects.actions && `+${td.effects.actions} Action `}{td.effects.armure && `+${td.effects.armure} Armure `}{td.effects.description}</div>}
                                                            </div>
                                                            {editMode && <button onClick={() => { const nt = editableChar.traits.filter(t => t.name !== trait.name); setEditableChar({ ...editableChar, traits: nt }); }} className="ml-2 text-xs px-1 bg-red-600 text-white rounded">✕</button>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Combat panel (sous la grid) */}
                            <Combat
                                character={character}
                                onUpdateCharacter={onCharacterUpdate}
                                onOpenDice={(context) => {
                                    setDiceContext(context);
                                    setShowDiceModal(true);
                                }}
                            />
                        </>
                    )}

                    {activeTab === 'dice'      && <DiceModal character={character} isBerserk={false} context={null} onClose={() => handleChangeTab('fiche')} onUpdate={onCharacterUpdate} sessionId={activeGMSession} />}
                    {activeTab === 'runes'     && <RunesTab character={character} onUpdate={onCharacterUpdate} />}
                    {activeTab === 'inventaire' && <InventoryTab character={character} onUpdate={onCharacterUpdate} />}
                    {activeTab === 'journal'   && <JournalTab characterId={character.id} />}
                    {activeTab === 'historique' && <div className="text-center p-8 text-viking-text dark:text-viking-parchment">Historique à venir...</div>}
                </div>
            </div>

            {/* ── Bouton flottant historique ── */}
            <button
                onClick={() => setHistoryPanelOpen(true)}
                className="fixed bottom-2 right-1 w-10 h-10 bg-viking-bronze text-viking-brown rounded-full shadow-lg hover:bg-viking-leather transition-all z-30 flex items-center justify-center text-lg border-2 border-viking-leather"
                title="Historique des jets"
            >
                📜
            </button>

            {/* ── Éléments globaux ── */}
            <ToastNotifications onViewHistory={() => setHistoryPanelOpen(true)} sessionId={activeGMSession} />
            <HistoryPanel isOpen={historyPanelOpen} onClose={() => setHistoryPanelOpen(false)} sessionId={activeGMSession} />
            {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}

            {/* ── Modales fiche ── */}
            {showDiceModal && <DiceModal character={character} isBerserk={false} context={diceContext} onClose={() => setShowDiceModal(false)} onUpdate={onCharacterUpdate} sessionId={activeGMSession} />}
            {showEditModal && <EditModals type={showEditModal} character={editableChar} onClose={() => setShowEditModal(null)} onUpdate={(newChar) => { setEditableChar(newChar); setShowEditModal(null); }} />}
            {showEvolutionModal && <Experience character={character} onClose={() => setShowEvolutionModal(false)} onUpdate={onCharacterUpdate} />}
            {showAvatarUploader && (
                <AvatarUploader
                    currentAvatar={editableChar.avatar}
                    onAvatarChange={(newAvatar) => setEditableChar({ ...editableChar, avatar: newAvatar })}
                    onClose={() => setShowAvatarUploader(false)}
                />
            )}

            {/* ── Modale suppression ── */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-red-600 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-4">⚠️ Supprimer le personnage ?</h3>
                        <p className="text-viking-text dark:text-viking-parchment mb-6">Cette action est irréversible. {formatFullName(character)} sera définitivement supprimé.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600">Annuler</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Changer de personnage (depuis menu hamburger) ── */}
            <CharacterListModal
                isOpen={showCharacterList}
                currentCharId={character?.id}
                onClose={() => setShowCharacterList(false)}
                onSelect={(char) => {
                    // PlayerPage gère la CodeModal — on remonte l'info via onLogout
                    // puis PlayerPage repasse en 'selecting' avec le perso pré-sélectionné.
                    // Solution simple : recharger la page sur l'URL du perso sélectionné.
                    window.location.href = `/${system}/${char.accessUrl}`;
                }}
            />
        </div>
    );
};

export default Sheet;