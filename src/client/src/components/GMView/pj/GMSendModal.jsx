// components/GMView/scene/GMSendModal.jsx - Modale envoi message GM (V2 : nouveau + depuis notes)
import React, { useState, useEffect, useRef } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';

const TOAST_ANIMATIONS = [
    { id: 'default', label: 'Classique', icon: '📬' },
    { id: 'shake', label: 'Tremblement', icon: '💥' },
    { id: 'flash', label: 'Flash', icon: '⚡' },
    { id: 'glitter', label: 'Doré', icon: '✨' },
];

const GMSendModal = ({ onClose, onSend, sessionCharacters = [], preSelectedCharId = null }) => {
    // Mode : 'new' ou 'from_notes'
    const [mode, setMode] = useState('new');

    // Destinataires
    const [selectedTargets, setSelectedTargets] = useState(() => {
        if (preSelectedCharId) return new Set([preSelectedCharId]);
        return new Set(sessionCharacters.map(c => c.id));
    });

    // Contenu message
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageData, setImageData] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [toastAnimation, setToastAnimation] = useState('default');
    const [sending, setSending] = useState(false);

    // Notes GM (mode from_notes)
    const [gmNotes, setGmNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [noteSearch, setNoteSearch] = useState('');
    const [selectedNoteId, setSelectedNoteId] = useState(null);

    const fileInputRef = useRef(null);
    const fetchWithAuth = useFetch();

    // --- Charger les notes du GM quand on passe en mode from_notes ---
    useEffect(() => {
        if (mode === 'from_notes' && gmNotes.length === 0) {
            loadGMNotes();
        }
    }, [mode]);

    const loadGMNotes = async () => {
        setNotesLoading(true);
        try {
            const response = await fetchWithAuth('/api/journal/-1?type=note');
            if (response.ok) {
                const data = await response.json();
                setGmNotes(data);
            }
        } catch (error) {
            console.error('[GMSendModal] Error loading GM notes:', error);
        } finally {
            setNotesLoading(false);
        }
    };

    // Filtrer les notes par recherche
    const filteredNotes = gmNotes.filter(note => {
        if (!noteSearch.trim()) return true;
        const q = noteSearch.toLowerCase();
        return (note.title || '').toLowerCase().includes(q) ||
            (note.body || '').toLowerCase().includes(q);
    });

    // Sélectionner une note → pré-remplir les champs
    const selectNote = (note) => {
        setSelectedNoteId(note.id);
        setTitle(note.title || '');
        setBody(note.body || '');
        // Si la note a une image dans metadata
        if (note.metadata?.imageUrl) {
            setImageData(note.metadata.imageUrl);
            setImagePreview(note.metadata.imageUrl);
        }
    };

    // --- Toggle destinataire ---
    const toggleTarget = (charId) => {
        setSelectedTargets(prev => {
            const next = new Set(prev);
            if (next.has(charId)) next.delete(charId);
            else next.add(charId);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedTargets.size === sessionCharacters.length) {
            setSelectedTargets(new Set());
        } else {
            setSelectedTargets(new Set(sessionCharacters.map(c => c.id)));
        }
    };

    const allSelected = selectedTargets.size === sessionCharacters.length;

    // --- Image upload ---
    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert('Image trop volumineuse (max 2 Mo)');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setImageData(ev.target.result);
            setImagePreview(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImageData(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Envoi ---
    const handleSend = async () => {
        if (selectedTargets.size === 0) return;
        if (!title.trim() && !body.trim()) return;

        setSending(true);
        try {
            await onSend({
                targetCharacterIds: Array.from(selectedTargets),
                title: title.trim() || null,
                body: body.trim() || null,
                imageData: imageData || null,
                toastAnimation
            });
            onClose();
        } catch (error) {
            console.error('[GMSendModal] Error sending:', error);
            setSending(false);
        }
    };

    // --- Changer de mode ---
    const switchMode = (newMode) => {
        setMode(newMode);
        if (newMode === 'new') {
            setSelectedNoteId(null);
            // Ne pas effacer les champs si le GM a déjà écrit quelque chose
        }
    };

    const canSend = selectedTargets.size > 0 && (title.trim() || body.trim());

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-lg w-full border-4 border-viking-bronze max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b-2 border-viking-bronze/50">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        📨 Envoyer un message
                    </h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* --- Toggle mode --- */}
                    <div className="flex gap-1 bg-viking-parchment dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => switchMode('new')}
                            className={`flex-1 px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                                mode === 'new'
                                    ? 'bg-viking-bronze text-viking-brown shadow'
                                    : 'text-viking-leather dark:text-viking-bronze'
                            }`}
                        >
                            ✏️ Nouveau
                        </button>
                        <button
                            onClick={() => switchMode('from_notes')}
                            className={`flex-1 px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                                mode === 'from_notes'
                                    ? 'bg-viking-bronze text-viking-brown shadow'
                                    : 'text-viking-leather dark:text-viking-bronze'
                            }`}
                        >
                            📓 Depuis mes notes
                        </button>
                    </div>

                    {/* --- Sélection de note (mode from_notes) --- */}
                    {mode === 'from_notes' && (
                        <div className="space-y-2">
                            {/* Recherche */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={noteSearch}
                                    onChange={(e) => setNoteSearch(e.target.value)}
                                    placeholder="Rechercher dans mes notes..."
                                    className="w-full pl-8 pr-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none"
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-viking-leather dark:text-viking-bronze">
                                    🔍
                                </span>
                            </div>

                            {/* Liste de notes */}
                            <div className="max-h-40 overflow-y-auto border-2 border-viking-leather/20 dark:border-viking-bronze/20 rounded-lg divide-y divide-viking-leather/10 dark:divide-viking-bronze/20">
                                {notesLoading ? (
                                    <div className="p-3 text-center text-sm text-viking-leather dark:text-viking-bronze">
                                        Chargement...
                                    </div>
                                ) : filteredNotes.length === 0 ? (
                                    <div className="p-3 text-center text-sm text-viking-leather dark:text-viking-bronze">
                                        {noteSearch ? 'Aucune note trouvée' : 'Aucune note disponible'}
                                    </div>
                                ) : (
                                    filteredNotes.map(note => (
                                        <button
                                            key={note.id}
                                            onClick={() => selectNote(note)}
                                            className={`w-full text-left px-3 py-2 transition-colors ${
                                                selectedNoteId === note.id
                                                    ? 'bg-viking-bronze/20 dark:bg-viking-bronze/10'
                                                    : 'hover:bg-viking-parchment dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <div className="font-semibold text-sm text-viking-brown dark:text-viking-parchment truncate">
                                                {note.title || 'Sans titre'}
                                            </div>
                                            {note.body && (
                                                <div className="text-xs text-viking-text/60 dark:text-viking-parchment/50 truncate mt-0.5">
                                                    {note.body.substring(0, 60)}
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- Destinataires --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2 block">
                            Destinataires
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={toggleAll}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-2 ${
                                    allSelected
                                        ? 'bg-viking-bronze border-viking-leather text-viking-brown'
                                        : 'border-viking-leather/30 dark:border-viking-bronze/30 text-viking-leather dark:text-viking-bronze'
                                }`}
                            >
                                {allSelected ? '☑' : '☐'} Tous
                            </button>

                            {sessionCharacters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => toggleTarget(char.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-2 ${
                                        selectedTargets.has(char.id)
                                            ? 'bg-viking-bronze/30 border-viking-bronze text-viking-brown dark:text-viking-parchment'
                                            : 'border-viking-leather/30 dark:border-viking-bronze/30 text-viking-leather dark:text-viking-bronze'
                                    }`}
                                >
                                    {char.avatar ? (
                                        <img src={char.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                        <span className="w-5 h-5 rounded-full bg-viking-leather/20 flex items-center justify-center text-[10px]">
                                            {char.name?.[0]?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                    {selectedTargets.has(char.id) ? '☑' : '☐'} {char.name}
                                </button>
                            ))}
                        </div>
                        {selectedTargets.size === 0 && (
                            <p className="text-xs text-red-500 mt-1">Sélectionnez au moins un destinataire</p>
                        )}
                    </div>

                    {/* --- Titre --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1 block">
                            Titre
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Titre du message (optionnel)..."
                            className="w-full px-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none"
                        />
                    </div>

                    {/* --- Corps --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1 block">
                            Message
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Contenu du message..."
                            rows={4}
                            className="w-full px-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none resize-y"
                        />
                    </div>

                    {/* --- Image optionnelle --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1 block">
                            Image (optionnel)
                        </label>
                        {imagePreview ? (
                            <div className="relative inline-block">
                                <img src={imagePreview} alt="Aperçu" className="max-h-32 rounded-lg border-2 border-viking-bronze" />
                                <button
                                    onClick={removeImage}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 text-sm border-2 border-dashed border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg text-viking-leather dark:text-viking-bronze hover:border-viking-bronze transition-colors"
                            >
                                📎 Ajouter une image
                            </button>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </div>

                    {/* --- Animation toast --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2 block">
                            Animation de notification
                        </label>
                        <div className="flex gap-2">
                            {TOAST_ANIMATIONS.map(anim => (
                                <button
                                    key={anim.id}
                                    onClick={() => setToastAnimation(anim.id)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-2 ${
                                        toastAnimation === anim.id
                                            ? 'bg-viking-bronze border-viking-leather text-viking-brown'
                                            : 'border-viking-leather/30 dark:border-viking-bronze/30 text-viking-leather dark:text-viking-bronze'
                                    }`}
                                >
                                    {anim.icon} {anim.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t-2 border-viking-bronze/50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!canSend || sending}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                            canSend && !sending
                                ? 'bg-viking-success text-white hover:bg-green-700'
                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                    >
                        {sending ? '⏳ Envoi...' : `📨 Envoyer (${selectedTargets.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GMSendModal;