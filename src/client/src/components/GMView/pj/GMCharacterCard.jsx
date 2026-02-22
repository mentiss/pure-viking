// components/GMView/scene/GMCharacterCard.jsx - Fiche personnage vue Maître du Jeu
import React, { useState } from 'react';
import {
    formatFullName,
    formatSkillName,
    getBlessureMalus,
    getFatigueMalus,
    getSuccessThreshold,
    formatExplosion, getBestCharacteristic, getExplosionThreshold
} from '../../../tools/utils.js';
import { CARACNAMES, TRAITS } from '../../../tools/data.js';
import TokenRow from "./TokenRow.jsx";
import CollapsibleSection from "./CollapsibleSection.jsx";

// --- Composant principal ---
const GMCharacterCard = ({ character, isOnline, onUpdateTokens, onSendMessage, onSendItem }) => {
    if (!character) return null;

    const blessureMalus = getBlessureMalus(character.tokensBlessure);
    const fatigueMalus = getFatigueMalus(character.tokensFatigue);

    // Handler pour toggle tokens (même logique que CharacterSheet)
    const handleTokenToggle = (type, index) => {
        const key = type === 'blessure' ? 'tokensBlessure' : 'tokensFatigue';
        const max = type === 'blessure' ? 5 : 9;
        const curr = character[key];
        const newValue = index < curr ? index : Math.min(index + 1, max);

        onUpdateTokens(character.id, { [key]: newValue });
    };

    // Items équipés
    const equippedItems = (character.items || []).filter(i => i.location === 'equipped');
    const equippedWeapons = equippedItems.filter(i => i.category === 'weapon');
    const equippedArmor = equippedItems.filter(i => i.category === 'armor');

    return (
        <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze">
            {/* === HEADER === */}
            <div className="p-4 border-b-2 border-viking-bronze/50">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                        {character.avatar ? (
                            <img
                                src={character.avatar}
                                alt={character.prenom}
                                className="w-14 h-14 rounded-full object-cover border-2 border-viking-bronze"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-viking-leather/30 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-viking-brown dark:text-viking-parchment border-2 border-viking-bronze">
                                {character.prenom?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        {/* Pastille online */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-viking-brown ${
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                    </div>

                    {/* Nom + joueur */}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                            {formatFullName(character)}
                        </h3>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">
                            👤 {character.playerName}
                            {character.activite && ` • ${character.activite}`}
                        </div>
                        <button
                          onClick={() => onSendMessage(character.id)}
                          className="px-2 py-1 text-xs bg-viking-success text-white rounded font-semibold hover:bg-green-700 transition-colors"
                          title="Envoyer un message"
                        >
                          📨
                        </button>
                        <button
                            onClick={() => onSendItem(character.id)}
                            className="ml-1 px-2 py-1 text-xs bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather transition-colors"
                            title="Envoyer un objet"
                        >
                            🎁
                        </button>
                    </div>

                    {/* Status tags rapides */}
                    <div className="flex flex-col gap-1 items-end">
                        {blessureMalus > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white font-semibold">
                                {character.tokensBlessure === 5 ? '💀 KO' : `-${blessureMalus}d10`}
                            </span>
                        )}
                        {fatigueMalus > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-600 text-white font-semibold">
                                +{fatigueMalus} seuil
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* === CONTENU === */}
            <div className="p-4 space-y-3">

                {/* --- Caractéristiques (grille compacte) --- */}
                <div>
                    <div className="text-xs font-semibold text-viking-leather dark:text-viking-bronze mb-2 uppercase tracking-wide">
                        Caractéristiques
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                        {['force', 'agilite', 'perception', 'intelligence', 'charisme', 'chance'].map(carac => (
                            <div key={carac} className="text-center p-2 bg-viking-parchment dark:bg-gray-800 rounded">
                                <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                    {CARACNAMES[carac]?.substring(0, 3).toUpperCase() || carac.substring(0, 3).toUpperCase()}
                                </div>
                                <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                                    {character[carac] || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- État : Tokens + SAGA --- */}
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-viking-leather dark:text-viking-bronze uppercase tracking-wide">
                        État
                    </div>

                    <TokenRow
                        label="Blessures"
                        current={character.tokensBlessure}
                        max={5}
                        type="blessure"
                        onToggle={handleTokenToggle}
                    />

                    <TokenRow
                        label="Fatigue"
                        current={character.tokensFatigue}
                        max={9}
                        type="fatigue"
                        onToggle={handleTokenToggle}
                    />

                    {/* SAGA */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-viking-brown dark:text-viking-parchment w-20">
                            SAGA
                        </span>
                        <div className="flex gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                                <div
                                    key={i}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                                        i < character.sagaActuelle
                                            ? 'bg-viking-bronze border-viking-leather text-viking-brown font-bold'
                                            : 'border-viking-leather/40 dark:border-viking-bronze/40 text-transparent'
                                    }`}
                                >
                                    ★
                                </div>
                            ))}
                        </div>
                        <span className="text-xs text-viking-leather dark:text-viking-bronze ml-1">
                            {character.sagaActuelle}/5
                        </span>
                    </div>
                </div>

                {/* --- Combat (compact) --- */}
                <div className="flex gap-3">
                    <div className="flex-1 text-center p-2 bg-viking-parchment dark:bg-gray-800 rounded">
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">ᛟ Réputation</div>
                        <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">{character.sagaTotale}</div>
                    </div>
                    <div className="flex-1 text-center p-2 bg-viking-parchment dark:bg-gray-800 rounded">
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">🛡️ Armure</div>
                        <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">{character.armure || 0}</div>
                    </div>
                    <div className="flex-1 text-center p-2 bg-viking-parchment dark:bg-gray-800 rounded">
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">🎯 Seuil</div>
                        <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">{character.seuilCombat || 1}</div>
                    </div>
                    <div className="flex-1 text-center p-2 bg-viking-parchment dark:bg-gray-800 rounded">
                        <div className="text-xs text-viking-leather dark:text-viking-bronze">⚡ Actions</div>
                        <div className="text-lg font-bold text-viking-brown dark:text-viking-parchment">{character.actionsDisponibles || 1}</div>
                    </div>
                </div>

                {/* --- Équipement rapide --- */}
                {equippedItems.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-viking-leather dark:text-viking-bronze mb-1 uppercase tracking-wide">
                            Équipé
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {equippedWeapons.map(w => (
                                <span key={w.id} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                                    ⚔️ {w.name} {w.damage ? `(${w.damage} dég)` : ''}
                                </span>
                            ))}
                            {equippedArmor.map(a => (
                                <span key={a.id} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                    🛡️ {a.name} {a.armorValue ? `(+${a.armorValue})` : ''}
                                </span>
                            ))}
                            {equippedItems.filter(i => i.category === 'item').map(i => (
                                <span key={i.id} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                    📦 {i.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- Sections collapsables --- */}

                <CollapsibleSection title="Compétences" icon="📚" defaultOpen={false}>
                    {character.skills?.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1">
                            {character.skills
                                .filter(s => s.level > 0)
                                .sort((a, b) => b.level - a.level)
                                .map((skill, i) => (
                                    <div key={i} className="flex justify-between items-center px-2 py-1 bg-viking-parchment dark:bg-gray-800 rounded text-xs">
                                        <span className="text-viking-brown dark:text-viking-parchment truncate">
                                            {formatSkillName(skill)} <span className="text-[10px] px-1 rounded bg-amber-300/30 text-viking-text">💥 {getExplosionThreshold(getBestCharacteristic(character, skill).level)[0]}+</span> <span className="text-[10px] px-1 rounded bg-green-300/30 text-viking-text">🎲 {getSuccessThreshold(skill.level)}+</span>
                                        </span>
                                        <span className="font-bold text-viking-bronze ml-2 shrink-0">
                                            {skill.currentPoints}/{skill.level}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="text-xs text-viking-leather dark:text-viking-bronze italic">Aucune compétence</div>
                    )}
                </CollapsibleSection>

                <CollapsibleSection title="Traits & Backgrounds" icon="🏷️" defaultOpen={false}>
                    {character.traits?.length > 0 ? (
                        <div className="space-y-1">
                            {character.traits.map((trait, i) => {
                                const traitData = TRAITS.find(t => t.name === trait.name);
                                return (
                                    <div key={i} className="px-2 py-1.5 bg-viking-parchment dark:bg-gray-800 rounded text-xs">
                                        <div className="font-semibold text-viking-brown dark:text-viking-parchment">
                                            {trait.name}
                                        </div>
                                        {traitData?.effects?.description && (
                                            <div className="text-viking-success mt-0.5">
                                                {traitData.effects.description}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-xs text-viking-leather dark:text-viking-bronze italic">Aucun trait</div>
                    )}
                </CollapsibleSection>

                <CollapsibleSection title="Runes" icon="ᚱ" defaultOpen={false}>
                    {character.runes?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {character.runes.map((rune, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">
                                    {rune.name} (Niv.{rune.level})
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-viking-leather dark:text-viking-bronze italic">Aucune rune</div>
                    )}
                </CollapsibleSection>

                <CollapsibleSection title="Inventaire complet" icon="🎒" defaultOpen={false}>
                    {character.items?.length > 0 ? (
                        <div className="space-y-1">
                            {character.items.map((item, i) => {
                                const locationIcons = { equipped: '⚔️', bag: '🎒', stash: '🏠' };
                                return (
                                    <div key={i} className="flex justify-between items-center px-2 py-1 bg-viking-parchment dark:bg-gray-800 rounded text-xs">
                                        <span className="text-viking-brown dark:text-viking-parchment">
                                            {locationIcons[item.location] || '📦'} {item.name}
                                            {item.quantity > 1 && ` (x${item.quantity})`}
                                        </span>
                                        <span className="text-viking-leather dark:text-viking-bronze">
                                            {item.category}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-xs text-viking-leather dark:text-viking-bronze italic">Inventaire vide</div>
                    )}
                </CollapsibleSection>
            </div>
        </div>
    );
};

export default GMCharacterCard;