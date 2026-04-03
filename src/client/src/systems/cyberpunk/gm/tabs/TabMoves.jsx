// src/client/src/systems/cyberpunk/gm/tabs/TabMoves.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Vue GM complète des manœuvres Cyberpunk.
//
// Fonctionnalités :
//   - Affichage de tous les moves (officiels + custom approuvés + en attente)
//   - Recherche full-text (name + description)
//   - Filtres combinables : catégorie (pills) + playbook (pills)
//   - Panneau latéral droit pour créer ou éditer un move (push inline)
//   - Actions par move : éditer (tous), approuver/rejeter (pending), supprimer (custom)
//   - Confirmation de suppression via useConfirm
//   - Callback onPendingCount → met à jour le badge de l'onglet dans GMView
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Btn, Input, Textarea } from '../BasicComponents.jsx';
import { PLAYBOOKS, STATS, STAT_LABELS } from '../../config.jsx';
import useConfirm from '../../../../hooks/useConfirm.jsx';

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
    { id: 'all',      label: 'Tout'         },
    { id: 'official', label: 'Officiels'    },
    { id: 'custom',   label: 'Custom'       },
    { id: 'pending',  label: '⏳ En attente' },
];

const EMPTY_FORM = { name: '', stat: '', playbook: '', description: '' };

// ── Helpers badge statut ──────────────────────────────────────────────────────

/**
 * Retourne label + classes CSS du badge de statut d'un move.
*/
function moveBadge(move) {
    if (move.type === 'official') {
        return { label: '⬡ Officiel', classes: 'bg-primary/10 text-primary border border-primary/30' };
    }
    if (!move.isApproved) {
        return { label: '⏳ En attente', classes: 'bg-accent/15 text-accent border border-accent/50' };
    }
    return { label: '✦ Custom', classes: 'bg-accent/10 text-accent border border-accent/25' };
}

// ── Pill — bouton filtre réutilisable ────────────────────────────────────────

const Pill = ({ label, isActive, onClick, colorActive = 'primary' }) => {
    const activeClasses = colorActive === 'accent'
        ? 'bg-accent text-default border-transparent cp-glow-amber'
        : 'bg-primary text-default border-transparent cp-glow-cyan';

    return (
        <button
            onClick={onClick}
            className={`text-xs px-3 py-1 rounded-full font-semibold cp-font-ui uppercase tracking-wide
                        transition-all cursor-pointer border
                        ${isActive
                ? activeClasses
                : 'bg-surface-alt text-muted border-default hover:text-default hover:border-accent'}`}
        >
            {label}
        </button>
    );
};

// ── MoveCard ──────────────────────────────────────────────────────────────────

