// components/GMView/tabs/TabCombat.jsx - Onglet Combat (extrait de GMView)
import React from 'react';
import CombatControls from '../pj/CombatantControls.jsx';
import OnlinePlayersPanel from '../OnlinePlayersPanel.jsx';
import CombatantCard from '../pj/CombatantCard.jsx';
import RulesReference from '../RulesReference.jsx';
import AddNPCModal from '../npc/AddNPCModal.jsx';
import EditNPCModal from '../npc/EditNPCModal.jsx';
import NPCAttackModal from '../npc/NPCAttackModal.jsx';
import AttackValidationQueue from '../pj/AttackValidationQueue.jsx';
import ConfirmModal from '../../shared/ConfirmModal.jsx';

const TabCombat = ({
                       // State combat
                       combatState,
                       onlineCharacters,
                       pendingAttacks,
                       // Handlers combat
                       onStartCombat,
                       onNextTurn,
                       onEndCombat,
                       onAddCombatant,
                       onUpdateCombatant,
                       onRemoveCombatant,
                       onAddPlayerToCombat,
                       onValidateAttack,
                       onRejectAttack,
                       // NPC
                       onNPCAttack,
                       attackingNPC,
                       onNPCAttackSubmitted,
                       onCloseNPCAttack,
                       // Drag
                       onDragStart,
                       onDragOver,
                       onDragEnd,
                       // Modals state
                       showAddNPC,
                       onShowAddNPC,
                       onCloseAddNPC,
                       editingNPC,
                       onCloseEditNPC,
                       onUpdateEditingNPC,
                       showEndCombatConfirm,
                       onShowEndCombatConfirm,
                       onCloseEndCombatConfirm,
                   }) => {
    return (
        <>
            {/* Contrôles Combat */}
            <CombatControls
                combatState={combatState}
                onStartCombat={onStartCombat}
                onNextTurn={onNextTurn}
                onEndCombat={onShowEndCombatConfirm}
                canStartCombat={combatState.combatants.length > 0}
            />

            {/* Joueurs en ligne */}
            <OnlinePlayersPanel
                onlineCharacters={onlineCharacters}
                combatants={combatState.combatants}
                onAddPlayerToCombat={onAddPlayerToCombat}
                combatActive={combatState.active}
            />

            {/* Liste Combattants */}
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">
                        Combattants {combatState.combatants.length > 0 && `(${combatState.combatants.length})`}
                    </h2>
                    <button
                        onClick={onShowAddNPC}
                        className="px-3 py-1 bg-viking-bronze text-viking-brown rounded text-sm font-semibold hover:bg-viking-leather"
                    >
                        ➕ Ajouter
                    </button>
                </div>

                {combatState.combatants.length === 0 ? (
                    <div className="text-center p-8 text-viking-leather dark:text-viking-bronze">
                        Aucun combattant. Ajoutez des adversaires pour commencer.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {combatState.combatants.map((combatant, index) => (
                            <CombatantCard
                                key={combatant.id}
                                combatant={combatant}
                                isActive={index === combatState.currentTurnIndex}
                                onUpdate={(updates) => onUpdateCombatant(combatant.id, updates)}
                                onRemove={(id) => onRemoveCombatant(id)}
                                onEdit={(npc) => onCloseEditNPC(npc)}
                                onDragStart={() => onDragStart(index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                combatActive={combatState.active}
                                onNPCAttack={(npc) => onNPCAttack(npc)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Règles Référence */}
            <RulesReference />

            {/* --- Modals combat-only --- */}

            {showAddNPC && (
                <AddNPCModal
                    onClose={onCloseAddNPC}
                    onAdd={onAddCombatant}
                />
            )}

            {editingNPC && (
                <EditNPCModal
                    npc={editingNPC}
                    onClose={() => onCloseEditNPC(null)}
                    onUpdate={(updates) => onUpdateEditingNPC(updates)}
                />
            )}

            {/* File validation attaques */}
            <AttackValidationQueue
                pendingAttacks={pendingAttacks}
                combatState={combatState}
                onValidate={onValidateAttack}
                onReject={onRejectAttack}
            />

            {/* Modal attaque NPC */}
            {attackingNPC && (
                <NPCAttackModal
                    npc={attackingNPC}
                    combatState={combatState}
                    onClose={onCloseNPCAttack}
                    onAttackSubmitted={onNPCAttackSubmitted}
                />
            )}

            {/* Confirmation fin combat */}
            {showEndCombatConfirm && (
                <ConfirmModal
                    title="⏹️ Terminer le combat"
                    message="Êtes-vous sûr de vouloir terminer le combat ? Les actions restantes seront perdues."
                    onConfirm={onEndCombat}
                    onCancel={onCloseEndCombatConfirm}
                    confirmText="Terminer"
                    cancelText="Annuler"
                    danger={true}
                />
            )}
        </>
    );
};

export default TabCombat;