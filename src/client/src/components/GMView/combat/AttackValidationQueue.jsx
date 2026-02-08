// AttackValidationQueue.js - File validation attaques pour MJ
import React, { useState, useEffect } from "react";

const AttackValidationQueue = ({ pendingAttacks, combatState, onValidate, onReject }) => {
    const { useState } = React;
    const [editingAttack, setEditingAttack] = useState(null);
    
    if (!pendingAttacks || pendingAttacks.length === 0) return null;
    
    return (
        <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-viking-brown border-4 border-viking-bronze rounded-lg shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="p-4">
                <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment mb-3">
                    ⚔️ Attaques en attente ({pendingAttacks.length})
                </h3>
                
                <div className="space-y-3">
                    {pendingAttacks.map((attack, index) => (
                        <AttackValidationCard
                            key={index}
                            attack={attack}
                            combatState={combatState}
                            onValidate={(modifiedAttack) => onValidate(index, modifiedAttack)}
                            onReject={() => onReject(index)}
                            isEditing={editingAttack === index}
                            onEdit={() => setEditingAttack(editingAttack === index ? null : index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const AttackValidationCard = ({ attack, combatState, onValidate, onReject, isEditing, onEdit }) => {
    const { useState } = React;
    
    const [selectedTargetId, setSelectedTargetId] = useState(attack.targetId);
    const [customDamage, setCustomDamage] = useState(attack.damage);
    
    const attacker = combatState.combatants.find(c => c.id === attack.attackerId);
    const currentTarget = combatState.combatants.find(c => c.id === selectedTargetId);
    
    // Recalculer dégâts si changement de cible
    const recalculateDamage = (newTargetId) => {
        const newTarget = combatState.combatants.find(c => c.id === newTargetId);
        if (!newTarget) return attack.damage;
        
        const successes = attack.rollResult.totalSuccesses || attack.rollResult.baseSuccesses || 0;
        const mr = Math.max(0, successes - newTarget.seuil);
        const rawDamage = attack.weapon.degats + mr;
        return Math.max(0, rawDamage - newTarget.armure);
    };
    
    const handleTargetChange = (newTargetId) => {
        setSelectedTargetId(newTargetId);
        setCustomDamage(recalculateDamage(newTargetId));
    };
    
    const handleValidate = () => {
        onValidate({
            ...attack,
            targetId: selectedTargetId,
            damage: customDamage
        });
    };
    
    return (
        <div className="p-3 border-2 border-viking-bronze rounded bg-viking-parchment dark:bg-gray-800">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-bold text-viking-brown dark:text-viking-parchment">
                        {attacker?.name || 'Inconnu'}
                    </div>
                    <div className="text-xs text-viking-leather dark:text-viking-bronze">
                        {attack.rollResult.totalSuccesses || attack.rollResult.baseSuccesses || 0} succès
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="px-2 py-1 bg-viking-bronze text-viking-brown rounded text-xs hover:bg-viking-leather"
                >
                    {isEditing ? '📝' : '✏️'}
                </button>
            </div>
            
            {isEditing ? (
                <>
                    {/* Édition cible */}
                    <div className="mb-3">
                        <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                            Cible :
                        </label>
                        <select
                            value={selectedTargetId}
                            onChange={(e) => handleTargetChange(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                        >
                            {combatState.combatants
                                .filter(c => c.id !== attack.attackerId)
                                .map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} (Seuil {c.seuil}, Arm {c.armure})
                                    </option>
                                ))}
                        </select>
                    </div>
                    
                    {/* Édition dégâts */}
                    <div className="mb-3">
                        <label className="block text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                            Dégâts :
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={customDamage}
                            onChange={(e) => setCustomDamage(parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-700"
                        />
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            Calcul auto : {recalculateDamage(selectedTargetId)} blessures
                        </div>
                    </div>
                </>
            ) : (
                <div className="mb-3">
                    <div className="text-sm text-viking-brown dark:text-viking-parchment">
                        → <strong>{currentTarget?.name || 'Cible inconnue'}</strong>
                    </div>
                    <div className="text-sm text-viking-danger font-bold">
                        {attack.damage} blessures
                    </div>
                </div>
            )}
            
            {/* Boutons validation */}
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