// src/client/src/systems/tecumah/gm/GMView.jsx
// Shell principal de l'interface GM Tecumah.
// Onglets : Session · Ressources · Journal · Combat
// Bouton dés flottant accessible depuis tous les onglets.

import React, {useEffect, useState} from 'react';
import {useParams} from "react-router-dom";
import {useAuth} from "../../../../context/AuthContext.jsx";
import useSystem from "../../../../hooks/useSystem.js";
import TecumahDiceModal from "../modals/TecumahDiceModal.jsx";
import tecumahConfig from "../../config.jsx";
import TabSession from "./tabs/TabSession.jsx";
import TabResource from "./tabs/TabResource.jsx";
import TabJournal from "../../../../components/gm/tabs/TabJournal.jsx";
import CombatPanel from "../../../../components/combat/CombatPanel.jsx";
import DiceHistoryPage from "../../../../components/layout/DiceHistoryPage.jsx";
import ToastNotifications from "../../../../components/layout/ToastNotifications.jsx";
import GMDiceModal from "./modals/GMDiceModal.jsx";
import TableManagementModal from "../../../../components/gm/modals/TableManagementModal.jsx";
import DiceConfigModal from "../../../../components/modals/DiceConfigModal.jsx";
import {useSocket} from "../../../../context/SocketContext.jsx";
import {useFetch} from "../../../../hooks/useFetch.js";
import TabCombat from "./tabs/TabCombat.jsx";
import TecumahHistoryEntry from "../TecumahHistoryEntry.jsx";

const GM_TABS = [
    { id: 'session',    label: '📜 Session'    },
    { id: 'ressources', label: '⚡ Ressources'  },
    { id: 'journal',    label: '📓 Journal'     },
    { id: 'combat',     label: '⚔️ Combat'      },
    { id: 'historique', label: '🎲 Historique'  },
];

