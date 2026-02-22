// components/GMView/scene/GMSendItemModal.jsx - Modale envoi d'item GM → joueur
import React, { useState } from 'react';
import { ITEMS, CARACNAMES } from '../../../tools/data.js';

const TOAST_ANIMATIONS = [
    { id: 'default', label: 'Classique', icon: '📬' },
    { id: 'shake', label: 'Tremblement', icon: '💥' },
    { id: 'flash', label: 'Flash', icon: '⚡' },
    { id: 'glitter', label: 'Doré', icon: '✨' },
];

const GMSendItemModal = ({ onClose, onSend, sessionCharacters = [], preSelectedCharId = null }) => {
    // Destinataire unique
    const [targetCharId, setTargetCharId] = useState(preSelectedCharId || (sessionCharacters[0]?.id ?? null));

    // Mode sélection : catalogue ou custom
    const [mode, setMode] = useState('list'); // 'list' | 'custom'

    // Catalogue
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedItem, setSelectedItem] = useState(null);

    // Custom
    const [customName, setCustomName] = useState('');
    const [customCategory, setCustomCategory] = useState('item');
    const [customWeaponType, setCustomWeaponType] = useState('1 main');
    const [customDamage, setCustomDamage] = useState('');
    const [customRange, setCustomRange] = useState('');
    const [customArmorValue, setCustomArmorValue] = useState('');
    const [customReqForce, setCustomReqForce] = useState('');
    const [customReqAgi, setCustomReqAgi] = useState('');
    const [customNotes, setCustomNotes] = useState('');

    // Commun
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [toastAnimation, setToastAnimation] = useState('default');
    const [sending, setSending] = useState(false);

    // Filtrer catalogue
    const filteredItems = ITEMS.filter(item => {
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchSearch && matchCategory;
    });

    // Construire l'objet item à envoyer
    const buildItem = () => {
        if (mode === 'list') {
            if (!selectedItem) return null;
            return {
                ...selectedItem,
                quantity,
                location: 'bag',
                customItem: false
            };
        } else {
            if (!customName.trim()) return null;
            const requirements = {};
            if (customReqForce) requirements.force = parseInt(customReqForce);
            if (customReqAgi) requirements.agilite = parseInt(customReqAgi);

            return {
                name: customName.trim(),
                category: customCategory,
                quantity,
                location: 'bag',
                notes: customNotes.trim() || null,
                weaponType: customCategory === 'weapon' ? customWeaponType : undefined,
                damage: customCategory === 'weapon' && customDamage ? parseInt(customDamage) : undefined,
                range: customCategory === 'weapon' && customRange ? customRange.trim() : undefined,
                armorValue: customCategory === 'armor' && customArmorValue ? parseInt(customArmorValue) : 0,
                requirements,
                customItem: true
            };
        }
    };

    const handleSend = async () => {
        const item = buildItem();
        if (!item || !targetCharId) return;

        setSending(true);
        try {
            await onSend({
                targetCharacterId: targetCharId,
                item,
                note: note.trim() || null,
                toastAnimation
            });
            onClose();
        } catch (error) {
            console.error('[GMSendItemModal] Error:', error);
            setSending(false);
        }
    };

    const canSend = targetCharId && (mode === 'list' ? !!selectedItem : !!customName.trim());

    // Helper affichage stats item
    const getItemDetails = (item) => {
        const parts = [];
        if (item.weaponType) parts.push(item.weaponType);
        if (item.damage) parts.push(`Dégâts: ${item.damage}`);
        if (item.range) parts.push(`Portée: ${item.range}`);
        if (item.armorValue) parts.push(`Armure: +${item.armorValue}`);
        if (item.requirements && Object.keys(item.requirements).length > 0) {
            const reqs = Object.entries(item.requirements)
                .map(([k, v]) => `${CARACNAMES[k] || k} ${v}`)
                .join(', ');
            parts.push(`Pré-requis: ${reqs}`);
        }
        return parts.join(' • ');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-lg w-full border-4 border-viking-bronze max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b-2 border-viking-bronze/50">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        🎁 Envoyer un objet
                    </h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* --- Destinataire (unique) --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2 block">
                            Destinataire
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {sessionCharacters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => setTargetCharId(char.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-2 ${
                                        targetCharId === char.id
                                            ? 'bg-viking-bronze/30 border-viking-bronze text-viking-brown dark:text-viking-parchment'
                                            : 'border-viking-leather/30 dark:border-viking-bronze/30 text-viking-leather dark:text-viking-bronze'
                                    }`}
                                >
                                    {char.avatar ? (
                                        <img src={char.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                        <span className="w-5 h-5 rounded-full bg-viking-leather/20 flex items-center justify-center text-[10px]">
                                            {char.name?.[0]?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                    {char.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- Mode : Catalogue / Custom --- */}
                    <div className="flex gap-1 bg-viking-parchment dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setMode('list')}
                            className={`flex-1 px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                                mode === 'list'
                                    ? 'bg-viking-bronze text-viking-brown shadow'
                                    : 'text-viking-leather dark:text-viking-bronze'
                            }`}
                        >
                            📋 Catalogue
                        </button>
                        <button
                            onClick={() => setMode('custom')}
                            className={`flex-1 px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                                mode === 'custom'
                                    ? 'bg-viking-bronze text-viking-brown shadow'
                                    : 'text-viking-leather dark:text-viking-bronze'
                            }`}
                        >
                            ✏️ Custom
                        </button>
                    </div>

                    {/* --- Mode Catalogue --- */}
                    {mode === 'list' && (
                        <div className="space-y-2">
                            {/* Recherche + filtre catégorie */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Rechercher..."
                                    className="flex-1 px-3 py-1.5 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none"
                                />
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="px-2 py-1.5 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                                >
                                    <option value="all">Tout</option>
                                    <option value="weapon">Armes</option>
                                    <option value="armor">Armures</option>
                                    <option value="item">Objets</option>
                                </select>
                            </div>

                            {/* Liste */}
                            <div className="max-h-48 overflow-y-auto border-2 border-viking-leather/20 dark:border-viking-bronze/20 rounded-lg divide-y divide-viking-leather/10 dark:divide-viking-bronze/20">
                                {filteredItems.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedItem(item)}
                                        className={`w-full text-left px-3 py-2 transition-colors ${
                                            selectedItem?.name === item.name
                                                ? 'bg-viking-bronze/20 dark:bg-viking-bronze/10'
                                                : 'hover:bg-viking-parchment dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <div className="font-semibold text-sm text-viking-brown dark:text-viking-parchment">
                                            {item.name}
                                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-viking-leather/10 text-viking-leather dark:text-viking-bronze">
                                                {item.category === 'weapon' ? 'Arme' : item.category === 'armor' ? 'Armure' : 'Objet'}
                                            </span>
                                        </div>
                                        {getItemDetails(item) && (
                                            <div className="text-[11px] text-viking-leather dark:text-viking-bronze mt-0.5">
                                                {getItemDetails(item)}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- Mode Custom --- */}
                    {mode === 'custom' && (
                        <div className="space-y-3">
                            {/* Nom */}
                            <input
                                type="text"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder="Nom de l'objet *"
                                className="w-full px-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none"
                            />

                            {/* Catégorie */}
                            <select
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full px-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                            >
                                <option value="item">Objet</option>
                                <option value="weapon">Arme</option>
                                <option value="armor">Armure</option>
                            </select>

                            {/* Stats arme */}
                            {customCategory === 'weapon' && (
                                <div className="grid grid-cols-3 gap-2">
                                    <select
                                        value={customWeaponType}
                                        onChange={(e) => setCustomWeaponType(e.target.value)}
                                        className="px-2 py-1.5 text-xs border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                                    >
                                        <option value="1 main">1 main</option>
                                        <option value="2 mains">2 mains</option>
                                        <option value="Distance">Distance</option>
                                        <option value="2 mains / Jet">2 mains / Jet</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={customDamage}
                                        onChange={(e) => setCustomDamage(e.target.value)}
                                        placeholder="Dégâts"
                                        min="0"
                                        className="px-2 py-1.5 text-xs border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                                    />
                                    <input
                                        type="text"
                                        value={customRange}
                                        onChange={(e) => setCustomRange(e.target.value)}
                                        placeholder="Portée"
                                        className="px-2 py-1.5 text-xs border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                                    />
                                </div>
                            )}

                            {/* Stats armure */}
                            {customCategory === 'armor' && (
                                <input
                                    type="number"
                                    value={customArmorValue}
                                    onChange={(e) => setCustomArmorValue(e.target.value)}
                                    placeholder="Valeur d'armure"
                                    min="0"
                                    className="w-full px-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                                />
                            )}

                            {/* Pré-requis */}
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    value={customReqForce}
                                    onChange={(e) => setCustomReqForce(e.target.value)}
                                    placeholder="Pré-requis FOR"
                                    min="0"
                                    className="px-2 py-1.5 text-xs border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                                />
                                <input
                                    type="number"
                                    value={customReqAgi}
                                    onChange={(e) => setCustomReqAgi(e.target.value)}
                                    placeholder="Pré-requis AGI"
                                    min="0"
                                    className="px-2 py-1.5 text-xs border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment"
                                />
                            </div>

                            {/* Notes item */}
                            <input
                                type="text"
                                value={customNotes}
                                onChange={(e) => setCustomNotes(e.target.value)}
                                placeholder="Notes sur l'objet"
                                className="w-full px-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none"
                            />
                        </div>
                    )}

                    {/* --- Quantité --- */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">
                            Quantité :
                        </label>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-7 h-7 bg-viking-parchment dark:bg-gray-800 rounded text-sm font-bold text-viking-brown dark:text-viking-parchment border border-viking-leather/30 dark:border-viking-bronze/30"
                            >
                                -
                            </button>
                            <span className="w-8 text-center font-semibold text-viking-brown dark:text-viking-parchment">
                                {quantity}
                            </span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-7 h-7 bg-viking-parchment dark:bg-gray-800 rounded text-sm font-bold text-viking-brown dark:text-viking-parchment border border-viking-leather/30 dark:border-viking-bronze/30"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* --- Note accompagnante --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-1 block">
                            Note (optionnel)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Message accompagnant l'objet..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border-2 border-viking-leather/30 dark:border-viking-bronze/30 rounded-lg bg-viking-parchment dark:bg-gray-800 text-viking-brown dark:text-viking-parchment focus:border-viking-bronze focus:outline-none resize-y"
                        />
                    </div>

                    {/* --- Animation toast --- */}
                    <div>
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2 block">
                            Animation de notification
                        </label>
                        <div className="flex gap-2">
                            {TOAST_ANIMATIONS.map(anim => (
                                <button
                                    key={anim.id}
                                    onClick={() => setToastAnimation(anim.id)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-2 ${
                                        toastAnimation === anim.id
                                            ? 'bg-viking-bronze border-viking-leather text-viking-brown'
                                            : 'border-viking-leather/30 dark:border-viking-bronze/30 text-viking-leather dark:text-viking-bronze'
                                    }`}
                                >
                                    {anim.icon} {anim.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t-2 border-viking-bronze/50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!canSend || sending}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                            canSend && !sending
                                ? 'bg-viking-success text-white hover:bg-green-700'
                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                    >
                        {sending ? '⏳ Envoi...' : '🎁 Envoyer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GMSendItemModal;