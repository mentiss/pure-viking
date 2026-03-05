// src/client/src/components/combat/modals/TargetSelectionModal.jsx
// Modal générique de sélection de cible.
//
// Toute logique métier (calcul dégâts, stats cible, liste armes) est injectée
// par le slug via props — ce composant ne connaît aucune règle de jeu.
//
// Props :
//   combatState       {object}   — état combat complet
//   attacker          {object}   — combattant attaquant (pour exclure de la liste)
//   rollResult        {any}      — résultat du jet (opaque, passé à calculateDamage)
//   availableWeapons  {array}    — [{ id, nom, degats }] fourni par attackConfig.getWeapons
//   selectedWeapon    {object}   — arme sélectionnée (state géré par useAttackFlow)
//   onWeaponChange    {function} — (weapon) => void
//   calculateDamage   {function} — (target, weapon, rollResult) => number  [slug]
//   renderTargetInfo  {function} — (combatant) => string|JSX                [slug]
//   allowDamageEdit   {boolean}  — true pour le GM (défaut : false)
//   onConfirm         {function} — (target, finalDamage) => void
//   onClose           {function}

import React, { useState } from 'react';

const TargetSelectionModal = ({
                                  combatState,
                                  attacker,
                                  rollResult,
                                  availableWeapons = [],
                                  selectedWeapon,
                                  onWeaponChange,
                                  calculateDamage,
                                  renderTargetInfo,
                                  allowDamageEdit = false,
                                  onConfirm,
                                  onClose,
                              }) => {
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [customDamage,   setCustomDamage]   = useState(null);

    const weapon = selectedWeapon ?? availableWeapons[0] ?? null;

    // Dégâts calculés pour la cible sélectionnée
    const suggestedDamage = selectedTarget
        ? (calculateDamage?.(selectedTarget, weapon, rollResult) ?? 0)
        : 0;

    const displayDamage = customDamage !== null ? customDamage : suggestedDamage;

    const handleTargetSelect = (target) => {
        setSelectedTarget(target);
        setCustomDamage(null); // reset édition manuelle à chaque changement de cible
    };

    const handleConfirm = () => {
        if (!selectedTarget) return;
        onConfirm(selectedTarget, displayDamage);
    };

    // Cibles = tous les combattants sauf l'attaquant
    const targets = combatState.combatants.filter(c => c.id !== attacker?.id);

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-lg w-full border-4 border-viking-bronze p-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        🎯 Sélectionner la cible
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger"
                    >
                        ✕
                    </button>
                </div>

                {/* Sélection d'arme */}
                {availableWeapons.length > 0 && (
                    <div className="mb-4 p-3 bg-viking-bronze/20 rounded">
                        {availableWeapons.length > 1 ? (
                            <div>
                                <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                                    Arme utilisée :
                                </label>
                                <select
                                    value={weapon?.id ?? ''}
                                    onChange={e => {
                                        const w = availableWeapons.find(w => String(w.id) === e.target.value);
                                        if (w) {
                                            onWeaponChange?.(w);
                                            setCustomDamage(null);
                                        }
                                    }}
                                    className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                                >
                                    {availableWeapons.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.nom} (Dégâts base : {w.degats})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                Arme : <strong>{weapon?.nom}</strong> (Dégâts base : {weapon?.degats})
                            </div>
                        )}
                    </div>
                )}

                {/* Liste des cibles */}
                <div className="mb-4">
                    <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                        Choisir la cible :
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {targets.length === 0 && (
                            <div className="text-sm text-viking-leather dark:text-viking-bronze text-center py-4">
                                Aucune cible disponible.
                            </div>
                        )}
                        {targets.map(target => {
                            const isSelected = selectedTarget?.id === target.id;
                            const dmg = calculateDamage?.(target, weapon, rollResult) ?? 0;

                            return (
                                <button
                                    key={target.id}
                                    onClick={() => handleTargetSelect(target)}
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
                                                {target.type === 'npc' && (
                                                    <span className="text-xs ml-2 text-viking-leather dark:text-viking-bronze">
                                                        (PNJ)
                                                    </span>
                                                )}
                                            </div>
                                            {/* Info slug-specific : seuil/armure/PV... */}
                                            {renderTargetInfo && (
                                                <div className="text-xs text-viking-leather dark:text-viking-bronze mt-0.5">
                                                    {renderTargetInfo(target)}
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <span className="font-bold text-viking-danger text-sm shrink-0 ml-2">
                                                → {dmg} dégâts
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Édition des dégâts (GM ou si allowDamageEdit) */}
                {selectedTarget && (
                    <div className="mb-4 p-3 bg-viking-parchment dark:bg-gray-800 rounded">
                        <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                            Dégâts calculés : <strong>{suggestedDamage}</strong>
                        </div>
                        {allowDamageEdit && (
                            <div className="mt-2">
                                <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                                    Modifier (optionnel) :
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={displayDamage}
                                    onChange={e => setCustomDamage(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                                />
                            </div>
                        )}
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

export default TargetSelectionModal;