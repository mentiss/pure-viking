// src/client/src/systems/cyberpunk/gm/tabs/TabSession.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Onglet Session GM — Cyberpunk / The Sprawl
//
// Layout :
//   Gauche  — liste des persos de la session (mini-cards + indicateur online)
//   Droite  — fiche GM du perso sélectionné (édition complète)
//
// Fonctionnalités GM :
//   Ressources (Cred / [info] / [matos] / Retenue / XP / Avancements) — save immédiat
//   Stats — éditables via contrôles +/−, save sur bouton
//   Tags personnage — add/remove, save immédiat
//   Directives — completion checkbox, save immédiat
//   Relations — tags add/remove, save immédiat
//   Cyberware — tags add/remove, save immédiat
//   Moves — toggle add/remove, save immédiat via PATCH /xp
//   Envoyer une note — GMSendModal générique
//   Envoyer un objet — formulaire inline
//
// Temps réel :
//   Socket `character-full-update` et `character-update` → màj locale
//   Toutes les sauvegardes émettent via le PUT (qui broadcaste en socket côté serveur)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card }           from '../../components/layout/Card.jsx';
import { Tag, TagAdder }  from '../../components/layout/TagManager.jsx';
import { ResourceCounter } from '../../components/layout/ResourceCounter.jsx';
import { StatCard }       from '../../components/layout/StatCard.jsx';
import { IdentityCard }   from '../../components/layout/IdentityCard.jsx';
import { MoveCard }       from '../../components/layout/MoveCard.jsx';
import {
    DirectiveRow,
    RelationRow,
    CyberwareRow,
    ItemRow,
} from '../../components/layout/Rows.jsx';

import { STAT_LABELS } from '../../config.jsx';
import useSystem from "../../../../hooks/useSystem.js";
import {useFetch} from "../../../../hooks/useFetch.js";
import {useSocket} from "../../../../context/SocketContext.jsx";
import GMSendModal from "../../../../components/gm/modals/GMSendModal.jsx";
import {useParams} from "react-router-dom";

// ── Constantes ────────────────────────────────────────────────────────────────

const STATS_LIST = ['cran', 'pro', 'chair', 'esprit', 'style', 'synth'];

const RESOURCE_CONFIG = [
    { key: 'cred',             label: 'Cred',    color: 'var(--cp-cred-color)'     },
    { key: 'infoTokens',       label: '[info]',  color: 'var(--cp-info-color)'     },
    { key: 'matosTokens',      label: '[matos]', color: 'var(--cp-matos-color)'    },
    { key: 'retenue',          label: 'Retenue', color: 'var(--cp-retenue-color)'  },
    { key: 'xp',               label: 'XP',      color: 'var(--color-accent)'      },
    { key: 'baseAdvancements', label: 'Avanc.',  color: 'var(--color-success)'     },
];

// ── Helpers UI ────────────────────────────────────────────────────────────────

