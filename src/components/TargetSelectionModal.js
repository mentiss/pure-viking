// TargetSelectionModal.js - Sélection cible après jet d'attaque

const TargetSelectionModal = ({ combatState, attackerCombatant, rollResult, character, onConfirm, onClose }) => {
    const { useState } = React;
    
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [customDamage, setCustomDamage] = useState(null);
    const [selectedWeapon, setSelectedWeapon] = useState(null);
    
    // Trouver armes équipées du personnage
    const getEquippedWeapons = () => {
        if (attackerCombatant.type === 'npc') {
            return attackerCombatant.attaques || [{ name: 'Attaque', degats: 1 }];
        }
        
        // Pour joueur : chercher armes équipées dans inventaire
        if (character?.inventory) {
            const equippedWeapons = character.inventory.filter(item => 
                item.type === 'Arme' && item.equipped
            ).map(item => ({
                name: item.name,
                degats: parseInt(item.degats || item.damage || item.dmg || 2)
            }));
            
            if (equippedWeapons.length > 0) {
                return equippedWeapons;
            }
        }
        
        // Défaut : mains nues
        return [{ name: 'Mains nues', degats: 1 }];
    };
    
    const availableWeapons = getEquippedWeapons();
    const weapon = selectedWeapon || availableWeapons[0];
    
    // Calculer dégâts suggérés
    const calculateDamage = (target, weaponToUse = weapon) => {
        if (!target || !rollResult) return 0;
        
        const successes = rollResult.totalSuccesses || rollResult.baseSuccesses || 0;
        const targetThreshold = target.seuil || 1;
        const mr = Math.max(0, successes - targetThreshold); // Marge de réussite
        
        const rawDamage = weaponToUse.degats + mr;
        const finalDamage = Math.max(0, rawDamage - (target.armure || 0));
        
        return finalDamage;
    };
    
    const suggestedDamage = selectedTarget ? calculateDamage(selectedTarget) : 0;
    const displayDamage = customDamage !== null ? customDamage : suggestedDamage;
    
    const handleConfirm = () => {
        if (!selectedTarget) return;
        
        onConfirm({
            targetId: selectedTarget.id,
            damage: displayDamage,
            rollResult: rollResult,
            weapon: weapon,
            mr: Math.max(0, (rollResult.totalSuccesses || rollResult.baseSuccesses || 0) - (selectedTarget.seuil || 1))
        });
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-lg w-full border-4 border-viking-bronze p-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        🎯 Sélectionner la cible
                    </h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                {/* Résultat jet */}
                <div className="mb-4 p-3 bg-viking-bronze/20 rounded">
                    <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">
                        Résultat du jet : {rollResult.totalSuccesses || rollResult.baseSuccesses || 0} succès
                    </div>
                    {availableWeapons.length > 1 ? (
                        <div className="mt-2">
                            <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                                Arme utilisée :
                            </label>
                            <select
                                value={availableWeapons.indexOf(weapon)}
                                onChange={(e) => {
                                    setSelectedWeapon(availableWeapons[e.target.value]);
                                    setCustomDamage(null); // Reset custom damage
                                }}
                                className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                            >
                                {availableWeapons.map((w, i) => (
                                    <option key={i} value={i}>
                                        {w.name} (Dégâts base : {w.degats})
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            Arme : {weapon.name} (Dégâts base : {weapon.degats})
                        </div>
                    )}
                </div>
                
                {/* Liste cibles */}
                <div className="mb-4">
                    <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                        Choisir la cible :
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {combatState.combatants
                            .filter(c => c.id !== attackerCombatant.id) // Pas soi-même par défaut
                            .map(target => {
                                const damage = calculateDamage(target);
                                const isSelected = selectedTarget?.id === target.id;
                                
                                return (
                                    <button
                                        key={target.id}
                                        onClick={() => {
                                            setSelectedTarget(target);
                                            setCustomDamage(null); // Reset custom
                                        }}
                                        className={`w-full p-3 rounded border-2 text-left transition-colors ${
                                            isSelected
                                                ? 'border-viking-bronze bg-viking-bronze/20'
                                                : 'border-viking-leather dark:border-viking-bronze hover:bg-viking-parchment dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-viking-brown dark:text-viking-parchment">
                                                    {target.name}
                                                    {target.type === 'player' && (
                                                        <span className="text-xs ml-2 text-viking-bronze">
                                                            ({target.playerName})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                                    Seuil: {target.seuil} | Armure: {target.armure}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="text-sm">
                                                    <span className="font-bold text-viking-danger">
                                                        → {damage} blessures
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
                
                {/* Calcul dégâts */}
                {selectedTarget && (
                    <div className="mb-4 p-3 bg-viking-parchment dark:bg-gray-800 rounded">
                        <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Calcul dégâts :
                        </div>
                        <div className="text-xs space-y-1 text-viking-text dark:text-viking-parchment">
                            <div>Arme : {weapon.degats}</div>
                            <div>+ MR : {Math.max(0, (rollResult.totalSuccesses || rollResult.baseSuccesses || 0) - selectedTarget.seuil)}</div>
                            <div>- Armure : {selectedTarget.armure}</div>
                            <div className="border-t border-viking-bronze pt-1 mt-1">
                                <strong>Total : {suggestedDamage} blessures</strong>
                            </div>
                        </div>
                        
                        {/* Modification manuelle */}
                        <div className="mt-3">
                            <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                                Modifier dégâts (optionnel) :
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={customDamage !== null ? customDamage : suggestedDamage}
                                onChange={(e) => setCustomDamage(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                            />
                        </div>
                    </div>
                )}
                
                {/* Boutons */}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded font-semibold hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedTarget}
                        className="flex-1 px-4 py-2 bg-viking-danger text-white rounded font-semibold hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Envoyer au MJ
                    </button>
                </div>
            </div>
        </div>
    );
};
