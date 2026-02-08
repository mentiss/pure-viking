// GMView.js - Interface Maître du Jeu

import React, { useState, useEffect } from "react";
import '../../tools/data.js';
import AttackValidationQueue from './combat/AttackValidationQueue.jsx';
import GMDiceModal from './GMDiceModal.jsx';
import {NPC_TEMPLATES} from "../../tools/data.js";
import {useSocket} from "../../context/SocketContext.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";
import NPCAttackModal from "./npc/NPCAttackModal.jsx";
import ToastNotifications from "../shared/ToastNotifications.jsx";
import HistoryPanel from "../shared/HistoryPanel.jsx";
import ConfirmModal from "../shared/ConfirmModal.jsx";
import CombatantCard from "./combat/CombatantCard.jsx";
import AddNPCModal from "./npc/AddNPCModal.jsx";
import EditNPCModal from "./npc/EditNPCModal.jsx";
import RulesReference from "./RulesReference.jsx";
import {useAuth} from "../../context/AuthContext.jsx";
import {useFetch} from "../../hooks/useFetch.js";
import GMHeader from "./GMHeader.jsx";
import OnlinePlayersPanel from "./OnlinePlayersPanel.jsx";
import CombatControls from "./combat/CombatantControls.jsx";
import TableManagementModal from "./tables/TableManagementModal.jsx";

