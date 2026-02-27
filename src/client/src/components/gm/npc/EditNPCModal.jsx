
// Modal Edit NPC (similaire mais pour édition)
import React from "react";
import {useSocket} from "../../../context/SocketContext.jsx";

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

export default EditNPCModal;