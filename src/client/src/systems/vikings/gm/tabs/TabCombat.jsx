// src/client/src/systems/vikings/gm/tabs/TabCombat.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Onglet Combat — extrait de GMView.
// Step 11 : AddNPCModal + EditNPCModal remplacées par NPCModal.
//           NPCModal reçoit combatConfig pour les callbacks slug.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import CombatControls         from '../../../../components/gm/pj/CombatantControls.jsx';
import OnlinePlayersPanel     from '../../../../components/gm/OnlinePlayersPanel.jsx';
import CombatantCard          from '../../../../components/gm/pj/CombatantCard.jsx';
import RulesReference         from '../../../../components/gm/RulesReference.jsx';
import NPCModal               from '../../../../components/gm/npc/NPCModal.jsx';
import NPCAttackModal         from '../../../../components/gm/npc/NPCAttackModal.jsx';
import AttackValidationQueue  from '../../../../components/gm/pj/AttackValidationQueue.jsx';
import ConfirmModal           from '../../../../components/modals/ConfirmModal.jsx';

const TabCombat = ({
                       // State combat
                       combatState,
                       onlineCharacters,
                       combatConfig,
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
                       // NPC attaque
                       onNPCAttack,
                       attackingNPC,
                       onNPCAttackSubmitted,
                       onCloseNPCAttack,
                       // Drag
                       onDragStart,
                       onDragOver,
                       onDragEnd,
                       // Modal NPC (bibliothèque)
                       showNPCModal,
                       onShowNPCModal,
                       onCloseNPCModal,
                       // Confirmation fin combat
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
                canStartCombat={combatState.combatants?.length > 0}
            />

            {/* Joueurs en ligne */}
            <OnlinePlayersPanel
                onlineCharacters={onlineCharacters}
                combatState={combatState}
                onAddPlayerToCombat={onAddPlayerToCombat}
            />

            {/* Liste combattants */}
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">
                        Combattants {combatState.combatants?.length > 0 && `(${combatState.combatants.length})`}
                    </h2>
                    <button
                        onClick={(e) => { e.stopPropagation(); onShowNPCModal(); }}
                        className="px-3 py-1 bg-viking-bronze text-viking-brown rounded text-sm font-semibold hover:bg-viking-leather"
                    >
                        ➕ Ajouter
                    </button>
                </div>
                {!combatState.combatants?.length ? (
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
                                onEdit={() => {}}          // édition inline — plus d'EditNPCModal
                                onDragStart={() => onDragStart(index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                combatActive={combatState.active}
                                onNPCAttack={(npc) => onNPCAttack(npc)}
                                combatConfig={combatConfig}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Modals ─────────────────────────────────────────────────── */}

            {/* Bibliothèque NPC — remplace AddNPCModal + EditNPCModal */}
            {showNPCModal && (
                <NPCModal
                    onClose={onCloseNPCModal}
                    onAddCombatant={onAddCombatant}
                    combatConfig={combatConfig}
                />
            )}

            {/* File validation attaques joueurs */}
            <AttackValidationQueue
                pendingAttacks={pendingAttacks}
                combatState={combatState}
                combatConfig={combatConfig}
                onValidate={onValidateAttack}
                onReject={onRejectAttack}
            />

            {/* Modal attaque NPC */}
            {attackingNPC && (
                <NPCAttackModal
                    npc={attackingNPC}
                    combatState={combatState}
                    combatConfig={combatConfig}
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
                />
            )}
        </>
    );
};

export default TabCombat;