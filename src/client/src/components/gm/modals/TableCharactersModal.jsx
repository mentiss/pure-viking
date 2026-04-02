// src/client/src/components/gm/modals/TableCharactersModal.jsx
// Gérer les personnages d'une table/session.
//
// Corrections appliquées :
//   - alertMessage déplacé dans chaque sous-composant (scope propre)
//   - char.name normalisé : utilise nom || name || playerName (multi-slug)
//   - chars défensif : Array.isArray() avant .filter()

import React, { useState, useEffect } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import AlertModal from '../../modals/AlertModal.jsx';

// ─── Composant principal ──────────────────────────────────────────────────────

const TableCharactersModal = ({ isOpen, onClose, session, onSessionUpdated }) => {
    const [sessionData,    setSessionData]    = useState(null);
    const [allCharacters,  setAllCharacters]  = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [showAddModal,   setShowAddModal]   = useState(false);
    const [alertMessage,   setAlertMessage]   = useState(null);

    const fetchWithAuth = useFetch();

    useEffect(() => {
        if (isOpen && session) loadData();
    }, [isOpen, session]);

    const loadData = async () => {
        setLoading(true);
        try {
            const sessionResponse = await fetchWithAuth(`/api/sessions/${session.id}`);
            const sessionFull = await sessionResponse.json();
            setSessionData(sessionFull);

            const charsResponse = await fetchWithAuth('/api/characters');
            const chars = await charsResponse.json();

            if (!Array.isArray(chars)) {
                console.error('[TableCharactersModal] /api/characters n\'a pas retourné un tableau :', chars);
                setAllCharacters([]);
                return;
            }

            setAllCharacters(chars.filter(c => c.id !== -1));
        } catch (error) {
            console.error('[TableCharactersModal] Error loading data:', error);
            setAlertMessage('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCharacter = async (characterId) => {
        try {
            const response = await fetchWithAuth(
                `/api/sessions/${session.id}/characters/${characterId}`,
                { method: 'POST' }
            );
            if (response.ok) {
                const updated = await response.json();
                setSessionData(updated);
                setShowAddModal(false);
                onSessionUpdated?.(updated);
            } else {
                const err = await response.json().catch(() => ({}));
                setAlertMessage(err.error || 'Erreur lors de l\'ajout du personnage');
            }
        } catch (error) {
            console.error('[TableCharactersModal] Error adding character:', error);
            setAlertMessage('Erreur lors de l\'ajout du personnage');
        }
    };

    const handleRemoveCharacter = async (characterId) => {
        if (!confirm('Retirer ce personnage de la table ?')) return;
        try {
            const response = await fetchWithAuth(
                `/api/sessions/${session.id}/characters/${characterId}`,
                { method: 'DELETE' }
            );
            if (response.ok) {
                const updated = await response.json();
                setSessionData(updated);
                onSessionUpdated?.(updated);
            }
        } catch (error) {
            console.error('[TableCharactersModal] Error removing character:', error);
            setAlertMessage('Erreur lors du retrait du personnage');
        }
    };

    if (!isOpen) return null;

    const assignedIds    = sessionData?.characters?.map(c => c.id) || [];
    const availableChars = allCharacters.filter(c => !assignedIds.includes(c.id));

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                <div className="bg-surface rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border-4 border-default">

                    {/* En-tête */}
                    <div className="p-4 border-b-2 border-default flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-default">
                                    👥 Personnages de la table
                                </h2>
                                <p className="text-sm text-muted">
                                    {session.name}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-2xl text-muted hover:text-danger"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Contenu */}
                    <div className="p-4 overflow-y-auto flex-1">
                        {loading ? (
                            <div className="text-center py-8 text-muted">
                                Chargement...
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="w-full mb-4 px-4 py-3 bg-primary text-bg rounded-lg font-semibold hover:opacity-90"
                                >
                                    ➕ Ajouter un personnage
                                </button>

                                {!sessionData?.characters?.length ? (
                                    <div className="text-center py-8 text-muted">
                                        Aucun personnage dans cette table
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {sessionData.characters.map(char => (
                                            <CharacterRow
                                                key={char.id}
                                                char={char}
                                                onRemove={() => handleRemoveCharacter(char.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Pied */}
                    <div className="p-4 border-t-2 border-default bg-surface-alt flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-primary text-bg rounded-lg font-semibold hover:opacity-90"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddCharacterModal
                    onClose={() => setShowAddModal(false)}
                    availableCharacters={availableChars}
                    onAddCharacter={handleAddCharacter}
                />
            )}

            {alertMessage && (
                <AlertModal
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </>
    );
};

// ─── Ligne d'un personnage assigné ───────────────────────────────────────────

function getDisplayName(char) {
    return char.nom || char.name || char.playerName || '—';
}

const CharacterRow = ({ char, onRemove }) => (
    <div className="flex items-center gap-3 p-3 bg-surface-alt rounded-lg border-2 border-default">
        {char.avatar ? (
            <img
                src={char.avatar}
                alt={getDisplayName(char)}
                className="w-12 h-12 rounded-full border-2 border-default flex-shrink-0 object-cover"
            />
        ) : (
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-default bg-surface flex items-center justify-center flex-shrink-0">
                <span className="text-xl">👤</span>
            </div>
        )}

        <div className="flex-1 min-w-0">
            <div className="font-bold text-default truncate">
                {getDisplayName(char)}
            </div>
            <div className="text-sm text-muted">
                Joueur : {char.playerName}
            </div>
        </div>

        <button
            onClick={onRemove}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex-shrink-0 text-sm"
        >
            🗑️ Retirer
        </button>
    </div>
);

// ─── Modale d'ajout ───────────────────────────────────────────────────────────

const AddCharacterModal = ({ onClose, availableCharacters, onAddCharacter }) => {
    const [filter,       setFilter]       = useState('');
    const [alertMessage, setAlertMessage] = useState(null);

    const filtered = availableCharacters.filter(c => {
        const displayName = getDisplayName(c);
        const search = `${displayName} ${c.playerName ?? ''}`.toLowerCase();
        return search.includes(filter.toLowerCase());
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border-4 border-default">

                {/* En-tête */}
                <div className="p-4 border-b-2 border-default flex-shrink-0 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-default">
                        Ajouter un personnage
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-2xl text-muted hover:text-danger"
                    >
                        ✕
                    </button>
                </div>

                {/* Contenu */}
                <div className="p-4 overflow-y-auto flex-1">
                    <input
                        type="text"
                        placeholder="🔍 Rechercher un personnage..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full mb-4 px-4 py-2 border-2 border-default rounded-lg bg-surface text-default"
                        autoFocus
                    />

                    {filtered.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            {filter ? 'Aucun personnage trouvé' : 'Tous les personnages sont déjà assignés'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => onAddCharacter(char.id)}
                                    className="w-full flex items-center gap-3 p-3 bg-surface-alt rounded-lg border-2 border-default hover:border-primary hover:shadow-lg transition-all text-left"
                                >
                                    {char.avatar ? (
                                        <img
                                            src={char.avatar}
                                            alt={getDisplayName(char)}
                                            className="w-12 h-12 rounded-full border-2 border-default flex-shrink-0 object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-default bg-surface flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl">👤</span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-default truncate">
                                            {getDisplayName(char)}
                                        </div>
                                        <div className="text-sm text-muted">
                                            {char.playerName}
                                        </div>
                                    </div>

                                    <div className="text-accent text-xl flex-shrink-0">➕</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pied */}
                <div className="p-4 border-t-2 border-default bg-surface-alt flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                    >
                        Annuler
                    </button>
                </div>
            </div>

            {alertMessage && (
                <AlertModal
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </div>
    );
};

export default TableCharactersModal;