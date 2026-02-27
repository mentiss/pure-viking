// EditModals.js - Modales d'édition (Ajout compétences/traits)


import React, { useState, useEffect } from "react";
import {CARACNAMES, COMPETENCES, TRAITS} from "../../../../tools/data.js";
import {getSkillExamples, isSpecializableSkill} from "../../../../tools/utils.js";

const EditModals = ({ type, character, onClose, onUpdate }) => {
    const { useState } = React;
    
    if (type === 'addSkill') {
        return <AddSkillModal character={character} onClose={onClose} onUpdate={onUpdate} />;
    } else if (type === 'addTrait') {
        return <AddTraitModal character={character} onClose={onClose} onUpdate={onUpdate} />;
    }
    return null;
};

// Modal Ajout Compétence
export const AddSkillModal = ({ character, onClose, onUpdate }) => {
    const { useState } = React;
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [specialization, setSpecialization] = useState('');
    const [error, setError] = useState(null);
    setError(null);
    // Compétences disponibles
    // Pour compétences spécialisables : toujours disponibles (on peut les prendre plusieurs fois)
    // Pour autres : seulement si pas déjà possédées
    const availableSkills = COMPETENCES.filter(comp => {
        if (!comp.name.toLowerCase().includes(search.toLowerCase())) return false;
        
        if (isSpecializableSkill(comp.name)) {
            return true; // Toujours disponible
        } else {
            return !character.skills.some(s => s.name === comp.name);
        }
    });
    
    const handleAdd = () => {
        if (!selected) return;
        
        // Vérifier spécialisation requise mais non fournie
        if (isSpecializableSkill(selected.name) && !specialization.trim()) {
            setError(`La compétence "${selected.name}" nécessite une spécialisation (ex: ${getSkillExamples(selected.name)})`);
            return;
        }
        
        // Vérifier si cette spécialisation existe déjà
        if (specialization.trim() && character.skills.some(s => 
            s.name === selected.name && s.specialization === specialization.trim()
        )) {
            setError(`Vous possédez déjà "${selected.name} (${specialization.trim()})"`);
            return;
        }
        
        const newSkills = [...character.skills, {
            name: selected.name,
            specialization: specialization.trim() || undefined,
            level: 0,
            currentPoints: 0
        }];
        
        onUpdate({ ...character, skills: newSkills });
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">Ajouter une compétence</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Recherche */}
                    <div>
                        <input 
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher une compétence..."
                            className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            autoFocus
                        />
                    </div>
                    
                    {/* Liste des compétences */}
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                        {availableSkills.length === 0 ? (
                            <div className="col-span-2 text-center text-viking-leather dark:text-viking-bronze p-4">
                                {search ? 'Aucune compétence trouvée' : 'Toutes les compétences ont été ajoutées'}
                            </div>
                        ) : (
                            availableSkills.map(skill => (
                                <button
                                    key={skill.name}
                                    onClick={() => setSelected(skill)}
                                    className={`p-3 rounded text-left text-sm transition-all ${
                                        selected?.name === skill.name
                                            ? 'bg-viking-bronze text-viking-brown border-2 border-viking-leather'
                                            : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-2 border-transparent hover:border-viking-bronze'
                                    }`}
                                >
                                    <div className="font-semibold">{skill.name}</div>
                                    <div className="text-xs opacity-75">Caracs: {skill.caracs.map(c => CARACNAMES[c]).join(', ')}</div>
                                </button>
                            ))
                        )}
                    </div>
                    
                    {/* Spécialisation (si nécessaire) */}
                    {selected && isSpecializableSkill(selected.name) && (
                        <div className="p-4 bg-viking-bronze/10 dark:bg-viking-leather/10 rounded-lg border-2 border-viking-bronze">
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                ⚔️ Spécialisation requise
                            </label>
                            <input
                                type="text"
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                placeholder={`Ex: ${getSkillExamples(selected.name)}`}
                                className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            />
                            <div className="text-xs text-viking-leather dark:text-viking-bronze mt-2">
                                Cette compétence peut être prise plusieurs fois avec différentes spécialisations.
                                Chaque spécialisation a son propre niveau de maîtrise.
                            </div>
                        </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-viking-leather dark:border-viking-bronze">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={handleAdd}
                            disabled={!selected}
                            className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Ajouter
                        </button>
                    </div>
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

// Modal Ajout Trait
export const AddTraitModal = ({ character, onClose, onUpdate }) => {
    const { useState } = React;
    const [selected, setSelected] = useState(null);
    const [traitSearch, setTraitSearch] = useState('');
    
    // Vérifier si un trait peut être sélectionné
    const canSelectTrait = (trait) => {
        // Déjà sélectionné
        if (character.traits.some(t => t.name === trait.name)) {
            return { can: false, reason: 'Déjà possédé' };
        }
        
        // Vérifier incompatibilités
        for (const incompName of trait.incompatible || []) {
            if (character.traits.some(t => t.name === incompName)) {
                return { can: false, reason: `Incompatible avec ${incompName}` };
            }
        }
        
        // Vérifier prérequis caractéristiques
        if (trait.requirements) {
            for (const [stat, required] of Object.entries(trait.requirements)) {
                if (character[stat] < required) {
                    return { can: false, reason: `Nécessite ${CARACNAMES[stat]} ${required}+` };
                }
            }
        }
        
        // Vérifier prérequis compétences
        if (trait.requiresSkill) {
            for (const [skillName, requiredLevel] of Object.entries(trait.requiresSkill)) {
                const skill = character.skills.find(s => s.name === skillName);
                if (!skill || skill.level < requiredLevel) {
                    return { can: false, reason: `Nécessite ${skillName} ${requiredLevel}+` };
                }
            }
        }
        
        // Vérifier SAGA minimale
        if (trait.requiresSaga) {
            if (character.sagaTotale < trait.requiresSaga) {
                return { can: false, reason: `Nécessite ${trait.requiresSaga} SAGA totale` };
            }
        }
        
        return { can: true };
    };
    
    const handleAdd = () => {
        if (!selected) return;
        
        const newTraits = [...character.traits, { name: selected.name }];
        
        // Appliquer les effets du trait
        let updated = { ...character, traits: newTraits };
        
        if (selected.effects) {
            if (selected.effects.actions) {
                updated.actionsDisponibles += selected.effects.actions;
            }
            if (selected.effects.armure) {
                updated.armure += selected.effects.armure;
            }
            if (selected.effects.seuil) {
                updated.seuilCombat += selected.effects.seuil;
            }
        }
        
        onUpdate(updated);
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-4xl w-full border-4 border-viking-bronze max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">Ajouter un trait</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Info */}
                    <div className="text-sm text-viking-leather dark:text-viking-bronze">
                        Traits actuels : {character.traits.length}
                    </div>
                    
                    {/* Recherche */}
                    <input
                        type="text"
                        placeholder="🔍 Rechercher un trait..."
                        value={traitSearch}
                        onChange={(e) => setTraitSearch(e.target.value)}
                        className="w-full px-3 py-2 rounded border-2 border-viking-leather dark:border-viking-bronze bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment text-sm"
                    />
                    
                    {/* Liste des traits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                        {TRAITS
                            .filter(trait => {
                                const search = traitSearch.toLowerCase();
                                return !search || trait.name.toLowerCase().includes(search) || trait.description.toLowerCase().includes(search);
                            })
                            .map(trait => {
                            const check = canSelectTrait(trait);
                            return (
                                <button
                                    key={trait.name}
                                    onClick={() => check.can && setSelected(trait)}
                                    disabled={!check.can}
                                    className={`p-3 rounded text-left text-sm transition-all ${
                                        !check.can
                                            ? 'opacity-40 cursor-not-allowed bg-gray-300 dark:bg-gray-700'
                                            : selected?.name === trait.name
                                                ? 'bg-viking-bronze text-viking-brown border-2 border-viking-leather'
                                                : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-2 border-transparent hover:border-viking-bronze'
                                    }`}
                                >
                                    <div className="font-bold">{trait.name}</div>
                                    <div className="text-xs mt-1 opacity-90">{trait.description}</div>
                                    {trait.effects && (
                                        <div className="text-xs mt-1 text-viking-success">
                                            {trait.effects.actions && `+${trait.effects.actions} Action `}
                                            {trait.effects.armure && `+${trait.effects.armure} Armure `}
                                            {trait.effects.seuil && `+${trait.effects.seuil} Seuil `}
                                            {trait.effects.description}
                                        </div>
                                    )}
                                    {!check.can && (
                                        <div className="text-xs mt-1 text-red-600 dark:text-red-400 font-semibold">
                                            ⚠️ {check.reason}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-viking-leather dark:border-viking-bronze">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={handleAdd}
                            disabled={!selected}
                            className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditModals;
