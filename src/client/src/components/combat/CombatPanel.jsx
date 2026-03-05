// src/client/src/components/combat/CombatPanel.jsx
// Panneau combat générique côté joueur.
//
// Responsabilités :
//   - Charge l'état combat initial (GET /combat) et écoute combat-update
//   - Identifie le combattant du joueur local dans la liste
//   - Affiche round, tour actif, liste combattants (via CombatantList)
//   - Itère combatConfig.actions → boutons filtrés par condition()
//   - Bouton "Autre action" si canBurnAction() truthy
//   - Bouton "Attaquer" si attack.condition() truthy et actionsRemaining > 0
//   - Gère openModal(id) → instancie le Modal déclaré dans l'action slug
//   - Délègue le flow attaque à useAttackFlow
//   - Délègue l'opportunité de défense à useDefenseOpportunity
//   - Collapse local (non persisté) pour accéder au reste de la fiche
//
// Ce composant ne contient aucun import système.
//
// Props :
//   character    {object}  — personnage complet du joueur
//   combatConfig {object}  — vikingsConfig.combat (injecté par Sheet.jsx)

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket }    from '../../context/SocketContext.jsx';
import { useFetch }     from '../../hooks/useFetch.js';
import { useSystem }    from '../../hooks/useSystem.js';
import { useAttackFlow }          from '../../hooks/useAttackFlow.js';
import { useDefenseOpportunity }  from '../../hooks/useDefenseOpportunity.js';
import CombatantList    from './CombatantList.jsx';
import TargetSelectionModal from './TargetSelectionModal.jsx';

// ─── Composant principal ─────────────────────────────────────────────────────

