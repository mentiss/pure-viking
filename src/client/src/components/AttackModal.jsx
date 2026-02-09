// AttackModal.js - Modal attaque combinée (jet + cible)
import React, {useState, useEffect} from 'react';
import DiceModal from './DiceModal';
import TargetSelectionModal from './shared/TargetSelectionModal.jsx';

const AttackModal = ({ character, combatState, myCombatant, onClose, onAttackSubmitted }) => {
    const { useState } = React;
    
    const [step, setStep] = useState('roll'); // 'roll' | 'target'
    const [rollResult, setRollResult] = useState(null);
    const [showDiceModal, setShowDiceModal] = useState(true);

    const isBerserk = !!myCombatant?.activeStates?.some(s => s.name === 'Berserk');
    
    const handleRollComplete = (result) => {
        setRollResult(result);
        setShowDiceModal(false);
        setStep('target');
    };
    
    const handleTargetConfirm = (targetData) => {
        // Envoyer au backend
        onAttackSubmitted({
            attackerId: myCombatant.id,
            attackerName: myCombatant.name,
            ...targetData
        });
        onClose();
    };
    
    if (step === 'roll' && showDiceModal) {
        return (
            <DiceModal
                character={character}
                isBerserk={isBerserk}
                onClose={onClose}
                onUpdate={() => {}}
                context={{
                    type: 'combat-attack',
                    onRollComplete: handleRollComplete
                }}
            />
        );
    }
    
    if (step === 'target' && rollResult) {
        return (
            <TargetSelectionModal
                combatState={combatState}
                attackerCombatant={myCombatant}
                rollResult={rollResult}
                character={character}
                onConfirm={handleTargetConfirm}
                onClose={onClose}
            />
        );
    }
    
    return null;
};

export default AttackModal;