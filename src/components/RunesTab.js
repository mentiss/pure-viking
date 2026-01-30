// RunesTab.js - Onglet runes complet

const RunesTab = ({ character, onUpdate }) => {
    const { useState } = React;
    const [selectedRune, setSelectedRune] = useState(null);
    const [editMode, setEditMode] = useState(false);
    
    const getRuneLevel = (runeName) => {
        const charRune = character.runes?.find(r => r.name === runeName);
        return charRune?.level || 0;
    };
    
    const setRuneLevel = (runeName, newLevel) => {
        const clampedLevel = Math.max(0, Math.min(5, newLevel));
        
        const existingRune = character.runes?.find(r => r.name === runeName);
        
        let updatedRunes;
        if (existingRune) {
            // Modifier niveau existant
            if (clampedLevel === 0) {
                // Retirer la rune si niveau 0
                updatedRunes = character.runes.filter(r => r.name !== runeName);
            } else {
                updatedRunes = character.runes.map(r => 
                    r.name === runeName ? { ...r, level: clampedLevel } : r
                );
            }
        } else {
            // Ajouter nouvelle rune
            if (clampedLevel > 0) {
                updatedRunes = [...(character.runes || []), { 
                    name: runeName, 
                    level: clampedLevel 
                }];
            } else {
                updatedRunes = character.runes || [];
            }
        }
        
        onUpdate({ ...character, runes: updatedRunes });
    };
    
    const getLevelDescription = (level) => {
        const descriptions = [
            "Signe inconnu",
            "Identification littérale et légendes associées",
            "Sensoriel : sentir la présence ou l'influence de la rune",
            "Active : tracer la rune, activer sa magie, combiner jusqu'à 3 runes",
            "Création d'objets à charge, tatouages magiques. Combiner jusqu'à 4 runes",
            "Artefacts permanents, visions prophétiques. Combiner jusqu'à 5 runes"
        ];
        return descriptions[level] || "";
    };
    
    return (
        <div className="max-w-7xl mx-auto p-4 space-y-4">
            {/* En-tête */}
            <div className="bg-white dark:bg-viking-brown rounded-lg p-4 border-2 border-viking-leather dark:border-viking-bronze">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-viking font-bold text-viking-brown dark:text-viking-parchment mb-2">
                            🔮 Futhark - Les 24 Runes
                        </h2>
                        <div className="text-sm text-viking-text dark:text-viking-parchment">
                            Cliquez sur une rune pour voir ses détails
                        </div>
                    </div>
                    <button 
                        onClick={() => setEditMode(!editMode)}
                        className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                            editMode 
                                ? 'bg-viking-success text-white' 
                                : 'bg-viking-bronze text-viking-brown hover:bg-viking-leather'
                        }`}
                    >
                        {editMode ? '✓ Terminé' : '⚙️ Éditer niveaux'}
                    </button>
                </div>
            </div>
            
            {/* Grille des runes */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {RUNES.map(rune => {
                    const level = getRuneLevel(rune.name);
                    const isSelected = selectedRune?.name === rune.name;
                    
                    return (
                        <div key={rune.name} className="relative">
                            <button
                                onClick={() => !editMode && setSelectedRune(isSelected ? null : rune)}
                                disabled={editMode}
                                className={`w-full p-3 rounded-lg text-center border-2 transition-all ${
                                    isSelected && !editMode
                                        ? 'bg-viking-bronze border-viking-leather text-viking-brown scale-105 shadow-lg'
                                        : level > 0
                                            ? 'bg-viking-parchment dark:bg-gray-800 border-viking-bronze text-viking-text dark:text-viking-parchment hover:border-viking-bronze'
                                            : 'bg-gray-200 dark:bg-gray-900 border-viking-leather/30 dark:border-viking-bronze/30 text-viking-text/50 dark:text-viking-parchment/50 hover:border-viking-leather'
                                } ${editMode ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                <div className="text-4xl mb-1">{rune.symbol}</div>
                                <div className="text-xs font-semibold">{rune.name}</div>
                                <div className="text-xs opacity-75 mt-1">
                                    {level > 0 ? `Niv ${level}` : '—'}
                                </div>
                            </button>
                            
                            {/* Contrôles +/- en mode édition */}
                            {editMode && (
                                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 rounded-lg">
                                    <button
                                        onClick={() => setRuneLevel(rune.name, level - 1)}
                                        disabled={level === 0}
                                        className="w-8 h-8 bg-viking-danger text-white rounded-full font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700"
                                    >
                                        −
                                    </button>
                                    <div className="w-8 text-center font-bold text-white text-lg">
                                        {level}
                                    </div>
                                    <button
                                        onClick={() => setRuneLevel(rune.name, level + 1)}
                                        disabled={level === 5}
                                        className="w-8 h-8 bg-viking-success text-white rounded-full font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-green-700"
                                    >
                                        +
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Détail rune sélectionnée */}
            {selectedRune && (
                <div className="bg-white dark:bg-viking-brown rounded-lg p-6 border-4 border-viking-bronze shadow-xl">
                    <div className="flex items-start gap-6">
                        {/* Symbole */}
                        <div className="flex-shrink-0 w-32 h-32 flex items-center justify-center bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze">
                            <div className="text-8xl text-viking-bronze">{selectedRune.symbol}</div>
                        </div>
                        
                        {/* Infos */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <h3 className="text-3xl font-viking font-bold text-viking-brown dark:text-viking-parchment">
                                    {selectedRune.name}
                                </h3>
                                <div className="text-sm text-viking-leather dark:text-viking-bronze">
                                    Lettre : {selectedRune.letter}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 bg-viking-parchment/50 dark:bg-gray-800/50 rounded border border-viking-leather dark:border-viking-bronze">
                                    <div className="text-xs font-semibold text-viking-leather dark:text-viking-bronze mb-1">
                                        Traduction littérale
                                    </div>
                                    <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">
                                        {selectedRune.literal}
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-viking-bronze/20 dark:bg-viking-bronze/10 rounded border border-viking-bronze">
                                    <div className="text-xs font-semibold text-viking-leather dark:text-viking-bronze mb-1">
                                        Sens ésotérique
                                    </div>
                                    <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">
                                        {selectedRune.esoteric}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Niveau du personnage */}
                            <div className="p-4 bg-viking-bronze/10 dark:bg-viking-leather/10 rounded-lg border-2 border-viking-bronze">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold text-viking-brown dark:text-viking-parchment">
                                        Votre niveau : {getRuneLevel(selectedRune.name)}
                                    </div>
                                    <div className="text-sm text-viking-bronze font-semibold">
                                        {getRuneLevel(selectedRune.name) === 0 ? 'Inconnue' : 
                                         getRuneLevel(selectedRune.name) === 1 ? 'Apprenti' :
                                         getRuneLevel(selectedRune.name) === 2 ? 'Apprenti' :
                                         getRuneLevel(selectedRune.name) >= 3 ? 'Adepte' : ''}
                                    </div>
                                </div>
                                <div className="text-xs text-viking-text dark:text-viking-parchment italic">
                                    {getLevelDescription(getRuneLevel(selectedRune.name))}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setSelectedRune(null)}
                        className="mt-4 w-full px-4 py-2 bg-viking-leather hover:bg-viking-bronze text-viking-parchment rounded font-semibold transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            )}
            
            {/* Légende niveaux */}
            <div className="bg-white dark:bg-viking-brown rounded-lg p-4 border-2 border-viking-leather dark:border-viking-bronze">
                <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Niveaux de maîtrise</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="flex gap-2">
                        <span className="font-bold text-viking-bronze">0:</span>
                        <span className="text-viking-text dark:text-viking-parchment">Signe inconnu</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-bold text-viking-bronze">1:</span>
                        <span className="text-viking-text dark:text-viking-parchment">Identification et légendes</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-bold text-viking-bronze">2:</span>
                        <span className="text-viking-text dark:text-viking-parchment">Sensoriel (sentir présence)</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-bold text-viking-bronze">3:</span>
                        <span className="text-viking-text dark:text-viking-parchment">Active (tracer, 3 runes max)</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-bold text-viking-bronze">4:</span>
                        <span className="text-viking-text dark:text-viking-parchment">Objets chargés (4 runes max)</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-bold text-viking-bronze">5:</span>
                        <span className="text-viking-text dark:text-viking-parchment">Artefacts permanents (5 runes max)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

