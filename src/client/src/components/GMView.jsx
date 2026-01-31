// GMView.js - Interface Maître du Jeu

import React, { useState, useEffect } from "react";
import './../tools/data.js';
import AttackValidationQueue from './AttackValidationQueue';
import GMDiceModal from './GMDiceModal';
import {NPC_TEMPLATES} from "../tools/data.js";
import {useSocket} from "../context/SocketContext.jsx";


// Composant Card Combattant (vue MJ)
const CombatantCardGM = ({ combatant, isActive, onUpdate, onRemove, onEdit, onDragStart, onDragOver, onDragEnd, combatActive, onNPCAttack }) => {
    const isPlayer = combatant.type === 'player';
    const isBerserk = combatant.activeStates?.some(s => s.name === 'Berserk');

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
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {isActive && <span className="text-xl">▶️</span>}
                    <div>
                        <div className="font-bold text-viking-brown dark:text-viking-parchment">
                            {combatant.name}
                            {isPlayer && <span className="text-xs ml-2 text-viking-bronze">({combatant.playerName})</span>}
                            {isBerserk && combatant.activeStates?.map((state, i) => (
                                <span key={i} className="text-[10px] bg-red-600 text-white px-1 rounded-full animate-pulse" title={state.name}>
                                    🔥 BERSERK {state.duration}
                                </span>
                            ))}
                        </div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">
                            Initiative: {combatant.initiative} | Actions: {combatant.actionsRemaining}/{combatant.actionsMax} {isBerserk && <span className="ml-1 text-[10px]">(+2 Berserk)</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    {!isPlayer && (
                        <button
                            onClick={onEdit}
                            className="px-2 py-1 bg-viking-bronze text-viking-brown rounded text-xs hover:bg-viking-leather"
                        >
                            ✏️
                        </button>
                    )}
                    <button
                        onClick={onRemove}
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
            
            {/* Initiative roll (joueurs) */}
            {isPlayer && combatant.initiativeRoll && (
                <div className="text-xs text-viking-leather dark:text-viking-bronze mb-2">
                    Initiative: {combatant.initiativeRoll}
                </div>
            )}
            
            {/* Attaques (NPCs) */}
            {!isPlayer && combatant.attaques && combatant.attaques.length > 0 && (
                <div className="text-xs text-viking-leather dark:text-viking-bronze mb-2">
                    <div className="font-semibold">Attaques:</div>
                    {combatant.attaques.map((att, i) => (
                        <div key={i} className="ml-2">
                            • {att.name}: {att.succes}+/{att.explosion}+, Dégâts {att.degats}
                        </div>
                    ))}
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
                            className="px-2 py-1 bg-viking-danger text-white rounded text-xs hover:bg-red-700"
                        >
                            ⚔️ Attaquer
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};


// Modal Ajout NPC
const AddNPCModal = ({ onClose, onAdd }) => {
    const { useState } = React;
    
    const [useTemplate, setUseTemplate] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState(NPC_TEMPLATES[0]);
    const [name, setName] = useState('');
    const [blessureMax, setBlessureMax] = useState(5);
    const [armure, setArmure] = useState(1);
    const [seuil, setSeuil] = useState(1);
    const [actionsMax, setActionsMax] = useState(1);
    const [attaques, setAttaques] = useState([
        { name: 'Attaque', succes: 6, explosion: 10, degats: 2 }
    ]);
    
    const addAttaque = () => {
        setAttaques([...attaques, { name: 'Nouvelle attaque', succes: 6, explosion: 10, degats: 2 }]);
    };
    
    const removeAttaque = (index) => {
        setAttaques(attaques.filter((_, i) => i !== index));
    };
    
    const updateAttaque = (index, field, value) => {
        const newAttaques = [...attaques];
        newAttaques[index][field] = field === 'name' ? value : parseInt(value);
        setAttaques(newAttaques);
    };
    
    const rollInitiative = () => {
        const d1 = Math.floor(Math.random() * 10) + 1;
        const d2 = Math.floor(Math.random() * 10) + 1;
        // NPCs : 2d10 seulement (pas d'agilité)
        return d1 + d2;
    };
    
    const handleAdd = () => {
        let npcData;
        
        if (useTemplate) {
            npcData = {
                ...selectedTemplate,
                name: name || selectedTemplate.name,
                type: 'npc',
                initiative: rollInitiative()
            };
        } else {
            npcData = {
                type: 'npc',
                name: name || 'Adversaire',
                blessure: 0,
                blessureMax: parseInt(blessureMax),
                armure: parseInt(armure),
                seuil: parseInt(seuil),
                actionsMax: parseInt(actionsMax),
                attaques: attaques,
                initiative: rollInitiative()
            };
        }
        
        onAdd(npcData);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-lg w-full border-4 border-viking-bronze p-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">Ajouter Adversaire</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                {/* Mode */}
                <div className="mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setUseTemplate(true)}
                            className={`px-3 py-2 rounded text-sm font-semibold ${useTemplate ? 'bg-viking-bronze text-viking-brown' : 'bg-gray-200 dark:bg-gray-700 text-viking-text dark:text-viking-parchment'}`}
                        >
                            Template
                        </button>
                        <button
                            onClick={() => setUseTemplate(false)}
                            className={`px-3 py-2 rounded text-sm font-semibold ${!useTemplate ? 'bg-viking-bronze text-viking-brown' : 'bg-gray-200 dark:bg-gray-700 text-viking-text dark:text-viking-parchment'}`}
                        >
                            Personnalisé
                        </button>
                    </div>
                </div>
                
                {useTemplate ? (
                    <>
                        <div className="mb-3">
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Template</label>
                            <select
                                value={NPC_TEMPLATES.indexOf(selectedTemplate)}
                                onChange={(e) => setSelectedTemplate(NPC_TEMPLATES[e.target.value])}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            >
                                {NPC_TEMPLATES.map((t, i) => (
                                    <option key={i} value={i}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="mb-3">
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Nom (optionnel)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={selectedTemplate.name}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                        
                        <div className="p-3 bg-viking-parchment dark:bg-gray-800 rounded text-sm text-viking-brown dark:text-viking-parchment">
                            <div>HP: {selectedTemplate.blessureMax}</div>
                            <div>Armure: {selectedTemplate.armure}</div>
                            <div>Seuil: {selectedTemplate.seuil}</div>
                            <div>Actions: {selectedTemplate.actionsMax}</div>
                            <div className="mt-2">
                                <div className="font-semibold">Attaques:</div>
                                {selectedTemplate.attaques.map((att, i) => (
                                    <div key={i} className="ml-2 text-xs">
                                        • {att.name}: Succès {att.succes}+, Explosion {att.explosion}+, Dégâts {att.degats}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Nom</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">HP Max</label>
                                <input
                                    type="number"
                                    value={blessureMax}
                                    onChange={(e) => setBlessureMax(e.target.value)}
                                    className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Armure</label>
                                <input
                                    type="number"
                                    value={armure}
                                    onChange={(e) => setArmure(e.target.value)}
                                    className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Seuil</label>
                                <input
                                    type="number"
                                    value={seuil}
                                    onChange={(e) => setSeuil(e.target.value)}
                                    className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Actions/tour</label>
                                <input
                                    type="number"
                                    value={actionsMax}
                                    onChange={(e) => setActionsMax(e.target.value)}
                                    className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment">Attaques</label>
                                <button
                                    onClick={addAttaque}
                                    className="px-2 py-1 bg-viking-bronze text-viking-brown rounded text-xs hover:bg-viking-leather"
                                >
                                    ➕ Attaque
                                </button>
                            </div>
                            
                            {attaques.map((att, i) => (
                                <div key={i} className="mb-3 p-2 border border-viking-bronze rounded">
                                    <div className="flex justify-between items-center mb-2">
                                        <input
                                            type="text"
                                            value={att.name}
                                            onChange={(e) => updateAttaque(i, 'name', e.target.value)}
                                            placeholder="Nom attaque"
                                            className="flex-1 px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                        />
                                        {attaques.length > 1 && (
                                            <button
                                                onClick={() => removeAttaque(i)}
                                                className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-xs text-viking-leather dark:text-viking-bronze mb-1">Succès</label>
                                            <input
                                                type="number"
                                                value={att.succes}
                                                onChange={(e) => updateAttaque(i, 'succes', e.target.value)}
                                                placeholder="6+"
                                                className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-viking-leather dark:text-viking-bronze mb-1">Explosion</label>
                                            <input
                                                type="number"
                                                value={att.explosion}
                                                onChange={(e) => updateAttaque(i, 'explosion', e.target.value)}
                                                placeholder="10"
                                                className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-viking-leather dark:text-viking-bronze mb-1">Dégâts</label>
                                            <input
                                                type="number"
                                                value={att.degats}
                                                onChange={(e) => updateAttaque(i, 'degats', e.target.value)}
                                                placeholder="2"
                                                className="w-full px-2 py-1 border rounded text-sm text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded font-semibold hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleAdd}
                        className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather"
                    >
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal Edit NPC (similaire mais pour édition)
const EditNPCModal = ({ npc, onClose, onUpdate }) => {
    const { useState } = React;
    
    const [name, setName] = useState(npc.name);
    const [blessureMax, setBlessureMax] = useState(npc.blessureMax);
    const [armure, setArmure] = useState(npc.armure);
    const [seuil, setSeuil] = useState(npc.seuil);
    const [actionsMax, setActionsMax] = useState(npc.actionsMax);
    const [armeName, setArmeName] = useState(npc.arme?.name || '');
    const [armeDegats, setArmeDegats] = useState(npc.arme?.degats || '');
    const [armeSeuil, setArmeSeuil] = useState(npc.arme?.seuil || 7);
    
    const handleUpdate = () => {
        onUpdate({
            name,
            blessureMax: parseInt(blessureMax),
            armure: parseInt(armure),
            seuil: parseInt(seuil),
            actionsMax: parseInt(actionsMax),
            arme: {
                name: armeName,
                degats: armeDegats,
                seuil: parseInt(armeSeuil)
            }
        });
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-lg w-full border-4 border-viking-bronze p-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">Modifier {npc.name}</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Nom</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">HP Max</label>
                            <input
                                type="number"
                                value={blessureMax}
                                onChange={(e) => setBlessureMax(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Armure</label>
                            <input
                                type="number"
                                value={armure}
                                onChange={(e) => setArmure(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Seuil</label>
                            <input
                                type="number"
                                value={seuil}
                                onChange={(e) => setSeuil(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Actions/tour</label>
                            <input
                                type="number"
                                value={actionsMax}
                                onChange={(e) => setActionsMax(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Arme</label>
                        <input
                            type="text"
                            value={armeName}
                            onChange={(e) => setArmeName(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800 mb-2"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Dégâts</label>
                            <input
                                type="text"
                                value={armeDegats}
                                onChange={(e) => setArmeDegats(e.target.value)}
                                placeholder="1d6+2"
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1">Seuil arme</label>
                            <input
                                type="number"
                                value={armeSeuil}
                                onChange={(e) => setArmeSeuil(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-viking-brown dark:text-viking-parchment dark:bg-gray-800"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded font-semibold hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleUpdate}
                        className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather"
                    >
                        Mettre à jour
                    </button>
                </div>
            </div>
        </div>
    );
};

// Référence Règles Combat
const RulesReference = () => {
    return (
        <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4">
            <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-3">
                📖 Règles Combat (Référence)
            </h2>
            
            <div className="space-y-3 text-sm text-viking-text dark:text-viking-parchment">
                <div>
                    <div className="font-bold text-viking-bronze mb-1">Initiative</div>
                    <div>2d10 + Agilité (calculée automatiquement)</div>
                </div>
                
                <div>
                    <div className="font-bold text-viking-bronze mb-1">Actions par Tour</div>
                    <div>Variable selon personnage/adversaire. Reset à chaque nouveau tour.</div>
                </div>
                
                <div>
                    <div className="font-bold text-viking-bronze mb-1">Posture Défensive (1 action)</div>
                    <div className="ml-3">
                        <div>• <strong>Actif:</strong> Jet combat CàC, si 1+ succès → Seuil attaquant = Seuil + MR</div>
                        <div>• <strong>Passif:</strong> Seuil attaquant = Seuil + (Combat / 2, arrondi inf, max 3)</div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            Exemple: Combat 4 → Passif +2 seuil | Combat 7 → Passif +3 seuil
                        </div>
                    </div>
                </div>
                
                <div>
                    <div className="font-bold text-viking-bronze mb-1">Blessures</div>
                    <div>KO à 5 tokens pour joueurs. Variable pour adversaires.</div>
                </div>
                
                <div>
                    <div className="font-bold text-viking-bronze mb-1">Fatigue</div>
                    <div>Affecte les jets mais pas ajoutée pendant combat (sauf traits spéciaux).</div>
                </div>
            </div>
        </div>
    );
};

const GMView = ({ darkMode, onToggleDarkMode }) => {
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
    
    // Charger état combat initial
    useEffect(() => {
        loadCombatState();
        loadOnlineCharacters();
        loadPendingAttacks();
    }, []);
    
    // Socket globale
    const socket = useSocket();
    
    // WebSocket listeners
    useEffect(() => {
        if (!socket) return;
        
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
            const res = await fetch(`/api/characters/${onlineChar.characterId}`);
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
                    const charRes = await fetch(`/api/characters/${combatant.characterId}`);
                    const fullChar = await charRes.json();
                    
                    // Modifier les champs nécessaires
                    fullChar.tokensBlessure = updates.blessure !== undefined ? updates.blessure : combatant.blessure;
                    fullChar.tokensFatigue = updates.fatigue !== undefined ? updates.fatigue : combatant.fatigue;
                    
                    // Update fiche complète
                    await fetch(`/api/characters/${combatant.characterId}`, {
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
        if (!confirm('Supprimer ce combattant ?')) return;
        
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
            <header className="bg-viking-brown dark:bg-gray-800 text-viking-parchment p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">⚔️</span>
                        <h1 className="text-xl font-bold font-viking">Vue Maître du Jeu</h1>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowDiceModal(true)}
                            className="px-3 py-1 bg-viking-success text-white rounded text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                            🎲 Lancer dés
                        </button>
                        <a 
                            href="/"
                            className="px-3 py-1 bg-viking-bronze hover:bg-viking-leather text-viking-brown rounded text-sm font-semibold transition-colors"
                        >
                            ← Retour App
                        </a>
                        <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
                    </div>
                </div>
            </header>
            
            <div className="max-w-7xl mx-auto p-4">
                {/* Contrôles Combat */}
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">
                            Contrôles Combat
                        </h2>
                        {!combatState.active ? (
                            <button
                                onClick={startCombat}
                                disabled={combatState.combatants.length === 0}
                                className="px-4 py-2 bg-viking-success text-white rounded font-semibold hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                🎬 Démarrer Combat
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={nextTurn}
                                    className="px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather"
                                >
                                    ▶️ Tour Suivant
                                </button>
                                <button
                                    onClick={() => setShowEndCombatConfirm(true)}
                                    className="px-4 py-2 bg-viking-danger text-white rounded font-semibold hover:bg-red-700"
                                >
                                    ⏹️ Terminer
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {combatState.active && (
                        <div className="flex gap-4 text-sm">
                            <div className="px-3 py-1 bg-viking-bronze/20 rounded">
                                <span className="font-semibold">Round:</span> {combatState.round}
                            </div>
                            <div className="px-3 py-1 bg-viking-bronze/20 rounded">
                                <span className="font-semibold">Tour actuel:</span> {currentCombatant ? currentCombatant.name : 'Aucun'}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Joueurs en ligne */}
                {onlineCharacters.length > 0 && !combatState.active && (
                    <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4 mb-4">
                        <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-4">
                            👥 Joueurs en ligne ({onlineCharacters.length})
                        </h2>
                        <div className="space-y-2">
                            {onlineCharacters.map(char => {
                                const alreadyAdded = combatState.combatants.some(c => c.characterId === char.characterId);
                                
                                return (
                                    <div
                                        key={char.characterId}
                                        className="flex justify-between items-center p-2 bg-viking-parchment dark:bg-gray-800 rounded"
                                    >
                                        <div>
                                            <div className="font-bold text-viking-brown dark:text-viking-parchment">
                                                {char.name}
                                            </div>
                                            <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                                Joueur: {char.playerName} | Agilité: {char.agilite} | Actions: {char.actionsMax}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => addPlayerToCombat(char)}
                                            disabled={alreadyAdded}
                                            className="px-3 py-1 bg-viking-bronze text-viking-brown rounded text-sm font-semibold hover:bg-viking-leather disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            {alreadyAdded ? '✓ Ajouté' : '➕ Ajouter'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
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
                                <CombatantCardGM
                                    key={combatant.id}
                                    combatant={combatant}
                                    isActive={index === combatState.currentTurnIndex}
                                    onUpdate={(updates) => updateCombatant(combatant.id, updates)}
                                    onRemove={() => removeCombatant(combatant.id)}
                                    onEdit={() => setEditingNPC(combatant)}
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    combatActive={combatState.active}
                                    onNPCAttack={handleNPCAttack}
                                />
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Règles Référence */}
                <RulesReference />
            </div>
            
            {/* Modals */}
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
            <ToastNotifications onViewHistory={() => setHistoryPanelOpen(true)} />

            {/* History Panel */}
            <HistoryPanel isOpen={historyPanelOpen} onClose={() => setHistoryPanelOpen(false)} />

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