const GMView = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    const { system }  = useParams();
    const { logout }  = useAuth();
    const { apiBase } = useSystem();
    const socket        = useSocket();
    const fetchWithAuth = useFetch();

    const [combatState,         setCombatState]         = useState({ active: false, round: 0, currentTurnIndex: -1, combatants: [] });
    const [showNPCModal,        setShowNPCModal]        = useState(false);
    const [attackingNPC,        setAttackingNPC]        = useState(null);
    const [showEndCombatConfirm,setShowEndCombatConfirm]= useState(false);
    const [draggedIndex,        setDraggedIndex]        = useState(null);

    const [activeTab,         setActiveTab]         = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return GM_TABS.some(t => t.id === hash) ? hash : 'session';
    });
    const [showDiceModal,     setShowDiceModal]     = useState(false);
    const [showTableMgmt,     setShowTableMgmt]     = useState(false);
    const [showDiceConfig,    setShowDiceConfig]    = useState(false);
    const [showMenu,          setShowMenu]          = useState(false);

    const changeTab = (id) => {
        setActiveTab(id);
        window.location.hash = id;
    };

    useEffect(() => {
        fetchWithAuth(`${apiBase}/combat`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setCombatState(d); })
            .catch(() => {});
    }, [apiBase]);

    useEffect(() => {
        if (!socket) return;
        const fn = (state) => setCombatState(state);
        socket.on('combat-update', fn);
        return () => socket.off('combat-update', fn);
    }, [socket]);

    const startCombat  = () => fetchWithAuth(`${apiBase}/combat/start`,    { method: 'POST' }).then(r => r.json()).then(setCombatState).catch(console.error);
    const endCombat    = () => fetchWithAuth(`${apiBase}/combat/end`,      { method: 'POST' }).then(r => r.json()).then(d => { setCombatState(d); setShowEndCombatConfirm(false); }).catch(console.error);
    const nextTurn     = () => fetchWithAuth(`${apiBase}/combat/next-turn`, { method: 'POST' }).then(r => r.json()).then(setCombatState).catch(console.error);

    const addCombatant    = (data) => fetchWithAuth(`${apiBase}/combat/combatant`,     { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ combatant: data }) }).then(r => r.json()).then(setCombatState).catch(console.error);
    const removeCombatant = (id)   => fetchWithAuth(`${apiBase}/combat/combatant/${id}`, { method: 'DELETE' }).then(r => r.json()).then(setCombatState).catch(console.error);
    const updateCombatant = (id, updates) => fetchWithAuth(`${apiBase}/combat/combatant/${id}`, { method: 'PUT', body: JSON.stringify({ updates }) }).catch(console.error);

    const addPlayerToCombat = async (onlineChar) => {
        const res      = await fetchWithAuth(`${apiBase}/characters/${onlineChar.characterId}`);
        const fullChar = await res.json();
        const initiative = Math.floor(Math.random() * 6) + 1 + Math.floor((fullChar.agilite ?? 3) / 3) + Math.floor((fullChar.perception ?? 3) / 3);
        await addCombatant({
            type: 'player', characterId: fullChar.id,
            name: `${fullChar.prenom ?? ''} ${fullChar.nom ?? ''}`.trim() || onlineChar.name,
            actionsMax: 1, initiative,
            healthData: {
                blessure_niveau:   fullChar.blessure_niveau   ?? 0,
                defense_naturelle: fullChar.defense_naturelle ?? 9,
                resistance_fixe:   fullChar.vigueur           ?? 3,
            },
        });
    };

    const handleValidateAttack = async (attackId, modifiedAttack) => {
        const attack = modifiedAttack ?? combatState.pendingAttacks?.find(a => a.id === attackId);
        if (!attack) return;
        const target       = combatState.combatants.find(c => c.id === attack.targetId);
        const finalDamage  = tecumahConfig.combat?.onBeforeDamage?.({ target, damage: attack.damage, weapon: attack.weapon, rollResult: attack.rollResult }) ?? attack.damage;
        const newHealthData = target ? { ...target.healthData } : null;
        if (tecumahConfig.combat?.onDamage) await tecumahConfig.combat.onDamage({ target, damage: finalDamage, newHealthData, fetchWithAuth, apiBase });
        await fetchWithAuth(`${apiBase}/combat/validate-attack`, { method: 'POST', body: JSON.stringify({ attackId, targetId: target?.id, newHealthData }) });
    };

    const handleRejectAttack    = (attackId) => fetchWithAuth(`${apiBase}/combat/reject-attack`, { method: 'POST', body: JSON.stringify({ attackId }) });
    const handleNPCAttack       = (npc) => setAttackingNPC(npc);
    const handleNPCAttackSubmitted = async (attackData) => {
        await fetchWithAuth(`${apiBase}/combat/submit-attack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attack: attackData }) });
        const npc = combatState.combatants.find(c => c.id === attackData.attackerId);
        if (npc?.actionsRemaining > 0) await updateCombatant(npc.id, { actionsRemaining: npc.actionsRemaining - 1 });
        setAttackingNPC(null);
    };

    const handleDragStart = (index) => setDraggedIndex(index);
    const handleDragOver  = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const list = [...combatState.combatants];
        const item = list.splice(draggedIndex, 1)[0];
        list.splice(index, 0, item);
        setCombatState(s => ({ ...s, combatants: list }));
        setDraggedIndex(index);
    };
    const handleDragEnd = () => {
        if (draggedIndex !== null) fetchWithAuth(`${apiBase}/combat/reorder`, { method: 'POST', body: JSON.stringify({ combatants: combatState.combatants }) });
        setDraggedIndex(null);
    };

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            data-theme={darkMode ? 'dark' : undefined}
        >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <header
                className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
                style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}
            >
                <div className="flex items-center gap-3" style={{ flex: '0 0 auto', minWidth: 120 }}>
                    <h1 style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.1rem', lineHeight: 1 }}>
                        🎭 Interface GM
                        {activeSession && (
                            <p className="ml-7" style={{fontWeight: '400', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {activeSession.name}
                            </p>
                        )}
                    </h1>

                </div>

                <div className="flex-1" style={{fontSize: '2rem', color: 'var(--color-primary)'}}>
                    <h1 className="text-center tecumah-font">Tecumah Gulch</h1>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Bouton dés */}
                    <button
                        onClick={() => setShowDiceModal(true)}
                        className="px-3 py-1.5 rounded text-sm font-semibold"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                        title="Lancer les dés"
                    >
                        🎲
                    </button>


                    {/* Thème */}
                    <button onClick={onToggleDarkMode} className="w-8 h-8 flex items-center justify-center rounded" style={{ fontSize: '1rem' }}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>

                    {/* Hamburger */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(m => !m); }}
                            className="w-8 h-8 flex items-center justify-center rounded"
                            style={{ background: showMenu ? 'var(--color-surface-alt)' : 'transparent', fontSize: '1.1rem' }}
                        >
                            ☰
                        </button>
                        {showMenu && (
                            <>
                                {/* Overlay pour fermer */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div
                                    className="absolute right-0 top-10 rounded-xl shadow-xl z-50 py-2"
                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', minWidth: 200 }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <GmMenuItem onClick={() => { setShowTableMgmt(true); setShowMenu(false); }}>
                                        🗂️ Gérer les tables
                                    </GmMenuItem>
                                    <GmMenuItem onClick={() => { setShowDiceConfig(true); setShowMenu(false); }}>
                                        ⚙️ Config des dés
                                    </GmMenuItem>
                                    <hr style={{ borderColor: 'var(--color-border)', margin: '4px 0' }} />

                                    <hr style={{ borderColor: 'var(--color-border)', margin: '4px 0' }} />
                                    <GmMenuItem onClick={async () => { await logout(); window.location.href = `/${system}`; }} danger>
                                        🚪 Déconnexion
                                    </GmMenuItem>
                                </div>
                            </>

                        )}
                    </div>
                </div>
            </header>

            {/* ── Onglets ──────────────────────────────────────────────────── */}
            <nav className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                {GM_TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => changeTab(t.id)}
                        className="flex-shrink-0 px-4 py-2 text-sm"
                        style={{
                            fontWeight:   activeTab === t.id ? 700 : 400,
                            color:        activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            borderBottom: activeTab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            {/* ── Contenu ──────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w mx-auto px-4 py-4">

                    {activeTab === 'session' && (
                        <TabSession
                            activeSession={activeSession}
                            onlineCharacters={onlineCharacters}
                        />
                    )}

                    {activeTab === 'ressources' && (
                        <TabResource activeSession={activeSession} />
                    )}

                    {activeTab === 'journal' && (
                        <TabJournal characterId={-1} />
                    )}

                    {activeTab === 'combat' && (
                        <TabCombat
                            combatState={combatState}
                            onlineCharacters={onlineCharacters}
                            combatConfig={tecumahConfig.combat}
                            pendingAttacks={combatState.pendingAttacks ?? []}
                            onStartCombat={startCombat}
                            onNextTurn={nextTurn}
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
                            onCloseEndCombatConfirm={() => { setShowEndCombatConfirm(false); endCombat(); }}
                        />
                    )}

                    {activeTab === 'historique' && (
                        <DiceHistoryPage
                            sessionId={activeSession?.id ?? null}
                            renderHistoryEntry={tecumahConfig.dice.renderHistoryEntry}
                        />
                    )}
                </div>
            </main>

            {/* ── Overlays ─────────────────────────────────────────────────── */}
            <ToastNotifications
                sessionId={activeSession?.id}
                renderDiceToast={(entry) => {
                    return (<TecumahHistoryEntry entry={entry} />)
                }}
            />

            {showDiceModal && (
                <GMDiceModal
                    onClose={() => setShowDiceModal(false)}
                    sessionId={activeSession?.id ?? null}
                />
            )}

            {showTableMgmt && (
                <TableManagementModal
                    isOpen
                    onClose={() => setShowTableMgmt(false)}
                    activeSessionId={activeSession?.id}
                    onSelectTable={(session) => { onSessionChange(session); setShowTableMgmt(false); }}
                />
            )}

            {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}
        </div>
    );
};

const GmMenuItem = ({ onClick, children, danger }) => (
    <button
        onClick={onClick}
        className="w-full text-left px-4 py-2 text-sm hover:opacity-80"
        style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text)' }}
    >
        {children}
    </button>
);

export default GMView;