const CombatPanel = ({ character, combatConfig, sessionId = null }) => {
    const { apiBase }      = useSystem();
    const socket           = useSocket();
    const fetchWithAuth    = useFetch();

    // ── État combat ──────────────────────────────────────────────────────────
    const [combatState, setCombatState] = useState({
        active: false,
        round: 0,
        currentTurnIndex: -1,
        combatants: [],
        pendingAttacks: [],
    });

    // ── UI locale ────────────────────────────────────────────────────────────
    const [collapsed,     setCollapsed]     = useState(false);
    const [activeModalId, setActiveModalId] = useState(null); // id de l'action slug ouverte

    // ── Chargement initial ───────────────────────────────────────────────────
    useEffect(() => {
        fetchWithAuth(`${apiBase}/combat`)
            .then(r => r.json())
            .then(data => setCombatState(data))
            .catch(err => console.error('[CombatPanel] Error loading combat state:', err));
    }, [apiBase]);

    // ── Écoute socket ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handler = (state) => setCombatState(state);
        socket.on('combat-update', handler);
        return () => socket.off('combat-update', handler);
    }, [socket]);

    // ── Combattant local ─────────────────────────────────────────────────────
    const myCombatant = combatState.combatants.find(
        c => c.type === 'player' && c.characterId === character?.id
    ) ?? null;

    const currentCombatant = combatState.combatants[combatState.currentTurnIndex] ?? null;
    const isMyTurn = myCombatant && currentCombatant && myCombatant.id === currentCombatant.id;

    // ── Flow attaque ─────────────────────────────────────────────────────────
    const attackConfig = combatConfig?.attack ?? null;

    const flow = useAttackFlow({
        character,
        combatant:    myCombatant,
        combatState,
        attackConfig,
        fetchWithAuth,
        apiBase,
    });

    // ── Opportunité de défense ───────────────────────────────────────────────
    const defense = useDefenseOpportunity({
        combatConfig,
        socket,
        fetchWithAuth,
        apiBase,
        myCombatantId: myCombatant?.id ?? null,
    });

    // ── Burn d'action générique ("Autre action") ─────────────────────────────
    const handleBurnAction = useCallback(async () => {
        if (!myCombatant) return;
        try {
            await fetchWithAuth(`${apiBase}/combat/action`, {
                method: 'POST',
                body: JSON.stringify({ combatantId: myCombatant.id }),
            });
            // Effet secondaire slug optionnel
            if (combatConfig?.onBurnAction) {
                await combatConfig.onBurnAction({ combatant: myCombatant, fetchWithAuth, apiBase });
            }
        } catch (err) {
            console.error('[CombatPanel] Error burning action:', err);
        }
    }, [myCombatant, combatConfig, fetchWithAuth, apiBase]);

    // ── Si combat inactif → rien à afficher ─────────────────────────────────
    if (!combatState.active) return null;

    // ── Conditions d'affichage des boutons ───────────────────────────────────
    const canAttack = myCombatant
        && isMyTurn
        && myCombatant.actionsRemaining > 0
        && (attackConfig?.condition?.(character, myCombatant, combatState) ?? false);

    const canBurn = myCombatant
        && isMyTurn
        && (combatConfig?.canBurnAction
            ? combatConfig.canBurnAction({ combatant: myCombatant })
            : myCombatant.actionsRemaining > 0);

    // ── Modal slug active (actions déclarées dans combatConfig.actions) ──────
    const activeAction = combatConfig?.actions?.find(a => a.id === activeModalId) ?? null;
    const ActiveModal  = activeAction?.Modal ?? null;

    // ── Contexte partagé pour les callbacks slug ─────────────────────────────
    const slugCtx = {
        character,
        combatant:  myCombatant,
        combatState,
        fetchWithAuth,
        apiBase,
        socket,
        openModal: setActiveModalId,
    };

    return (
        <div className="fixed bottom-4 left-4 w-96 bg-white dark:bg-viking-brown border-4 border-viking-bronze rounded-lg shadow-2xl z-40 max-h-[80vh] overflow-y-auto">

            {/* ── Header (toujours visible) ── */}
            <button
                onClick={() => setCollapsed(c => !c)}
                className="w-full flex items-center justify-between px-4 py-2 bg-viking-bronze/20 hover:bg-viking-bronze/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-viking-brown dark:text-viking-parchment">
                        ⚔️ Combat
                    </span>
                    <span className="text-sm text-viking-leather dark:text-viking-bronze">
                        Round {combatState.round}
                    </span>
                    {currentCombatant && (
                        <span className="text-xs text-viking-leather dark:text-viking-bronze">
                            — Tour : <strong>{currentCombatant.name}</strong>
                            {isMyTurn && (
                                <span className="ml-1 text-viking-success font-semibold">
                                    (Votre tour !)
                                </span>
                            )}
                        </span>
                    )}
                </div>
                <span className="text-viking-leather dark:text-viking-bronze">
                    {collapsed ? '▲' : '▼'}
                </span>
            </button>

            {/* ── Corps (collapsible) ── */}
            {!collapsed && (
                <div className="p-3 space-y-3">

                    {/* Liste des combattants */}
                    <CombatantList
                        combatState={combatState}
                        myCharacterId={character?.id}
                        renderHealthDisplay={combatConfig?.renderHealthDisplay ?? null}
                    />

                    {/* Mes actions (seulement si je suis dans le combat) */}
                    {myCombatant && (
                        <div className="border-t border-viking-bronze/30 pt-3 space-y-2">

                            {/* Compteur d'actions */}
                            {myCombatant.actionsMax > 0 && (
                                <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                    Actions : {myCombatant.actionsRemaining}/{myCombatant.actionsMax}
                                </div>
                            )}

                            {/* États actifs */}
                            {myCombatant.activeStates?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {myCombatant.activeStates.map(s => (
                                        <span
                                            key={s.id}
                                            className="px-2 py-0.5 bg-viking-bronze/30 text-viking-brown dark:text-viking-parchment text-xs rounded"
                                        >
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Bouton Attaquer */}
                            {attackConfig && (
                                <button
                                    onClick={flow.startAttack}
                                    disabled={!canAttack || flow.step !== 'idle'}
                                    className="w-full px-3 py-2 bg-viking-danger text-white rounded font-semibold hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                >
                                    ⚔️ Attaquer
                                    {flow.step === 'submitting' && (
                                        <span className="ml-2 text-xs opacity-70">Envoi…</span>
                                    )}
                                </button>
                            )}

                            {/* Actions slug déclarées */}
                            {combatConfig?.actions?.map(action => {
                                const visible = action.condition?.(character, myCombatant, combatState) ?? true;
                                if (!visible) return null;
                                return (
                                    <button
                                        key={action.id}
                                        disabled={!isMyTurn}
                                        onClick={() => action.onAction?.(slugCtx)}
                                        className="w-full px-3 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                    >
                                        {action.label}
                                    </button>
                                );
                            })}

                            {/* Bouton "Autre action" générique */}
                            <button
                                onClick={handleBurnAction}
                                disabled={!canBurn}
                                className="w-full px-3 py-2 bg-viking-leather text-viking-parchment rounded font-semibold hover:bg-viking-bronze disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                            >
                                🏃 Autre action
                            </button>

                            {/* Erreur flow attaque */}
                            {flow.error && (
                                <div className="text-xs text-viking-danger bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                    {flow.error}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Modals flow attaque (hors du corps collapsible) ── */}

            {/* Étape dés — rendu délégué au slug */}
            {(flow.step === 'rolling' || flow.step === 'rolled') &&
                attackConfig?.renderRollStep?.({
                    character,
                    combatant:      myCombatant,
                    activeStates:   myCombatant?.activeStates ?? [],
                    onRollComplete: flow.onRollDone,           // ← stocke + reste ouvert
                    onProceed:      flow.proceedToTargeting,   // ← passe à targeting
                    rollResult:     flow.rollResult,           // ← résultat disponible dans 'rolled'
                    onClose:        flow.cancel,
                    sessionId:      sessionId,
                })
            }

            {/* Étape sélection cible */}
            {flow.step === 'targeting' && (
                <TargetSelectionModal
                    combatState={combatState}
                    attacker={myCombatant}
                    rollResult={flow.rollResult}
                    availableWeapons={attackConfig?.getWeapons?.(character) ?? []}
                    selectedWeapon={flow.selectedWeapon}
                    onWeaponChange={flow.setSelectedWeapon}
                    calculateDamage={attackConfig?.calculateDamage}
                    renderTargetInfo={attackConfig?.renderTargetInfo}
                    allowDamageEdit={false}
                    onConfirm={flow.handleTargetConfirm}
                    onClose={flow.cancel}
                />
            )}

            {/* ── Modal action slug (Posture, Berserk…) ── */}
            {ActiveModal && (
                <ActiveModal
                    character={character}
                    combatant={myCombatant}
                    combatState={combatState}
                    onClose={() => setActiveModalId(null)}
                />
            )}

            {/* ── Opportunité de défense (slug avec defenseOpportunity défini) ── */}
            {defense.isActive
                && defense.step === 'defending'
                && combatConfig?.attack?.defenseOpportunity?.renderDefenseStep?.({
                    character,
                    combatant:  myCombatant,
                    attackData: defense.attackData,
                    onDefenseComplete: defense.handleDefenseComplete,
                    onClose:           defense.cancel,
                })
            }
        </div>
    );
};

export default CombatPanel;