// GMView.jsx - Interface Maître du Jeu (shell avec tabs)

import React, { useState, useEffect } from "react";
import '../../../tools/data.js';
import GMDiceModal from './modals/GMDiceModal.jsx';
import {NPC_TEMPLATES} from "../../../tools/data.js";
import {useSocket} from "../../../context/SocketContext.jsx";
import ToastNotifications from "../../../components/layout/ToastNotifications.jsx";
import HistoryPanel from "../../../components/layout/HistoryPanel.jsx";
import {useAuth} from "../../../context/AuthContext.jsx";
import {toSystemUrl, useFetch} from "../../../hooks/useFetch.js";
import GMHeader from "./layout/GMHeader.jsx";
import TableManagementModal from "../../../components/gm/modals/TableManagementModal.jsx";
import TabCombat from "./tabs/TabCombat.jsx";
import TabSession from "./tabs/TabSession.jsx";
import TabJournal from "../../../components/gm/tabs/TabJournal.jsx";
import DiceConfigModal from "../../../components/modals/DiceConfigModal.jsx";
import vikingsConfig from '../config.jsx';
import { useParams } from 'react-router-dom';

const GMView = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    console.log('[GMView] Component rendering...');
    console.log(activeSession);
    const { system } = useParams();
    const apiBase    = `/api/${system}`;

    // --- Tab actif ---
    const [activeGMTab, setActiveGMTab] = useState(() => {
        const hash = window.location.hash.substring(1);
        return ['combat', 'session', 'journal'].includes(hash) ? hash : 'combat';
    });

    useEffect(() => {
        window.location.hash = activeGMTab;
    }, [activeGMTab]);

    // --- State combat ---
    const [combatState, setCombatState] = useState({
        active: false,
        round: 0,
        currentTurnIndex: -1,
        combatants: []
    });

    // --- State modals combat ---
    const [showNPCModal, setShowNPCModal] = useState(false);
    const [attackingNPC, setAttackingNPC] = useState(null);
    const [showEndCombatConfirm, setShowEndCombatConfirm] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    // --- State global ---
    const [showDiceModal, setShowDiceModal] = useState(false);
    const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
    const [showTableManagement, setShowTableManagement] = useState(false);
    const [showDiceConfig, setShowDiceConfig] = useState(false);

    const { logout } = useAuth();
    const fetchWithAuth = useFetch();
    const socket = useSocket();

    // =========================================
    // EFFECTS
    // =========================================

    // Charger état initial
    useEffect(() => {
        loadCombatState();
    }, []);

    // WebSocket listeners
    useEffect(() => {
        if (!socket) return;

        const handleCombatUpdate = (state) => {
            console.log('[GMView] combat-update received', {
                pendingAttacks: state.pendingAttacks,
                pendingLength: state.pendingAttacks?.length
            });
            setCombatState(state);
        };

        socket.on('combat-update', handleCombatUpdate);

        return () => {
            socket.off('combat-update', handleCombatUpdate);
        };
    }, [socket]);

    // =========================================
    // LOADERS
    // =========================================

    const loadCombatState = async () => {
        try {
            const res = await fetch(toSystemUrl('/api/combat'));
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error loading combat state:', error);
        }
    };

    // =========================================
    // HANDLERS COMBAT
    // =========================================

    const startCombat = async () => {
        try {
            const res = await fetchWithAuth('/api/combat/start', { method: 'POST' });
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error starting combat:', error);
        }
    };

    const endCombat = async () => {
        try {
            const res = await fetchWithAuth('/api/combat/end', { method: 'POST' });
            const data = await res.json();
            setCombatState(data);
            setShowEndCombatConfirm(false);
        } catch (error) {
            console.error('Error ending combat:', error);
        }
    };

    const nextTurn = async () => {
        try {
            const res  = await fetchWithAuth('/api/combat/next-turn', { method: 'POST' });
            const data = await res.json();

            const currentCombatant = data.combatants[data.currentTurnIndex];

            let updatedCombatants = data.combatants;
            if (vikingsConfig.combat?.onTurnStart && currentCombatant) {
                updatedCombatants = vikingsConfig.combat.onTurnStart(
                    currentCombatant,
                    updatedCombatants
                );
            }

            const hasChanges = JSON.stringify(updatedCombatants) !== JSON.stringify(data.combatants);
            if (hasChanges) {
                await fetchWithAuth(`${apiBase}/combat/sync-states`, {
                    method: 'POST',
                    body:   JSON.stringify({ combatants: updatedCombatants }),
                });
            } else {
                setCombatState(data);
            }
        } catch (error) {
            console.error('Error next turn:', error);
        }
    };

    const addCombatant = async (combatantData) => {
        try {
            const res = await fetchWithAuth('/api/combat/combatant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combatant: combatantData })
            });
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error adding combatant:', error);
        }
    };

    const updateCombatant = async (id, updates) => {
        try {
            const combatant = combatState.combatants.find(c => c.id === id);

            // Sync healthData → DB pour les joueurs (ajustements directs GM)
            if (combatant?.type === 'player' && combatant.characterId && updates.healthData) {
                const hd = { ...combatant.healthData, ...updates.healthData };
                if ('tokensBlessure' in updates.healthData || 'tokensFatigue' in updates.healthData) {
                    try {
                        const charRes  = await fetchWithAuth(`${apiBase}/characters/${combatant.characterId}`);
                        const fullChar = await charRes.json();
                        await fetchWithAuth(`${apiBase}/characters/${combatant.characterId}`, {
                            method: 'PUT',
                            body:   JSON.stringify({
                                ...fullChar,
                                tokensBlessure: hd.tokensBlessure ?? fullChar.tokensBlessure,
                                tokensFatigue:  hd.tokensFatigue  ?? fullChar.tokensFatigue,
                            }),
                        });
                    } catch (dbErr) {
                        console.error('[GMView] Error syncing health to DB:', dbErr);
                    }
                }
            }

            await fetchWithAuth(`/api/combat/combatant/${id}`, {
                method: 'PUT',
                body:   JSON.stringify({ updates }),
            });
        } catch (error) {
            console.error('Error updating combatant:', error);
        }
    };

    const removeCombatant = async (id) => {
        try {
            const res = await fetchWithAuth(`/api/combat/combatant/${id}`, { method: 'DELETE' });
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error removing combatant:', error);
        }
    };

    const addPlayerToCombat = async (onlineChar) => {
        try {
            const res      = await fetchWithAuth(`/api/characters/${onlineChar.characterId}`);
            const fullChar = await res.json();

            const d1 = Math.floor(Math.random() * 10) + 1;
            const d2 = Math.floor(Math.random() * 10) + 1;
            const initiative     = d1 + d2 + (fullChar.agilite || 2);
            const initiativeRoll = `${d1} + ${d2} + ${fullChar.agilite || 2} = ${initiative}`;

            const playerCombatant = {
                type:        'player',
                characterId: fullChar.id,
                name:        onlineChar.name,
                actionsMax:  fullChar.actionsDisponibles || 1,
                initiative,
                initiativeRoll,
                // Structure générique healthData (opaque)
                healthData: {
                    tokensBlessure: fullChar.tokensBlessure || 0,
                    blessureMax:    5,
                    tokensFatigue:  fullChar.tokensFatigue  || 0,
                    armure:         fullChar.armure          || 0,
                    seuil:          fullChar.seuilCombat     || 1,
                },
                // Compatibilité descendante CombatantCard
                blessure:    fullChar.tokensBlessure || 0,
                blessureMax: 5,
                fatigue:     fullChar.tokensFatigue  || 0,
                armure:      fullChar.armure          || 0,
                seuil:       fullChar.seuilCombat     || 1,
            };

            await addCombatant(playerCombatant);
        } catch (error) {
            console.error('Error adding player to combat:', error);
        }
    };

    const reorderCombatants = async (newOrder) => {
        try {
            const res = await fetchWithAuth('/api/combat/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combatants: newOrder })
            });
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error reordering:', error);
        }
    };

    const handleValidateAttack = async (attackId, modifiedAttack) => {
        try {
            const attack   = modifiedAttack ?? combatState.pendingAttacks.find(a => a.id === attackId);
            if (!attack) return;

            const attacker = combatState.combatants.find(c => c.id === attack.attackerId);
            const target   = combatState.combatants.find(c => c.id === attack.targetId);

            // 1. onBeforeDamage — peut modifier le montant final
            const finalDamage = vikingsConfig.combat?.onBeforeDamage?.({
                attacker, target,
                damage:     attack.damage,
                weapon:     attack.weapon,
                rollResult: attack.rollResult,
            }) ?? attack.damage;

            // 2. Construire le nouveau healthData de la cible
            const newHealthData = target ? {
                ...target.healthData,
                tokensBlessure: Math.min(
                    target.healthData?.blessureMax ?? 5,
                    (target.healthData?.tokensBlessure ?? 0) + finalDamage
                ),
            } : null;

            // 3. onDamage slug → persistance BDD
            if (vikingsConfig.combat?.onDamage) {
                await vikingsConfig.combat.onDamage({
                    attacker, target,
                    damage: finalDamage, weapon: attack.weapon,
                    rollResult: attack.rollResult, newHealthData,
                    fetchWithAuth, apiBase,
                });
            }

            // 4. Valider côté serveur
            await fetchWithAuth('/api/combat/validate-attack', {
                method: 'POST',
                body:   JSON.stringify({ attackId, targetId: target?.id, newHealthData }),
            });
        } catch (error) {
            console.error('Error validating attack:', error);
        }
    };

    const handleRejectAttack = async (attackId) => {
        try {
            await fetchWithAuth('/api/combat/reject-attack', {
                method: 'POST',
                body:   JSON.stringify({ attackId }),
            });
        } catch (error) {
            console.error('Error rejecting attack:', error);
        }
    };

    const handleNPCAttack = (npc) => setAttackingNPC(npc);

    const handleNPCAttackSubmitted = async (attackData) => {
        try {
            await fetchWithAuth('/api/combat/submit-attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attack: attackData })
            });

            const npc = combatState.combatants.find(c => c.id === attackData.attackerId);
            if (npc && npc.actionsRemaining > 0) {
                await updateCombatant(npc.id, {
                    actionsRemaining: npc.actionsRemaining - 1
                });
            }

            setAttackingNPC(null);
        } catch (error) {
            console.error('Error submitting NPC attack:', error);
        }
    };

    // =========================================
    // HANDLERS DRAG
    // =========================================

    const handleDragStart = (index) => setDraggedIndex(index);

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newCombatants = [...combatState.combatants];
        const draggedItem = newCombatants[draggedIndex];
        newCombatants.splice(draggedIndex, 1);
        newCombatants.splice(index, 0, draggedItem);

        setCombatState({ ...combatState, combatants: newCombatants });
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null) {
            reorderCombatants(combatState.combatants);
        }
        setDraggedIndex(null);
    };

    // =========================================
    // HANDLERS NAVIGATION
    // =========================================

    const handleSelectTable = (session) => {
        onSessionChange(session ?? null);
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.location.reload();
    };

    const handleLogout = async () => {
        await logout();
        handleGoHome();
    };

    // =========================================
    // RENDER
    // =========================================

    return (
        <div className="min-h-screen bg-viking-parchment dark:bg-gray-900 transition-colors">
            {/* Header avec tabs intégrés */}
            <GMHeader
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
                activeSession={activeSession}
                activeTab={activeGMTab}
                onTabChange={setActiveGMTab}
                onManageTables={() => setShowTableManagement(true)}
                onGoHome={handleGoHome}
                onLogout={handleLogout}
                onOpenDice={() => setShowDiceModal(true)}
                onDiceConfig={() => setShowDiceConfig(true)}
            />

            {/* Contenu principal - délégué aux tabs */}
            <div className="max-w-7xl mx-auto p-4">
                {activeGMTab === 'combat' && (
                    <TabCombat
                        combatState={combatState}
                        onlineCharacters={onlineCharacters}
                        pendingAttacks={combatState.pendingAttacks ?? []}
                        combatConfig={vikingsConfig.combat}
                        onStartCombat={startCombat}
                        onNextTurn={nextTurn}
                        onEndCombat={endCombat}
                        onAddCombatant={addCombatant}
                        onUpdateCombatant={updateCombatant}
                        onRemoveCombatant={removeCombatant}
                        onAddPlayerToCombat={addPlayerToCombat}
                        onValidateAttack={handleValidateAttack}
                        onRejectAttack={handleRejectAttack}
                        onNPCAttack={handleNPCAttack}
                        attackingNPC={attackingNPC}
                        onNPCAttackSubmitted={handleNPCAttackSubmitted}
                        onCloseNPCAttack={() => setAttackingNPC(null)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        showNPCModal={showNPCModal}
                        onShowNPCModal={() => setShowNPCModal(true)}
                        onCloseNPCModal={() => setShowNPCModal(false)}
                        showEndCombatConfirm={showEndCombatConfirm}
                        onShowEndCombatConfirm={() => setShowEndCombatConfirm(true)}
                        onCloseEndCombatConfirm={() => setShowEndCombatConfirm(false)}
                    />
                )}

                {activeGMTab === 'session' && (
                    <TabSession
                        activeSession={activeSession}
                        onlineCharacters={onlineCharacters}
                    />
                )}

                {activeGMTab === 'journal' && (
                    <TabJournal />
                )}
            </div>

            {/* === Éléments globaux (visibles sur tous les tabs) === */}

            {/* Modal Gestion Tables */}
            {showTableManagement && (
                <TableManagementModal
                    isOpen={showTableManagement}
                    onClose={() => setShowTableManagement(false)}
                    onSelectTable={handleSelectTable}
                    activeSessionId={activeSession?.id}
                />
            )}

            {/* DiceModal pour MJ (accessible depuis tous les tabs) */}
            {showDiceModal && (
                <GMDiceModal
                    onClose={() => setShowDiceModal(false)}
                    darkMode={darkMode}
                    sessionId={activeSession?.id}
                />
            )}

            {/* Bouton flottant historique */}
            <button
                onClick={() => setHistoryPanelOpen(true)}
                className="fixed bottom-2 right-1 w-10 h-10 bg-viking-bronze text-viking-brown rounded-full shadow-lg hover:bg-viking-leather transition-all z-30 flex items-center justify-center text-lg border-2 border-viking-leather"
                title="Historique des jets"
            >
                📜
            </button>

            {/* Toast Notifications */}
            <ToastNotifications onViewHistory={() => setHistoryPanelOpen(true)} sessionId={activeSession?.id} />

            {/* History Panel */}
            <HistoryPanel isOpen={historyPanelOpen} onClose={() => setHistoryPanelOpen(false)} sessionId={activeSession?.id} />

            {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}
        </div>
    );
};

export default GMView;