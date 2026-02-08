
// Modal Ajout NPC
import React from "react";
import {useSocket} from "../../../context/SocketContext.jsx";
import {NPC_TEMPLATES} from "../../../tools/data.js";

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

export default AddNPCModal;