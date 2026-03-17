// components/JournalTab.jsx - Onglet Journal V2 (split layout, recherche, filtres)
// Utilise uniquement les variables CSS génériques des themes (--color-*).
// Aucune classe Tailwind système-spécifique (viking-*, dune-*, etc.).

import React, { useState, useEffect, useRef } from 'react';
import { useFetch }   from '../../hooks/useFetch.js';
import { useSession } from '../../context/SessionContext.jsx';
import ConfirmModal   from '../modals/ConfirmModal.jsx';
import { useSocket }  from '../../context/SocketContext.jsx';
import RichTextEditor, { stripHtml } from '../shared/RichTextEditor.jsx';
import useImageLightbox from "../../hooks/useImageLightbox.js";
import ImageLightbox from "../ui/ImageLightbox.jsx";

// ── Styles inline partagés ────────────────────────────────────────────────────
const S = {
    surface:     { background: 'var(--color-surface)',     color: 'var(--color-text)' },
    surfaceAlt:  { background: 'var(--color-surface-alt)', color: 'var(--color-text)' },
    border:      { borderColor: 'var(--color-border)' },
    text:        { color: 'var(--color-text)' },
    textMuted:   { color: 'var(--color-text-muted)' },
    primary:     { background: 'var(--color-primary)',     color: 'var(--color-bg)' },
    success:     { background: 'var(--color-success)',     color: '#fff' },
    danger:      { color: 'var(--color-danger)' },
    bg:          { background: 'var(--color-bg)' },
};

