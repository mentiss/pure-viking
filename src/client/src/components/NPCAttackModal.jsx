// NPCAttackModal.js - Modal attaque NPC avec sélection attaque
import React, { useState, useEffect } from "react";

const NPCAttackModal = ({ npc, combatState, onClose, onAttackSubmitted }) => {
    const { useState } = React;
    
    const hasMultipleAttacks = npc.attaques && npc.attaques.length > 1;
    const [selectedAttack, setSelectedAttack] = useState(npc.attaques?.[0] || null);
    const [step, setStep] = useState(hasMultipleAttacks ? 'select' : 'roll'); // Skip select si 1 attaque
    const [rollResult, setRollResult] = useState(null);
    
    if (!selectedAttack) {
        return null;
    }
    
    const handleAttackSelect = () => {
        setStep('roll');
    };
    
    const handleRollComplete = (result) => {
        setRollResult(result);
        setStep('target');
    };
    
    const handleTargetConfirm = (targetData) => {
        onAttackSubmitted({
            attackerId: npc.id,
            attackerName: npc.name,
            ...targetData
        });
        onClose();
    };
    
    // Step 1: Sélection attaque (si plusieurs)
    if (step === 'select' && npc.attaques && npc.attaques.length > 1) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                            ⚔️ Choisir l'attaque
                        </h3>
                        <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                        {npc.attaques.map((attack, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setSelectedAttack(attack);
                                    setStep('roll');
                                }}
                                className={`w-full p-3 rounded border-2 text-left ${
                                    selectedAttack === attack
                                        ? 'border-viking-bronze bg-viking-bronze/20'
                                        : 'border-viking-leather dark:border-viking-bronze hover:bg-viking-parchment dark:hover:bg-gray-800'
                                }`}
                            >
                                <div className="font-bold text-viking-brown dark:text-viking-parchment">
                                    {attack.name}
                                </div>
                                <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                    Succès {attack.succes}+ | Explosion {attack.explosion}+ | Dégâts {attack.degats}
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    <button
                        onClick={handleAttackSelect}
                        className="w-full px-4 py-2 bg-viking-danger text-white rounded font-semibold hover:bg-red-700"
                    >
                        Continuer
                    </button>
                </div>
            </div>
        );
    }
    
    // Step 2: Jet de dés custom
    if (step === 'roll') {
        return <NPCDiceRoll attack={selectedAttack} npcName={npc.name} onClose={onClose} onRollComplete={handleRollComplete} />;
    }
    
    // Step 3: Sélection cible
    if (step === 'target' && rollResult) {
        return (
            <TargetSelectionModal
                combatState={combatState}
                attackerCombatant={npc}
                rollResult={rollResult}
                character={null}
                onConfirm={handleTargetConfirm}
                onClose={onClose}
            />
        );
    }
    
    return null;
};

// Sous-composant : Jet de dés NPC custom
const NPCDiceRoll = ({ attack, onClose, onRollComplete, npcName }) => {
    const { useState } = React;
    const [rolling, setRolling] = useState(false);
    const [result, setResult] = useState(null);
    const [broadcast, setBroadcast] = useState(false);
    
    const rollDice = () => {
        setRolling(true);
        
        // Jet 3d10
        const rolls = [];
        for (let i = 0; i < 3; i++) {
            let currentRoll = Math.floor(Math.random() * 10) + 1;
            rolls.push(currentRoll);
            
            // Explosion
            while (currentRoll >= attack.explosion) {
                currentRoll = Math.floor(Math.random() * 10) + 1;
                rolls.push(currentRoll);
            }
        }
        
        // Compter succès
        const successes = rolls.filter(d => d >= attack.succes).length;
        
        const rollResult = {
            rolls,
            threshold: attack.succes,
            explosionThresholds: [attack.explosion],
            baseSuccesses: successes,
            totalSuccesses: successes
        };
        
        setResult(rollResult);
        setRolling(false);
        
        // Si broadcast, envoyer à l'API pour historiser
        if (broadcast) {
            fetch('/api/dice/roll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: -1,
                    character_name: npcName || 'PNJ',
                    roll_type: 'combat',
                    roll_target: attack.name,
                    pool: 3,
                    threshold: attack.succes,
                    results: rolls,
                    successes,
                    saga_spent: 0,
                    saga_recovered: 0
                })
            }).catch(err => console.error('Error broadcasting roll:', err));
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        🎲 {attack.name}
                    </h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="mb-4 p-3 bg-viking-parchment dark:bg-gray-800 rounded text-sm text-viking-brown dark:text-viking-parchment">
                    <div>Succès sur : {attack.succes}+</div>
                    <div>Explosion sur : {attack.explosion}+</div>
                    <div>Dégâts : {attack.degats}</div>
                </div>
                
                <div className="mb-4 flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="broadcast-npc"
                        checked={broadcast}
                        onChange={(e) => setBroadcast(e.target.checked)}
                        className="w-4 h-4"
                    />
                    <label htmlFor="broadcast-npc" className="text-sm text-viking-brown dark:text-viking-parchment cursor-pointer">
                        📢 Partager le jet (historique visible par tous)
                    </label>
                </div>
                
                {result ? (
                    <>
                        <div className="mb-4 p-4 bg-viking-bronze/20 rounded">
                            <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                Dés : {result.rolls.join(', ')}
                            </div>
                            <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                                {result.totalSuccesses} succès
                            </div>
                        </div>
                        
                        <button
                            onClick={() => onRollComplete(result)}
                            className="w-full px-4 py-2 bg-viking-success text-white rounded font-semibold hover:bg-green-700"
                        >
                            Continuer
                        </button>
                    </>
                ) : (
                    <button
                        onClick={rollDice}
                        disabled={rolling}
                        className="w-full px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-50"
                    >
                        {rolling ? 'Lancement...' : '🎲 Lancer les dés'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default NPCAttackModal;