const MoveCard = ({ move, isActive, onEdit, onApprove, onReject, onDelete }) => {
    const badge     = moveBadge(move);
    const isPending = move.type === 'custom' && !move.isApproved;
    const isCustom  = move.type === 'custom';

    const borderClass = isActive       ? 'border-primary cp-glow-cyan'
        : isPending      ? 'border-accent cp-glow-amber'
            : '';            // border seul → --default-border-color

    return (
        <div className={`rounded-xl p-4 flex flex-col gap-2 transition-all bg-surface border ${borderClass}`}>

            <div className="flex items-start gap-2 flex-wrap">
                <div className="flex-1 min-w-0">

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm text-default">
                            {move.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded cp-font-ui uppercase tracking-wide ${badge.classes}`}>
                            {badge.label}
                        </span>
                        {move.playbook && (
                            <span className="text-xs px-1.5 py-0.5 rounded cp-font-ui uppercase tracking-wide bg-surface-alt text-muted border border-default">
                                {move.playbook}
                            </span>
                        )}
                        {move.stat && (
                            <span className={`cp-stat-badge cp-stat-badge-${move.stat}`}>
                                {STAT_LABELS[move.stat] ?? move.stat}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-xs leading-relaxed line-clamp-2 text-muted">
                        {move.description}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
                <Btn small variant="ghost" onClick={() => onEdit(move)}>⫶ Éditer</Btn>
                {isPending && (
                    <>
                        <Btn small variant="success" onClick={() => onApprove(move.id)}>✓ Approuver</Btn>
                        <Btn small variant="danger"  onClick={() => onReject(move.id)}>✕ Rejeter</Btn>
                    </>
                )}
                {isCustom && (
                    <Btn small variant="danger" onClick={() => onDelete(move)}>⌫ Supprimer</Btn>
                )}
            </div>
        </div>
    );
};

// ── MoveFormPanel — panneau latéral création / édition ────────────────────────

const MoveFormPanel = ({ move, onSave, onClose, onApprove, onReject }) => {
    const isNew     = move === 'new';
    const isPending = !isNew && move?.type === 'custom' && !move?.isApproved;

    const [form, setForm]     = useState(() =>
        isNew ? { ...EMPTY_FORM } : {
            name:        move.name        ?? '',
            stat:        move.stat        ?? '',
            playbook:    move.playbook    ?? '',
            description: move.description ?? '',
        }
    );
    const [saving, setSaving] = useState(false);

    // Ré-initialise si le move cible change
    useEffect(() => {
        setForm(isNew ? { ...EMPTY_FORM } : {
            name:        move.name        ?? '',
            stat:        move.stat        ?? '',
            playbook:    move.playbook    ?? '',
            description: move.description ?? '',
        });
    }, [isNew, move?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const set     = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
    const canSave = form.name.trim().length > 0 && form.description.trim().length > 0;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        await onSave(form, isNew ? null : move.id);
        setSaving(false);
    };

    return (
        // style= ici uniquement pour la largeur fixe en px — pas de classe équivalente disponible
        <div
            className="flex flex-col sticky top-0 self-start max-h-screen bg-surface border-l overflow-y-auto"
            style={{ width: '360px', minWidth: '360px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 bg-surface border-b">
                <span className="text-xs font-bold cp-font-ui uppercase tracking-widest text-muted">
                    {isNew ? '+ Nouvelle manœuvre' : '⫶ Éditer la manœuvre'}
                </span>
                <button
                    onClick={onClose}
                    className="text-lg leading-none text-muted hover:text-default transition-colors bg-transparent border-none cursor-pointer"
                >
                    ✕
                </button>
            </div>

            {/* Champs */}
            <div className="flex flex-col gap-4 p-4 flex-1">

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold cp-font-ui uppercase tracking-wide text-muted">Nom *</label>
                    <Input value={form.name} onChange={v => set('name', v)} placeholder="Nom de la manœuvre" />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold cp-font-ui uppercase tracking-wide text-muted">Stat associée</label>
                    <div className="flex gap-1.5 flex-wrap">
                        {/* "Aucune" — cliquer sur la stat active la désélectionne */}
                        {[{ id: '', label: '—' }, ...STATS.map(s => ({ id: s, label: STAT_LABELS[s] ?? s }))].map(s => (
                            <button
                                key={s.id}
                                onClick={() => set('stat', form.stat === s.id ? '' : s.id)}
                                className={`text-xs px-2.5 py-1 rounded-full font-semibold cp-font-ui uppercase tracking-wide
                                            transition-all cursor-pointer border
                                            ${form.stat === s.id
                                    ? s.id ? `cp-stat-badge cp-stat-badge-${s.id}` : 'bg-primary text-default border-transparent cp-glow-cyan'
                                    : 'bg-surface-alt text-muted border-default hover:text-default hover:border-accent'}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold cp-font-ui uppercase tracking-wide text-muted">Playbook</label>
                    <div className="flex gap-1.5 flex-wrap">
                        {[{ id: '', label: 'Base' }, ...PLAYBOOKS.map(pb => ({ id: pb.id, label: pb.label }))].map(pb => (
                            <button
                                key={pb.id}
                                onClick={() => set('playbook', form.playbook === pb.id ? '' : pb.id)}
                                className={`text-xs px-2.5 py-1 rounded-full font-semibold cp-font-ui uppercase tracking-wide
                                            transition-all cursor-pointer border
                                            ${form.playbook === pb.id
                                    ? 'bg-accent text-default border-transparent cp-glow-amber'
                                    : 'bg-surface-alt text-muted border-default hover:text-default hover:border-accent'}`}
                            >
                                {pb.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold cp-font-ui uppercase tracking-wide text-muted">Description *</label>
                    <Textarea
                        value={form.description}
                        onChange={v => set('description', v)}
                        placeholder="Décrivez les effets de cette manœuvre…"
                        rows={6}
                    />
                </div>

                {/* Méta readonly — statut du move édité */}
                {!isNew && (
                    <div className="rounded-lg px-3 py-2 text-xs bg-surface-alt border text-muted">
                        {moveBadge(move).label}
                        {move.playbook && ` · ${move.playbook}`}
                        {move.createdAt && ` · créé le ${new Date(move.createdAt).toLocaleDateString('fr-FR')}`}
                    </div>
                )}
            </div>

            {/* Footer actions */}
            <div className="flex flex-col gap-2 px-4 py-3 sticky bottom-0 bg-surface border-t">
                {isPending && (
                    <div className="flex gap-2">
                        <Btn variant="success" onClick={() => onApprove(move.id)}>✓ Approuver</Btn>
                        <Btn variant="danger"  onClick={() => onReject(move.id)}>✕ Rejeter</Btn>
                    </div>
                )}
                <div className="flex gap-2">
                    <Btn variant="ghost"   onClick={onClose}>Annuler</Btn>
                    <Btn variant="primary" onClick={handleSave} disabled={!canSave || saving}>
                        {saving ? '…' : isNew ? '+ Créer' : '✓ Sauvegarder'}
                    </Btn>
                </div>
            </div>
        </div>
    );
};

// ── TabMoves ──────────────────────────────────────────────────────────────────

/**
 * @param {{ fetchWithAuth: Function, apiBase: string, onPendingCount?: (n: number) => void }} props
 */
const TabMoves = ({ fetchWithAuth, apiBase, onPendingCount }) => {

    // ── State ─────────────────────────────────────────────────────────────────

    const [moves,          setMoves]          = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [search,         setSearch]         = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterPlaybook, setFilterPlaybook] = useState('');
    const [panelMove,      setPanelMove]      = useState(null); // null | 'new' | Move
    const { confirm, confirmEl }              = useConfirm();

    // ── Chargement ────────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchWithAuth(`${apiBase}/moves`).then(r => r.ok ? r.json() : []);
            const list = Array.isArray(data) ? data : [];
            setMoves(list);
            onPendingCount?.(list.filter(m => m.type === 'custom' && !m.isApproved).length);
        } catch {
            setMoves([]);
            onPendingCount?.(0);
        } finally {
            setLoading(false);
        }
    }, [apiBase, fetchWithAuth, onPendingCount]);

    useEffect(() => { load(); }, [load]);

    // ── Filtres & recherche ───────────────────────────────────────────────────

    const knownPlaybooks = useMemo(() => {
        const pbs = new Set(moves.map(m => m.playbook).filter(Boolean));
        return [...pbs].sort();
    }, [moves]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return moves.filter(m => {
            if (filterCategory === 'official' && m.type !== 'official')                        return false;
            if (filterCategory === 'custom'   && !(m.type === 'custom' && m.isApproved))       return false;
            if (filterCategory === 'pending'  && !(m.type === 'custom' && !m.isApproved))      return false;
            if (filterPlaybook === 'base'     && m.playbook !== null)                          return false;
            if (filterPlaybook && filterPlaybook !== 'base' && m.playbook !== filterPlaybook)  return false;
            if (q && !m.name.toLowerCase().includes(q) && !m.description.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [moves, filterCategory, filterPlaybook, search]);

    // ── Actions API ───────────────────────────────────────────────────────────

    const handleSave = useCallback(async (form, id) => {
        const body = {
            name:        form.name.trim(),
            description: form.description.trim(),
            stat:        form.stat     || null,
            playbook:    form.playbook || null,
        };
        await fetchWithAuth(`${apiBase}/moves${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body:   JSON.stringify(body),
        });
        setPanelMove(null);
        await load();
    }, [apiBase, fetchWithAuth, load]);

    const handleApprove = useCallback(async (id) => {
        await fetchWithAuth(`${apiBase}/moves/${id}/approve`, {
            method: 'PATCH',
            body:   JSON.stringify({ approved: true }),
        });
        setPanelMove(null);
        await load();
    }, [apiBase, fetchWithAuth, load]);

    const handleReject = useCallback(async (id) => {
        await fetchWithAuth(`${apiBase}/moves/${id}/approve`, {
            method: 'PATCH',
            body:   JSON.stringify({ approved: false }),
        });
        setPanelMove(null);
        await load();
    }, [apiBase, fetchWithAuth, load]);

    const handleDelete = useCallback(async (move) => {
        const ok = await confirm({
            title:       '⌫ Supprimer la manœuvre',
            message:     `Supprimer définitivement "${move.name}" ? Cette action est irréversible.`,
            confirmText: 'Supprimer',
            cancelText:  'Annuler',
            danger:      true,
        });
        if (!ok) return;
        await fetchWithAuth(`${apiBase}/moves/${move.id}`, { method: 'DELETE' });
        if (panelMove?.id === move.id) setPanelMove(null);
        await load();
    }, [apiBase, fetchWithAuth, load, confirm, panelMove]);

    const openPanel = useCallback((moveOrNew) => {
        if(moveOrNew === 'new') setPanelMove(panelMove === 'new' ? null : 'new');
        else setPanelMove(panelMove?.id === moveOrNew?.id ? null : moveOrNew);
    }, [panelMove]);

    // ── Pills playbook ────────────────────────────────────────────────────────

    const playbookPills = useMemo(() => [
        { id: '',     label: 'Tous' },
        { id: 'base', label: 'Base' },
        ...knownPlaybooks.map(pb => ({ id: pb, label: pb })),
    ], [knownPlaybooks]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full min-h-0">

            {/* ── Barre de filtres ────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 px-4 py-3 bg-surface border-b">

                {/* Recherche + bouton créer */}
                <div className="flex gap-2 items-center">
                    <div className="flex-1">
                        <Input value={search} onChange={setSearch} placeholder="Rechercher par nom ou description…" />
                    </div>
                    <Btn variant="primary" onClick={() => openPanel('new')}>+ Nouvelle</Btn>
                </div>

                {/* Pills catégorie + playbook sur une seule ligne flex-wrap */}
                <div className="flex gap-1.5 flex-wrap items-center">
                    {CATEGORY_FILTERS.map(f => (
                        <Pill
                            key={f.id}
                            label={f.label}
                            isActive={filterCategory === f.id}
                            onClick={() => setFilterCategory(f.id)}
                            colorActive="primary"
                        />
                    ))}
                    {knownPlaybooks.length > 0 && (
                        <>
                            {/* Séparateur visuel entre les deux groupes */}
                            <span className="text-muted select-none px-0.5">·</span>
                            {playbookPills.map(f => (
                                <Pill
                                    key={f.id}
                                    label={f.label}
                                    isActive={filterPlaybook === f.id}
                                    onClick={() => setFilterPlaybook(f.id)}
                                    colorActive="accent"
                                />
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* ── Corps : liste + panneau ──────────────────────────────────── */}
            <div className="flex flex-1 min-h-0">

                {/* Liste */}
                <div className="flex-1 overflow-y-auto cp-scroll p-4 flex flex-col gap-3 min-w-0">

                    {loading && (
                        <p className="text-center py-8 text-sm text-muted">Chargement…</p>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="rounded-xl p-8 text-center bg-surface border">
                            <p className="text-sm text-muted">
                                {search || filterCategory !== 'all' || filterPlaybook
                                    ? 'Aucune manœuvre ne correspond aux filtres.'
                                    : '✦ Aucune manœuvre enregistrée.'}
                            </p>
                        </div>
                    )}

                    {!loading && filtered.length > 0 && (
                        <p className="text-xs text-muted">
                            {filtered.length} manœuvre{filtered.length > 1 ? 's' : ''}
                            {moves.length !== filtered.length && ` sur ${moves.length}`}
                        </p>
                    )}

                    {!loading && filtered.map(move => (
                        <MoveCard
                            key={move.id}
                            move={move}
                            isActive={panelMove !== 'new' && panelMove?.id === move.id}
                            onEdit={openPanel}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>

                {/* Panneau latéral */}
                {panelMove !== null && (
                    <MoveFormPanel
                        move={panelMove}
                        onSave={handleSave}
                        onClose={() => setPanelMove(null)}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                )}
            </div>

            {/* Modale confirmation suppression */}
            {confirmEl}
        </div>
    );
};

export default TabMoves;