const JournalTab = ({ characterId }) => {
    const [entries,       setEntries]       = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [deleteTarget,  setDeleteTarget]  = useState(null);

    // Filtres
    const [searchQuery,   setSearchQuery]   = useState('');
    const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'session' | 'none'
    const [dateFrom,      setDateFrom]      = useState('');
    const [dateTo,        setDateTo]        = useState('');
    const [showFilters,   setShowFilters]   = useState(false);
    const [listCollapsed, setListCollapsed] = useState(false);

    const titleRef    = useRef(null);
    const pendingSave = useRef(null);

    const fetchWithAuth       = useFetch();
    const { activeGMSession } = useSession();
    const socket              = useSocket();

    const { lightboxSrc, openLightbox, closeLightbox, containerRef } = useImageLightbox();

    // ── Socket : messages GM entrants ────────────────────────────────────────
    useEffect(() => {
        if (!socket || !characterId) return;
        const handleGMMessage = (data) => {
            if (data.characterId === characterId) {
                setEntries(prev => [data.entry, ...prev]);
            }
        };
        socket.on('gm-message-received', handleGMMessage);
        return () => socket.off('gm-message-received', handleGMMessage);
    }, [socket, characterId]);

    // ── Chargement des entrées ────────────────────────────────────────────────
    useEffect(() => {
        if (!characterId) return;
        loadEntries();
    }, [characterId, sessionFilter, activeGMSession]);

    const loadEntries = async () => {
        try {
            setLoading(true);
            let url = `/api/journal/${characterId}`;
            if (sessionFilter === 'session' && activeGMSession) {
                url += `?sessionId=${activeGMSession}`;
            }
            const response = await fetchWithAuth(url);
            if (response.ok) setEntries(await response.json());
        } catch (error) {
            console.error('[JournalTab] Error loading entries:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Filtrage local ────────────────────────────────────────────────────────
    const filteredEntries = entries.filter(entry => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (
                !(entry.title || '').toLowerCase().includes(q) &&
                !(entry.body  || '').toLowerCase().includes(q)
            ) return false;
        }
        if (sessionFilter === 'none' && entry.sessionId) return false;
        if (dateFrom) {
            const d = new Date(entry.createdAt).toISOString().split('T')[0];
            if (d < dateFrom) return false;
        }
        if (dateTo) {
            const d = new Date(entry.createdAt).toISOString().split('T')[0];
            if (d > dateTo) return false;
        }
        return true;
    });

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const createNote = async () => {
        await flushPendingSave();
        try {
            const response = await fetchWithAuth(`/api/journal/${characterId}`, {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: activeGMSession || null,
                    type:  'note',
                    title: 'Nouvelle note',
                    body:  '',
                }),
            });
            if (response.ok) {
                const newEntry = await response.json();
                setEntries(prev => [newEntry, ...prev]);
                setSelectedEntry(newEntry);
                setTimeout(() => {
                    if (titleRef.current) {
                        titleRef.current.focus();
                        titleRef.current.select();
                    }
                }, 50);
            }
        } catch (error) {
            console.error('[JournalTab] Error creating note:', error);
        }
    };

    const saveEntry = async (entryId, updates) => {
        try {
            const response = await fetchWithAuth(`/api/journal/${characterId}/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
            if (response.ok) {
                const updated = await response.json();
                setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
                if (selectedEntry?.id === entryId) setSelectedEntry(updated);
            }
        } catch (error) {
            console.error('[JournalTab] Error saving entry:', error);
        }
    };

    const handleFieldChange = (field, value) => {
        if (!selectedEntry) return;
        const updated = { ...selectedEntry, [field]: value };
        setSelectedEntry(updated);
        setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
        pendingSave.current = {
            entryId: selectedEntry.id,
            ...(pendingSave.current || {}),
            [field]: value,
        };
    };

    const flushPendingSave = async () => {
        if (pendingSave.current) {
            const { entryId, ...updates } = pendingSave.current;
            pendingSave.current = null;
            await saveEntry(entryId, updates);
        }
    };

    const deleteEntry = async (entryId) => {
        try {
            const response = await fetchWithAuth(`/api/journal/${characterId}/${entryId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setEntries(prev => prev.filter(e => e.id !== entryId));
                if (selectedEntry?.id === entryId) setSelectedEntry(null);
            }
        } catch (error) {
            console.error('[JournalTab] Error deleting entry:', error);
        } finally {
            setDeleteTarget(null);
        }
    };

    const selectEntry = async (entry) => {
        await flushPendingSave();
        setSelectedEntry(entry);
    };

    // ── Filtres ───────────────────────────────────────────────────────────────
    const clearFilters = () => {
        setSearchQuery('');
        setSessionFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    const hasActiveFilters = searchQuery || sessionFilter !== 'all' || dateFrom || dateTo;

    // ── Formatters date ───────────────────────────────────────────────────────
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>

            {/* ── Barre d'outils ──────────────────────────────────────────── */}
            <div className="shrink-0 mb-3 space-y-2">
                <div className="flex gap-2 items-center">
                    {/* Recherche */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Rechercher dans le journal..."
                            className="w-full pl-8 pr-3 py-2 text-sm border-2 rounded-lg outline-none"
                            style={{
                                ...S.bg,
                                ...S.text,
                                borderColor: 'var(--color-border)',
                            }}
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
                              style={S.textMuted}>🔍</span>
                    </div>

                    {/* Toggle filtres */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold transition-opacity"
                        style={showFilters || hasActiveFilters ? S.primary : { ...S.bg, ...S.textMuted, border: '1px solid var(--color-border)' }}
                        title="Filtres avancés"
                    >
                        🔍 {hasActiveFilters ? '●' : ''}
                    </button>

                    {/* Créer */}
                    <button
                        onClick={createNote}
                        className="px-4 py-2 rounded-lg text-sm font-semibold shrink-0 transition-opacity hover:opacity-85"
                        style={S.success}
                    >
                        ✏️ Nouvelle note
                    </button>
                </div>

                {/* Filtres avancés */}
                {showFilters && (
                    <div
                        className="flex flex-wrap gap-3 items-center rounded-lg border p-3"
                        style={{ ...S.surface, borderColor: 'var(--color-border)' }}
                    >
                        {/* Filtre session */}
                        <div className="flex gap-1">
                            {[
                                { value: 'all',     label: 'Toutes' },
                                ...(activeGMSession ? [{ value: 'session', label: 'Session' }] : []),
                                { value: 'none',    label: 'Hors session' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSessionFilter(opt.value)}
                                    className="px-2.5 py-1 rounded text-xs font-semibold transition-opacity"
                                    style={sessionFilter === opt.value ? S.primary : { ...S.surfaceAlt, ...S.textMuted }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Filtre date */}
                        <div className="flex items-center gap-1.5 text-xs" style={S.textMuted}>
                            <span>Du</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ ...S.bg, ...S.text, borderColor: 'var(--color-border)' }}
                            />
                            <span>au</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ ...S.bg, ...S.text, borderColor: 'var(--color-border)' }}
                            />
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-2.5 py-1 text-xs font-semibold rounded transition-opacity hover:opacity-75"
                                style={S.danger}
                            >
                                ✕ Réinitialiser
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Loading ──────────────────────────────────────────────────── */}
            {loading && entries.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-2xl animate-pulse mb-2">⏳</div>
                        <p style={S.textMuted}>Chargement du journal...</p>
                    </div>
                </div>
            )}

            {/* ── Journal vide ──────────────────────────────────────────────── */}
            {!loading && entries.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl mb-4">📓</div>
                        <h3 className="text-xl font-bold mb-2" style={S.text}>Journal vide</h3>
                        <p className="mb-4" style={S.textMuted}>
                            Créez votre première note pour garder une trace de vos aventures.
                        </p>
                        <button
                            onClick={createNote}
                            className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-85"
                            style={S.primary}
                        >
                            ✏️ Créer une note
                        </button>
                    </div>
                </div>
            )}

            {/* ── Layout split ─────────────────────────────────────────────── */}
            {entries.length > 0 && (
                <div className="flex-1 flex gap-3 min-h-0">

                    {/* ── PANNEAU GAUCHE : Liste ──────────────────────────── */}
                    <div
                        className={`shrink-0 flex flex-col rounded-lg border-2 overflow-hidden transition-all ${
                            listCollapsed ? 'w-10' : 'w-72'
                        }`}
                        style={{ ...S.surface, borderColor: 'var(--color-primary)' }}
                    >
                        {/* Bouton collapse */}
                        <button
                            onClick={() => setListCollapsed(!listCollapsed)}
                            className="shrink-0 px-2 py-2 border-b text-sm transition-opacity hover:opacity-75 flex items-center gap-2"
                            style={{ ...S.surfaceAlt, ...S.textMuted, borderColor: 'var(--color-border)' }}
                            title={listCollapsed ? 'Afficher la liste' : 'Masquer la liste'}
                        >
                            {listCollapsed ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span className="text-xs font-semibold">
                                        {filteredEntries.length} note{filteredEntries.length > 1 ? 's' : ''}
                                        {hasActiveFilters && ` (filtrée${filteredEntries.length > 1 ? 's' : ''})`}
                                    </span>
                                </>
                            )}
                        </button>

                        {!listCollapsed && (
                            <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--color-border)' }}>
                                {filteredEntries.length === 0 ? (
                                    <div className="p-4 text-center text-xs" style={S.textMuted}>
                                        Aucune note ne correspond aux filtres.
                                    </div>
                                ) : (
                                    filteredEntries.map(entry => {
                                        const isSelected = selectedEntry?.id === entry.id;
                                        return (
                                            <button
                                                key={entry.id}
                                                onClick={() => selectEntry(entry)}
                                                className="w-full text-left px-3 py-2.5 transition-opacity border-l-4"
                                                style={{
                                                    background: isSelected
                                                        ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                                                        : 'transparent',
                                                    borderLeftColor: isSelected
                                                        ? 'var(--color-primary)'
                                                        : 'transparent',
                                                }}
                                            >
                                                <div className="font-semibold text-sm truncate" style={S.text}>
                                                    {entry.type === 'gm_message' ? '📨 ' : ''}
                                                    {entry.title || 'Sans titre'}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px]" style={S.textMuted}>
                                                        {formatDateShort(entry.updatedAt)}
                                                    </span>
                                                    {entry.sessionName && (
                                                        <span
                                                            className="text-[10px] px-1 rounded truncate max-w-[100px]"
                                                            style={{
                                                                background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                                                                color: 'var(--color-primary)',
                                                            }}
                                                        >
                                                            {entry.sessionName}
                                                        </span>
                                                    )}
                                                </div>
                                                {entry.body && (
                                                    <div className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                                                        {stripHtml(entry.body).substring(0, 60)}{entry.body.length > 60 ? '...' : ''}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── PANNEAU DROIT : Détail / Édition ───────────────── */}
                    <div className="flex-1 min-w-0">
                        {selectedEntry ? (
                            <div
                                className="h-full flex flex-col rounded-lg border-2"
                                style={{ ...S.surface, borderColor: 'var(--color-primary)' }}
                            >
                                {/* Header */}
                                <div
                                    className="shrink-0 p-4 border-b"
                                    style={{ borderColor: 'var(--color-border)' }}
                                >
                                    {selectedEntry.type === 'note' ? (
                                        <input
                                            ref={titleRef}
                                            type="text"
                                            value={selectedEntry.title || ''}
                                            onChange={e => handleFieldChange('title', e.target.value)}
                                            placeholder="Titre de la note..."
                                            className="w-full text-xl font-bold px-0 py-1 bg-transparent border-0 border-b-2 border-transparent outline-none transition-colors"
                                            style={{
                                                color: 'var(--color-text)',
                                                borderBottomColor: 'transparent',
                                            }}
                                            onFocus={e => { e.target.style.borderBottomColor = 'var(--color-primary)'; }}
                                            onBlur={e => { e.target.style.borderBottomColor = 'transparent'; flushPendingSave(); }}
                                        />
                                    ) : (
                                        <div className="text-xl font-bold py-1 flex items-center gap-2" style={S.text}>
                                            📨 {selectedEntry.title || 'Message du MJ'}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs" style={S.textMuted}>
                                        <span>
                                            {selectedEntry.sessionName
                                                ? `📜 ${selectedEntry.sessionName}`
                                                : '📓 Hors session'}
                                        </span>
                                        {selectedEntry.type === 'gm_message' && (
                                            <span
                                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                                style={{
                                                    background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                                                    color: 'var(--color-primary)',
                                                }}
                                            >
                                                Message du MJ
                                            </span>
                                        )}
                                        <span>•</span>
                                        <span>Créée le {formatDate(selectedEntry.createdAt)}</span>
                                        {selectedEntry.updatedAt !== selectedEntry.createdAt && (
                                            <>
                                                <span>•</span>
                                                <span>Modifiée le {formatDate(selectedEntry.updatedAt)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Corps — flex-1 min-h-0 pour que le scroll fonctionne */}
                                <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex flex-col p-4">
                                    {selectedEntry.type === 'note' ? (
                                        /* ── Note éditable ── */
                                        <RichTextEditor
                                            content={selectedEntry.body || ''}
                                            onUpdate={html => handleFieldChange('body', html)}
                                            onBlur={flushPendingSave}
                                            editable={true}
                                            onImageDoubleClick={openLightbox}
                                            placeholder="Écrivez vos notes ici..."
                                            className="w-full h-full border-2 rounded-lg transition-colors"
                                            style={{
                                                borderColor: 'var(--color-border)',
                                                background: 'var(--color-bg)',
                                            }}
                                        />
                                    ) : (
                                        /* ── Message GM (lecture + image éventuelle) ── */
                                        <div ref={containerRef} className="flex flex-col flex-1 min-h-0 gap-3">
                                            <RichTextEditor
                                                content={selectedEntry.body || ''}
                                                editable={false}
                                                onImageDoubleClick={openLightbox}
                                                className="flex-1 min-h-0 border-2 rounded-lg"
                                                style={{
                                                    borderColor: 'var(--color-border)',
                                                    background: 'var(--color-bg)',
                                                    opacity: 0.9,
                                                }}
                                            />
                                            {selectedEntry.metadata?.imageUrl && (
                                                <div
                                                    className="shrink-0 overflow-y-auto rounded-lg border-2 p-2"
                                                    style={{
                                                        maxHeight: '220px',
                                                        borderColor: 'var(--color-border)',
                                                        background: 'var(--color-bg)',
                                                    }}
                                                >
                                                    <img
                                                        src={selectedEntry.metadata.imageUrl}
                                                        alt=""
                                                        className="max-w-full rounded-lg border-2"
                                                        style={{
                                                            borderColor: 'var(--color-primary)',
                                                            cursor: 'zoom-in',
                                                        }}
                                                        onDoubleClick={() => openLightbox(selectedEntry.metadata.imageUrl)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div
                                    className="shrink-0 px-4 py-3 border-t flex justify-end"
                                    style={{ borderColor: 'var(--color-border)' }}
                                >
                                    <button
                                        onClick={() => setDeleteTarget(selectedEntry)}
                                        className="px-4 py-1.5 text-sm rounded font-semibold transition-opacity hover:opacity-75"
                                        style={S.danger}
                                    >
                                        🗑️ Supprimer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="h-full flex items-center justify-center rounded-lg border-2"
                                style={{ ...S.surface, borderColor: 'var(--color-primary)' }}
                            >
                                <div className="text-center">
                                    <div className="text-3xl mb-2 opacity-30">📝</div>
                                    <p className="text-sm" style={S.textMuted}>
                                        Sélectionnez une note ou créez-en une nouvelle
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Confirmation suppression ──────────────────────────────────── */}
            {deleteTarget && (
                <ConfirmModal
                    title="🗑️ Supprimer la note"
                    message={`Voulez-vous vraiment supprimer « ${deleteTarget.title || 'Sans titre'} » ? Cette action est irréversible.`}
                    onConfirm={() => deleteEntry(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                    confirmText="Supprimer"
                    cancelText="Annuler"
                    danger={true}
                />
            )}
            {lightboxSrc && (
                <ImageLightbox src={lightboxSrc} onClose={closeLightbox} />
            )}
        </div>
    );
};

export default JournalTab;