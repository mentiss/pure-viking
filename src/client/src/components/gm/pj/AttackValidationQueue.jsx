// src/client/src/components/gm/pj/AttackValidationQueue.jsx
// File de validation des attaques côté GM.
//
// Phase 3 — changements :
//   - attack.id (uuid) remplace l'index de tableau
//   - combatConfig injecté pour calculateDamage + renderTargetInfo
//   - pendingAttacks provient désormais de combatState.pendingAttacks

import React, { useState } from 'react';

const AttackValidationQueue = ({
                                   pendingAttacks,
                                   combatState,
                                   combatConfig,
                                   onValidate,   // (attackId, modifiedAttack) => void
                                   onReject,     // (attackId) => void
                               }) => {
    const [editingId, setEditingId] = useState(null);

    if (!pendingAttacks || pendingAttacks.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-viking-brown border-4 border-viking-bronze rounded-lg shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="p-4">
                <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment mb-3">
                    ⚔️ Attaques en attente ({pendingAttacks.length})
                </h3>
                <div className="space-y-3">
                    {pendingAttacks.map(attack => (
                        <AttackValidationCard
                            key={attack.id}
                            attack={attack}
                            combatState={combatState}
                            combatConfig={combatConfig}
                            onValidate={(modified) => onValidate(attack.id, modified)}
                            onReject={() => onReject(attack.id)}
                            isEditing={editingId === attack.id}
                            onEdit={() => setEditingId(editingId === attack.id ? null : attack.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Carte individuelle ───────────────────────────────────────────────────────

const AttackValidationCard = ({
                                  attack,
                                  combatState,
                                  combatConfig,
                                  onValidate,
                                  onReject,
                                  isEditing,
                                  onEdit,
                              }) => {
    const [selectedTargetId, setSelectedTargetId] = useState(attack.targetId);
    const [customDamage,     setCustomDamage]     = useState(attack.damage ?? 0);

    const attacker      = combatState.combatants.find(c => c.id === attack.attackerId);
    const currentTarget = combatState.combatants.find(c => c.id === selectedTargetId);

    const successes = attack.rollResult?.totalSuccesses
        ?? attack.rollResult?.baseSuccesses
        ?? attack.rollResult?.successes
        ?? 0;

    // Recalcul via slug
    const recalculate = (targetId) => {
        const target = combatState.combatants.find(c => c.id === targetId);
        if (!target || !combatConfig?.attack?.calculateDamage) return attack.damage ?? 0;
        return combatConfig.attack.calculateDamage(target, attack.weapon, attack.rollResult);
    };

    const handleTargetChange = (newTargetId) => {
        setSelectedTargetId(newTargetId);
        setCustomDamage(recalculate(newTargetId));
    };

    const handleValidate = () => {
        onValidate({ ...attack, targetId: selectedTargetId, damage: customDamage });
    };

    const getTargetInfo = (target) => {
        if (!target) return '';
        return combatConfig?.attack?.renderTargetInfo?.(target) ?? '';
    };

    return (
        <div className="p-3 border-2 border-viking-bronze rounded bg-viking-parchment dark:bg-gray-800">
            {/* En-tête */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-bold text-viking-brown dark:text-viking-parchment">
                        {attacker?.name ?? 'Inconnu'}
                    </div>
                    <div className="text-xs text-viking-leather dark:text-viking-bronze">
                        {successes} succès
                        {attack.weapon?.nom && ` · ${attack.weapon.nom}`}
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="px-2 py-1 bg-viking-bronze text-viking-brown rounded text-xs hover:bg-viking-leather"
                >
                    {isEditing ? '📝' : '✏️'}
                </button>
            </div>

            {/* Mode édition */}
            {isEditing ? (
                <div className="space-y-2 mb-3">
                    <div>
                        <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                            Cible :
                        </label>
                        <select
                            value={selectedTargetId}
                            onChange={e => handleTargetChange(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                        >
                            {combatState.combatants
                                .filter(c => c.id !== attack.attackerId)
                                .map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{getTargetInfo(c) ? ` (${getTargetInfo(c)})` : ''}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                            Dégâts :
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={customDamage}
                            onChange={e => setCustomDamage(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                        />
                    </div>
                </div>
            ) : (
                <div className="mb-3">
                    <div className="text-sm text-viking-brown dark:text-viking-parchment">
                        → <strong>{currentTarget?.name ?? 'Cible inconnue'}</strong>
                        {currentTarget && getTargetInfo(currentTarget) && (
                            <span className="text-xs ml-1 text-viking-leather dark:text-viking-bronze">
                                ({getTargetInfo(currentTarget)})
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-viking-danger font-bold">
                        {customDamage} dégâts
                    </div>
                    {/* Résultat défense si disponible */}
                    {attack.defenseResolved && (
                        <div className="text-xs text-viking-bronze mt-1">
                            Défense : {attack.defenseResult === null ? 'abandonnée' : `${attack.defenseResult} succès`}
                        </div>
                    )}
                </div>
            )}

            {/* Boutons */}
            <div className="flex gap-2">
                <button
                    onClick={onReject}
                    className="flex-1 px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                >
                    ❌ Annuler
                </button>
                <button
                    onClick={handleValidate}
                    className="flex-1 px-3 py-1 bg-viking-success text-white rounded text-sm hover:bg-green-700"
                >
                    ✅ Valider
                </button>
            </div>
        </div>
    );
};

export default AttackValidationQueue;