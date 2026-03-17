// src/client/src/systems/tecumah/components/gm/tabs/TabCombat.jsx
// Onglet Combat GM — pattern identique à Vikings/TabCombat.
// Composant pur : reçoit tous les handlers depuis GMView.
// Tout l'état et les appels API sont dans GMView.

import React from 'react';
import CombatControls        from '../../../../../components/gm/pj/CombatantControls.jsx';
import OnlinePlayersPanel    from '../../../../../components/gm/OnlinePlayersPanel.jsx';
import CombatantCard         from '../../../../../components/gm/pj/CombatantCard.jsx';
import NPCModal              from '../../../../../components/gm/npc/NPCModal.jsx';
import NPCAttackModal        from '../../../../../components/gm/npc/NPCAttackModal.jsx';
import AttackValidationQueue from '../../../../../components/gm/pj/AttackValidationQueue.jsx';
import ConfirmModal          from '../../../../../components/modals/ConfirmModal.jsx';

const TabCombat = ({
                       // State
                       combatState,
                       onlineCharacters,
                       combatConfig,
                       pendingAttacks,
                       // Handlers combat
                       onStartCombat,
                       onNextTurn,
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
                       // Modal NPC
                       showNPCModal,
                       onShowNPCModal,
                       onCloseNPCModal,
                       // Confirmation fin combat
                       showEndCombatConfirm,
                       onShowEndCombatConfirm,
                       onCloseEndCombatConfirm,
                   }) => {
    const canStart = combatState.combatants?.length > 0;

    return (
        <>
            {/* ── Contrôles ──────────────────────────────────────────────── */}
            <CombatControls
                combatState={combatState}
                canStartCombat={canStart}
                onStartCombat={onStartCombat}
                onNextTurn={onNextTurn}
                onEndCombat={onShowEndCombatConfirm}
            />

            {/* ── Joueurs en ligne ────────────────────────────────────────── */}
            <OnlinePlayersPanel
                onlineCharacters={onlineCharacters}
                combatState={combatState}
                onAddPlayer={onAddPlayerToCombat}
            />

            {/* ── Bouton ajouter NPC ──────────────────────────────────────── */}
            <div className="flex justify-end mb-3">
                <button
                    onClick={onShowNPCModal}
                    className="px-4 py-2 rounded text-sm font-semibold"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                    + Ajouter un NPC
                </button>
            </div>

            {/* ── Liste combattants ───────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
                {combatState.combatants?.length === 0 ? (
                    <p className="text-center py-8 text-muted text-sm">
                        Aucun combattant. Ajoutez des adversaires pour commencer.
                    </p>
                ) : (
                    combatState.combatants.map((combatant, index) => (
                        <CombatantCard
                            key={combatant.id}
                            combatant={combatant}
                            isActive={index === combatState.currentTurnIndex}
                            combatActive={combatState.active}
                            combatConfig={combatConfig}
                            onUpdate={(updates) => onUpdateCombatant(combatant.id, updates)}
                            onRemove={(id) => onRemoveCombatant(id)}
                            onEdit={() => {}}
                            onNPCAttack={(npc) => onNPCAttack(npc)}
                            onDragStart={() => onDragStart(index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDragEnd={onDragEnd}
                        />
                    ))
                )}
            </div>

            {/* ── File validation attaques ────────────────────────────────── */}
            <AttackValidationQueue
                pendingAttacks={pendingAttacks}
                combatState={combatState}
                combatConfig={combatConfig}
                onValidate={onValidateAttack}
                onReject={onRejectAttack}
            />

            {/* ── Modales ─────────────────────────────────────────────────── */}
            {showNPCModal && (
                <NPCModal
                    onClose={onCloseNPCModal}
                    onAddCombatant={onAddCombatant}
                    combatConfig={combatConfig}
                />
            )}

            {attackingNPC && (
                <NPCAttackModal
                    npc={attackingNPC}
                    combatState={combatState}
                    combatConfig={combatConfig}
                    onClose={onCloseNPCAttack}
                    onAttackSubmitted={onNPCAttackSubmitted}
                />
            )}

            {showEndCombatConfirm && (
                <ConfirmModal
                    title="⏹️ Terminer le combat"
                    message="Êtes-vous sûr de vouloir terminer le combat ? Les actions en cours seront perdues."
                    onConfirm={() => { onCloseEndCombatConfirm(); /* GMView gère endCombat */ }}
                    onCancel={onCloseEndCombatConfirm}
                />
            )}
        </>
    );
};

export default TabCombat;