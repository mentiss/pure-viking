// src/client/src/systems/tecumah/Sheet.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams }   from 'react-router-dom';
import { useAuth }     from '../../context/AuthContext.jsx';
import { useSocket }   from '../../context/SocketContext.jsx';
import { useFetch }    from '../../hooks/useFetch.js';
import { useSystem }   from '../../hooks/useSystem.js';
import { useSession }  from '../../context/SessionContext.jsx';
import './theme.css';

// Composants génériques
import SessionPlayersBar  from '../../components/layout/SessionPlayersBar.jsx';
import ToastNotifications from '../../components/layout/ToastNotifications.jsx';
import DiceConfigModal    from '../../components/modals/DiceConfigModal.jsx';
import CharacterListModal from '../../components/modals/CharacterListModal.jsx';
import AvatarUploader     from '../../components/AvatarUploader.jsx';
import JournalTab         from '../../components/tabs/JournalTab.jsx';
import DiceHistoryPage    from '../../components/layout/DiceHistoryPage.jsx';

// Composants Tecumah
import HealthDisplay  from './components/HealthDisplay.jsx';
import ResourcesBar   from './components/ResourcesBar.jsx';
import DefensePanel   from './components/DefensePanel.jsx';
import AttributeRow   from './components/AttributeRow.jsx';
import SkillRow       from './components/SkillRow.jsx';
import InventoryTab   from './components/InventoryTab.jsx';
import XPModal        from './components/modals/XPModal.jsx';
import TecumahDiceModal from './components/modals/TecumahDiceModal.jsx';

import tecumahConfig, {
    ATTRIBUTS, ATTRIBUT_LABELS, SKILLS_BY_ATTR,
    BACKGROUNDS, BACKGROUNDS_BY_ID,
    pipsToNotation,
} from './config.jsx';
import TecumahHistoryEntry from "./components/TecumahHistoryEntry.jsx";

// ── Onglets ───────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'fiche',      label: '🤠 Fiche'     },
    { id: 'inventaire', label: '🎒 Inventaire' },
    { id: 'journal',    label: '📓 Journal'    },
    { id: 'historique', label: '📜 Historique' },
];

