// components/gm/combat/CombatantCard.jsx - Card d'un combattant (vue MJ)
import React, {useState} from 'react';
import ConfirmModal from "../../modals/ConfirmModal.jsx";

const CombatantCard = ({
                           combatant,
                           isActive,
                           onUpdate,
                           onRemove,
                           onEdit,
                           onDragStart,
                           onDragOver,
                           onDragEnd,
                           combatActive,
                           onNPCAttack
                       }) => {
    const isPlayer = combatant.type === 'player';
    const isBerserk = combatant.activeStates?.some(s => s.name === 'Berserk');
    const [showConfirmRemove, setShowConfirmRemove] = useState(false);

    const applyDamage = (amount) => {
        const newBlessure = Math.max(0, Math.min(combatant.blessureMax || 5, combatant.blessure + amount));
        onUpdate({ blessure: newBlessure });
    };

    const applyFatigue = (amount) => {
        const newFatigue = Math.max(0, Math.min(9, (combatant.fatigue || 0) + amount));
        onUpdate({ fatigue: newFatigue });
    };

    const burnAction = () => {
        if (combatant.actionsRemaining > 0) {
            onUpdate({ actionsRemaining: combatant.actionsRemaining - 1 });
        }
    };

    return (
        <div
            draggable={!combatActive}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            className={`p-3 rounded-lg border-2 transition-all ${
                isActive
                    ? 'bg-viking-bronze/20 border-viking-bronze'
                    : 'bg-viking-parchment dark:bg-gray-800 border-viking-leather dark:border-viking-bronze'
            } ${!combatActive ? 'cursor-move' : ''}`}
        >
            {/* En-tête */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {isActive && <span className="text-xl">▶️</span>}
                    {/* Avatar pour joueurs */}
                    {isPlayer && combatant.avatar && (
                        <img
                            src={combatant.avatar}
                            alt={combatant.name}
                            className="w-10 h-10 rounded-full border-2 border-viking-bronze flex-shrink-0"
                        />
                    )}
                    <div>
                        <div className="font-bold text-viking-brown dark:text-viking-parchment">
                            {combatant.name}
                            {isBerserk && combatant.activeStates?.map((state, i) => (
                                <span key={i} className="text-[10px] bg-red-600 text-white px-1 rounded-full animate-pulse ml-2" title={state.name}>
                                    🔥 BERSERK {state.duration}
                                </span>
                            ))}
                        </div>
                        {isPlayer && (
                            <div className="text-xs text-viking-bronze">
                                {combatant.playerName}
                            </div>
                        )}
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">
                            Initiative: {combatant.initiative} | Actions: {combatant.actionsRemaining}/{combatant.actionsMax} {isBerserk && <span className="ml-1 text-[10px]">(+2 Berserk)</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    {!isPlayer && (
                        <>
                            <button
                                onClick={() => onEdit(combatant)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                                ✏️
                            </button>
                            {combatActive && (
                                <button
                                    onClick={() => onNPCAttack(combatant)}
                                    className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                                    title="Attaquer"
                                >
                                    ⚔️
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={() => setShowConfirmRemove(true)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 text-sm mb-2">
                <div>
                    <div className="text-xs text-viking-leather dark:text-viking-bronze">Blessure</div>
                    <div className="flex gap-0.5">
                        {Array.from({ length: combatant.blessureMax || 5 }).map((_, i) => (
                            <span
                                key={i}
                                className={`text-lg ${i < combatant.blessure ? 'text-viking-danger' : 'text-gray-300 dark:text-gray-600'}`}
                            >
                                ■
                            </span>
                        ))}
                    </div>
                </div>
                {isPlayer && (
                    <div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">Fatigue</div>
                        <div className="flex gap-0.5">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <span
                                    key={i}
                                    className={`text-lg ${i < (combatant.fatigue || 0) ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}
                                >
                                    ■
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <div className="text-xs text-viking-leather dark:text-viking-bronze">Armure</div>
                    <div className="font-bold text-viking-brown dark:text-viking-parchment">{combatant.armure + (isBerserk ? 2 : 0)}</div>
                </div>
                <div>
                    <div className="text-xs text-viking-leather dark:text-viking-bronze">Seuil</div>
                    <div className="font-bold text-viking-brown dark:text-viking-parchment">
                        {combatant.seuil + (isBerserk ? 1 : 0)}
                        {combatant.postureDefensive && (
                            <span className="text-xs text-viking-success ml-1">
                                +{combatant.postureDefensiveValue} (Déf {combatant.postureDefensiveType})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* États actifs */}
            {combatant.activeStates && combatant.activeStates.length > 0 && (
                <div className="mt-2 pt-2 border-t border-viking-leather/30 dark:border-viking-bronze/30">
                    <div className="text-xs font-semibold mb-1 text-viking-brown dark:text-viking-parchment">États actifs:</div>
                    <div className="flex flex-wrap gap-1">
                        {combatant.activeStates.map((state, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-0.5 bg-viking-bronze/30 text-viking-brown dark:text-viking-parchment text-xs rounded"
                            >
                                {state.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions rapides */}
            {combatActive && (
                <div className="flex gap-1 flex-wrap">
                    <button
                        onClick={() => applyDamage(1)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                        +1 Blessure
                    </button>
                    <button
                        onClick={() => applyDamage(-1)}
                        className="px-2 py-1 bg-viking-success text-white rounded text-xs hover:bg-green-700"
                    >
                        -1 Blessure
                    </button>
                    {isPlayer && (
                        <>
                            <button
                                onClick={() => applyFatigue(1)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                                +1 Fatigue
                            </button>
                            <button
                                onClick={() => applyFatigue(-1)}
                                className="px-2 py-1 bg-blue-300 text-white rounded text-xs hover:bg-blue-400"
                            >
                                -1 Fatigue
                            </button>
                        </>
                    )}
                    <button
                        onClick={burnAction}
                        disabled={combatant.actionsRemaining === 0}
                        className="px-2 py-1 bg-viking-leather text-viking-parchment rounded text-xs hover:bg-viking-bronze disabled:opacity-30"
                    >
                        Burn Action
                    </button>
                    {!isPlayer && combatant.attaques && combatant.attaques.length > 0 && onNPCAttack && (
                        <button
                            onClick={() => onNPCAttack(combatant)}
                            disabled={combatant.actionsRemaining === 0}
                            className="px-2 py-1 bg-viking-danger text-white rounded text-xs hover:bg-red-700 disabled:opacity-30"
                        >
                            ⚔️ Attaquer
                        </button>
                    )}
                </div>
            )}


            {/* Modale de confirmation suppression */}
            {showConfirmRemove && (
                <ConfirmModal
                    title="🗑️ Retirer du combat"
                    message={`Voulez-vous retirer ${combatant.name} du combat ?`}
                    onConfirm={() => {
                        onRemove(combatant.id);
                        setShowConfirmRemove(false);
                    }}
                    onCancel={() => setShowConfirmRemove(false)}
                    confirmText="Retirer"
                    cancelText="Annuler"
                    danger={true}
                />
            )}
        </div>
    );
};

export default CombatantCard;