// components/JournalTab.jsx - Onglet Journal V2 (split layout, recherche, filtres)
import React, { useState, useEffect, useRef } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { useSession } from '../context/SessionContext.jsx';
import ConfirmModal from './shared/ConfirmModal.jsx';
import {useSocket} from "../context/SocketContext.jsx";

const JournalTab = ({ characterId }) => {
    const [entries, setEntries] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Filtres
    const [searchQuery, setSearchQuery] = useState('');
    const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'session' | 'none'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [listCollapsed, setListCollapsed] = useState(false);

    // Refs pour sauvegarde auto
    const titleRef = useRef(null);
    const bodyRef = useRef(null);
    const pendingSave = useRef(null);

    const fetchWithAuth = useFetch();
    const { activeGMSession } = useSession();
    const socket = useSocket();

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

    // --- Charger les entrées ---
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
            if (response.ok) {
                const data = await response.json();
                setEntries(data);
            }
        } catch (error) {
            console.error('[JournalTab] Error loading entries:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Filtrage local (recherche + date) ---
    const filteredEntries = entries.filter(entry => {
        // Filtre texte
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchTitle = (entry.title || '').toLowerCase().includes(q);
            const matchBody = (entry.body || '').toLowerCase().includes(q);
            if (!matchTitle && !matchBody) return false;
        }

        // Filtre "hors session"
        if (sessionFilter === 'none' && entry.sessionId) return false;

        // Filtre date
        if (dateFrom) {
            const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
            if (entryDate < dateFrom) return false;
        }
        if (dateTo) {
            const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
            if (entryDate > dateTo) return false;
        }

        return true;
    });

    // --- Créer une nouvelle note ---
    const createNote = async () => {
        await flushPendingSave();

        try {
            const response = await fetchWithAuth(`/api/journal/${characterId}`, {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: activeGMSession || null,
                    type: 'note',
                    title: 'Nouvelle note',
                    body: ''
                })
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

    // --- Sauvegarde auto ---
    const saveEntry = async (entryId, updates) => {
        try {
            const response = await fetchWithAuth(`/api/journal/${characterId}/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                const updated = await response.json();
                setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
                if (selectedEntry?.id === entryId) {
                    setSelectedEntry(updated);
                }
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
            [field]: value
        };
    };

    const flushPendingSave = async () => {
        if (pendingSave.current) {
            const { entryId, ...updates } = pendingSave.current;
            pendingSave.current = null;
            await saveEntry(entryId, updates);
        }
    };

    const handleBlur = () => {
        flushPendingSave();
    };

    // --- Supprimer ---
    const deleteEntry = async (entryId) => {
        try {
            const response = await fetchWithAuth(`/api/journal/${characterId}/${entryId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setEntries(prev => prev.filter(e => e.id !== entryId));
                if (selectedEntry?.id === entryId) {
                    setSelectedEntry(null);
                }
            }
        } catch (error) {
            console.error('[JournalTab] Error deleting entry:', error);
        } finally {
            setDeleteTarget(null);
        }
    };

    // --- Sélectionner ---
    const selectEntry = async (entry) => {
        await flushPendingSave();
        setSelectedEntry(entry);
    };

    // --- Réinitialiser filtres ---
    const clearFilters = () => {
        setSearchQuery('');
        setSessionFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    const hasActiveFilters = searchQuery || sessionFilter !== 'all' || dateFrom || dateTo;

    // --- Formatter date ---
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    // --- Render ---
    return (
        <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
            {/* Barre d'outils : recherche + filtres + créer */}
            <div className="shrink-0 mb-3 space-y-2">
                <div className="flex gap-2 items-center">
                    {/* Recherche */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher dans le journal..."
                            className="w-full pl-8 pr-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-white dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-viking-leather dark:text-viking-bronze text-sm">
                            🔍
                        </span>
                    </div>

                    {/* Toggle filtres avancés */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            showFilters || hasActiveFilters
                                ? 'bg-viking-bronze text-viking-brown'
                                : 'bg-white dark:bg-gray-800 text-viking-leather dark:text-viking-bronze border border-viking-leather/30 dark:border-viking-bronze/30'
                        }`}
                        title="Filtres avancés"
                    >
                        🔍 {hasActiveFilters ? '●' : ''}
                    </button>

                    {/* Bouton créer */}
                    <button
                        onClick={createNote}
                        className="px-4 py-2 bg-viking-success text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shrink-0"
                    >
                        ✏️ Nouvelle note
                    </button>
                </div>

                {/* Filtres avancés (collapsable) */}
                {showFilters && (
                    <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-viking-brown rounded-lg border border-viking-leather/20 dark:border-viking-bronze/20 p-3">
                        {/* Filtre session */}
                        <div className="flex gap-1">
                            {[
                                { value: 'all', label: 'Toutes' },
                                ...(activeGMSession ? [{ value: 'session', label: 'Session' }] : []),
                                { value: 'none', label: 'Hors session' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSessionFilter(opt.value)}
                                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                                        sessionFilter === opt.value
                                            ? 'bg-viking-bronze text-viking-brown'
                                            : 'bg-viking-parchment dark:bg-gray-800 text-viking-leather dark:text-viking-bronze'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Filtre date */}
                        <div className="flex items-center gap-1.5 text-xs text-viking-leather dark:text-viking-bronze">
                            <span>Du</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2 py-1 rounded border border-viking-leather/30 dark:border-viking-bronze/30 bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment text-xs"
                            />
                            <span>au</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2 py-1 rounded border border-viking-leather/30 dark:border-viking-bronze/30 bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment text-xs"
                            />
                        </div>

                        {/* Reset filtres */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded font-semibold"
                            >
                                ✕ Réinitialiser
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Loading */}
            {loading && entries.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-2xl animate-pulse mb-2">⏳</div>
                        <p className="text-viking-leather dark:text-viking-bronze">Chargement du journal...</p>
                    </div>
                </div>
            )}

            {/* Journal vide */}
            {!loading && entries.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl mb-4">📓</div>
                        <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-2">
                            Journal vide
                        </h3>
                        <p className="text-viking-leather dark:text-viking-bronze mb-4">
                            Créez votre première note pour garder une trace de vos aventures.
                        </p>
                        <button
                            onClick={createNote}
                            className="px-6 py-2 bg-viking-bronze text-viking-brown rounded-lg font-semibold hover:bg-viking-leather transition-colors"
                        >
                            ✏️ Créer une note
                        </button>
                    </div>
                </div>
            )}

            {/* Layout split : liste à gauche, détail à droite */}
            {entries.length > 0 && (
                <div className="flex-1 flex gap-3 min-h-0">
                    {/* --- PANNEAU GAUCHE : Liste des notes --- */}
                    <div className={`shrink-0 flex flex-col bg-white dark:bg-viking-brown rounded-lg border-2 border-viking-bronze overflow-hidden transition-all ${
                        listCollapsed ? 'w-10' : 'w-72'
                    }`}>
                        {/* Bouton collapse */}
                        <button
                            onClick={() => setListCollapsed(!listCollapsed)}
                            className="shrink-0 px-2 py-2 border-b border-viking-leather/10 dark:border-viking-bronze/20 bg-viking-parchment/50 dark:bg-gray-800/50 hover:bg-viking-bronze/20 transition-colors text-sm text-viking-leather dark:text-viking-bronze"
                            title={listCollapsed ? 'Afficher la liste' : 'Masquer la liste'}
                        >
                            {listCollapsed ? <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg> : <div className="flex items-center gap-2"><svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg> <span className="text-xs font-semibold text-viking-leather dark:text-viking-bronze">
                            {filteredEntries.length} note{filteredEntries.length > 1 ? 's' : ''}
                            {hasActiveFilters && ` (filtrée${filteredEntries.length > 1 ? 's' : ''})`}
                        </span></div>}
                        </button>

                        {!listCollapsed && (
                            <>
                                {/* Liste scrollable */}
                                <div className="flex-1 overflow-y-auto divide-y divide-viking-leather/10 dark:divide-viking-bronze/20">
                                    {filteredEntries.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-viking-leather dark:text-viking-bronze">
                                            Aucune note ne correspond aux filtres.
                                        </div>
                                    ) : (
                                        filteredEntries.map(entry => (
                                            <button
                                                key={entry.id}
                                                onClick={() => selectEntry(entry)}
                                                className={`w-full text-left px-3 py-2.5 transition-colors ${
                                                    selectedEntry?.id === entry.id
                                                        ? 'bg-viking-bronze/20 dark:bg-viking-bronze/10 border-l-4 border-viking-bronze'
                                                        : 'hover:bg-viking-parchment dark:hover:bg-gray-800 border-l-4 border-transparent'
                                                }`}
                                            >
                                                <div className="font-semibold text-sm text-viking-brown dark:text-viking-parchment truncate">
                                                    {entry.type === 'gm_message' ? '📨 ' : ''}{entry.title || 'Sans titre'}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-viking-leather dark:text-viking-bronze">
                                                {formatDateShort(entry.updatedAt)}
                                            </span>
                                                    {entry.sessionName && (
                                                        <span className="text-[10px] px-1 rounded bg-viking-bronze/20 text-viking-brown dark:text-viking-bronze truncate max-w-[100px]">
                                                    {entry.sessionName}
                                                </span>
                                                    )}
                                                </div>
                                                {entry.body && (
                                                    <div className="text-[11px] text-viking-text/60 dark:text-viking-parchment/50 mt-1 line-clamp-2">
                                                        {entry.body.substring(0, 60)}{entry.body.length > 60 ? '...' : ''}
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* --- PANNEAU DROIT : Détail / Édition --- */}
                    <div className="flex-1 min-w-0">
                        {selectedEntry ? (
                            <div className="h-full flex flex-col bg-white dark:bg-viking-brown rounded-lg border-2 border-viking-bronze">
                                {/* Header note */}
                                <div className="shrink-0 p-4 border-b border-viking-leather/10 dark:border-viking-bronze/20">
                                    {selectedEntry.type === 'note' ? (
                                        <input
                                            ref={titleRef}
                                            type="text"
                                            value={selectedEntry.title || ''}
                                            onChange={(e) => handleFieldChange('title', e.target.value)}
                                            onBlur={handleBlur}
                                            placeholder="Titre de la note..."
                                            className="w-full text-xl font-bold px-0 py-1 border-0 border-b-2 border-transparent bg-transparent text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none transition-colors"
                                        />
                                    ) : (
                                        <div className="text-xl font-bold py-1 text-viking-brown dark:text-viking-parchment flex items-center gap-2">
                                            📨 {selectedEntry.title || 'Message du MJ'}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-viking-leather dark:text-viking-bronze">
                                        <span>
                                            {selectedEntry.sessionName
                                                ? `📜 ${selectedEntry.sessionName}`
                                                : '📓 Hors session'
                                            }
                                        </span>
                                        {selectedEntry.type === 'gm_message' && (
                                            <span className="px-1.5 py-0.5 bg-viking-bronze/20 text-viking-bronze rounded text-[10px] font-semibold">
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

                                {/* Corps éditable */}
                                <div className="flex-1 p-4 min-h-0">
                                     {selectedEntry.type === 'note' ? (
                                        <textarea
                                            ref={bodyRef}
                                            value={selectedEntry.body || ''}
                                            onChange={(e) => handleFieldChange('body', e.target.value)}
                                            onBlur={handleBlur}
                                            placeholder="Écrivez vos notes ici..."
                                            className="w-full h-full px-3 py-2 border-2 border-viking-leather/20 dark:border-viking-bronze/20 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment focus:border-viking-bronze focus:outline-none transition-colors resize-none"
                                        />
                                    ) : (
                                        <div className="w-full h-full px-3 py-2 border-2 border-viking-leather/10 dark:border-viking-bronze/10 rounded-lg bg-viking-parchment/50 dark:bg-gray-800/50 text-viking-text dark:text-viking-parchment overflow-y-auto whitespace-pre-wrap">
                                            {selectedEntry.body || ''}
                                            {selectedEntry.metadata?.imageUrl && (
                                                <img src={selectedEntry.metadata.imageUrl} alt="" className="mt-3 max-w-full rounded-lg border-2 border-viking-bronze" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer actions */}
                                <div className="shrink-0 px-4 py-3 border-t border-viking-leather/10 dark:border-viking-bronze/20 flex justify-end">
                                    <button
                                        onClick={() => setDeleteTarget(selectedEntry)}
                                        className="px-4 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded font-semibold transition-colors"
                                    >
                                        🗑️ Supprimer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-white dark:bg-viking-brown rounded-lg border-2 border-viking-bronze">
                                <div className="text-center">
                                    <div className="text-3xl mb-2 opacity-30">📝</div>
                                    <p className="text-sm text-viking-leather dark:text-viking-bronze">
                                        Sélectionnez une note ou créez-en une nouvelle
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal confirmation suppression */}
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
        </div>
    );
};

export default JournalTab;