// InventoryTab.js - Gestion inventaire/équipement
import React, { useState, useEffect } from "react";
import {CARACNAMES, ITEMS} from "../../tools/data.js";
import AlertModal from "../shared/AlertModal.jsx";

const InventoryTab = ({ character, onUpdate }) => {
    const { useState } = React;
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [addLocation, setAddLocation] = useState('bag');
    const [editItem, setEditItem] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    
    const items = character.items || [];
    
    // Filtrer par emplacement
    const equipped = items.filter(i => i.location === 'equipped');
    const bag = items.filter(i => i.location === 'bag');
    const stash = items.filter(i => i.location === 'stash');
    
    // Calculer armure totale depuis équipement
    const totalArmor = equipped.reduce((sum, i) => sum + (i.armorValue || 0), 0);
    
    // Déplacer item
    const moveItem = (item, newLocation) => {
        const updatedItems = items.map(i => 
            i.id === item.id ? { ...i, location: newLocation } : i
        );
        
        // Recalculer armure si changement équipement
        let newArmor = character.armure;
        if (item.location === 'equipped' || newLocation === 'equipped') {
            const newTotalArmor = updatedItems
                .filter(i => i.location === 'equipped')
                .reduce((sum, i) => sum + (i.armorValue || 0), 0);
            newArmor = newTotalArmor;
        }
        
        onUpdate({
            ...character,
            items: updatedItems,
            armure: newArmor
        });
    };
    
    // Supprimer item
    const deleteItem = (itemId) => {
        if (!confirm('Supprimer cet objet ?')) return;
        
        const item = items.find(i => i.id === itemId);
        const updatedItems = items.filter(i => i.id !== itemId);
        
        // Recalculer armure si équipé
        let newArmor = character.armure;
        if (item.location === 'equipped' && item.armorValue) {
            newArmor = updatedItems
                .filter(i => i.location === 'equipped')
                .reduce((sum, i) => sum + (i.armorValue || 0), 0);
        }
        
        onUpdate({
            ...character,
            items: updatedItems,
            armure: newArmor
        });
    };
    
    // Changer quantité
    const changeQuantity = (itemId, delta) => {
        const updatedItems = items.map(i => {
            if (i.id === itemId) {
                const newQty = Math.max(0, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }).filter(i => i.quantity > 0); // Supprimer si quantité = 0
        
        onUpdate({
            ...character,
            items: updatedItems
        });
    };
    
    // Render section
    const renderSection = (title, itemList, location) => {
        const { useState } = React;
        const [filterType, setFilterType] = useState('all');
        
        const locationIcons = {
            equipped: '⚔️',
            bag: '🎒',
            stash: '🏠'
        };
        
        const locationLabels = {
            equipped: 'ÉQUIPÉ',
            bag: 'SAC',
            stash: 'STASH'
        };
        
        // Filtrer par type
        const filteredList = filterType === 'all' 
            ? itemList 
            : itemList.filter(i => i.category === filterType);
        
        return (
            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        {locationIcons[location]} {locationLabels[location]} ({itemList.length})
                    </h3>
                    <button
                        onClick={() => { setAddLocation(location); setShowAddModal(true); }}
                        className="px-3 py-1 bg-viking-bronze text-viking-brown rounded text-sm font-semibold hover:bg-viking-leather"
                    >
                        + Ajouter
                    </button>
                </div>
                
                {location === 'equipped' && (
                    <div className="mb-3 p-3 bg-viking-success/20 rounded-lg border-2 border-viking-success">
                        <div className="text-lg font-bold text-viking-success text-center">
                            ARMURE TOTALE : {totalArmor}
                        </div>
                    </div>
                )}
                
                {/* Filtres */}
                {itemList.length > 0 && (
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                                filterType === 'all' 
                                    ? 'bg-viking-bronze text-viking-brown' 
                                    : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                            }`}
                        >
                            Tous ({itemList.length})
                        </button>
                        <button
                            onClick={() => setFilterType('weapon')}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                                filterType === 'weapon' 
                                    ? 'bg-viking-bronze text-viking-brown' 
                                    : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                            }`}
                        >
                            Armes ({itemList.filter(i => i.category === 'weapon').length})
                        </button>
                        <button
                            onClick={() => setFilterType('armor')}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                                filterType === 'armor' 
                                    ? 'bg-viking-bronze text-viking-brown' 
                                    : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                            }`}
                        >
                            Armures ({itemList.filter(i => i.category === 'armor').length})
                        </button>
                        <button
                            onClick={() => setFilterType('item')}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                                filterType === 'item' 
                                    ? 'bg-viking-bronze text-viking-brown' 
                                    : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                            }`}
                        >
                            Objets ({itemList.filter(i => i.category === 'item').length})
                        </button>
                    </div>
                )}
                
                <div className="space-y-2">
                    {filteredList.length === 0 ? (
                        <div className="text-center text-viking-leather dark:text-viking-bronze p-4">
                            {filterType === 'all' ? 'Aucun objet' : `Aucun objet de ce type`}
                        </div>
                    ) : (
                        filteredList.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onMove={moveItem}
                                onDelete={deleteItem}
                                onChangeQty={changeQuantity}
                                onEdit={setEditItem}
                                currentLocation={location}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    };
    
    return (
        <div className="space-y-4">
            {renderSection('Équipé', equipped, 'equipped')}
            {renderSection('Sac', bag, 'bag')}
            {renderSection('Stash', stash, 'stash')}
            
            {showAddModal && (
                <AddItemModal
                    character={character}
                    onClose={() => setShowAddModal(false)}
                    onUpdate={onUpdate}
                    defaultLocation={addLocation}
                />
            )}
            
            {editItem && (
                <EditItemModal
                    character={character}
                    item={editItem}
                    onClose={() => setEditItem(null)}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    );
};

// Carte item
const ItemCard = ({ item, onMove, onDelete, onChangeQty, onEdit, currentLocation }) => {
    const getItemDetails = () => {
        const parts = [];
        
        if (item.category === 'weapon') {
            parts.push(`${item.weaponType || 'Arme'}`);
            if (item.damage) parts.push(`Dégâts ${item.damage}`);
            if (item.range) parts.push(`Portée ${item.range}`);
        }
        
        if (item.category === 'armor' && item.armorValue > 0) {
            parts.push(`Armure +${item.armorValue}`);
        }
        
        if (item.requirements && Object.keys(item.requirements).length > 0) {
            const reqs = Object.entries(item.requirements)
                .map(([k, v]) => `${CARACNAMES[k]} ${v}`)
                .join(', ');
            parts.push(`Pré-requis: ${reqs}`);
        }
        
        return parts.join(' • ');
    };
    
    const getCategoryBadge = () => {
        const badges = {
            weapon: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Arme' },
            armor: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'Armure' },
            item: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200', label: 'Objet' }
        };
        
        const badge = badges[item.category] || badges.item;
        
        return (
            <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };
    
    return (
        <div className="p-3 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-viking-brown dark:text-viking-parchment">
                            {item.name}
                        </span>
                        {getCategoryBadge()}
                        {item.customItem && (
                            <span className="text-xs px-2 py-0.5 rounded bg-viking-bronze/20 text-viking-bronze">
                                Custom
                            </span>
                        )}
                    </div>
                    
                    {getItemDetails() && (
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mb-1">
                            {getItemDetails()}
                        </div>
                    )}
                    
                    {item.notes && (
                        <div className="text-xs text-viking-text dark:text-viking-parchment italic mt-1">
                            {item.notes}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                    {/* Quantité */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onChangeQty(item.id, -1)}
                            className="w-6 h-6 rounded bg-viking-bronze text-viking-brown text-sm font-bold hover:bg-viking-leather"
                        >
                            -
                        </button>
                        <span className="text-sm font-semibold text-viking-brown dark:text-viking-parchment px-2">
                            x{item.quantity}
                        </span>
                        <button
                            onClick={() => onChangeQty(item.id, 1)}
                            className="w-6 h-6 rounded bg-viking-bronze text-viking-brown text-sm font-bold hover:bg-viking-leather"
                        >
                            +
                        </button>
                    </div>
                    
                    {/* Déplacer */}
                    <div className="flex gap-1">
                        {currentLocation !== 'equipped' && (
                            <button
                                onClick={() => onMove(item, 'equipped')}
                                className="px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                                title="Équiper"
                            >
                                ⚔️
                            </button>
                        )}
                        {currentLocation !== 'bag' && (
                            <button
                                onClick={() => onMove(item, 'bag')}
                                className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                                title="Mettre dans le sac"
                            >
                                🎒
                            </button>
                        )}
                        {currentLocation !== 'stash' && (
                            <button
                                onClick={() => onMove(item, 'stash')}
                                className="px-2 py-1 rounded bg-gray-600 text-white text-xs hover:bg-gray-700"
                                title="Mettre au stash"
                            >
                                🏠
                            </button>
                        )}
                    </div>
                    
                    {/* Éditer */}
                    <button
                        onClick={() => onEdit(item)}
                        className="px-2 py-1 rounded bg-viking-bronze text-viking-brown text-xs hover:bg-viking-leather"
                        title="Éditer"
                    >
                        ✏️
                    </button>
                    
                    {/* Supprimer */}
                    <button
                        onClick={() => onDelete(item.id)}
                        className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal ajout item
const AddItemModal = ({ character, onClose, onUpdate, defaultLocation }) => {
    const { useState } = React;
    
    const [mode, setMode] = useState('list'); // 'list' ou 'custom'
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    
    // Custom fields
    const [customName, setCustomName] = useState('');
    const [customCategory, setCustomCategory] = useState('item');
    const [customWeaponType, setCustomWeaponType] = useState('1 main');
    const [customDamage, setCustomDamage] = useState('');
    const [customRange, setCustomRange] = useState('');
    const [customArmorValue, setCustomArmorValue] = useState('');
    const [customReqForce, setCustomReqForce] = useState('');
    const [customReqAgi, setCustomReqAgi] = useState('');
    const [customNotes, setCustomNotes] = useState('');
    
    const [quantity, setQuantity] = useState(1);
    const [location, setLocation] = useState(defaultLocation);
    
    // Filtrer items
    const filteredItems = ITEMS.filter(item => {
        const matchSearch = !search || 
            item.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchSearch && matchCategory;
    });
    
    const handleAdd = () => {
        let newItem;
        
        if (mode === 'list') {
            if (!selected) return;
            
            newItem = {
                ...selected,
                id: Date.now(), // Temporaire, sera remplacé par DB
                quantity,
                location,
                notes: '',
                customItem: false
            };
        } else {
            if (!customName.trim()) {
                setAlertMessage('Le nom est requis');
                return;
            }
            
            const requirements = {};
            if (customReqForce) requirements.force = parseInt(customReqForce);
            if (customReqAgi) requirements.agilite = parseInt(customReqAgi);
            
            newItem = {
                id: Date.now(),
                name: customName.trim(),
                category: customCategory,
                quantity,
                location,
                notes: customNotes.trim(),
                weaponType: customCategory === 'weapon' ? customWeaponType : undefined,
                damage: customCategory === 'weapon' && customDamage ? parseInt(customDamage) : undefined,
                range: customCategory === 'weapon' && customRange ? customRange.trim() : undefined,
                armorValue: customCategory === 'armor' && customArmorValue ? parseInt(customArmorValue) : 0,
                requirements,
                customItem: true
            };
        }
        
        const updatedItems = [...(character.items || []), newItem];
        
        // Recalculer armure si équipé
        let newArmor = character.armure;
        if (location === 'equipped' && newItem.armorValue) {
            newArmor = updatedItems
                .filter(i => i.location === 'equipped')
                .reduce((sum, i) => sum + (i.armorValue || 0), 0);
        }
        
        onUpdate({
            ...character,
            items: updatedItems,
            armure: newArmor
        });
        
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">Ajouter un objet</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Mode sélection - Switch boutons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setMode('list')}
                            className={`py-3 rounded-lg font-semibold transition-colors ${
                                mode === 'list'
                                    ? 'bg-viking-bronze text-viking-brown border-2 border-viking-leather'
                                    : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment border-2 border-viking-leather dark:border-viking-bronze hover:bg-viking-bronze/20'
                            }`}
                        >
                            📋 Depuis la liste
                        </button>
                        <button
                            onClick={() => setMode('custom')}
                            className={`py-3 rounded-lg font-semibold transition-colors ${
                                mode === 'custom'
                                    ? 'bg-viking-bronze text-viking-brown border-2 border-viking-leather'
                                    : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment border-2 border-viking-leather dark:border-viking-bronze hover:bg-viking-bronze/20'
                            }`}
                        >
                            ✏️ Objet personnalisé
                        </button>
                    </div>
                    
                    {mode === 'list' ? (
                        <>
                            {/* Recherche */}
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="🔍 Rechercher..."
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                autoFocus
                            />
                            
                            {/* Filtres catégorie */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCategoryFilter('all')}
                                    className={`px-3 py-1 rounded text-sm font-semibold ${
                                        categoryFilter === 'all' 
                                            ? 'bg-viking-bronze text-viking-brown' 
                                            : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                                    }`}
                                >
                                    Tous
                                </button>
                                <button
                                    onClick={() => setCategoryFilter('weapon')}
                                    className={`px-3 py-1 rounded text-sm font-semibold ${
                                        categoryFilter === 'weapon' 
                                            ? 'bg-viking-bronze text-viking-brown' 
                                            : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                                    }`}
                                >
                                    Armes
                                </button>
                                <button
                                    onClick={() => setCategoryFilter('armor')}
                                    className={`px-3 py-1 rounded text-sm font-semibold ${
                                        categoryFilter === 'armor' 
                                            ? 'bg-viking-bronze text-viking-brown' 
                                            : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                                    }`}
                                >
                                    Armures
                                </button>
                                <button
                                    onClick={() => setCategoryFilter('item')}
                                    className={`px-3 py-1 rounded text-sm font-semibold ${
                                        categoryFilter === 'item' 
                                            ? 'bg-viking-bronze text-viking-brown' 
                                            : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                                    }`}
                                >
                                    Objets
                                </button>
                            </div>
                            
                            {/* Liste */}
                            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                                {filteredItems.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelected(item)}
                                        className={`p-2 rounded text-left text-sm ${selected?.name === item.name ? 'bg-viking-bronze text-viking-brown border-2 border-viking-leather' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-2 border-transparent hover:border-viking-bronze'}`}
                                    >
                                        <div className="font-semibold">{item.name}</div>
                                        {item.damage && <div className="text-xs">Dégâts {item.damage}</div>}
                                        {item.armorValue > 0 && <div className="text-xs">Armure +{item.armorValue}</div>}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Custom form */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Nom *</label>
                                    <input
                                        type="text"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Catégorie</label>
                                    <select
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                    >
                                        <option value="item">Objet</option>
                                        <option value="weapon">Arme</option>
                                        <option value="armor">Armure</option>
                                    </select>
                                </div>
                                
                                {customCategory === 'weapon' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Type arme</label>
                                            <select
                                                value={customWeaponType}
                                                onChange={(e) => setCustomWeaponType(e.target.value)}
                                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                            >
                                                <option value="1 main">1 main</option>
                                                <option value="2 mains">2 mains</option>
                                                <option value="Distance">Distance</option>
                                                <option value="1 main / Jet">1 main / Jet</option>
                                                <option value="2 mains / Jet">2 mains / Jet</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Dégâts</label>
                                                <input
                                                    type="number"
                                                    value={customDamage}
                                                    onChange={(e) => setCustomDamage(e.target.value)}
                                                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Portée</label>
                                                <input
                                                    type="text"
                                                    value={customRange}
                                                    onChange={(e) => setCustomRange(e.target.value)}
                                                    placeholder="ex: 15m"
                                                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                {customCategory === 'armor' && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Valeur armure</label>
                                        <input
                                            type="number"
                                            value={customArmorValue}
                                            onChange={(e) => setCustomArmorValue(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                        />
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Pré-requis</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={customReqForce}
                                            onChange={(e) => setCustomReqForce(e.target.value)}
                                            placeholder="Force"
                                            className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                        />
                                        <input
                                            type="number"
                                            value={customReqAgi}
                                            onChange={(e) => setCustomReqAgi(e.target.value)}
                                            placeholder="Agilité"
                                            className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Notes</label>
                                    <textarea
                                        value={customNotes}
                                        onChange={(e) => setCustomNotes(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Commun */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-viking-leather dark:border-viking-bronze">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Quantité</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Ajouter dans</label>
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            >
                                <option value="equipped">⚔️ Équipé</option>
                                <option value="bag">🎒 Sac</option>
                                <option value="stash">🏠 Stash</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={mode === 'list' ? !selected : !customName.trim()}
                            className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-30"
                        >
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Modal édition item
const EditItemModal = ({ character, item, onClose, onUpdate }) => {
    const { useState } = React;
    
    // States pour tous les champs éditables
    const [name, setName] = useState(item.name);
    const [category, setCategory] = useState(item.category);
    const [quantity, setQuantity] = useState(item.quantity);
    const [location, setLocation] = useState(item.location);
    const [notes, setNotes] = useState(item.notes || '');
    
    // Stats arme
    const [weaponType, setWeaponType] = useState(item.weaponType || '1 main');
    const [damage, setDamage] = useState(item.damage || '');
    const [range, setRange] = useState(item.range || '');
    
    // Stats armure
    const [armorValue, setArmorValue] = useState(item.armorValue || 0);
    
    // Pré-requis
    const [reqForce, setReqForce] = useState(item.requirements?.force || '');
    const [reqAgi, setReqAgi] = useState(item.requirements?.agilite || '');
    
    const handleSave = () => {
        if (!name.trim()) {
            setAlertMessage('Le nom est requis');
            return;
        }
        
        const requirements = {};
        if (reqForce) requirements.force = parseInt(reqForce);
        if (reqAgi) requirements.agilite = parseInt(reqAgi);
        
        const updatedItem = {
            ...item,
            name: name.trim(),
            category,
            quantity: Math.max(1, quantity),
            location,
            notes: notes.trim(),
            weaponType: category === 'weapon' ? weaponType : undefined,
            damage: category === 'weapon' && damage ? parseInt(damage) : undefined,
            range: category === 'weapon' && range ? range.trim() : undefined,
            armorValue: category === 'armor' && armorValue ? parseInt(armorValue) : 0,
            requirements
        };
        
        const updatedItems = character.items.map(i => 
            i.id === item.id ? updatedItem : i
        );
        
        // Recalculer armure si changement dans équipement
        let newArmor = character.armure;
        if (item.location === 'equipped' || location === 'equipped' || item.armorValue !== updatedItem.armorValue) {
            newArmor = updatedItems
                .filter(i => i.location === 'equipped')
                .reduce((sum, i) => sum + (i.armorValue || 0), 0);
        }
        
        onUpdate({
            ...character,
            items: updatedItems,
            armure: newArmor
        });
        
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">Éditer : {item.name}</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Nom */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Nom *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                        />
                    </div>
                    
                    {/* Catégorie */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Catégorie</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                        >
                            <option value="item">Objet</option>
                            <option value="weapon">Arme</option>
                            <option value="armor">Armure</option>
                        </select>
                    </div>
                    
                    {/* Stats arme */}
                    {category === 'weapon' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800 space-y-3">
                            <div className="font-semibold text-red-800 dark:text-red-200">⚔️ Stats Arme</div>
                            
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Type arme</label>
                                <select
                                    value={weaponType}
                                    onChange={(e) => setWeaponType(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                >
                                    <option value="1 main">1 main</option>
                                    <option value="2 mains">2 mains</option>
                                    <option value="Distance">Distance</option>
                                    <option value="1 main / Jet">1 main / Jet</option>
                                    <option value="2 mains / Jet">2 mains / Jet</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Dégâts</label>
                                    <input
                                        type="number"
                                        value={damage}
                                        onChange={(e) => setDamage(e.target.value)}
                                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Portée</label>
                                    <input
                                        type="text"
                                        value={range}
                                        onChange={(e) => setRange(e.target.value)}
                                        placeholder="ex: 15m"
                                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Stats armure */}
                    {category === 'armor' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                            <div className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🛡️ Stats Armure</div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Valeur armure</label>
                                <input
                                    type="number"
                                    value={armorValue}
                                    onChange={(e) => setArmorValue(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Pré-requis */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Pré-requis</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                value={reqForce}
                                onChange={(e) => setReqForce(e.target.value)}
                                placeholder="Force"
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            />
                            <input
                                type="number"
                                value={reqAgi}
                                onChange={(e) => setReqAgi(e.target.value)}
                                placeholder="Agilité"
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            />
                        </div>
                    </div>
                    
                    {/* Quantité & Emplacement */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-viking-leather dark:border-viking-bronze">
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Quantité</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Emplacement</label>
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            >
                                <option value="equipped">⚔️ Équipé</option>
                                <option value="bag">🎒 Sac</option>
                                <option value="stash">🏠 Stash</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Notes personnelles sur cet objet..."
                            className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                        />
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-30"
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
            {alertMessage && (
                <AlertModal
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </div>
    );
};

export default InventoryTab;
