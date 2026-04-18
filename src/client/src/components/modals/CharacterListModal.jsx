// src/client/src/components/CharacterListModal.jsx
// Modale de sélection de personnage.
// Utilisée depuis PlayerPage (état 'selecting') et depuis Sheet (changer de perso).
// onSelect(char) → l'appelant gère la suite (CodeModal, etc.)

import React, { useState, useEffect } from 'react';
import { toSystemUrl } from '../../hooks/useFetch.js';
import {formatFullName} from "../../tools/utils.js";
import useSystem from "../../hooks/useSystem.js";

const SayMyName = (slug, char) => {
    if(slug !== 'vikings') {
        return (char.prenom ? (char.nom ? char.prenom+' '+char.nom : char.prenom) : (char.nom ? char.nom : 'Nom inconnu'));
    }
    console.log(char);
    return formatFullName(char);
};

const CharacterListModal = ({ isOpen, currentCharId, onClose, onSelect }) => {
    const { slug } = useSystem()
    const [characters, setCharacters] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        fetch(toSystemUrl('/api/characters'))
            .then(res => {
                if (!res.ok) throw new Error('Failed to load characters');
                return res.json();
            })
            .then(data => {
                setCharacters(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading characters:', err);
                setError(err.message);
                setLoading(false);
            });
    }, [isOpen]);

    const handleSelect = (char) => {
        onSelect(char);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-surface rounded-lg shadow-2xl max-w-2xl w-full border-4 border-default max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b-2 border-default flex justify-between items-center sticky top-0 bg-surface z-10">
                    <h3 className="text-lg font-bold text-default">🗂️ Choisir un personnage</h3>
                    <button onClick={onClose} className="text-2xl text-muted hover:text-danger">✕</button>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-8 text-default">
                            <div className="text-3xl mb-2">⚔️</div>
                            <div>Chargement des personnages...</div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-danger">
                            <div className="text-2xl mb-2">⚠️</div>
                            <div>Erreur: {error}</div>
                        </div>
                    ) : characters.length === 0 || characters[0].id === -1 ? (
                        <div className="text-center py-8 text-default">
                            <div className="text-3xl mb-2">🗡️</div>
                            <div>Aucun personnage trouvé</div>
                            <div className="text-sm text-muted mt-2">
                                Créez votre premier personnage !
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {characters.filter(c => c.id > 0).map(char => {
                                const isCurrent = char.id === currentCharId;
                                const charname = SayMyName(slug, char);
                                return (
                                    <button
                                        key={char.id}
                                        onClick={() => handleSelect(char)}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                                            isCurrent
                                                ? 'bg-primary/20 border-primary text-default'
                                                : 'bg-surface-alt border-default text-default hover:border-primary hover:shadow-lg'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-bold text-lg">{charname}</div>
                                                <div className="text-sm text-muted mt-1">
                                                    {char.playerName}
                                                    {char.sexe && ` | ${char.sexe === 'homme' ? 'H' : 'F'}`}
                                                    {char.age && `, ${char.age}a`}
                                                </div>
                                                {char.activite && (
                                                    <div className="text-xs text-muted">{char.activite}</div>
                                                )}
                                            </div>
                                            {isCurrent && (
                                                <div className="text-xs text-success font-semibold">✓ Actuel</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t-2 border-default bg-surface-alt">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-primary text-accent rounded font-semibold hover:opacity-90 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CharacterListModal;