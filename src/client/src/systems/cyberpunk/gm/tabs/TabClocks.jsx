// src/client/src/systems/cyberpunk/gm/tabs/TabClocks.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Btn, SectionTitle, Input } from '../BasicComponents.jsx';
import IconPicker, { IconPreview, DEFAULT_CLOCK_PRESETS } from '../IconPicker.jsx';

// ── ClockBar — vue détaillée ──────────────────────────────────────────────────
const ClockBar = ({ clock, threats, onAdvance, onEdit, onDelete, onPin, onGoToThreat }) => {
    const pct    = clock.segments > 0 ? (clock.current / clock.segments) * 100 : 0;
    const isFull = clock.current >= clock.segments;

    return (
        <div className={`rounded-xl p-4 flex flex-col gap-3 ${clock.pinned ? 'cp-border-neon' : ''}`}
             style={{
                 background: 'var(--color-surface)',
                 border:     !clock.pinned ? `1px solid ${isFull ? 'var(--color-danger)' : 'var(--color-border)'}` : undefined,
                 boxShadow:  isFull && !clock.pinned ? '0 0 12px rgba(224,48,48,0.25)' : undefined,
             }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <IconPreview value={clock.icon} />
                    <div className="min-w-0">
                        <div className="font-semibold text-base">{clock.name}</div>
                        {clock.consequence && (
                            <div className="text-xs mt-0.5 italic text-muted">→ {clock.consequence}</div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={`font-mono text-xs font-bold ${isFull ? 'text-danger' : 'text-primary'}`}>
                        {clock.current}/{clock.segments}
                    </span>
                    <button
                        onClick={onPin}
                        title={clock.pinned ? 'Désépingler' : 'Épingler'}
                        className={`text-2xl transition-colors ${clock.pinned ? 'cp-pinned-indicator' : 'text-muted hover:text-default'}`}
                    >
                        <span
                            className="flex items-center justify-center leading-none"
                            style={{ transform: 'translateY(-1.505px)' }}
                        >
                            ⦿
                        </span>
                    </button>
                    <button
                        onClick={onEdit}
                        title="Editer cette clock"
                        className={`text-xl transition-colors text-muted hover:text-default`}
                    >
                        ⌬
                    </button>
                    <Btn onClick={onDelete} small variant="ghost">✕</Btn>
                </div>
            </div>

            {/* Barre de progression */}
            <div className="w-full h-3 rounded-full overflow-hidden"
                 style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                     style={{
                         width:      `${pct}%`,
                         background: isFull ? 'var(--color-danger)' : pct > 66 ? 'var(--cp-neon-amber)' : 'var(--color-primary)',
                         boxShadow:  isFull ? 'var(--cp-glow-magenta)' : 'var(--cp-glow-cyan)',
                     }}
                />
            </div>

            {/* Segments cliquables */}
            <div className="flex gap-1 flex-wrap">
                {Array.from({ length: clock.segments }).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => onAdvance(i < clock.current ? i : i + 1)}
                        title={`Mettre à ${i + 1}`}
                        className="flex-1 h-4 rounded transition-all min-w-[8px]"
                        style={{
                            background: i < clock.current
                                ? (isFull ? 'var(--color-danger)' : 'var(--color-primary)')
                                : 'var(--color-surface-alt)',
                            border:  '1px solid var(--color-border)',
                            cursor:  'pointer',
                        }}
                    />
                ))}
            </div>

            {/* Threats liées — noms cliquables */}
            {(clock.threatIds ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {(clock.threatIds ?? []).map(tid => {
                        const t = threats.find(th => th.id === tid);
                        return (
                            <button
                                key={tid}
                                onClick={() => onGoToThreat?.(tid)}
                                className="text-xs px-2 py-0.5 rounded transition-all hover:cp-glow-magenta"
                                style={{
                                    background: 'rgba(255,45,120,0.1)',
                                    color:      'var(--cp-neon-magenta)',
                                    border:     '1px solid rgba(255,45,120,0.25)',
                                    cursor:     'pointer',
                                }}
                            >
                                ⚠ {t ? t.name : `#${tid}`}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── ClockCompact — vue liste (une ligne) ──────────────────────────────────────
const ClockCompact = ({ clock, onAdvance, onEdit, onPin, onGoToThreat, threats }) => {
    const pct    = clock.segments > 0 ? (clock.current / clock.segments) * 100 : 0;
    const isFull = clock.current >= clock.segments;

    return (
        <div className={`cp-clock-compact ${clock.pinned ? 'cp-border-neon' : ''}`}>
            <IconPreview value={clock.icon} size="text-base" />

            <span className="font-semibold text-base flex-1 min-w-0 truncate">{clock.name}</span>

            {/* Mini barre */}
            <div className="w-24 h-2 rounded-full overflow-hidden shrink-0"
                 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                     style={{
                         width:      `${pct}%`,
                         background: isFull ? 'var(--color-danger)' : pct > 66 ? 'var(--cp-neon-amber)' : 'var(--color-primary)',
                     }}
                />
            </div>

            <span className={`font-mono text-xs font-bold shrink-0 ${isFull ? 'text-danger' : 'text-primary'}`}>
                {clock.current}/{clock.segments}
            </span>

            <Btn small variant="ghost" onClick={() => onAdvance(Math.max(0, clock.current - 1))} disabled={clock.current <= 0}>−</Btn>
            <Btn small variant={isFull ? 'danger' : 'ghost'} onClick={() => onAdvance(Math.min(clock.segments, clock.current + 1))} disabled={isFull}>+</Btn>
            <button onClick={onPin} title={clock.pinned ? 'Désépingler' : 'Épingler'}
                    className={`text-sm transition-colors ${clock.pinned ? 'cp-pinned-indicator' : 'text-muted hover:text-base'}`}>
                📌
            </button>
            <Btn small variant="ghost" onClick={onEdit}>✏</Btn>
        </div>
    );
};

// ── ClockForm ─────────────────────────────────────────────────────────────────
const ClockForm = ({ initial, threats, onSave, onCancel }) => {
    const [name,        setName]        = useState(initial?.name        ?? '');
    const [segments,    setSegments]    = useState(initial?.segments    ?? 6);
    const [consequence, setConsequence] = useState(initial?.consequence ?? '');
    const [threatIds,   setThreatIds]   = useState(initial?.threatIds   ?? []);
    const [icon,        setIcon]        = useState(initial?.icon        ?? '⏱');
    const [scope,       setScope]       = useState(initial?.sessionId === null ? 'slug' : 'session');

    const toggleThreat = (tid) => setThreatIds(prev =>
        prev.includes(tid) ? prev.filter(x => x !== tid) : [...prev, tid]
    );

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl"
             style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', boxShadow: 'var(--cp-glow-cyan)' }}>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Nom *</label>
                    <Input value={name} onChange={setName} placeholder="Ex: Plan Blackout" />
                </div>
                <div>
                    <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Segments</label>
                    <Input type="number" value={segments} onChange={v => setSegments(parseInt(v) || 6)} />
                </div>
            </div>

            <div>
                <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Conséquence si pleine</label>
                <Input value={consequence} onChange={setConsequence} placeholder="Ce qui se passe quand la clock est pleine…" />
            </div>

            <IconPicker value={icon} onChange={setIcon} presets={DEFAULT_CLOCK_PRESETS} label="Icône de la clock" />

            {threats.length > 0 && (
                <div>
                    <label className="text-xs cp-font-ui uppercase tracking-wide block mb-1 text-muted">Menaces liées</label>
                    <div className="flex flex-wrap gap-2">
                        {threats.map(t => (
                            <button key={t.id} onClick={() => toggleThreat(t.id)}
                                    className="text-xs px-2 py-1 rounded transition-all"
                                    style={{
                                        background: threatIds.includes(t.id) ? 'rgba(255,45,120,0.15)' : 'var(--color-surface-alt)',
                                        border:     `1px solid ${threatIds.includes(t.id) ? 'var(--cp-neon-magenta)' : 'var(--color-border)'}`,
                                        color:      threatIds.includes(t.id) ? 'var(--cp-neon-magenta)' : 'var(--color-text-muted)',
                                    }}>
                                {t.icon} {t.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
                <Btn onClick={() => onSave({ name, segments, consequence, icon, threatIds, scope })}
                     variant="primary" disabled={!name.trim()}>
                    Sauvegarder
                </Btn>
            </div>
        </div>
    );
};

// ── TabClocks ─────────────────────────────────────────────────────────────────
const TabClocks = ({ activeSession, fetchWithAuth, apiBase, onGoToThreat }) => {
    const [clocks,    setClocks]    = useState([]);
    const [threats,   setThreats]   = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [showForm,  setShowForm]  = useState(false);
    const [editClock, setEditClock] = useState(null);
    const [search,    setSearch]    = useState('');
    const [compact,   setCompact]   = useState(false);

    const sessionId = activeSession?.id ?? null;

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [cr, tr] = await Promise.all([
                fetchWithAuth(`${apiBase}/clocks${sessionId ? `?sessionId=${sessionId}` : ''}`).then(r => r.ok ? r.json() : []),
                fetchWithAuth(`${apiBase}/threats${sessionId ? `?sessionId=${sessionId}` : ''}`).then(r => r.ok ? r.json() : []),
            ]);
            setClocks(Array.isArray(cr) ? cr : []);
            setThreats(Array.isArray(tr) ? tr : []);
        } catch { setClocks([]); }
        finally { if (!silent) setLoading(false); }
    }, [apiBase, sessionId]);

    useEffect(() => { load(); }, [load]);

    const save = async (formData) => {
        const body = {
            name:        formData.name,
            segments:    formData.segments,
            consequence: formData.consequence,
            icon:        formData.icon,
            threatIds:   formData.threatIds,
            sessionId:   formData.scope === 'session' ? sessionId : null,
        };
        if (editClock) {
            await fetchWithAuth(`${apiBase}/clocks/${editClock.id}`, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await fetchWithAuth(`${apiBase}/clocks`, { method: 'POST', body: JSON.stringify(body) });
        }
        setShowForm(false);
        setEditClock(null);
        load();
    };

    const advance = async (clock, newVal) => {
        await fetchWithAuth(`${apiBase}/clocks/${clock.id}/advance`, {
            method: 'PATCH',
            body:   JSON.stringify({ delta: newVal - clock.current }),
        });
        load();
    };

    const pin = async (clock) => {
        await fetchWithAuth(`${apiBase}/clocks/${clock.id}/pin`, { method: 'PATCH' });
        load();
    };

    const deleteClock = async (id) => {
        if (!confirm('Supprimer cette clock ?')) return;
        await fetchWithAuth(`${apiBase}/clocks/${id}`, { method: 'DELETE' });
        load();
    };

    const filtered = clocks.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.consequence?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <p className="text-center py-8 text-sm text-muted">Chargement…</p>;

    return (
        <div className="flex flex-col gap-3 m-1">
            {/* Toolbar */}
            <div className="flex flew-wrap items-center gap-1.5 mt-1">
                <button
                    onClick={() => setCompact(v => !v)}
                    title={compact ? 'Vue détaillée' : 'Vue compacte'}
                    className={`text-sm px-2 py-1 rounded border transition-all ${compact ? 'border-accent text-accent' : 'border-base text-muted hover:border-accent'}`}
                    style={{ background: 'var(--color-surface-alt)' }}
                >
                    {compact ? '☰' : '⊟'}
                </button>
                <div className="flex-1">
                    <Input value={search} onChange={setSearch} placeholder="Rechercher…" small />
                </div>
                <Btn small variant="default" onClick={() => { setEditClock(null); setShowForm(true); }}>+ Nouvelle</Btn>
            </div>

            {(showForm || editClock) && (
                <ClockForm
                    initial={editClock}
                    threats={threats}
                    onSave={save}
                    onCancel={() => { setShowForm(false); setEditClock(null); }}
                />
            )}

            {filtered.length === 0 && !showForm && (
                <p className="text-sm text-center py-6 text-muted">
                    {search ? 'Aucun résultat.' : 'Aucune clock. Crée-en une pour suivre la progression des menaces.'}
                </p>
            )}

            {filtered.map(clock => compact ? (
                <ClockCompact
                    key={clock.id}
                    clock={clock}
                    threats={threats}
                    onAdvance={(val) => advance(clock, val)}
                    onEdit={() => { setEditClock(clock); setShowForm(false); }}
                    onPin={() => pin(clock)}
                    onGoToThreat={onGoToThreat}
                />
            ) : (
                <ClockBar
                    key={clock.id}
                    clock={clock}
                    threats={threats}
                    onAdvance={(val) => advance(clock, val)}
                    onEdit={() => { setEditClock(clock); setShowForm(false); }}
                    onDelete={() => deleteClock(clock.id)}
                    onPin={() => pin(clock)}
                    onGoToThreat={onGoToThreat}
                />
            ))}
        </div>
    );
};

export default TabClocks;