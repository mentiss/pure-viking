// CombatPanel.js - Panneau combat côté joueurs
import React, { useState, useEffect } from "react";
import AttackModal from "../../components/AttackModal.jsx";
import DiceModal from "./components/modals/DiceModal.jsx";
import {useSocket} from "../../context/SocketContext.jsx";
import {toSystemUrl, useFetch} from "../../hooks/useFetch.js";

const Combat = ({ character, onUpdateCharacter, onOpenDice }) => {
    const { useState, useEffect } = React;
    
    const [combatState, setCombatState] = useState({
        active: false,
        round: 0,
        currentTurnIndex: -1,
        combatants: []
    });
    
    const [showPostureModal, setShowPostureModal] = useState(false);
    const [showAttackModal, setShowAttackModal] = useState(false);
    
    // Charger état combat initial
    useEffect(() => {
        const loadCombatState = async () => {
            try {
                const res = await fetch(toSystemUrl('/api/combat'));
                const data = await res.json();
                setCombatState(data);
            } catch (error) {
                console.error('Error loading combat state:', error);
            }
        };
        
        loadCombatState();
    }, []);
    
    // Socket globale
    const socket = useSocket();
    const fetchWithAuth = useFetch();
    
    // WebSocket listener
    useEffect(() => {
        if (!socket) return;
        
        const handleCombatUpdate = (state) => {
            setCombatState(state);
        };
        
        socket.on('combat-update', handleCombatUpdate);
        
        return () => {
            socket.off('combat-update', handleCombatUpdate);
        };
    }, [socket]);
    
    // Trouver le combattant du joueur actuel
    const myCombatant = combatState.combatants.find(c => 
        c.type === 'player' && c.characterId === character.id
    );
    
    const currentCombatant = combatState.combatants[combatState.currentTurnIndex];
    const isMyTurn = myCombatant && currentCombatant && myCombatant.id === currentCombatant.id;

    const berserkBonus = myCombatant?.activeStates?.some(s => s.name === 'Berserk') ? 1 : 0;

    const currentArmor = (myCombatant?.armure || 0) + (berserkBonus * 2);
    const currentSeuil = (myCombatant?.seuil || 0) + (berserkBonus * 1);
    const ignoreBlessures = berserkBonus === 1;
    
    const useAction = async () => {
        if (!myCombatant || myCombatant.actionsRemaining <= 0) return;
        
        try {
            await fetchWithAuth('/api/combat/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    combatantId: myCombatant.id,
                    actionType: 'generic'
                })
            });
        } catch (error) {
            console.error('Error using action:', error);
        }
    };
    
    const activatePosture = async (type, value, skill) => {
        if (!myCombatant || myCombatant.actionsRemaining <= 0) return;
        
        try {
            await fetchWithAuth('/api/combat/posture-defensive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({
                    combatantId: myCombatant.id,
                    type,
                    value
                })
            });
            setShowPostureModal(false);
        } catch (error) {
            console.error('Error activating posture:', error);
        }
    };

    const activateBerserk = async () => {
        if (!myCombatant) return;

        const berserkState = { name: 'Berserk', duration: 5 };
        const currentStates = myCombatant.activeStates || [];

        console.log(currentStates, berserkState);

        try {
            // On tape sur l'API de combat, PAS sur celle du personnage
            await fetchWithAuth(`/api/combat/combatant/${myCombatant.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updates: {
                        activeStates: [...currentStates, berserkState],
                        actionsMax: myCombatant.actionsMax + 2,
                        actionsRemaining: myCombatant.actionsRemaining + 2
                    }
                })
            });
        } catch (error) {
            console.error('Erreur activation Berserker:', error);
        }
    };
    
    const handleAttack = () => {
        setShowAttackModal(true);
    };
    
    const handleAttackSubmitted = async (attackData) => {
        try {
            await fetchWithAuth('/api/combat/submit-attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attack: attackData })
            });
            
            // Consommer action
            useAction();
        } catch (error) {
            console.error('Error submitting attack:', error);
        }
    };
    
    if (!combatState.active) return null;
    
    return (
        <div className="fixed bottom-4 left-4 w-96 bg-white dark:bg-viking-brown border-4 border-viking-bronze rounded-lg shadow-2xl z-40 max-h-[80vh] overflow-y-auto">
            <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        ⚔️ Combat
                    </h3>
                    <div className="text-sm text-viking-leather dark:text-viking-bronze">
                        Round {combatState.round}
                    </div>
                </div>
                
                {/* Tour actuel */}
                <div className="mb-3 p-2 bg-viking-bronze/20 rounded text-sm">
                    <div className="font-semibold text-viking-brown dark:text-viking-parchment">
                        Tour actuel: {currentCombatant?.name || 'Aucun'}
                    </div>
                    {isMyTurn && (
                        <div className="text-viking-success font-bold">
                            ▶️ C'est votre tour !
                        </div>
                    )}
                </div>
                
                {/* Ordre initiative */}
                <div className="mb-3">
                    <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                        Ordre Initiative
                    </div>
                    <div className="space-y-1 text-sm">
                        {combatState.combatants.map((c, index) => {
                            const isMe = myCombatant && c.id === myCombatant.id;
                            const isCurrent = index === combatState.currentTurnIndex;
                            
                            return (
                                <div
                                    key={c.id}
                                    className={`p-2 rounded flex justify-between items-center ${
                                        isCurrent 
                                            ? 'bg-viking-bronze/30 border border-viking-bronze' 
                                            : 'bg-viking-parchment dark:bg-gray-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isCurrent && <span>▶️</span>}
                                        <span className={`${isMe ? 'font-bold text-viking-bronze' : 'text-viking-text dark:text-viking-parchment'}`}>
                                            {c.name} {isMe && '(Vous)'}
                                        </span>
                                    </div>
                                    {c.type === 'player' && (
                                        <span className="text-xs text-viking-leather dark:text-viking-bronze">
                                            {c.actionsRemaining}/{c.actionsMax} actions
                                        </span>
                                    )}
                                    {c.type === 'npc' && (
                                        <span className="text-xs text-viking-leather dark:text-viking-bronze">
                                            Adversaire
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Actions disponibles */}
                {myCombatant && (
                    <>
                        <div className="mb-3">
                            <div className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                Vos Actions ({myCombatant.actionsRemaining}/{myCombatant.actionsMax})
                            </div>
                            
                            <div className="space-y-2">
                                <button
                                    onClick={handleAttack}
                                    disabled={!isMyTurn || myCombatant.actionsRemaining === 0}
                                    className="w-full px-3 py-2 bg-viking-danger text-white rounded font-semibold hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                >
                                    ⚔️ Attaquer
                                </button>
                                
                                <button
                                    onClick={() => setShowPostureModal(true)}
                                    disabled={!isMyTurn || myCombatant.actionsRemaining === 0 || myCombatant.postureDefensive}
                                    className="w-full px-3 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                >
                                    🛡️ Posture Défensive
                                    {myCombatant.postureDefensive && ' (Actif)'}
                                </button>
                                
                                <button
                                    onClick={useAction}
                                    disabled={!isMyTurn || myCombatant.actionsRemaining === 0}
                                    className="w-full px-3 py-2 bg-viking-leather text-viking-parchment rounded font-semibold hover:bg-viking-bronze disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                >
                                    🏃 Autre Action
                                </button>
                                {/* Bouton conditionnel : si le perso a le trait ET que ce n'est pas déjà actif */}
                                {character.traits.some(t => t.name === 'Berserk') &&
                                    !myCombatant?.activeStates?.some(s => s.name === 'Berserk') && (
                                        <button
                                            onClick={activateBerserk}
                                            className="mt-2 w-full py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded shadow-lg transition-colors"
                                        >
                                            ACTIVER BERSERK
                                        </button>
                                )}
                            </div>
                        </div>
                        
                        {/* État */}
                        <div className="p-3 bg-viking-parchment dark:bg-gray-800 rounded text-sm">
                            <div className="font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                Votre État
                            </div>

                            <div className="space-y-1 text-viking-brown dark:text-viking-parchment">
                                {/* Affichage des états temporaires */}
                                <div className="flex gap-2 mb-2">
                                    {myCombatant?.activeStates?.map((s, i) => (
                                        <span key={i} className="px-2 py-1 bg-red-600 text-white text-xs rounded-full animate-pulse">
                                        🔥 {s.name} ({s.duration} tr)
                                    </span>
                                    ))}
                                </div>
                                <div className="flex justify-between">
                                    <span>Blessure:</span>
                                    <span className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span
                                                key={i}
                                                className={`${i < (myCombatant.blessure || 0) ? 'text-viking-danger' : 'text-gray-300 dark:text-gray-600'}`}
                                            >
                                                ■
                                            </span>
                                        ))}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Fatigue:</span>
                                    <span className="flex gap-0.5">
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <span
                                                key={i}
                                                className={`${i < (myCombatant.fatigue || 0) ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}
                                            >
                                                ■
                                            </span>
                                        ))}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Armure:</span>
                                    <span className="font-bold">{currentArmor || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Seuil:</span>
                                    <span className="font-bold">{currentSeuil || 1}</span>
                                </div>
                                {myCombatant.postureDefensive && (
                                    <div className="flex justify-between text-viking-success">
                                        <span>Posture Défensive:</span>
                                        <span className="font-bold">
                                            +{myCombatant.postureDefensiveValue} seuil ({myCombatant.postureDefensiveType})
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            {/* Modal Posture Défensive */}
            {showPostureModal && (
                <PostureDefensiveModal
                    character={character}
                    isBerserk={berserkBonus}
                    onClose={() => setShowPostureModal(false)}
                    onActivate={activatePosture}
                />
            )}
            
            {/* Modal Attaque */}
            {showAttackModal && myCombatant && (
                <AttackModal
                    character={character}
                    combatState={combatState}
                    myCombatant={myCombatant}
                    onClose={() => setShowAttackModal(false)}
                    onAttackSubmitted={handleAttackSubmitted}
                />
            )}
        </div>
    );
};

// Modal Posture Défensive
export const PostureDefensiveModal = ({ character, isBerserk, onClose, onActivate }) => {
    const { useState } = React;
    const [type, setType] = useState('passif');
    const [showDiceModal, setShowDiceModal] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState(null);
    
    // Trouver toutes les compétences de combat CàC
    const combatSkills = character.skills?.filter(s => 
        s.name === 'Combat' && (s.specialization === 'CàC armé' || s.specialization === 'CàC non armé')
    ) || [];
    
    // Sélectionner la première par défaut
    const defaultSkill = combatSkills[0];
    const activeSkill = selectedSkill || defaultSkill;
    const passifValue = activeSkill ? Math.min(3, Math.floor(activeSkill.level / 2)) : 0;
    
    const handleActivate = () => {
        if (type === 'passif') {
            onActivate('passif', passifValue, activeSkill);
            onClose();
        } else {
            // Pour actif, ouvrir DiceModal
            setShowDiceModal(true);
        }
    };
    
    const handleDiceRollComplete = (result) => {
        // result contient baseSuccesses
        const mr = result.baseSuccesses;
        onActivate('actif', mr, activeSkill);
        setShowDiceModal(false);
        onClose();
    };
    
    if (showDiceModal) {
        return (
            <DiceModal
                character={character}
                isBerserk={isBerserk}
                onClose={() => {
                    setShowDiceModal(false);
                    onClose();
                }}
                onUpdate={() => {}}
                context={{
                    type: 'posture-defensive',
                    skill: activeSkill,
                    onRollComplete: handleDiceRollComplete
                }}
            />
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        🛡️ Posture Défensive
                    </h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="mb-4 text-sm text-viking-text dark:text-viking-parchment">
                    Choisissez le type de posture défensive :
                </div>
                
                {/* Sélection compétence si plusieurs */}
                {combatSkills.length > 1 && (
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Compétence de combat :
                        </label>
                        <select
                            value={combatSkills.indexOf(activeSkill)}
                            onChange={(e) => setSelectedSkill(combatSkills[e.target.value])}
                            className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                        >
                            {combatSkills.map((skill, i) => (
                                <option key={i} value={i}>
                                    {skill.name} - {skill.specialization} (Niv {skill.level})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div className="space-y-3 mb-4">
                    <button
                        onClick={() => setType('passif')}
                        className={`w-full p-3 rounded border-2 text-left ${
                            type === 'passif'
                                ? 'border-viking-bronze bg-viking-bronze/20'
                                : 'border-viking-leather dark:border-viking-bronze'
                        }`}
                    >
                        <div className="font-bold text-viking-brown dark:text-viking-parchment mb-1">
                            Passif
                        </div>
                        <div className="text-sm text-viking-text dark:text-viking-parchment">
                            Seuil attaquant = Seuil + {passifValue}
                        </div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            ({activeSkill?.name} {activeSkill?.level} / 2 = {passifValue}, max 3)
                        </div>
                    </button>
                    
                    <button
                        onClick={() => setType('actif')}
                        className={`w-full p-3 rounded border-2 text-left ${
                            type === 'actif'
                                ? 'border-viking-bronze bg-viking-bronze/20'
                                : 'border-viking-leather dark:border-viking-bronze'
                        }`}
                    >
                        <div className="font-bold text-viking-brown dark:text-viking-parchment mb-1">
                            Actif
                        </div>
                        <div className="text-sm text-viking-text dark:text-viking-parchment">
                            Jet Combat CàC, si 1+ succès → Seuil attaquant = Seuil + MR
                        </div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            (Nécessite jet de dés)
                        </div>
                    </button>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded font-semibold hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleActivate}
                        className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather"
                    >
                        Activer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Combat;
