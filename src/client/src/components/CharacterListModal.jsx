// CharacterListModal.js - Modal de sélection de personnage
import React, { useState, useEffect } from "react";

const CharacterListModal = ({ currentCharId, onClose, onSelect }) => {
    const { useState, useEffect } = React;
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        fetch('/api/characters')
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
    }, []);
    
    // const handleSelect = async (id) => {
    //     try {
    //         const res = await fetch(`/api/characters/${id}`);
    //         if (!res.ok) throw new Error('Failed to load character');
    //         const data = await res.json();
    //         localStorage.setItem('currentCharacterId', data.id);
    //         onSelect(data);
    //         onClose();
    //     } catch (err) {
    //         console.error('Error loading character:', err);
    //         alert('Erreur lors du chargement du personnage');
    //     }
    // };

    const handleSelect = (char) => {
        onSelect(char); // Passer le perso simplifié, pas le complet
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">🗂️ Choisir un personnage</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="p-4">
                    {loading ? (
                        <div className="text-center py-8 text-viking-text dark:text-viking-parchment">
                            <div className="text-3xl mb-2">⚔️</div>
                            <div>Chargement des personnages...</div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-viking-danger">
                            <div className="text-2xl mb-2">⚠️</div>
                            <div>Erreur: {error}</div>
                        </div>
                    ) : characters.length === 0 || characters[0].id === -1 ? (
                        <div className="text-center py-8 text-viking-text dark:text-viking-parchment">
                            <div className="text-3xl mb-2">🗡️</div>
                            <div>Aucun personnage trouvé</div>
                            <div className="text-sm text-viking-leather dark:text-viking-bronze mt-2">
                                Créez votre premier personnage !
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {characters.map(char => {
                                const isCurrent = char.id === currentCharId;
                                if(char.id > 0) {
                                    return (
                                        <button
                                            key={char.id}
                                            onClick={() => handleSelect(char)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                                                isCurrent
                                                    ? 'bg-viking-bronze border-viking-leather text-viking-brown'
                                                    : 'bg-viking-parchment dark:bg-gray-800 border-viking-leather dark:border-viking-bronze text-viking-text dark:text-viking-parchment hover:border-viking-bronze hover:shadow-lg'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="font-bold text-lg">{char.name}</div>
                                                    <div className="text-sm opacity-75 mt-1">
                                                        {char.playerName} | {char.sexe === 'homme' ? 'H' : 'F'}, {char.age}a
                                                    </div>
                                                    <div className="text-xs opacity-75">{char.activite}</div>
                                                </div>
                                                {isCurrent && (
                                                    <div className="text-xs text-viking-success font-semibold">
                                                        ✓ Actuel
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-viking-leather/30 dark:border-viking-bronze/30 text-xs opacity-75">
                                                SAGA: {char.sagaActuelle}/{char.sagaTotale} |
                                                Blessures: {char.tokensBlessure}/5 |
                                                Fatigue: {char.tokensFatigue}/9
                                            </div>
                                        </button>
                                    );
                                }
                            })}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t-2 border-viking-bronze bg-viking-parchment/30 dark:bg-gray-800/30">
                    <button 
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-viking-leather hover:bg-viking-bronze text-viking-parchment rounded font-semibold transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CharacterListModal;
