// GMDiceModal.js - Lanceur de dés simple pour MJ

import React, { useState, useEffect } from "react";

const GMDiceModal = ({ onClose, darkMode }) => {
    const { useState } = React;
    
    const [threshold, setThreshold] = useState(7);
    const [explosion, setExplosion] = useState(10);
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
            while (currentRoll >= explosion) {
                currentRoll = Math.floor(Math.random() * 10) + 1;
                rolls.push(currentRoll);
            }
        }
        
        // Compter succès
        const successes = rolls.filter(d => d >= threshold).length;
        
        setResult({
            rolls,
            successes
        });
        setRolling(false);
        
        // Si broadcast, envoyer à l'API pour historiser
        if (broadcast) {
            fetch('/api/dice/roll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: -1,
                    character_name: 'MJ',
                    roll_type: 'carac',
                    roll_target: 'Jet MJ',
                    pool: 3,
                    threshold,
                    results: rolls,
                    successes,
                    saga_spent: 0,
                    saga_recovered: 0
                })
            }).catch(err => console.error('Error broadcasting roll:', err));
        }
    };
    
    const reset = () => {
        setResult(null);
        // Relancer automatiquement
        setTimeout(() => rollDice(), 100);
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        🎲 Lanceur de dés MJ
                    </h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                {/* Configuration */}
                <div className="mb-4 space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                            Succès sur :
                        </label>
                        <select
                            value={threshold}
                            onChange={(e) => setThreshold(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                        >
                            <option value={4}>4+</option>
                            <option value={5}>5+</option>
                            <option value={6}>6+</option>
                            <option value={7}>7+</option>
                            <option value={8}>8+</option>
                            <option value={9}>9+</option>
                            <option value={10}>10</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">
                            Explosion sur :
                        </label>
                        <select
                            value={explosion}
                            onChange={(e) => setExplosion(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                        >
                            <option value={8}>8+</option>
                            <option value={9}>9+</option>
                            <option value={10}>10</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="broadcast"
                            checked={broadcast}
                            onChange={(e) => setBroadcast(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="broadcast" className="text-sm text-viking-brown dark:text-viking-parchment cursor-pointer">
                            📢 Partager le jet (historique visible par tous)
                        </label>
                    </div>
                </div>
                
                {/* Résultat */}
                {result && (
                    <div className="mb-4 p-4 bg-viking-bronze/20 rounded">
                        <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Dés : {result.rolls.join(', ')}
                        </div>
                        <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                            {result.successes} succès
                        </div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            (Seuil {threshold}+, Explosion {explosion}+)
                        </div>
                    </div>
                )}
                
                {/* Boutons */}
                <div className="flex gap-2">
                    {result ? (
                        <>
                            <button
                                onClick={reset}
                                className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather"
                            >
                                Nouveau jet
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-viking-success text-white rounded font-semibold hover:bg-green-700"
                            >
                                Fermer
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
        </div>
    );
};

export default GMDiceModal;