const Btn = ({ onClick, children, variant = 'default', small = false, disabled = false }) => {
    const styles = {
        default: { },
        primary: { },
        danger:  { background: 'var(--color-danger)',      color: 'white',                 border: 'none' },
        ghost:   { background: 'transparent',              color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' },
    };
    return (
        <button onClick={onClick} disabled={disabled}
                className={`rounded-lg font-semibold transition-all ${small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-2'} bg-surface-alt hover:cp-neon-glow-el hover:bg-surface border border-base hover:border-accent`}
                style={{ ...styles[variant], opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
            {children}
        </button>
    );
};

// ── TabSession ────────────────────────────────────────────────────────────────

const TabSession = ({ activeSession, onlineCharacters, onSessionChange }) => {
    const { apiBase }   = useSystem();
    const { system } = useParams();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    // ── État ──────────────────────────────────────────────────────────────────
    const [characters,   setCharacters]   = useState({});   // Map id → fullChar
    const [selectedId,   setSelectedId]   = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [saving,       setSaving]       = useState(false);

    // Édition locale du perso sélectionné
    const [localChar,    setLocalChar]    = useState(null);
    const [statsDirty,   setStatsDirty]   = useState(false); // stats modifiées non sauvées

    // Moves disponibles (chargés une fois)
    const [allMoves,     setAllMoves]     = useState([]);
    const [movesTab,     setMovesTab]     = useState('playbook');

    // Modales
    const [showSendNote, setShowSendNote] = useState(false);
    const [showSendItem, setShowSendItem] = useState(false);
    const [sendItemForm, setSendItemForm] = useState({ name: '', description: '', quantity: 1 });
    const [sendItemMsg,  setSendItemMsg]  = useState(null);
    const [copied, setCopied] = useState(false);

    const onlineIds = new Set((onlineCharacters ?? []).map(c => c.characterId));

    // ── Chargement des persos de la session ───────────────────────────────────
    useEffect(() => {
        if (!activeSession?.characters?.length) {
            setCharacters({});
            setSelectedId(null);
            setLocalChar(null);
            return;
        }
        setLoading(true);
        const load = async () => {
            const loaded = {};
            await Promise.all((activeSession.characters ?? []).map(async c => {
                try {
                    const r = await fetchWithAuth(`${apiBase}/characters/${c.id}`);
                    if (r.ok) loaded[c.id] = await r.json();
                } catch (e) { console.error(`[TabSession/cyberpunk] ${c.id}:`, e); }
            }));
            setCharacters(loaded);
            const firstId = activeSession.characters[0]?.id ?? null;
            setSelectedId(prev => (prev && loaded[prev]) ? prev : firstId);
            setLoading(false);
        };
        load();
    }, [activeSession?.id, activeSession?.characters?.length]);

    // ── Sync localChar quand selectedId ou characters changent ────────────────
    useEffect(() => {
        if (selectedId && characters[selectedId]) {
            setLocalChar({ ...characters[selectedId] });
            setStatsDirty(false);
        } else {
            setLocalChar(null);
        }
    }, [selectedId, characters]);

    // ── Chargement des moves ──────────────────────────────────────────────────
    useEffect(() => {
        if (!apiBase) return;
        fetchWithAuth(`${apiBase}/moves`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setAllMoves(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [apiBase]);

    // ── Temps réel ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const onFull    = ({ characterId, character }) => {
            setCharacters(prev => prev[characterId] ? { ...prev, [characterId]: character } : prev);
        };
        const onPartial = ({ characterId, updates }) => {
            setCharacters(prev => prev[characterId]
                ? { ...prev, [characterId]: { ...prev[characterId], ...updates } }
                : prev
            );
        };
        socket.on('character-full-update', onFull);
        socket.on('character-update',      onPartial);
        return () => {
            socket.off('character-full-update', onFull);
            socket.off('character-update',      onPartial);
        };
    }, [socket]);

    // ── Sauvegarde complète ───────────────────────────────────────────────────
    const saveChar = useCallback(async (charToSave) => {
        if (!charToSave?.id) return;
        setSaving(true);
        try {
            const r = await fetchWithAuth(`${apiBase}/characters/${charToSave.id}`, {
                method: 'PUT',
                body:   JSON.stringify(charToSave),
            });
            if (r.ok) {
                const updated = await r.json();
                setCharacters(prev => ({ ...prev, [updated.id]: updated }));
                setStatsDirty(false);
                return updated;
            }
        } catch (e) { console.error('[TabSession/cyberpunk] saveChar:', e); }
        finally { setSaving(false); }
    }, [apiBase, fetchWithAuth]);

    // ── Patch immédiat d'un champ (ressources, tags, directives...) ───────────
    // Applique le patch localement + sauvegarde sans attendre
    const patchChar = useCallback(async (charId, patch) => {
        const current = characters[charId];
        if (!current) return;
        const next = { ...current, ...patch };
        // Optimistic update
        setCharacters(prev => ({ ...prev, [charId]: next }));
        try {
            const r = await fetchWithAuth(`${apiBase}/characters/${charId}`, {
                method: 'PUT',
                body:   JSON.stringify(next),
            });
            if (r.ok) {
                const updated = await r.json();
                setCharacters(prev => ({ ...prev, [charId]: updated }));
            }
        } catch (e) {
            // Rollback
            setCharacters(prev => ({ ...prev, [charId]: current }));
            console.error('[TabSession/cyberpunk] patchChar:', e);
        }
    }, [characters, apiBase, fetchWithAuth]);

    // ── Helpers pour le perso sélectionné ────────────────────────────────────
    const char = characters[selectedId] ?? null;

    // Stats — édition locale, save explicite
    const setLocalStat = (stat, value) => {
        setLocalChar(prev => ({ ...prev, [stat]: value }));
        setStatsDirty(true);
    };
    const saveStats = () => saveChar(localChar);

    // Tags personnage
    const addCharTag = (text, variant) => {
        if (!char) return;
        patchChar(char.id, { tags: [...(char.tags ?? []), { tag_text: text, tag_variant: variant }] });
    };
    const removeCharTag = (tagIdx) => {
        if (!char) return;
        patchChar(char.id, { tags: (char.tags ?? []).filter((_, i) => i !== tagIdx) });
    };

    // Directives — toggle completed
    const toggleDirective = (directive) => {
        if (!char) return;
        patchChar(char.id, {
            directives: (char.directives ?? []).map(d =>
                (d.id ?? d) === (directive.id ?? directive)
                    ? { ...d, completed: !d.completed }
                    : d
            ),
        });
    };

    // Relations — tags
    const addRelationTag = (relation, text, variant) => {
        if (!char) return;
        patchChar(char.id, {
            relations: (char.relations ?? []).map(r =>
                r === relation
                    ? { ...r, tags: [...(r.tags ?? []), { tag_text: text, tag_variant: variant }] }
                    : r
            ),
        });
    };
    const removeRelationTag = (relation, tagIdx) => {
        if (!char) return;
        patchChar(char.id, {
            relations: (char.relations ?? []).map(r =>
                r === relation
                    ? { ...r, tags: (r.tags ?? []).filter((_, i) => i !== tagIdx) }
                    : r
            ),
        });
    };

    // Cyberware — tags
    const addCyberTag = (item, text, variant) => {
        if (!char) return;
        patchChar(char.id, {
            cyberware: (char.cyberware ?? []).map(c =>
                c === item
                    ? { ...c, tags: [...(c.tags ?? []), { tag_text: text, tag_variant: variant }] }
                    : c
            ),
        });
    };
    const removeCyberTag = (item, tagIdx) => {
        if (!char) return;
        patchChar(char.id, {
            cyberware: (char.cyberware ?? []).map(c =>
                c === item
                    ? { ...c, tags: (c.tags ?? []).filter((_, i) => i !== tagIdx) }
                    : c
            ),
        });
    };

    // Moves — toggle via patchChar (sans coût XP — le GM édite librement)
    const charMoveIds = new Set((char?.moves ?? []).map(m => m.id));
    const toggleMove = (move) => {
        if (!char) return;
        const isAcquired = charMoveIds.has(move.id);
        patchChar(char.id, {
            moves: isAcquired
                ? (char.moves ?? []).filter(m => m.id !== move.id)
                : [...(char.moves ?? []), { id: move.id, name: move.name, stat: move.stat, description: move.description, playbook: move.playbook, type: move.type, isApproved: true }],
        });
    };

    // Moves filtrés par onglet
    const baseMoves     = allMoves.filter(m => m.playbook === null && m.type === 'official');
    const playbookMoves = allMoves.filter(m => m.playbook === char?.playbook);
    const allOffPlaybook = allMoves.filter(m => m.type === 'official' && m.playbook !== null && m.playbook !== char?.playbook);
    const movesDisplay  = movesTab === 'base' ? baseMoves : movesTab === 'playbook' ? playbookMoves : allOffPlaybook;

    // Envoi note
    const handleGMSend = useCallback(async (sendData) => {
        const r = await fetchWithAuth(`${apiBase}/journal/gm-send`, {
            method: 'POST',
            body:   JSON.stringify({
                targetCharacterIds: sendData.targetCharacterIds,
                sessionId:          activeSession?.id ?? null,
                title:              sendData.title ?? null,
                body:               sendData.body  ?? null,
                metadata:           sendData.imageData ? { imageUrl: sendData.imageData } : null,
                toastAnimation:     sendData.toastAnimation ?? 'default',
            }),
        });
        if (!r.ok) throw new Error('Envoi échoué');
    }, [apiBase, fetchWithAuth, activeSession?.id]);

    // Envoi item
    const handleSendItem = async () => {
        if (!sendItemForm.name.trim() || !char) return;
        setSendItemMsg(null);
        try {
            const r = await fetchWithAuth(`${apiBase}/characters/${char.id}/send-item`, {
                method: 'POST',
                body:   JSON.stringify({ ...sendItemForm, sessionId: activeSession?.id }),
            });
            if (r.ok) {
                setSendItemMsg({ type: 'success', text: `✦ "${sendItemForm.name}" envoyé !` });
                setSendItemForm({ name: '', description: '', quantity: 1 });
                // Recharger la fiche pour voir l'item ajouté
                const updated = await fetchWithAuth(`${apiBase}/characters/${char.id}`);
                if (updated.ok) {
                    const data = await updated.json();
                    setCharacters(prev => ({ ...prev, [char.id]: data }));
                }
            }
        } catch (e) {
            setSendItemMsg({ type: 'error', text: 'Erreur lors de l\'envoi.' });
        }
    };

    const handleLinkCopy = () => {
        const text = `━━━━━━━━━━━━━━━━━━━━\n ⬢  IDENTITÉ DÉTECTÉE\n━━━━━━━━━━━━━━━━━━━━\n 👤  Cible : ${char.prenom} ${char.nom}\n 🔗  Lien Neural : ${window.location.origin}/${system}/${char.accessUrl}\n 🔐  Code d'accès : \`${char.accessCode}\`\n━━━━━━━━━━━━━━━━━━━━`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // sessionCharacters pour GMSendModal
    const sessionCharacters = (activeSession?.characters ?? []).map(sc => ({
        id:   sc.id,
        name: characters[sc.id]
            ? [characters[sc.id].prenom, characters[sc.id].nom].filter(Boolean).join(' ') || sc.name
            : (sc.name ?? sc.id),
    }));

    // ── Etats vides ───────────────────────────────────────────────────────────
    if (!activeSession) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
                 style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ fontSize: '3rem' }}>⬡</span>
                <p className="text-sm">Aucune session sélectionnée.</p>
                <p className="text-xs">Ouvrez le menu et gérez vos sessions.</p>
            </div>
        );
    }

    if (loading && Object.keys(characters).length === 0) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Chargement des fiches…</p>
            </div>
        );
    }

    if (!activeSession.characters?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
                 style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ fontSize: '3rem' }}>👥</span>
                <p className="text-sm">Aucun personnage dans cette session.</p>
            </div>
        );
    }

    // ── Render principal ──────────────────────────────────────────────────────
    return (
        <div className="flex h-full gap-0" style={{ minHeight: 0 }}>

            {/* ── Sidebar persos ────────────────────────────────────────── */}
            <div
                className="flex flex-col gap-2 p-3 overflow-y-auto cp-scroll flex-shrink-0"
                style={{
                    width:       '220px',
                    borderRight: '1px solid var(--color-border)',
                    background:  'var(--cp-move-bg)',
                }}
            >
                <h3 className="text-xs font-bold cp-font-ui uppercase tracking-widest px-1"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Personnages
                </h3>
                {(activeSession.characters ?? []).map(sc => {
                    const c        = characters[sc.id];
                    const isOnline = onlineIds.has(sc.id);
                    const isActive = selectedId === sc.id;

                    return (
                        <button
                            key={sc.id}
                            onClick={() => setSelectedId(sc.id)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                            style={{
                                background: isActive ? 'rgba(0,229,255,0.08)' : 'var(--color-surface-alt)',
                                border:     `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                boxShadow:  isActive ? 'var(--cp-glow-cyan)' : 'none',
                                cursor:     'pointer',
                            }}
                        >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <div className="w-9 h-9 rounded-lg overflow-hidden"
                                     style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                    {c?.avatar
                                        ? <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                                        : <span className="w-full h-full flex items-center justify-center text-base"
                                                style={{ color: 'var(--color-primary)' }}>⬡</span>
                                    }
                                </div>
                                {/* Indicateur online */}
                                <span
                                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-bg"
                                    style={{
                                        background:   isOnline ? 'var(--color-success)' : 'var(--color-border)',
                                        borderColor:  'var(--cp-move-bg)',
                                    }}
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate"
                                     style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text)' }}>
                                    {c ? ([c.prenom, c.nom].filter(Boolean).join(' ') || 'Anonyme') : '…'}
                                </div>
                                <div className="text-xs cp-font-ui uppercase truncate"
                                     style={{ color: 'var(--color-text-muted)' }}>
                                    {c?.playbook || '—'}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Fiche GM du perso sélectionné ────────────────────────── */}
            {!char ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Sélectionne un personnage.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto cp-scroll p-4 flex flex-col gap-4">

                    {/* ── Barre d'actions GM ──────────────────────────── */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ background: onlineIds.has(char.id) ? 'var(--color-success)' : 'var(--color-border)' }}
                            />
                            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                {[char.prenom, char.nom].filter(Boolean).join(' ') || 'Anonyme'}
                            </span>
                            <span className="text-xs cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                                {char.playbook || '—'}
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Btn small onClick={handleLinkCopy}>{copied ? '✓ Copié !' : '🔗 Copier le lien'}</Btn>
                            <Btn small onClick={() => { setShowSendItem(v => !v); setSendItemMsg(null); }}>
                                📦 Envoyer item
                            </Btn>
                            <Btn small variant="primary" onClick={() => setShowSendNote(true)}>
                                ✉ Envoyer note
                            </Btn>
                        </div>
                    </div>

                    {/* ── Formulaire envoi item ────────────────────────── */}
                    {showSendItem && (
                        <Card title="Envoyer un objet">
                            {sendItemMsg && (
                                <p className="text-xs text-center"
                                   style={{ color: sendItemMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {sendItemMsg.text}
                                </p>
                            )}
                            <div className="flex flex-col gap-2">
                                <input type="text" placeholder="Nom de l'objet *"
                                       value={sendItemForm.name}
                                       onChange={e => setSendItemForm(p => ({ ...p, name: e.target.value }))}
                                       className="rounded-lg px-3 py-2 text-sm outline-none w-full"
                                       style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Description…"
                                           value={sendItemForm.description}
                                           onChange={e => setSendItemForm(p => ({ ...p, description: e.target.value }))}
                                           className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                           style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                    <input type="number" min="1" value={sendItemForm.quantity}
                                           onChange={e => setSendItemForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                                           className="w-16 text-center rounded-lg px-2 py-2 text-sm outline-none"
                                           style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                                </div>
                                <div className="flex gap-2">
                                    <Btn variant="ghost" small onClick={() => setShowSendItem(false)}>Annuler</Btn>
                                    <Btn variant="primary" small onClick={handleSendItem}
                                         disabled={!sendItemForm.name.trim()}>
                                        Envoyer
                                    </Btn>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* ── Grid identité + stats ────────────────────────── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="gap-2">
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {/* Identité — lecture seule côté GM */}
                                <IdentityCard char={char} editMode={false} set={() => {}} showAvatar={false} setShowAvatar={() => {}} />

                                {/* ── États narratifs (tags) ────────────────────────── */}
                                <Card title="États narratifs">
                                    {(char.tags ?? []).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {(char.tags ?? []).map((tag, i) => (
                                                <Tag key={i} tag={tag} alwaysRemovable
                                                     onRemove={() => removeCharTag(i)} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                                            Aucun état actif.
                                        </p>
                                    )}
                                    <TagAdder entityType="character" existingTags={char.tags ?? []}
                                              onAdd={addCharTag} />
                                </Card>
                            </div>

                            {/* ── Ressources ───────────────────────────────────── */}
                            <Card title="Ressources">
                                <div className="flex flex-wrap gap-4 justify-around">
                                    {RESOURCE_CONFIG.map(({ key, label, color }) => (
                                        <ResourceCounter
                                            key={key}
                                            label={label}
                                            value={char[key] ?? 0}
                                            color={color}
                                            editMode={true}
                                            onChange={v => patchChar(char.id, { [key]: Math.max(0, v) })}
                                        />
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Stats — édition locale + save explicite */}
                        <div className="flex flex-col gap-2">
                            <StatCard
                                editMode={true}
                                char={localChar ?? char}
                                editableChar={localChar ?? char}
                                setMoveModal={() => {}}
                                set={setLocalStat}
                            />
                            {statsDirty && (
                                <Btn variant="primary" small onClick={saveStats} disabled={saving}>
                                    {saving ? '…' : '💾 Sauvegarder les stats'}
                                </Btn>
                            )}
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-4">
                        {/* ── Cyberware ────────────────────────────────────── */}
                        <Card title="Cyberware">
                            {(char.cyberware ?? []).length === 0 && (
                                <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Aucun implant.</p>
                            )}
                            {(char.cyberware ?? []).map((c, i) => (
                                <CyberwareRow key={c.id ?? i} item={c}
                                              editMode={false}
                                              onChange={() => {}}
                                              onRemove={() => {}}
                                              onRemoveTag={(tagIdx) => removeCyberTag(c, tagIdx)}
                                              onAddTag={(text, variant) => addCyberTag(c, text, variant)} />
                            ))}
                        </Card>

                        {/* ── Inventaire ───────────────────────────────────────────────── */}
                        <Card title="Inventaire">
                            {(char.items ?? []).length === 0 && (
                                <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Inventaire vide.</p>
                            )}
                            {(char.items ?? []).map((item, i) => (
                                <ItemRow key={item.id ?? i} item={item}
                                         editMode={false}
                                         onChange={() => {}}
                                         onRemove={() => {}}
                                         onRemoveTag={(tagIdx) => {
                                             patchChar(char.id, {
                                                 items: (char.items ?? []).map(it =>
                                                     it === item
                                                         ? { ...it, tags: (it.tags ?? []).filter((_, idx) => idx !== tagIdx) }
                                                         : it
                                                 ),
                                             });
                                         }}
                                         onAddTag={(text, variant) => {
                                             patchChar(char.id, {
                                                 items: (char.items ?? []).map(it =>
                                                     it === item
                                                         ? { ...it, tags: [...(it.tags ?? []), { tag_text: text, tag_variant: variant }] }
                                                         : it
                                                 ),
                                             });
                                         }} />
                            ))}
                        </Card>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {/* ── Directives ───────────────────────────────────── */}
                        <Card title="Directives">
                            <div className="flex flex-col gap-3">
                                {['personal', 'mission'].map(type => {
                                    const items = (char.directives ?? []).filter(d => d.type === type);
                                    if (!items.length) return null;
                                    return (
                                        <div key={type} className="flex flex-col gap-1.5">
                                        <span className="text-xs cp-font-ui uppercase tracking-wide"
                                              style={{ color: 'var(--color-text-muted)' }}>
                                            {type === 'personal' ? 'Personnelles' : 'De Mission'}
                                        </span>
                                            {items.map((d, i) => (
                                                <DirectiveRow key={d.id ?? i} directive={d}
                                                              editMode={false}
                                                              onChange={() => toggleDirective(d)} />
                                            ))}
                                        </div>
                                    );
                                })}
                                {!(char.directives ?? []).length && (
                                    <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                                        Aucune directive.
                                    </p>
                                )}
                            </div>
                        </Card>

                        {/* ── Relations ────────────────────────────────────── */}
                        <Card title="Relations">
                            {(char.relations ?? []).length === 0 && (
                                <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Aucune relation.</p>
                            )}
                            {(char.relations ?? []).map((r, i) => (
                                <RelationRow key={r.id ?? i} relation={r}
                                             editMode={false}
                                             onChange={() => {}}
                                             onRemove={() => {}}
                                             onRemoveTag={(tagIdx) => removeRelationTag(r, tagIdx)}
                                             onAddTag={(text, variant) => addRelationTag(r, text, variant)} />
                            ))}
                        </Card>
                    </div>

                    {/* ── Moves ────────────────────────────────────────── */}
                    <Card title="Manœuvres">
                        {/* Micro-onglets */}
                        <div className="flex rounded-lg overflow-hidden"
                             style={{ background: 'var(--color-surface-alt)' }}>
                            {[
                                { id: 'playbook',    label: char.playbook ?? 'Playbook' },
                                { id: 'base',        label: 'De base' },
                                { id: 'advancement', label: '★ Avance.' },
                            ].map(t => (
                                <button key={t.id} onClick={() => setMovesTab(t.id)}
                                        className="flex-1 py-1.5 text-xs font-semibold cp-font-ui uppercase tracking-wide transition-all"
                                        style={{
                                            background: movesTab === t.id ? 'var(--color-primary)' : 'transparent',
                                            color:      movesTab === t.id ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                            border:     'none', cursor: 'pointer',
                                            boxShadow:  movesTab === t.id ? 'var(--cp-glow-cyan)' : 'none',
                                        }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Cliquez pour ajouter / retirer un move.
                        </p>

                        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto cp-scroll">
                            {movesDisplay.map(move => {
                                const isAcquired = charMoveIds.has(move.id);
                                const isBase     = move.playbook === null;
                                return (
                                    <MoveCard
                                        key={move.id}
                                        move={move}
                                        isUnlocked={isAcquired || isBase}
                                        isAcquired={isAcquired}
                                        isEditMode={!isBase}
                                        showFull={movesTab === 'advancement'}
                                        onClick={() => !isBase && toggleMove(move)}
                                    />
                                );
                            })}
                            {movesDisplay.length === 0 && (
                                <p className="text-xs italic py-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
                                    Aucun move.
                                </p>
                            )}
                        </div>
                    </Card>

                </div>
            )}

            {/* ── Modales ───────────────────────────────────────────────── */}
            {showSendNote && (
                <GMSendModal
                    onClose={() => setShowSendNote(false)}
                    onSend={handleGMSend}
                    sessionCharacters={sessionCharacters}
                    preSelectedCharId={selectedId}
                />
            )}
        </div>
    );
};

export default TabSession;