const GMView = ({ darkMode, onToggleDarkMode }) => {
    console.log('[GMView] Component rendering...');
    const { useState, useEffect } = React;
    
    const [combatState, setCombatState] = useState({
        active: false,
        round: 0,
        currentTurnIndex: -1,
        combatants: []
    });
    
    const [onlineCharacters, setOnlineCharacters] = useState([]);
    const [showAddNPC, setShowAddNPC] = useState(false);
    const [editingNPC, setEditingNPC] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [showDiceModal, setShowDiceModal] = useState(false);
    const [pendingAttacks, setPendingAttacks] = useState([]);
    const [attackingNPC, setAttackingNPC] = useState(null);
    const [showEndCombatConfirm, setShowEndCombatConfirm] = useState(false);
    const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [showTableManagement, setShowTableManagement] = useState(false);
    const { logout } = useAuth();
    const fetchWithAuth = useFetch();

    // Socket globale
    const socket = useSocket();
    console.log('[GMView] Socket from useSocket:', socket ? socket.id : 'null/undefined');

    // Charger état combat initial
    useEffect(() => {
        console.log('[GMView] Mounting...');
        const savedSessionId = localStorage.getItem('activeSessionId');
        if (savedSessionId) {
            loadActiveSession(savedSessionId);
        }
        loadCombatState();
        loadOnlineCharacters();
        loadPendingAttacks();

        return () => {
            console.log('[GMView] Unmounting...');
        };
    }, []);
    

    
    // WebSocket listeners
    useEffect(() => {
        if (!socket) return;
        console.log('[GMView] Socket:', socket ? socket.id : 'null');
        const handleCombatUpdate = (state) => {
            console.log(state);
            setCombatState(state);
        };
        
        const handleOnlineCharactersUpdate = (chars) => {
            setOnlineCharacters(chars);
        };
        
        const handlePendingAttacksUpdate = (attacks) => {
            setPendingAttacks(attacks);
        };
        
        socket.on('combat-update', handleCombatUpdate);
        socket.on('online-characters-update', handleOnlineCharactersUpdate);
        socket.on('pending-attacks-update', handlePendingAttacksUpdate);
        
        return () => {
            socket.off('combat-update', handleCombatUpdate);
            socket.off('online-characters-update', handleOnlineCharactersUpdate);
            socket.off('pending-attacks-update', handlePendingAttacksUpdate);
        };
    }, [socket]);

    useEffect(() => {
        if (socket && activeSession) {
            console.log('[GM] Broadcasting active session:', activeSession.id);

            // Broadcast la session active à tous les clients
            socket.emit('gm-set-active-session', activeSession.id);
            // Le GM rejoint aussi la room
            socket.emit('join-session', activeSession.id);

            // Cleanup : quitter la room quand on change de session
            return () => {
                socket.emit('leave-session', activeSession.id);
            };
        }
    }, [socket, activeSession?.id]);

    const loadActiveSession = async (sessionId) => {
        try {
            const response = await fetchWithAuth(`/api/sessions/${sessionId}`);
            if (response.ok) {
                const session = await response.json();
                setActiveSession(session);
                localStorage.setItem('activeSessionId', sessionId);
            }
        } catch (error) {
            console.error('Error loading active session:', error);
            localStorage.removeItem('activeSessionId');
        }
    };

    const handleSelectTable = (session) => {
        if (session) {
            setActiveSession(session);
            localStorage.setItem('activeSessionId', session.id);
        } else {
            setActiveSession(null);
            localStorage.removeItem('activeSessionId');
        }
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.location.reload();
    };

    const handleLogout = async () => {
        await logout();
        handleGoHome();
    };

    const handleDiceModal = () => {
        setShowDiceModal(true);
    }

    const loadCombatState = async () => {
        try {
            const res = await fetch('/api/combat');
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error loading combat state:', error);
        }
    };
    
    const loadOnlineCharacters = async () => {
        try {
            const res = await fetch('/api/online-characters');
            const data = await res.json();
            setOnlineCharacters(data);
        } catch (error) {
            console.error('Error loading online characters:', error);
        }
    };
    
    const loadPendingAttacks = async () => {
        try {
            const res = await fetch('/api/combat/pending-attacks');
            const data = await res.json();
            setPendingAttacks(data);
        } catch (error) {
            console.error('Error loading pending attacks:', error);
        }
    };
    
    const handleValidateAttack = async (attackIndex, modifiedAttack) => {
        try {
            // Récupérer cible actuelle pour blessure
            const attack = modifiedAttack || pendingAttacks[attackIndex];
            const target = combatState.combatants.find(c => c.id === attack.targetId);
            
            await fetch('/api/combat/validate-attack', {
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
            await fetch('/api/combat/reject-attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attackIndex })
            });
        } catch (error) {
            console.error('Error rejecting attack:', error);
        }
    };
    
    const handleNPCAttack = (npc) => {
        setAttackingNPC(npc);
    };
    
    const handleNPCAttackSubmitted = async (attackData) => {
        try {
            await fetch('/api/combat/submit-attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attack: attackData })
            });
            
            // Consommer action NPC
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
    
    const startCombat = async () => {
        try {
            const res = await fetch('/api/combat/start', { method: 'POST' });
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error starting combat:', error);
        }
    };
    
    const endCombat = async () => {
        try {
            const res = await fetch('/api/combat/end', { method: 'POST' });
            const data = await res.json();
            setCombatState(data);
            setShowEndCombatConfirm(false);
        } catch (error) {
            console.error('Error ending combat:', error);
        }
    };
    
    const nextTurn = async () => {
        try {
            const res = await fetch('/api/combat/next-turn', { method: 'POST' });
            const data = await res.json();
            setCombatState(data);
            data.combatants.forEach(c => {
                if (c.hasJustExpired && c.type === 'player') {
                    // On appelle TA fonction existante qui gère déjà la DB
                    updateCombatant(c.id, {
                        fatigue: c.fatigue,
                        hasJustExpired: false // On reset le flag
                    });
                }
            });
        } catch (error) {
            console.error('Error next turn:', error);
        }
    };
    
    const addPlayerToCombat = async (onlineChar) => {
        try {
            // Charger fiche complète pour avoir vraies stats
            const res = await fetchWithAuth(`/api/characters/${onlineChar.characterId}`);
            const fullChar = await res.json();
            
            // Rouler initiative : 2d10 + Agilité
            const d1 = Math.floor(Math.random() * 10) + 1;
            const d2 = Math.floor(Math.random() * 10) + 1;
            const initiative = d1 + d2 + (fullChar.agilite || 2);
            const initiativeRoll = `${d1} + ${d2} + ${fullChar.agilite || 2} = ${initiative}`;

            const playerCombatant = {
                type: 'player',
                characterId: fullChar.id,
                name: onlineChar.name,
                playerName: fullChar.playerName,
                agilite: fullChar.agilite,
                avatar: fullChar.avatar,
                initiative,
                initiativeRoll, // Pour affichage
                actionsMax: fullChar.actionsDisponibles || 1,
                blessure: fullChar.tokensBlessure || 0,
                blessureMax: 5,
                armure: fullChar.armure || 0,
                seuil: fullChar.seuilCombat || 1,
                fatigue: fullChar.tokensFatigue || 0
            };
            
            await addCombatant(playerCombatant);
        } catch (error) {
            console.error('Error adding player to combat:', error);
        }
    };
    
    const addCombatant = async (combatant) => {
        try {
            const res = await fetch('/api/combat/combatant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combatant })
            });
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error adding combatant:', error);
        }
    };
    
    const updateCombatant = async (id, updates) => {
        try {
            // Si changement blessure/fatigue sur joueur, update DB aussi
            const combatant = combatState.combatants.find(c => c.id === id);
            if (combatant && combatant.type === 'player' && combatant.characterId) {
                if ('blessure' in updates || 'fatigue' in updates) {
                    // Charger fiche complète
                    const charRes = await fetchWithAuth(`/api/characters/${combatant.characterId}`);
                    const fullChar = await charRes.json();
                    
                    // Modifier les champs nécessaires
                    fullChar.tokensBlessure = updates.blessure !== undefined ? updates.blessure : combatant.blessure;
                    fullChar.tokensFatigue = updates.fatigue !== undefined ? updates.fatigue : combatant.fatigue;
                    
                    // Update fiche complète
                    await fetchWithAuth(`/api/characters/${combatant.characterId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(fullChar)
                    });
                }
            }
            
            const res = await fetch(`/api/combat/combatant/${id}`, {
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
            const res = await fetch(`/api/combat/combatant/${id}`, { method: 'DELETE' });
            const data = await res.json();
            setCombatState(data);
        } catch (error) {
            console.error('Error removing combatant:', error);
        }
    };
    
    const reorderCombatants = async (newOrder) => {
        try {
            const res = await fetch('/api/combat/reorder', {
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
    
    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };
    
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
    
    const currentCombatant = combatState.combatants[combatState.currentTurnIndex];
    
    return (
        <div className="min-h-screen bg-viking-parchment dark:bg-gray-900 transition-colors">
            {/* Header */}
            <GMHeader
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
                activeSession={activeSession}
                onManageTables={() => setShowTableManagement(true)}
                onGoHome={handleGoHome}
                onLogout={handleLogout}
                onOpenDice={handleDiceModal}
            />
            
            <div className="max-w-7xl mx-auto p-4">
                {/* Contrôles Combat */}
                <CombatControls
                    combatState={combatState}
                    onStartCombat={startCombat}
                    onNextTurn={nextTurn}
                    onEndCombat={() => setShowEndCombatConfirm(true)}
                    canStartCombat={combatState.combatants.length > 0}
                />
                
                {/* Joueurs en ligne */}
                <OnlinePlayersPanel
                    onlineCharacters={onlineCharacters}
                    combatants={combatState.combatants}
                    onAddPlayerToCombat={addPlayerToCombat}
                    combatActive={combatState.active}
                />
                
                {/* Liste Combattants */}
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">
                            Combattants {combatState.combatants.length > 0 && `(${combatState.combatants.length})`}
                        </h2>
                        <button
                            onClick={() => setShowAddNPC(true)}
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
                                    combatant={combatant}
                                    isActive={index === combatState.currentTurnIndex}
                                    onUpdate={(updates) => updateCombatant(combatant.id, updates)}
                                    onRemove={(id) => removeCombatant(id)}
                                    onEdit={(npc) => setEditingNPC(npc)}
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    combatActive={combatState.active}
                                    onNPCAttack={(npc) => handleNPCAttack(npc)}
                                />
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Règles Référence */}
                <RulesReference />
            </div>
            
            {/* Modals */}
            {showTableManagement && (
                <TableManagementModal
                    isOpen={showTableManagement}
                    onClose={() => setShowTableManagement(false)}
                    onSelectTable={handleSelectTable}
                    activeSessionId={activeSession?.id}
                />
            )}

            {showAddNPC && (
                <AddNPCModal
                    onClose={() => setShowAddNPC(false)}
                    onAdd={addCombatant}
                />
            )}
            
            {editingNPC && (
                <EditNPCModal
                    npc={editingNPC}
                    onClose={() => setEditingNPC(null)}
                    onUpdate={(updates) => {
                        updateCombatant(editingNPC.id, updates);
                        setEditingNPC(null);
                    }}
                />
            )}
            
            {/* DiceModal pour MJ */}
            {showDiceModal && (
                <GMDiceModal
                    onClose={() => setShowDiceModal(false)}
                    darkMode={darkMode}
                    sessionId={activeSession?.id}
                />
            )}
            
            {/* File validation attaques */}
            <AttackValidationQueue
                pendingAttacks={pendingAttacks}
                combatState={combatState}
                onValidate={handleValidateAttack}
                onReject={handleRejectAttack}
            />
            
            {/* Modal attaque NPC */}
            {attackingNPC && (
                <NPCAttackModal
                    npc={attackingNPC}
                    combatState={combatState}
                    onClose={() => setAttackingNPC(null)}
                    onAttackSubmitted={handleNPCAttackSubmitted}
                />
            )}
            {/* Bouton flottant historique (si perso chargé) */}
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

            {/* Confirmation fin combat */}
            {showEndCombatConfirm && (
                <ConfirmModal
                    title="⏹️ Terminer le combat"
                    message="Êtes-vous sûr de vouloir terminer le combat ? Les actions restantes seront perdues."
                    onConfirm={endCombat}
                    onCancel={() => setShowEndCombatConfirm(false)}
                    confirmText="Terminer"
                    cancelText="Annuler"
                    danger={true}
                />
            )}
        </div>
    );
};

export default GMView;
