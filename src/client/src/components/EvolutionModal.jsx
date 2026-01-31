// EvolutionModal.js - Modal d'évolution (Dépense SAGA)

import React, { useState, useEffect } from "react";
import {formatSkillName, getSkillExamples, isSpecializableSkill} from "../tools/utils.js";
import {CARACNAMES, COMPETENCES, TRAITS} from "../tools/data.js";

const EvolutionModal = ({ character, onClose, onUpdate }) => {
    const { useState } = React;
    
    const [mode, setMode] = useState(null); // 'carac', 'skill', 'newSkill', 'trait', 'rune'
    const [selected, setSelected] = useState(null);
    const [step, setStep] = useState('select'); // 'select' ou 'confirm'
    const [traitSearch, setTraitSearch] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [error, setError] = useState(null);
    
    const costs = {
        carac: 2,
        skill: 1,
        newSkill: 3,
        trait: 4,
        rune: 2,
        newRune: 3
    };
    
    const currentCost = mode ? costs[mode] : 0;
    const canAfford = character.sagaActuelle >= currentCost;
    
    const handleConfirm = () => {
        if (!selected || !canAfford) return;
        setError(null);

        // Validation spécialisation pour newSkill
        if (mode === 'newSkill' && isSpecializableSkill(selected)) {
            if (!specialization.trim()) {
                setError(`La compétence "${selected}" nécessite une spécialisation (ex: ${getSkillExamples(selected)})`);
                return;
            }
            // Vérifier doublon
            if (character.skills.some(s => s.name === selected && s.specialization === specialization.trim())) {
                setError(`Vous possédez déjà "${selected} (${specialization.trim()})"`);
                return;
            }
        }
        
        let updated = { ...character };
        
        if (mode === 'carac') {
            // +1 Caractéristique
            updated[selected] = Math.min(5, updated[selected] + 1);
        } else if (mode === 'skill') {
            // +1 Compétence existante (selected est l'objet skill entier)
            updated.skills = updated.skills.map(s => 
                (s.name === selected.name && s.specialization === selected.specialization)
                    ? { ...s, level: Math.min(5, s.level + 1), currentPoints: Math.min(5, s.level + 1) }
                    : s
            );
        } else if (mode === 'newSkill') {
            // Nouvelle compétence (niveau 1)
            updated.skills = [...updated.skills, {
                name: selected,
                specialization: specialization.trim() || undefined,
                level: 1,
                currentPoints: 1
            }];
        } else if (mode === 'trait') {
            // Nouveau trait
            updated.traits = [...updated.traits, { name: selected }];
            
            // Appliquer effets
            const trait = TRAITS.find(t => t.name === selected);
            if (trait?.effects) {
                if (trait.effects.actions) updated.actionsDisponibles += trait.effects.actions;
                if (trait.effects.armure) updated.armure += trait.effects.armure;
                if (trait.effects.seuil) updated.seuilCombat += trait.effects.seuil;
            }
        } else if (mode === 'rune') {
            // +1 Rune existante
            updated.runes = updated.runes.map(r =>
                r.name === selected
                    ? { ...r, level: Math.min(5, r.level + 1) }
                    : r
            );
        } else if (mode === 'newRune') {
            // Nouvelle rune (niveau 1)
            updated.runes = [...(updated.runes || []), {
                name: selected,
                level: 1
            }];
        }
        
        // Dépenser SAGA
        updated.sagaActuelle = Math.max(0, updated.sagaActuelle - currentCost);
        updated.sagaTotale += currentCost;
        
        onUpdate(updated);
        onClose();
    };
    
    const resetSelection = () => {
        setMode(null);
        setSelected(null);
        setStep('select');
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-3xl w-full border-4 border-viking-bronze max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">💎 Évolution du personnage</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* SAGA disponible */}
                    <div className="p-3 bg-viking-bronze/20 dark:bg-viking-leather/20 rounded-lg border-2 border-viking-bronze text-center">
                        <div className="text-sm text-viking-text dark:text-viking-parchment">SAGA disponible</div>
                        <div className="text-3xl font-bold text-viking-bronze">{character.sagaActuelle}</div>
                    </div>
                    
                    {step === 'select' && (
                        <>
                            {/* Choix du type d'évolution */}
                            {!mode && (
                                <div>
                                    <h4 className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Choisir une évolution :</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setMode('carac')}
                                            disabled={character.sagaActuelle < 2}
                                            className="p-3 rounded text-left text-sm font-semibold bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-2 border-transparent hover:border-viking-bronze disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <div>+1 Caractéristique</div>
                                            <div className="text-xs text-viking-bronze">Coût : 2 SAGA</div>
                                        </button>
                                        <button 
                                            onClick={() => setMode('skill')}
                                            disabled={character.sagaActuelle < 1}
                                            className="p-3 rounded text-left text-sm font-semibold bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-2 border-transparent hover:border-viking-bronze disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <div>+1 Compétence</div>
                                            <div className="text-xs text-viking-bronze">Coût : 1 SAGA</div>
                                        </button>
                                        <button 
                                            onClick={() => setMode('newSkill')}
                                            disabled={character.sagaActuelle < 3}
                                            className="p-3 rounded text-left text-sm font-semibold bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-2 border-transparent hover:border-viking-bronze disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <div>Nouvelle Compétence</div>
                                            <div className="text-xs text-viking-bronze">Coût : 3 SAGA</div>
                                        </button>
                                        <button 
                                            onClick={() => setMode('trait')}
                                            disabled={character.sagaActuelle < 4}
                                            className="p-3 rounded text-left text-sm font-semibold bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-2 border-transparent hover:border-viking-bronze disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <div>Nouveau Trait</div>
                                            <div className="text-xs text-viking-bronze">Coût : 4 SAGA</div>
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Sélection selon le mode */}
                            {mode === 'carac' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">Choisir une caractéristique :</h4>
                                        <button onClick={resetSelection} className="text-xs text-viking-leather dark:text-viking-bronze hover:underline">← Retour</button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(CARACNAMES).map(([key, label]) => {
                                            const current = character[key];
                                            const canIncrease = current < 5;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => canIncrease && setSelected(key)}
                                                    disabled={!canIncrease}
                                                    className={`p-2 rounded text-sm ${
                                                        !canIncrease
                                                            ? 'opacity-30 cursor-not-allowed bg-gray-300 dark:bg-gray-700'
                                                            : selected === key
                                                                ? 'bg-viking-bronze text-viking-brown font-semibold'
                                                                : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment hover:bg-viking-bronze/30'
                                                    }`}
                                                >
                                                    <div className="font-semibold">{label}</div>
                                                    <div className="text-xs">{current} → {Math.min(5, current + 1)}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {mode === 'skill' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">Choisir une compétence :</h4>
                                        <button onClick={resetSelection} className="text-xs text-viking-leather dark:text-viking-bronze hover:underline">← Retour</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                        {character.skills.map(skill => {
                                            const canIncrease = skill.level < 5;
                                            return (
                                                <button
                                                    key={`${skill.name}-${skill.specialization || 'default'}`}
                                                    onClick={() => canIncrease && setSelected(skill)}
                                                    disabled={!canIncrease}
                                                    className={`p-2 rounded text-sm text-left ${
                                                        !canIncrease
                                                            ? 'opacity-30 cursor-not-allowed bg-gray-300 dark:bg-gray-700'
                                                            : selected?.name === skill.name && selected?.specialization === skill.specialization
                                                                ? 'bg-viking-bronze text-viking-brown font-semibold'
                                                                : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment hover:bg-viking-bronze/30'
                                                    }`}
                                                >
                                                    <div className="font-semibold">{formatSkillName(skill)}</div>
                                                    <div className="text-xs">Niv {skill.level} → {Math.min(5, skill.level + 1)}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {mode === 'newSkill' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">Choisir une nouvelle compétence :</h4>
                                        <button onClick={resetSelection} className="text-xs text-viking-leather dark:text-viking-bronze hover:underline">← Retour</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                        {COMPETENCES.filter(comp => {
                                            // Compétences spécialisables : toujours disponibles
                                            if (isSpecializableSkill(comp.name)) return true;
                                            // Autres : seulement si pas possédées
                                            return !character.skills.some(s => s.name === comp.name);
                                        }).map(comp => (
                                            <button
                                                key={comp.name}
                                                onClick={() => setSelected(comp.name)}
                                                className={`p-2 rounded text-sm text-left ${
                                                    selected === comp.name
                                                        ? 'bg-viking-bronze text-viking-brown font-semibold'
                                                        : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment hover:bg-viking-bronze/30'
                                                }`}
                                            >
                                                <div className="font-semibold">{comp.name}</div>
                                                <div className="text-xs opacity-75">{comp.caracs.map(c => CARACNAMES[c]).join(', ')}</div>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {/* Spécialisation (si nécessaire) */}
                                    {selected && isSpecializableSkill(selected) && (
                                        <div className="mt-3 p-3 bg-viking-bronze/10 dark:bg-viking-leather/10 rounded-lg border-2 border-viking-bronze">
                                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                                ⚔️ Spécialisation requise
                                            </label>
                                            <input
                                                type="text"
                                                value={specialization}
                                                onChange={(e) => setSpecialization(e.target.value)}
                                                placeholder={`Ex: ${getSkillExamples(selected)}`}
                                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {mode === 'trait' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-viking-brown dark:text-viking-parchment">Choisir un nouveau trait :</h4>
                                        <button onClick={resetSelection} className="text-xs text-viking-leather dark:text-viking-bronze hover:underline">← Retour</button>
                                    </div>
                                    
                                    {/* Recherche */}
                                    <input
                                        type="text"
                                        placeholder="🔍 Rechercher un trait..."
                                        value={traitSearch}
                                        onChange={(e) => setTraitSearch(e.target.value)}
                                        className="w-full px-3 py-2 mb-3 rounded border-2 border-viking-leather dark:border-viking-bronze bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment text-sm"
                                    />
                                    
                                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                                        {TRAITS
                                            .filter(t => !character.traits.some(ct => ct.name === t.name))
                                            .filter(t => {
                                                const search = traitSearch.toLowerCase();
                                                return !search || t.name.toLowerCase().includes(search) || t.description.toLowerCase().includes(search);
                                            })
                                            .map(trait => (
                                                <button
                                                    key={trait.name}
                                                    onClick={() => setSelected(trait.name)}
                                                    className={`p-2 rounded text-sm text-left ${
                                                        selected === trait.name
                                                            ? 'bg-viking-bronze text-viking-brown'
                                                            : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment hover:bg-viking-bronze/30'
                                                    }`}
                                                >
                                                    <div className="font-bold">{trait.name}</div>
                                                    <div className="text-xs opacity-90">{trait.description}</div>
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                            
                            {/* Bouton Confirmer */}
                            {mode && selected && (
                                <div className="flex gap-2 pt-2 border-t border-viking-leather dark:border-viking-bronze">
                                    <button 
                                        onClick={resetSelection}
                                        className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={() => setStep('confirm')}
                                        className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather"
                                    >
                                        Suivant →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* Confirmation */}
                    {step === 'confirm' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze">
                                <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Confirmer l'évolution :</h4>
                                <div className="text-sm text-viking-text dark:text-viking-parchment space-y-1">
                                    {mode === 'carac' && <p>+1 {CARACNAMES[selected]} ({character[selected]} → {character[selected] + 1})</p>}
                                    {mode === 'skill' && <p>+1 {formatSkillName(selected)} (Niv {selected.level} → {selected.level + 1})</p>}
                                    {mode === 'newSkill' && <p>Nouvelle compétence : {selected}{specialization && ` (${specialization})`} (Niv 1)</p>}
                                    {mode === 'trait' && <p>Nouveau trait : {selected}</p>}
                                    <p className="text-viking-bronze font-semibold">Coût : {currentCost} SAGA</p>
                                    <p>SAGA restante : {character.sagaActuelle - currentCost}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setStep('select')}
                                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
                                >
                                    ← Retour
                                </button>
                                <button 
                                    onClick={handleConfirm}
                                    className="flex-1 px-4 py-2 bg-viking-success text-white rounded font-semibold hover:bg-green-700"
                                >
                                    ✓ Confirmer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {error && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-sm bg-viking-parchment dark:bg-viking-brown border-4 border-double border-viking-danger p-6 shadow-2xl shadow-red-900/50">
                        <div className="flex justify-center mb-4">
                            <span className="text-4xl">⚠️</span>
                        </div>

                        <h3 className="text-center text-viking-danger font-viking text-xl mb-4 uppercase">
                            Par Odin !
                        </h3>

                        <p className="text-center text-viking-text dark:text-viking-parchment font-vikingText mb-6 italic">
                            {error}
                        </p>

                        <button
                            onClick={() => setError(null)}
                            className="w-full py-3 bg-viking-danger text-white font-viking uppercase tracking-widest hover:brightness-110 shadow-lg transition-all"
                        >
                            Continuer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvolutionModal;
