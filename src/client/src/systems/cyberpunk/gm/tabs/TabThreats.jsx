// src/client/src/systems/cyberpunk/gm/tabs/TabThreats.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Btn, SectionTitle, Textarea, Input } from '../BasicComponents.jsx';
import IconPicker, { IconPreview } from '../IconPicker.jsx';
import useConfirm from "../../../../hooks/useConfirm.jsx";

const THREAT_TYPES   = ['Corporation', 'Gang', 'Individu', 'IA', 'Lieu', 'Autre'];
const STATUS_META    = {
    'active':      { label: 'Active',      cls: 'cp-threat-active'      },
    'dormante':    { label: 'Dormante',     cls: 'cp-threat-dormante'    },
    'neutralisée': { label: 'Neutralisée', cls: 'cp-threat-neutralisee' },
};

// ── MiniClockBar — segments interactifs embarqués dans ThreatCard ─────────────
const MiniClockBar = ({ clock, onAdvance }) => {
    const pct    = clock.segments > 0 ? (clock.current / clock.segments) * 100 : 0;
    const isFull = clock.current >= clock.segments;
    const color  = isFull ? 'var(--color-danger)' : pct > 66 ? 'var(--cp-neon-amber)' : 'var(--color-primary)';

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <IconPreview value={clock.icon} size="text-sm" />
                <span className="font-semibold text-base flex-1 truncate">{clock.name}</span>
                <span className="font-mono text-xs text-muted">{clock.current}/{clock.segments}</span>
            </div>
            {/* Segments cliquables */}
            <div className="flex gap-0.5">
                {Array.from({ length: clock.segments }).map((_, i) => (
                    <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); onAdvance(i < clock.current ? i : i + 1); }}
                        title={`→ ${i + 1}`}
                        className="flex-1 h-3 rounded-sm transition-all"
                        style={{
                            background: i < clock.current ? color : 'var(--color-surface-alt)',
                            border:     '1px solid var(--color-border)',
                            cursor:     'pointer',
                            minWidth:   '6px',
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

// ── ThreatCard ────────────────────────────────────────────────────────────────
const ThreatCard = ({ threat, clocks, expanded, onToggle, onEdit, onDelete, onPin, onStatusChange, onAdvanceClock }) => {
    const linkedClocks = clocks.filter(c => (threat.clockIds ?? []).includes(c.id));
    const allFull      = linkedClocks.length > 0 && linkedClocks.every(c => c.current >= c.segments);
    const statusMeta   = STATUS_META[threat.status] ?? STATUS_META['active'];

    const cycleStatus = () => {
        const order  = ['active', 'dormante', 'neutralisée'];
        const idx    = order.indexOf(threat.status ?? 'active');
        onStatusChange(order[(idx + 1) % order.length]);
    };

    return (
        <div
            className={`rounded-xl overflow-hidden transition-all ${allFull ? 'cp-threat-alert' : ''} ${threat.status === 'neutralisée' ? 'cp-threat-neutralisee' : ''}`}
            style={{
                background: 'var(--color-surface)',
                border:     allFull ? undefined : '1px solid var(--color-border)',
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2">
                {/* Poignée drag */}
                <span className="cp-drag-handle text-base select-none" title="Réordonner">⠿</span>

                {/* Icône */}
                <IconPreview value={threat.icon} />

                {/* Nom + type — cliquable pour expand */}
                <button
                    onClick={onToggle}
                    className="flex-1 min-w-0 text-left"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <div className="font-semibold text-base truncate">{threat.name}</div>
                    {threat.type && <div className="text-xs text-muted">{threat.type}</div>}
                </button>

                {/* Badges droite */}
                <div className="flex items-center gap-1.5 shrink-0">

                    {allFull && (
                        <span className="text-xs px-1.5 py-0.5 rounded cp-glow-magenta"
                              style={{ background: 'rgba(255,45,120,0.15)', color: 'var(--cp-neon-magenta)', border: '1px solid rgba(255,45,120,0.4)' }}>
                            ⚡ Prête
                        </span>
                    )}
                    {linkedClocks.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(0,229,255,0.08)', color: 'var(--color-primary)', border: '1px solid rgba(0,229,255,0.2)' }}>
                            {linkedClocks.length}⏱
                        </span>
                    )}

                    {/* Badge statut cliquable */}
                    <button onClick={cycleStatus}
                            className={`text-xs px-2 py-0.5 rounded border transition-all cp-font-ui uppercase tracking-wide ${statusMeta.cls}`}
                            style={{ background: 'var(--color-surface-alt)', cursor: 'pointer' }}
                            title="Cliquer pour changer le statut">
                        {statusMeta.label}
                    </button>

                    {/* Épingle */}
                    <button onClick={onPin} title={threat.pinned ? 'Désépingler' : 'Épingler'}
                            className={`text-2xl transition-colors ${threat.pinned ? 'cp-pinned-indicator' : 'text-muted hover:text-default'}`}>
                        <span
                            className="flex items-center justify-center leading-none"
                            style={{ transform: 'translateY(-1.505px)' }}
                        >
                            ⦿
                        </span>
                    </button>

                    <button
                        onClick={onToggle}
                        className="text-muted text-xl hover:text-default"
                    >
                        {expanded ? '▲' : '▼'}
                    </button>
                </div>
            </div>

            {/* Corps */}
            {expanded && (
                <div className="px-4 pb-4 flex flex-col gap-3"
                     style={{ borderTop: '1px solid var(--color-border)' }}>

                    {threat.impulse && (
                        <div>
                            <span className="text-xs cp-font-ui uppercase tracking-wide text-muted">Impulsion</span>
                            <p className="mt-0.5 text-base">{threat.impulse}</p>
                        </div>
                    )}

                    {(threat.moves ?? []).length > 0 && (
                        <div>
                            <span className="text-xs cp-font-ui uppercase tracking-wide text-muted">Moves MC</span>
                            <ul className="mt-1 flex flex-col gap-1">
                                {threat.moves.map((m, i) => (
                                    <li key={i} className="flex gap-2 text-base">
                                        <span style={{ color: 'var(--cp-neon-magenta)' }}>›</span> {m}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {linkedClocks.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className="text-xs cp-font-ui uppercase tracking-wide text-muted">Clocks liées</span>
                            {linkedClocks.map(c => (
                                <MiniClockBar
                                    key={c.id}
                                    clock={c}
                                    onAdvance={(val) => onAdvanceClock(c, val)}
                                />
                            ))}
                        </div>
                    )}

                    {threat.notes && (
                        <p className="text-xs italic text-muted">{threat.notes}</p>
                    )}

                    <div className="flex justify-between gap-2 pt-1">
                        <Btn small onClick={onEdit}>✏ Modifier</Btn>
                        <button
                            onClick={onDelete}
                            className="text-sm transition-colors text-muted hover:text-danger"
                            title="Supprimer cette menace"
                        >
                            ☒
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── InlineClockForm — création rapide de clock depuis ThreatForm ──────────────
const InlineClockForm = ({ onCreated, onCancel, fetchWithAuth, apiBase, sessionId }) => {
    const [name,     setName]     = useState('');
    const [segments, setSegments] = useState(6);
    const [saving,   setSaving]   = useState(false);

    const create = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const r = await fetchWithAuth(`${apiBase}/clocks`, {
                method: 'POST',
                body:   JSON.stringify({ name, segments, sessionId: sessionId ?? null }),
            });
            if (r.ok) {
                const newClock = await r.json();
                onCreated(newClock);
            }
        } finally { setSaving(false); }
    };

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg"
             style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)' }}>
            <span className="text-xs cp-font-ui uppercase tracking-wide text-muted">Nouvelle clock</span>
            <div className="flex gap-2">
                <Input value={name} onChange={setName} placeholder="Nom de la clock…" />
                <input type="number" value={segments} onChange={e => setSegments(parseInt(e.target.value) || 6)}
                       min={2} max={12}
                       className="w-16 rounded-lg text-sm px-2 py-1.5 outline-none text-center"
                       style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
            </div>
            <div className="flex gap-2">
                <Btn small variant="ghost" onClick={onCancel}>Annuler</Btn>
                <Btn small variant="primary" onClick={create} disabled={!name.trim() || saving}>
                    {saving ? '…' : '+ Créer'}
                </Btn>
            </div>
        </div>
    );
};

// ── ThreatForm ────────────────────────────────────────────────────────────────
const ThreatForm = ({ initial, clocks: initialClocks, onSave, onCancel, fetchWithAuth, apiBase, sessionId }) => {
    const [name,          setName]          = useState(initial?.name    ?? '');
    const [type,          setType]          = useState(initial?.type    ?? '');
    const [impulse,       setImpulse]       = useState(initial?.impulse ?? '');
    const [moves,         setMoves]         = useState((initial?.moves  ?? []).join('\n'));
    const [notes,         setNotes]         = useState(initial?.notes   ?? '');
    const [icon,          setIcon]          = useState(initial?.icon    ?? '⚠');
    const [status,        setStatus]        = useState(initial?.status  ?? 'active');
    const [clockIds,      setClockIds]      = useState(initial?.clockIds ?? []);
    const [clocks,        setClocks]        = useState(initialClocks);
    const [showNewClock,  setShowNewClock]  = useState(false);
    const [scope,         setScope]         = useState(initial?.sessionId === null ? 'slug' : 'session');

    const toggleClock = (cid) => setClockIds(prev =>
        prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]
    );

    const handleClockCreated = (newClock) => {
        setClocks(prev => [...prev, newClock]);
        setClockIds(prev => [...prev, newClock.id]);
        setShowNewClock(false);
    };

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl"
             style={{ background: 'var(--color-surface)', border: '1px solid var(--cp-neon-magenta)', boxShadow: 'var(--cp-glow-magenta)' }}>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Nom *</label>
                    <Input value={name} onChange={setName} placeholder="Ex: Arasaka" />
                </div>
                <div>
                    <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)}
                            className="w-full rounded-lg text-sm px-3 py-2 outline-none"
                            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                        <option value="">—</option>
                        {THREAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Statut</label>
                <div className="flex gap-2">
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                        <button key={key} onClick={() => setStatus(key)}
                                className={`text-xs px-3 py-1 rounded border transition-all cp-font-ui uppercase ${status === key ? meta.cls + ' border-current' : 'border-base text-muted'}`}
                                style={{ background: status === key ? 'var(--color-surface-alt)' : 'transparent' }}>
                            {meta.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Impulsion fondamentale</label>
                <Input value={impulse} onChange={setImpulse} placeholder="Ce que cette menace veut fondamentalement…" />
            </div>

            <div>
                <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Moves MC (un par ligne)</label>
                <Textarea value={moves} onChange={setMoves} placeholder={"Compromettre un contact\nAvancer une clock\nEnvoyer des renforts…"} rows={4} />
            </div>

            <div>
                <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Notes</label>
                <Textarea value={notes} onChange={setNotes} placeholder="Notes libres…" rows={2} />
            </div>

            <IconPicker value={icon} onChange={setIcon} label="Icône de la menace" />

            {/* Clocks liées */}
            <div>
                <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Clocks liées</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {clocks.map(c => (
                        <button key={c.id} onClick={() => toggleClock(c.id)}
                                className="text-xs px-2 py-1 rounded transition-all flex items-center gap-1"
                                style={{
                                    background: clockIds.includes(c.id) ? 'rgba(0,229,255,0.15)' : 'var(--color-surface-alt)',
                                    border:     `1px solid ${clockIds.includes(c.id) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    color:      clockIds.includes(c.id) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                }}>
                            <IconPreview value={c.icon} size="text-xs" /> {c.name}
                        </button>
                    ))}
                </div>
                {!showNewClock ? (
                    <button onClick={() => setShowNewClock(true)}
                            className="text-xs text-muted hover:text-primary transition-colors">
                        + Créer une nouvelle clock
                    </button>
                ) : (
                    <InlineClockForm
                        fetchWithAuth={fetchWithAuth}
                        apiBase={apiBase}
                        sessionId={sessionId}
                        onCreated={handleClockCreated}
                        onCancel={() => setShowNewClock(false)}
                    />
                )}
            </div>

            <div>
                <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Portée</label>
                <select value={scope} onChange={e => setScope(e.target.value)}
                        className="w-full rounded-lg text-sm px-3 py-2 outline-none"
                        style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    <option value="session">Session</option>
                    <option value="slug">Campagne (global)</option>
                </select>
            </div>

            <div className="flex gap-2">
                <Btn onClick={onCancel} variant="ghost">Annuler</Btn>
                <Btn onClick={() => onSave({ name, type, impulse, moves: moves.split('\n').map(m => m.trim()).filter(Boolean), notes, icon, status, clockIds, scope })}
                     variant="primary" disabled={!name.trim()}>
                    Sauvegarder
                </Btn>
            </div>
        </div>
    );
};

// ── TabThreats ────────────────────────────────────────────────────────────────
const TabThreats = ({ activeSession, fetchWithAuth, apiBase, expandThreatId, onExpandConsumed }) => {
    const [threats,    setThreats]    = useState([]);
    const [clocks,     setClocks]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm,   setShowForm]   = useState(false);
    const [editThreat, setEditThreat] = useState(null);
    const [search,     setSearch]     = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const dragIdRef  = useRef(null);
    const { confirm, confirmEl } = useConfirm();
    const expandedId = expandThreatId;

    const sessionId = activeSession?.id ?? null;

    const toggleExpand = (id) =>
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    // expandThreatId reçu en prop → l'ajouter au Set
    useEffect(() => {
        if (expandThreatId) {
            setExpandedIds(prev => new Set(prev).add(expandThreatId));
            onExpandConsumed?.();
        }
    }, [expandThreatId]);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [tr, cr] = await Promise.all([
                fetchWithAuth(`${apiBase}/threats${sessionId ? `?sessionId=${sessionId}` : ''}`).then(r => r.ok ? r.json() : []),
                fetchWithAuth(`${apiBase}/clocks${sessionId  ? `?sessionId=${sessionId}`  : ''}`).then(r => r.ok ? r.json() : []),
            ]);
            setThreats(Array.isArray(tr) ? tr : []);
            setClocks(Array.isArray(cr)  ? cr : []);
        } catch { setThreats([]); }
        finally { if (!silent) setLoading(false); }
    }, [apiBase, sessionId]);

    useEffect(() => { load(); }, [load]);

    // Consommer expandThreatId après le premier rendu
    useEffect(() => {
        if (expandThreatId) onExpandConsumed?.();
    }, [expandThreatId]);

    const save = async (formData) => {
        const body = {
            name:      formData.name,
            type:      formData.type,
            impulse:   formData.impulse,
            moves:     formData.moves,
            notes:     formData.notes,
            icon:      formData.icon,
            status:    formData.status,
            clockIds:  formData.clockIds,
            sessionId: formData.scope === 'session' ? sessionId : null,
        };
        if (editThreat) {
            await fetchWithAuth(`${apiBase}/threats/${editThreat.id}`, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await fetchWithAuth(`${apiBase}/threats`, { method: 'POST', body: JSON.stringify(body) });
        }
        setShowForm(false);
        setEditThreat(null);
        load();
    };

    const deleteThreat = async (id) => {
        const ok = await confirm({
            title:       'Supprimer la menace',
            message:     'Cette action est irréversible.',
            danger:      true,
            confirmText: 'Supprimer',
        });
        if (!ok) return;
        await fetchWithAuth(`${apiBase}/threats/${id}`, { method: 'DELETE' });
        load();
    };

    const pin = async (threat) => {
        await fetchWithAuth(`${apiBase}/threats/${threat.id}/pin`, { method: 'PATCH' });
        load();
    };

    const changeStatus = async (threat, status) => {
        await fetchWithAuth(`${apiBase}/threats/${threat.id}/status`, {
            method: 'PATCH',
            body:   JSON.stringify({ status }),
        });
        load();
    };

    const advanceClock = async (clock, newVal) => {
        await fetchWithAuth(`${apiBase}/clocks/${clock.id}/advance`, {
            method: 'PATCH',
            body:   JSON.stringify({ delta: newVal - clock.current }),
        });
        load();
    };

    // ── Drag-and-drop ─────────────────────────────────────────────────────────
    const handleDragStart = (e, id) => {
        dragIdRef.current = id;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e, targetId) => {
        e.preventDefault();
        const dragId = dragIdRef.current;
        if (!dragId || dragId === targetId) return;

        const ordered = [...threats];
        const fromIdx = ordered.findIndex(t => t.id === dragId);
        const toIdx   = ordered.findIndex(t => t.id === targetId);
        const [moved] = ordered.splice(fromIdx, 1);
        ordered.splice(toIdx, 0, moved);

        // Optimistic update
        setThreats(ordered);

        await fetchWithAuth(`${apiBase}/threats/reorder`, {
            method: 'PATCH',
            body:   JSON.stringify({ items: ordered.map((t, i) => ({ id: t.id, sortOrder: i })) }),
        });
    };

    // ── Filtres ───────────────────────────────────────────────────────────────
    const filtered = threats.filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !q || t.name.toLowerCase().includes(q) || t.impulse?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
        const matchType   = !filterType   || t.type   === filterType;
        const matchStatus = !filterStatus || t.status === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    if (loading) return <p className="text-center py-8 text-sm text-muted">Chargement…</p>;

    return (
        <div className="flex flex-col gap-3 m-1">
            {confirmEl}

            {/* Toolbar */}
            <div className="flex flex-wrap gap-1.5">
                <div className="flex-1">
                    <Input value={search} onChange={setSearch} placeholder="Rechercher…" small />
                </div>
                <div className="flex-none">
                    <Btn small variant="default" onClick={() => { setEditThreat(null); setShowForm(true); }}>+ Nouvelle</Btn>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
                {/* Chips filtres type */}
                <button onClick={() => setFilterType('')}
                        className={`text-xs px-2 py-0.5 rounded border transition-all cp-font-ui ${!filterType ? 'border-accent text-accent' : 'border-base text-muted hover:border-accent'}`}
                        style={{ background: 'var(--color-surface-alt)' }}>
                    Tous types
                </button>
                {THREAT_TYPES.map(t => (
                    <button key={t} onClick={() => setFilterType(prev => prev === t ? '' : t)}
                            className={`text-xs px-2 py-0.5 rounded border transition-all cp-font-ui ${filterType === t ? 'border-accent text-accent' : 'border-base text-muted hover:border-accent'}`}
                            style={{ background: 'var(--color-surface-alt)' }}>
                        {t}
                    </button>
                ))}
                <div className="w-0.5 cp-divider-h min-h-4"></div>
                {/* Chips filtres statut */}
                <button onClick={() => setFilterStatus('')}
                        className={`text-xs px-2 py-0.5 rounded border transition-all cp-font-ui ${!filterStatus ? 'border-accent text-accent' : 'border-base text-muted hover:border-accent'}`}
                        style={{ background: 'var(--color-surface-alt)' }}>
                    Tous statuts
                </button>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                    <button key={key} onClick={() => setFilterStatus(prev => prev === key ? '' : key)}
                            className={`text-xs px-2 py-0.5 rounded border transition-all cp-font-ui ${filterStatus === key ? meta.cls + ' border-current' : 'border-base text-muted hover:border-accent'}`}
                            style={{ background: 'var(--color-surface-alt)' }}>
                        {meta.label}
                    </button>
                ))}
            </div>


            <div className="flex flex-wrap gap-1.5">

            </div>

            {(showForm || editThreat) && (
                <ThreatForm
                    initial={editThreat}
                    clocks={clocks}
                    onSave={save}
                    onCancel={() => { setShowForm(false); setEditThreat(null); }}
                    fetchWithAuth={fetchWithAuth}
                    apiBase={apiBase}
                    sessionId={sessionId}
                />
            )}

            {filtered.length === 0 && !showForm && (
                <p className="text-sm text-center py-6 text-muted">
                    {search || filterType || filterStatus ? 'Aucun résultat.' : 'Aucune menace définie.'}
                </p>
            )}

            {/* Liste avec drag-and-drop */}
            {filtered.map(threat => (
                <div
                    key={threat.id}
                    draggable
                    onDragStart={e => handleDragStart(e, threat.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, threat.id)}
                >
                    <ThreatCard
                        threat={threat}
                        clocks={clocks}
                        expanded={expandedIds.has(threat.id)}
                        onToggle={() => toggleExpand(threat.id)}
                        onEdit={() => { setEditThreat(threat); setShowForm(false); }}
                        onDelete={() => deleteThreat(threat.id)}
                        onPin={() => pin(threat)}
                        onStatusChange={(status) => changeStatus(threat, status)}
                        onAdvanceClock={advanceClock}
                    />
                </div>
            ))}
        </div>
    );
};

export default TabThreats;