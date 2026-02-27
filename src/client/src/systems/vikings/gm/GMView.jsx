// GMView.jsx - Interface Maître du Jeu (shell avec tabs)

import React, { useState, useEffect } from "react";
import '../../../tools/data.js';
import GMDiceModal from '../../../components/gm/GMDiceModal.jsx';
import {NPC_TEMPLATES} from "../../../tools/data.js";
import {useSocket} from "../../../context/SocketContext.jsx";
import ToastNotifications from "../../../components/layout/ToastNotifications.jsx";
import HistoryPanel from "../../../components/layout/HistoryPanel.jsx";
import {useAuth} from "../../../context/AuthContext.jsx";
import {toSystemUrl, useFetch} from "../../../hooks/useFetch.js";
import GMHeader from "../../../components/gm/layout/GMHeader.jsx";
import TableManagementModal from "../../../components/gm/modals/TableManagementModal.jsx";
import TabCombat from "./tabs/TabCombat.jsx";
import TabSession from "../../../components/gm/tabs/TabSession.jsx";
import TabJournal from "../../../components/gm/tabs/TabJournal.jsx";
import DiceConfigModal from "../../../components/modals/DiceConfigModal.jsx";

const GMView = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    console.log('[GMView] Component rendering...');

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
    const [pendingAttacks, setPendingAttacks] = useState([]);

    // --- State modals combat ---
    const [showAddNPC, setShowAddNPC] = useState(false);
    const [editingNPC, setEditingNPC] = useState(null);
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
        loadPendingAttacks();
    }, []);

    // WebSocket listeners
    useEffect(() => {
        if (!socket) return;

        const handleCombatUpdate = (state) => setCombatState(state);
        const handlePendingAttacksUpdate = (attacks) => setPendingAttacks(attacks);

        socket.on('combat-update', handleCombatUpdate);
        socket.on('pending-attacks-update', handlePendingAttacksUpdate);

        return () => {
            socket.off('combat-update', handleCombatUpdate);
            socket.off('pending-attacks-update', handlePendingAttacksUpdate);
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

    const loadPendingAttacks = async () => {
        try {
            const res = await fetch(toSystemUrl('/api/combat/pending-attacks'));
            const data = await res.json();
            setPendingAttacks(data);
        } catch (error) {
            console.error('Error loading pending attacks:', error);
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
            const res = await fetchWithAuth('/api/combat/next-turn', { method: 'POST' });
            const data = await res.json();
            setCombatState(data);
            data.combatants.forEach(c => {
                if (c.hasJustExpired && c.type === 'player') {
                    updateCombatant(c.id, {
                        fatigue: c.fatigue,
                        hasJustExpired: false
                    });
                }
            });
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
            // Si c'est un joueur, sync aussi la fiche en DB
            const combatant = combatState.combatants.find(c => c.id === id);
            if (combatant?.type === 'player' && combatant.characterId) {
                if ('blessure' in updates || 'fatigue' in updates) {
                    const charRes = await fetchWithAuth(`/api/characters/${combatant.characterId}`);
                    if (charRes.ok) {
                        const fullChar = await charRes.json();
                        fullChar.tokensBlessure = updates.blessure !== undefined ? updates.blessure : combatant.blessure;
                        fullChar.tokensFatigue = updates.fatigue !== undefined ? updates.fatigue : combatant.fatigue;

                        await fetchWithAuth(`/api/characters/${combatant.characterId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(fullChar)
                        });
                    }
                }
            }

            const res = await fetchWithAuth(`/api/combat/combatant/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });
            const data = await res.json();
            setCombatState(data);
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
            const res = await fetchWithAuth(`/api/characters/${onlineChar.characterId}`);
            const fullChar = await res.json();

            const d1 = Math.floor(Math.random() * 10) + 1;
            const d2 = Math.floor(Math.random() * 10) + 1;
            const initiative = d1 + d2 + (fullChar.agilite || 2);
            const initiativeRoll = `${d1} + ${d2} + ${fullChar.agilite || 2} = ${initiative}`;

            const playerCombatant = {
                type: 'player',
                characterId: fullChar.id,
                name: onlineChar.name,
                blessure: fullChar.tokensBlessure || 0,
                blessureMax: 5,
                fatigue: fullChar.tokensFatigue || 0,
                armure: fullChar.armure || 0,
                seuil: fullChar.seuilCombat || 1,
                actionsMax: fullChar.actionsDisponibles || 1,
                initiative,
                initiativeRoll
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

    const handleValidateAttack = async (attackIndex, modifiedAttack) => {
        try {
            const attack = modifiedAttack || pendingAttacks[attackIndex];
            const target = combatState.combatants.find(c => c.id === attack.targetId);

            await fetchWithAuth('/api/combat/validate-attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attackIndex,
                    modifiedAttack: attack ? {
                        ...attack,
                        targetBlessure: target?.blessure || 0
                    } : null
                })
            });
        } catch (error) {
            console.error('Error validating attack:', error);
        }
    };

    const handleRejectAttack = async (attackIndex) => {
        try {
            await fetchWithAuth('/api/combat/reject-attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attackIndex })
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
                        pendingAttacks={pendingAttacks}
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
                        showAddNPC={showAddNPC}
                        onShowAddNPC={() => setShowAddNPC(true)}
                        onCloseAddNPC={() => setShowAddNPC(false)}
                        editingNPC={editingNPC}
                        onCloseEditNPC={setEditingNPC}
                        onUpdateEditingNPC={(updates) => {
                            updateCombatant(editingNPC.id, updates);
                            setEditingNPC(null);
                        }}
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