// ─────────────────────────────────────────────────────────────────────────────
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

    const [activeTab,      setActiveTab]      = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.some(t => t.id === hash) ? hash : 'fiche';
    });
    const [editMode,       setEditMode]       = useState(false);
    const [editableChar,   setEditableChar]   = useState(character);
    const [showMenu,       setShowMenu]       = useState(false);
    const [showDiceConfig, setShowDiceConfig] = useState(false);
    const [showCharList,   setShowCharList]   = useState(false);
    const [showAvatar,     setShowAvatar]     = useState(false);
    const [showXPModal,    setShowXPModal]    = useState(false);
    const [diceModal,      setDiceModal]      = useState(null);
    const [complications,  setComplications]  = useState(0);

    useEffect(() => {
        if (!editMode) setEditableChar(character);
    }, [character, editMode]);

    useEffect(() => {
        if (!activeGMSession) return;
        fetchWithAuth(`${apiBase}/session-resources/${activeGMSession}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setComplications(d.complications ?? 0); })
            .catch(() => {});
    }, [activeGMSession, apiBase]);

    useEffect(() => {
        if (!socket) return;
        const fn = (d) => { if (d.complications != null) setComplications(d.complications); };
        socket.on('session-resources-update', fn);
        return () => socket.off('session-resources-update', fn);
    }, [socket]);

    const changeTab = (tab) => {
        setActiveTab(tab);
        window.location.hash = tab;
        if (tab === 'journal') onJournalRead?.();
    };

    const handleSave = useCallback(() => {
        onCharacterUpdate(editableChar);
        setEditMode(false);
    }, [editableChar, onCharacterUpdate]);

    const handleCancel = useCallback(() => {
        setEditableChar(character);
        setEditMode(false);
    }, [character]);

    const set = (field, value) => setEditableChar(p => ({ ...p, [field]: value }));

    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
        onLogout?.();
    };

    const char = editMode ? editableChar : character;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen flex"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            data-theme={darkMode ? 'dark' : undefined}
        >
            <div className="flex-1 flex flex-col min-w-0">

                {/* ── Header ──────────────────────────────────────────────── */}
                <header
                    className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
                    style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
                >
                    {/* Nom / infos */}
                    <div className="flex items-center gap-3" style={{ flex: '0 0 auto', minWidth: 120 }}>
                        <div className="min-w-0">
                            <h1 style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {char.prenom} {char.nom}
                            </h1>
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {char.playerName}
                            </p>
                        </div>
                    </div>

                    {/* TITLE GOES HERE */}
                    <div className="flex-1" style={{fontSize: '2rem', color: 'var(--color-primary)'}}>
                        <h1 className="text-center tecumah-font">Tecumah Gulch</h1>
                    </div>

                    {/* Boutons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="text-center hidden sm:block">
                            <div className="dune-label" style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>Code</div>
                            <div className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--color-accent)' }}>
                                {char.accessCode}
                            </div>
                        </div>
                        <button
                            onClick={() => setDiceModal(true)}
                            className="text-xs px-2 py-1 rounded font-semibold"
                            style={{ background: 'var(--color-surface-alt)', color: 'white' }}
                            title="Lancer des dés"
                        >
                            🎲 Dés
                        </button>
                        <button onClick={onToggleDarkMode} className="w-8 h-8 flex items-center justify-center rounded" style={{ fontSize: '1rem' }}>
                            {darkMode ? '☀️' : '🌙'}
                        </button>

                        {/* Hamburger */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(m => !m); }}
                                className="w-8 h-8 flex items-center justify-center rounded"
                                style={{ background: showMenu ? 'var(--color-surface-alt)' : 'transparent', fontSize: '1.1rem' }}
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
                                        className="absolute right-0 top-10 rounded-xl shadow-xl z-50 py-2"
                                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', minWidth: 200 }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <MenuItem onClick={() => { setShowDiceConfig(true); setShowMenu(false); }}>⚙️ Config des dés</MenuItem>
                                        <hr style={{ borderColor: 'var(--color-border)', margin: '4px 0' }} />
                                        <MenuItem onClick={() => { setShowCharList(true); setShowMenu(false); }}>🔄 Changer de personnage</MenuItem>
                                        <MenuItem
                                            onClick={() => { setShowMenu(false); window.location.href = `/${system}/creation`; }}
                                        >✨ Nouveau personnage</MenuItem>
                                        <MenuItem
                                            onClick={() => { setShowMenu(false); window.location.href = `/${system}/gm`; }}
                                        >🎭 Interface GM</MenuItem>
                                        <hr style={{ borderColor: 'var(--color-border)', margin: '4px 0' }} />
                                        <MenuItem onClick={handleLogout} danger>🚪 Déconnexion</MenuItem>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── Onglets ──────────────────────────────────────────────── */}
                <nav className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => changeTab(t.id)}
                            className="flex-shrink-0 px-4 py-2 text-sm"
                            style={{
                                fontWeight:   activeTab === t.id ? 700 : 400,
                                color:        activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                borderBottom: activeTab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                            }}
                        >
                            {t.label}
                            {t.id === 'journal' && journalUnread > 0 && (
                                <span className="ml-1 px-1 rounded-full text-xs" style={{ background: 'var(--color-danger)', color: '#fff' }}>
                                    {journalUnread}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>



                {/* ── Contenu ──────────────────────────────────────────────── */}
                <main className="flex flex-1">
                    {activeGMSession && (
                        <SessionPlayersBar
                            character={character}
                            sessionId={activeGMSession}
                            sessionName={activeSessionName}
                            headerHeight={105}
                        />
                    )}
                    <div className="flex-1 overflow-y-auto">
                        <div className="w-full mx-auto px-4 py-4">

                            {/* ══ FICHE ══════════════════════════════════════════ */}
                            {activeTab === 'fiche' && (
                                <div className="flex flex-col gap-6">

                                    <EditBar editMode={editMode} onEdit={() => setEditMode(true)} onSave={handleSave} onCancel={handleCancel} />

                                    <div className="grid grid-cols-4 gap-2 border-b-1 pb-1" style={{"borderColor": "var(--color-border)"}}>
                                        {/* Identité */}
                                        <Section title="Identité">
                                            {editMode ? (
                                                <div className="flex flex-col gap-3">
                                                    {/* Avatar cliquable en édition */}
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            onClick={() => setShowAvatar(true)}
                                                            style={{ cursor: 'pointer', flexShrink: 0 }}
                                                            title="Modifier l'avatar"
                                                        >
                                                            {char.avatar ? (
                                                                <img
                                                                    src={char.avatar}
                                                                    alt={char.prenom}
                                                                    className="w-14 h-14 rounded-full object-cover"
                                                                    style={{ border: '2px solid var(--color-accent)' }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                                                                    style={{ background: 'var(--color-surface-alt)', border: '2px dashed var(--color-accent)' }}
                                                                >
                                                                    🤠
                                                                </div>
                                                            )}
                                                            <p style={{ fontSize: '0.6rem', textAlign: 'center', color: 'var(--color-accent)', marginTop: 2 }}>
                                                                Modifier
                                                            </p>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                                                Cliquez sur l'avatar pour le modifier
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Champs */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { k: 'prenom',       l: 'Prénom'               },
                                                            { k: 'nom',          l: 'Nom'                  },
                                                            { k: 'age',          l: 'Âge',              type: 'number'},
                                                            { k: 'taille',       l: 'Taille'               },
                                                            { k: 'sexe',         l: 'Sexe'                 },
                                                            { k: 'accessCode',   l: 'Code d\'accès',    transform: v => v.toUpperCase().slice(0, 6), mono: true   },
                                                        ].map(({ k, l, type, transform, mono }) => (
                                                            <label key={k} className="flex flex-col gap-1">
                                                                <span style={labelSt}>{l}</span>
                                                                <input
                                                                    type={type ?? 'text'}
                                                                    value={editableChar[k] ?? ''}
                                                                    onChange={e => set(k, transform ? transform(e.target.value) : e.target.value)}
                                                                    className="rounded px-2 py-1 text-sm"
                                                                    style={{ ...inputSt, fontFamily: mono ? 'monospace' : undefined }}
                                                                />
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <label className="flex flex-col gap-1">
                                                        <span style={labelSt}>Description</span>
                                                        <textarea
                                                            value={editableChar.description ?? ''}
                                                            onChange={e => set('description', e.target.value)}
                                                            rows={3}
                                                            className="rounded px-2 py-1 text-sm"
                                                            style={inputSt}
                                                        />
                                                    </label>
                                                </div>
                                            ) : (
                                                /* Lecture — avatar à gauche, infos à droite */
                                                <div className="flex items-start gap-3">
                                                    {/* Avatar */}
                                                    <div style={{ flexShrink: 0 }}>
                                                        {char.avatar ? (
                                                            <img
                                                                src={char.avatar}
                                                                alt={char.prenom}
                                                                className="w-14 h-14 rounded-full object-cover"
                                                                style={{ border: '2px solid var(--color-accent)' }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                                                                style={{ background: 'var(--color-surface-alt)', border: '2px solid var(--color-border)' }}
                                                            >
                                                                🤠
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Infos */}
                                                    <div className="min-w-0">
                                                        <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', lineHeight: 1.2 }}>
                                                            {char.prenom} {char.nom}
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                            {char.playerName}
                                                        </p>
                                                        {(char.age || char.taille || char.sexe) && (
                                                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                                                {[char.age ? `${char.age} ans` : null, char.taille, char.sexe]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </p>
                                                        )}
                                                        {char.description && (
                                                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                                                                {char.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Section>

                                        {/* Santé */}
                                        <Section title="Santé">
                                            <HealthDisplay
                                                mode="track"
                                                niveau={char.blessure_niveau ?? 0}
                                                onChange={n => onCharacterUpdate({ ...character, blessure_niveau: n })}
                                            />
                                        </Section>

                                        {/* Défense */}
                                        <Section title="Défense">
                                            <DefensePanel character={char} />
                                        </Section>

                                        {/* Ressources */}
                                        <Section title="Ressources">
                                            <ResourcesBar
                                                pointsDestin={char.points_destin ?? 0}
                                                pointsPersonnage={char.points_personnage ?? 0}
                                                canEdit={true}
                                                onUpdatePD={d => onCharacterUpdate({ ...character, points_destin:    Math.max(0, (character.points_destin    ?? 0) + d) })}
                                                onUpdatePP={d => onCharacterUpdate({ ...character, points_personnage: Math.max(0, (character.points_personnage ?? 0) + d) })}
                                            />
                                        </Section>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Attributs + Compétences */}
                                        {ATTRIBUTS.map(attrKey => (
                                            <section key={attrKey} className="border-b-1" style={{"borderColor": "var(--color-border)"}}>
                                                <AttributeRow
                                                    attrKey={attrKey}
                                                    label={ATTRIBUT_LABELS[attrKey]}
                                                    pips={char[attrKey] ?? 6}
                                                    editMode={editMode}
                                                    onChangePips={v => set(attrKey, v)}
                                                    onRoll={ctx => setDiceModal(ctx)}
                                                />
                                                <div className="ml-2">
                                                    {(SKILLS_BY_ATTR[attrKey] ?? []).map(skill => {
                                                            if(char[skill.key] > 0 || editMode)
                                                                return (
                                                                    <SkillRow
                                                                        key={skill.key}
                                                                        skillKey={skill.key}
                                                                        label={skill.label}
                                                                        attrKey={attrKey}
                                                                        attrPips={char[attrKey] ?? 6}
                                                                        compPips={char[skill.key] ?? 0}
                                                                        editMode={editMode}
                                                                        onChangeComp={v => set(skill.key, v)}
                                                                        onRoll={ctx => setDiceModal(ctx)}
                                                                    />
                                                                );
                                                        }
                                                    )}
                                                </div>
                                            </section>
                                        ))}
                                    </div>



                                    {/* Backgrounds — inline dans la fiche */}
                                    <Section title="Backgrounds">
                                        <BackgroundsInline
                                            backgrounds={editMode ? editableChar.backgrounds ?? [] : char.backgrounds ?? []}
                                            onChange={bgs => setEditableChar(p => ({ ...p, backgrounds: bgs }))}
                                            readOnly={!editMode}
                                        />
                                    </Section>
                                </div>
                            )}

                            {/* ══ INVENTAIRE ══════════════════════════════════════ */}
                            {activeTab === 'inventaire' && (
                                <div>
                                    <EditBar editMode={editMode} onEdit={() => setEditMode(true)} onSave={handleSave} onCancel={handleCancel} />
                                    <InventoryTab
                                        items={editMode ? editableChar.items ?? [] : char.items ?? []}
                                        onChange={items => setEditableChar(p => ({ ...p, items }))}
                                        readOnly={!editMode}
                                    />
                                </div>
                            )}

                            {/* ══ JOURNAL ══════════════════════════════════════════ */}
                            {activeTab === 'journal' && <JournalTab characterId={character.id} />}

                            {/* ══ HISTORIQUE ══════════════════════════════════════ */}
                            {activeTab === 'historique' && (
                                <DiceHistoryPage
                                    sessionId={activeGMSession ?? null}
                                    renderHistoryEntry={tecumahConfig.dice.renderHistoryEntry}
                                />
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* ── Overlays ─────────────────────────────────────────────────── */}
            <ToastNotifications sessionId={activeGMSession} renderDiceToast={(entry) => {
                return (<TecumahHistoryEntry entry={entry} />)
            }} />

            {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}

            {showCharList && (
                <CharacterListModal
                    isOpen
                    currentCharId={character?.id}
                    onClose={() => setShowCharList(false)}
                    onSelect={c => { window.location.href = `/${system}/${c.accessUrl}`; }}
                />
            )}

            {showAvatar && (
                <AvatarUploader
                    currentAvatar={editableChar.avatar}
                    onAvatarChange={avatar => setEditableChar(p => ({ ...p, avatar }))}
                    onClose={() => setShowAvatar(false)}
                />
            )}

            {showXPModal && (
                <XPModal
                    character={character}
                    onUpdate={onCharacterUpdate}
                    onClose={() => setShowXPModal(false)}
                />
            )}

            {diceModal && (
                <TecumahDiceModal
                    character={character}
                    onCharacterUpdate={onCharacterUpdate}
                    onClose={() => setDiceModal(null)}
                    activeGMSession={activeGMSession}
                    initialAttrKey={diceModal.attrKey}
                    initialCompKey={diceModal.compKey}
                />
            )}
        </div>
    );
};

export default Sheet;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS INTERNES
// ═══════════════════════════════════════════════════════════════════════════════

// Barre d'édition réutilisée sur plusieurs onglets
const EditBar = ({ editMode, onEdit, onSave, onCancel }) => (
    <div className="flex justify-end gap-2 mb-2">
        {editMode ? (
            <>
                <button onClick={onCancel} className="px-4 py-2 rounded text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    Annuler
                </button>
                <button onClick={onSave} className="px-4 py-2 rounded text-sm" style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 700 }}>
                    ✓ Sauvegarder
                </button>
            </>
        ) : (
            <button onClick={onEdit} className="px-4 py-2 rounded text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                ✏️ Modifier
            </button>
        )}
    </div>
);

const Section = ({ title, children }) => (
    <section>
        <h3 className="tecumah-title-font" style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
            {title}
        </h3>
        {children}
    </section>
);

const MenuItem = ({ onClick, children, danger }) => (
    <button
        onClick={onClick}
        className="w-full text-left px-4 py-2 text-sm hover:opacity-80"
        style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text)' }}
    >
        {children}
    </button>
);

// Backgrounds inline — logique directement dans Sheet, pas de composant séparé
const BackgroundsInline = ({ backgrounds, onChange, readOnly }) => {
    const [adding, setAdding] = useState(false);
    const [newType, setNewType] = useState('');

    const update = (i, field, value) =>
        onChange(backgrounds.map((b, idx) => idx === i ? { ...b, [field]: value } : b));

    const remove = (i) => onChange(backgrounds.filter((_, idx) => idx !== i));

    const add = () => {
        if (!newType) return;
        onChange([...backgrounds, { id: undefined, type: newType, niveau: 1, notes: '' }]);
        setNewType('');
        setAdding(false);
    };

    return (
        <div className="flex flex-col gap-2">
            {backgrounds.map((bg, i) => {
                const def    = BACKGROUNDS_BY_ID[bg.type];
                if (!def) return null;
                const effect = def.effects[(bg.niveau ?? 1) - 1] ?? '';

                return (
                    <div key={i} className="rounded-lg p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-1">
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{def.name}</span>
                            <div className="flex items-center gap-2">
                                {!readOnly ? (
                                    <select
                                        value={bg.niveau ?? 1}
                                        onChange={e => update(i, 'niveau', Number(e.target.value))}
                                        className="rounded px-1 py-0.5 text-xs"
                                        style={inputSt}
                                    >
                                        {Array.from({ length: def.maxNiveau }, (_, k) => (
                                            <option key={k + 1} value={k + 1}>Niv. {k + 1}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Niv. {bg.niveau}</span>
                                )}
                                {!readOnly && (
                                    <button onClick={() => remove(i)} style={{ color: 'var(--color-danger)' }}>✕</button>
                                )}
                            </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 4 }}>{def.description}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 4 }}>{effect}</p>
                        {!readOnly ? (
                            <input
                                type="text"
                                value={bg.notes ?? ''}
                                onChange={e => update(i, 'notes', e.target.value)}
                                placeholder="Notes..."
                                className="w-full rounded px-2 py-1 text-xs"
                                style={inputSt}
                            />
                        ) : bg.notes ? (
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{bg.notes}</p>
                        ) : null}
                    </div>
                );
            })}

            {!readOnly && (
                adding ? (
                    <div className="flex gap-2 items-center">
                        <select value={newType} onChange={e => setNewType(e.target.value)} className="flex-1 rounded px-2 py-1 text-sm" style={inputSt}>
                            <option value="">— Choisir —</option>
                            {BACKGROUNDS.filter(b => !backgrounds.some(bg => bg.type === b.id)).map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <button onClick={add} className="px-3 py-1 rounded text-sm" style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}>Ajouter</button>
                        <button onClick={() => setAdding(false)} className="px-2 py-1 rounded text-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>Annuler</button>
                    </div>
                ) : (
                    <button onClick={() => setAdding(true)} className="px-3 py-2 rounded text-sm" style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                        + Ajouter un background
                    </button>
                )
            )}
        </div>
    );
};

const inputSt = { background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' };
const labelSt = { fontSize: '0.75rem', color: 'var(--color-text-muted)' };