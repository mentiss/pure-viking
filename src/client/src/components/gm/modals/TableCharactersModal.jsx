// components/gm/tables/TableCharactersModal.jsx - Gérer les persos d'une table
import React, { useState, useEffect } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import AlertModal from "../../modals/AlertModal.jsx";

const TableCharactersModal = ({ isOpen, onClose, session, onSessionUpdated }) => {
    const [sessionData, setSessionData] = useState(null);
    const [allCharacters, setAllCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);

    const fetchWithAuth = useFetch();

    useEffect(() => {
        if (isOpen && session) {
            loadData();
        }
    }, [isOpen, session]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Charger les détails de la session avec ses persos
            const sessionResponse = await fetchWithAuth(`/api/sessions/${session.id}`);
            const sessionFull = await sessionResponse.json();
            setSessionData(sessionFull);

            // Charger tous les persos pour l'ajout
            const charsResponse = await fetchWithAuth('/api/characters');
            const chars = await charsResponse.json();
            // Filtrer le GM (id = -1)
            setAllCharacters(chars.filter(c => c.id !== -1));
        } catch (error) {
            console.error('Error loading data:', error);
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
                if (onSessionUpdated) onSessionUpdated(updated);
            }
        } catch (error) {
            console.error('Error adding character:', error);
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
                if (onSessionUpdated) onSessionUpdated(updated);
            }
        } catch (error) {
            console.error('Error removing character:', error);
            setAlertMessage('Erreur lors du retrait du personnage');
        }
    };

    if (!isOpen) return null;

    const assignedCharacterIds = sessionData?.characters.map(c => c.id) || [];
    const availableCharacters = allCharacters.filter(c => !assignedCharacterIds.includes(c.id));

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border-4 border-viking-bronze">
                    {/* Header */}
                    <div className="p-4 border-b-2 border-viking-bronze flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-viking-brown dark:text-viking-parchment">
                                    👥 Personnages de la table
                                </h2>
                                <p className="text-sm text-viking-leather dark:text-viking-bronze">
                                    {session.name}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto flex-1">
                        {loading ? (
                            <div className="text-center py-8 text-viking-leather dark:text-viking-bronze">
                                Chargement...
                            </div>
                        ) : (
                            <>
                                {/* Bouton ajouter */}
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="w-full mb-4 px-4 py-3 bg-viking-bronze text-viking-brown rounded-lg font-semibold hover:bg-viking-leather"
                                >
                                    ➕ Ajouter un personnage
                                </button>

                                {/* Liste des persos assignés */}
                                {sessionData?.characters.length === 0 ? (
                                    <div className="text-center py-8 text-viking-leather dark:text-viking-bronze">
                                        Aucun personnage dans cette table
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {sessionData?.characters.map(char => (
                                            <div
                                                key={char.id}
                                                className="flex items-center gap-3 p-3 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-leather dark:border-viking-bronze"
                                            >
                                                {/* Avatar */}
                                                {char.avatar ? (
                                                    <img
                                                        src={char.avatar}
                                                        alt={char.name}
                                                        className="w-12 h-12 rounded-full border-2 border-viking-bronze flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-viking-leather dark:border-viking-bronze bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xl">👤</span>
                                                    </div>
                                                )}

                                                {/* Infos */}
                                                <div className="flex-1">
                                                    <div className="font-bold text-viking-brown dark:text-viking-parchment">
                                                        {char.name}
                                                    </div>
                                                    <div className="text-sm text-viking-leather dark:text-viking-bronze">
                                                        Joueur : {char.playerName}
                                                    </div>
                                                    <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                                        SAGA {char.sagaActuelle}/{char.sagaTotale} |
                                                        Blessures {char.tokensBlessure} |
                                                        Fatigue {char.tokensFatigue}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <button
                                                    onClick={() => handleRemoveCharacter(char.id)}
                                                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex-shrink-0"
                                                >
                                                    🗑️ Retirer
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t-2 border-viking-bronze bg-viking-parchment/30 dark:bg-gray-800/30 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-viking-leather text-viking-parchment rounded-lg font-semibold hover:bg-viking-brown"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>

            {/* Modale d'ajout */}
            {showAddModal && (
                <AddCharacterModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    availableCharacters={availableCharacters}
                    onAddCharacter={handleAddCharacter}
                />
            )}
        </>
    );
};

// Modale pour ajouter un personnage
const AddCharacterModal = ({ isOpen, onClose, availableCharacters, onAddCharacter }) => {
    const [filter, setFilter] = useState('');

    if (!isOpen) return null;

    const filteredCharacters = availableCharacters.filter(c => {
        const searchStr = `${c.name} ${c.playerName}`.toLowerCase();
        return searchStr.includes(filter.toLowerCase());
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border-4 border-viking-bronze">
                {/* Header */}
                <div className="p-4 border-b-2 border-viking-bronze flex-shrink-0">
                    <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">
                        Ajouter un personnage
                    </h3>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    {/* Recherche */}
                    <input
                        type="text"
                        placeholder="🔍 Rechercher un personnage..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full mb-4 px-4 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                        autoFocus
                    />

                    {/* Liste */}
                    {filteredCharacters.length === 0 ? (
                        <div className="text-center py-8 text-viking-leather dark:text-viking-bronze">
                            {filter ? 'Aucun personnage trouvé' : 'Tous les personnages sont déjà assignés'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredCharacters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => onAddCharacter(char.id)}
                                    className="w-full flex items-center gap-3 p-3 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-leather dark:border-viking-bronze hover:border-viking-bronze hover:shadow-lg transition-all text-left"
                                >
                                    {/* Avatar */}
                                    {char.avatar ? (
                                        <img
                                            src={char.avatar}
                                            alt={char.name}
                                            className="w-12 h-12 rounded-full border-2 border-viking-bronze flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-viking-leather dark:border-viking-bronze bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl">👤</span>
                                        </div>
                                    )}

                                    {/* Infos */}
                                    <div className="flex-1">
                                        <div className="font-bold text-viking-brown dark:text-viking-parchment">
                                            {char.name}
                                        </div>
                                        <div className="text-sm text-viking-leather dark:text-viking-bronze">
                                            Joueur : {char.playerName}
                                        </div>
                                    </div>

                                    <div className="text-viking-bronze text-xl flex-shrink-0">
                                        ➕
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t-2 border-viking-bronze bg-viking-parchment/30 dark:bg-gray-800/30 flex-shrink-0">
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