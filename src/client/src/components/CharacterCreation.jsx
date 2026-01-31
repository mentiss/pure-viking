// CharacterCreation.js - Composant de création de personnage
import React, { useState, useEffect } from "react";
import {
    canSelectTrait, formatExplosion,
    formatFullName,
    formatSkillName,
    getSkillExamples,
    getSuccessThreshold, isSpecializableSkill
} from "../tools/utils.js";
import {CARACNAMES, COMPETENCES, RUNES, TRAITS} from "../tools/data.js";

const CharacterCreation = ({ onComplete }) => {
    const { useState } = React;
    const [step, setStep] = useState(1);
    const [customCode, setCustomCode] = useState('');
    const [showSpecModal, setShowSpecModal] = useState(false);
    const [pendingSkill, setPendingSkill] = useState(null);
    const [specValue, setSpecValue] = useState('');
    const [specError, setSpecError] = useState('');
    const [character, setCharacter] = useState({
        prenom: '',
        surnom: '',
        nomParent: '',
        typeParent: 'pere',
        sexe: 'homme',
        age: 25,
        activite: '',
        playerName: '',
        force: 1,
        agilite: 1,
        perception: 1,
        intelligence: 1,
        charisme: 1,
        chance: 1,
        sagaActuelle: 1,
        sagaTotale: 1,
        armure: 0,
        actionsDisponibles: 1,
        seuilCombat: 1,
        tokensBlessure: 0,
        tokensFatigue: 0,
        skills: [],
        traits: [],
        runes: [],
        items: []
    });

    const TOTAL_CARAC_POINTS = 14;
    const TOTAL_SKILL_POINTS = 10;
    const MIN_CARAC = 1;
    const MAX_CARAC_CREATION = 4;
    const MAX_SKILL_CREATION = 3;
    const MIN_TRAITS = 2;
    const MAX_TRAITS = 4;

    const getUsedCaracPoints = () => {
        return character.force + character.agilite + character.perception + 
               character.intelligence + character.charisme + character.chance;
    };

    const getUsedSkillPoints = () => {
        return character.skills.reduce((sum, skill) => sum + skill.level, 0);
    };

    const getRemainingRunePoints = () => {
        const totalRunePoints = character.traits.reduce((sum, trait) => {
            const traitData = TRAITS.find(t => t.name === trait.name);
            return sum + (traitData?.effects?.runePoints || 0);
        }, 0);
        
        const usedRunePoints = character.runes.reduce((sum, rune) => sum + rune.level, 0);
        return totalRunePoints - usedRunePoints;
    };

    const handleFinalAddSkill = (skillName, specialization) => {
        // On met à jour via onUpdate (ton prop qui remonte à App.js)
        setCharacter({
            ...character,
            skills: [...character.skills, { name: skillName, specialization, level: 1, currentPoints: 1 }]
        });
    };

    // Étape 1: Identité
    const renderStep1 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-1">
                    Prénom *
                </label>
                <input
                    type="text"
                    value={character.prenom}
                    onChange={e => setCharacter({...character, prenom: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-1">
                    Surnom (optionnel)
                </label>
                <input
                    type="text"
                    value={character.surnom}
                    onChange={e => setCharacter({...character, surnom: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-2">
                    Filiation *
                </label>
                <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            checked={character.typeParent === 'pere'}
                            onChange={() => setCharacter({...character, typeParent: 'pere'})}
                            className="text-viking-bronze"
                        />
                        <span className="text-viking-text dark:text-viking-parchment">Fils de</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            checked={character.typeParent === 'mere'}
                            onChange={() => setCharacter({...character, typeParent: 'mere'})}
                            className="text-viking-bronze"
                        />
                        <span className="text-viking-text dark:text-viking-parchment">Fille de</span>
                    </label>
                </div>
                <input
                    type="text"
                    placeholder="Nom du parent"
                    value={character.nomParent}
                    onChange={e => setCharacter({...character, nomParent: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-1">
                        Sexe *
                    </label>
                    <select
                        value={character.sexe}
                        onChange={e => setCharacter({...character, sexe: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                    >
                        <option value="homme">Homme</option>
                        <option value="femme">Femme</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-1">
                        Âge
                    </label>
                    <input
                        type="number"
                        value={character.age}
                        onChange={e => setCharacter({...character, age: parseInt(e.target.value) || 25})}
                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-1">
                    Activité/Métier
                </label>
                <input
                    type="text"
                    value={character.activite}
                    onChange={e => setCharacter({...character, activite: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-1">
                    Nom du joueur
                </label>
                <input
                    type="text"
                    value={character.playerName}
                    onChange={e => setCharacter({...character, playerName: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                />
            </div>

            <button
                onClick={() => setStep(2)}
                disabled={!character.prenom || !character.nomParent}
                className="w-full mt-4 px-6 py-3 bg-viking-bronze hover:bg-viking-leather text-viking-brown dark:text-viking-parchment font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Suivant →
            </button>
        </div>
    );

    // Étape 2: Caractéristiques
    const renderStep2 = () => {
        const remaining = TOTAL_CARAC_POINTS - getUsedCaracPoints();
        const caracs = [
            { key: 'force', label: 'Force' },
            { key: 'agilite', label: 'Agilité' },
            { key: 'perception', label: 'Perception' },
            { key: 'intelligence', label: 'Intelligence' },
            { key: 'charisme', label: 'Charisme' },
            { key: 'chance', label: 'Chance' }
        ];
        
        return (
            <div className="space-y-4">
                <div className="p-4 bg-viking-bronze dark:bg-viking-leather rounded-lg text-center font-semibold text-viking-brown dark:text-viking-parchment">
                    Points restants : {remaining} / {TOTAL_CARAC_POINTS}
                </div>

                {remaining < 0 && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg text-sm text-red-800 dark:text-red-200">
                        Vous avez dépassé le nombre de points disponibles !
                    </div>
                )}

                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border-2 border-viking-bronze rounded-lg text-sm text-viking-text dark:text-viking-parchment">
                    <strong>Explosions :</strong> Niv 1-2 → 10 | Niv 3-4 → 9-10 | Niv 5 → 8-9-10
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {caracs.map(({key, label}) => {
                        const level = character[key];
                        const explosionText = formatExplosion(level);
                        
                        return (
                            <div key={key} className="p-4 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-viking-brown dark:text-viking-parchment">{label}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => level > MIN_CARAC && setCharacter({...character, [key]: level - 1})}
                                            disabled={level <= MIN_CARAC}
                                            className="w-7 h-7 flex items-center justify-center bg-viking-bronze hover:bg-viking-leather rounded-full text-viking-brown font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            -
                                        </button>
                                        
                                        <div className="flex gap-1">
                                            {[1,2,3,4,5].map(i => (
                                                <div
                                                    key={i}
                                                    className={`w-3 h-3 rounded-full border-2 ${
                                                        i <= level 
                                                            ? 'bg-viking-bronze border-viking-bronze' 
                                                            : 'bg-transparent border-viking-leather dark:border-viking-bronze'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        
                                        <span className="text-viking-text dark:text-viking-parchment w-6 text-center">({level})</span>
                                        
                                        <button
                                            onClick={() => level < MAX_CARAC_CREATION && setCharacter({...character, [key]: level + 1})}
                                            disabled={level >= MAX_CARAC_CREATION || remaining <= 0}
                                            className="w-7 h-7 flex items-center justify-center bg-viking-bronze hover:bg-viking-leather rounded-full text-viking-brown font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-viking-leather dark:text-viking-bronze italic">
                                    Explosion sur: {explosionText}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-2 mt-6">
                    <button
                        onClick={() => setStep(1)}
                        className="flex-1 px-6 py-3 bg-viking-leather hover:bg-viking-brown text-viking-parchment font-semibold rounded-lg transition-colors"
                    >
                        ← Précédent
                    </button>
                    <button
                        onClick={() => setStep(3)}
                        disabled={remaining !== 0}
                        className="flex-1 px-6 py-3 bg-viking-bronze hover:bg-viking-leather text-viking-brown font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Suivant →
                    </button>
                </div>
            </div>
        );
    };

    // Étape 3: Compétences
    const renderStep3 = () => {
        const remaining = TOTAL_SKILL_POINTS - getUsedSkillPoints();
        
        const addSkill = (skillName) => {
            const comp = COMPETENCES.find(c => c.name === skillName);
            if (!comp) return;
            
            let specialization = undefined;
            
            // Demander spécialisation si nécessaire
            if (isSpecializableSkill(skillName)) {
                setPendingSkill(skillName);
                setSpecValue('');
                setSpecError('');
                setShowSpecModal(true);
                return;
            } else {
                // Vérifier doublon pour compétences normales
                if (character.skills.some(s => s.name === skillName)) return;
            }
            
            setCharacter({
                ...character,
                skills: [...character.skills, { name: skillName, specialization, level: 1, currentPoints: 1 }]
            });
        };

        const removeSkill = (skill) => {
            setCharacter({
                ...character,
                skills: character.skills.filter(s => 
                    s.name !== skill.name || s.specialization !== skill.specialization
                )
            });
        };

        const changeSkillLevel = (skill, delta) => {
            setCharacter({
                ...character,
                skills: character.skills.map(s => {
                    if (s.name !== skill.name || s.specialization !== skill.specialization) return s;
                    const newLevel = Math.max(0, Math.min(MAX_SKILL_CREATION, s.level + delta));
                    return { ...s, level: newLevel, currentPoints: newLevel };
                })
            });
        };

        return (
            <div className="space-y-4">
                <div className="p-4 bg-viking-bronze dark:bg-viking-leather rounded-lg text-center font-semibold text-viking-brown dark:text-viking-parchment">
                    Points restants : {remaining} / {TOTAL_SKILL_POINTS}
                </div>

                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border-2 border-viking-bronze rounded-lg text-sm text-viking-text dark:text-viking-parchment">
                    <strong>Seuils :</strong> Niv 0-1 → 7+ | Niv 2 → 6+ | Niv 3-4 → 5+ | Niv 5 → 4+
                </div>

                <div>
                    <label className="block text-sm font-medium text-viking-brown dark:text-viking-parchment mb-1">
                        Ajouter une compétence
                    </label>
                    <select
                        onChange={(e) => { if (e.target.value) { addSkill(e.target.value); e.target.value = ''; }}}
                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-viking-brown text-viking-text dark:text-viking-parchment"
                    >
                        <option value="">-- Choisir --</option>
                        {COMPETENCES.map(c => (
                            <option
                                key={c.name}
                                value={c.name}
                                disabled={!isSpecializableSkill(c.name) && character.skills.some(s => s.name === c.name)}
                            >
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                    {character.skills.map(skill => {
                        const comp = COMPETENCES.find(c => c.name === skill.name);
                        const threshold = getSuccessThreshold(skill.level);
                        
                        return (
                            <div key={`${skill.name}-${skill.specialization || 'default'}`} className="p-3 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-semibold text-viking-brown dark:text-viking-parchment">
                                            {formatSkillName(skill)}
                                        </div>
                                        {comp && (
                                            <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                                {CARACNAMES[comp.caracs[0]]} / {CARACNAMES[comp.caracs[1]]}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeSkill(skill)}
                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-bold"
                                    >
                                        🗑️
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => changeSkillLevel(skill, -1)}
                                            disabled={skill.level <= 0}
                                            className="w-7 h-7 flex items-center justify-center bg-viking-bronze hover:bg-viking-leather rounded-full text-viking-brown font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            -
                                        </button>
                                        
                                        <div className="flex gap-1">
                                            {[1,2,3,4,5].map(i => (
                                                <div
                                                    key={i}
                                                    className={`w-3 h-3 rounded-full border-2 ${
                                                        i <= skill.level 
                                                            ? 'bg-viking-bronze border-viking-bronze' 
                                                            : 'bg-transparent border-viking-leather dark:border-viking-bronze'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        
                                        <span className="text-viking-text dark:text-viking-parchment text-sm">
                                            Niv {skill.level} - {skill.level} pt(s)
                                        </span>
                                        
                                        <button
                                            onClick={() => changeSkillLevel(skill, 1)}
                                            disabled={skill.level >= MAX_SKILL_CREATION || remaining <= 0}
                                            className="w-7 h-7 flex items-center justify-center bg-viking-bronze hover:bg-viking-leather rounded-full text-viking-brown font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="text-xs text-viking-leather dark:text-viking-bronze italic mt-1">
                                    Succès sur: {threshold}+
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-2 mt-6">
                    <button
                        onClick={() => setStep(2)}
                        className="flex-1 px-6 py-3 bg-viking-leather hover:bg-viking-brown text-viking-parchment font-semibold rounded-lg transition-colors"
                    >
                        ← Précédent
                    </button>
                    <button
                        onClick={() => setStep(4)}
                        disabled={remaining !== 0}
                        className="flex-1 px-6 py-3 bg-viking-bronze hover:bg-viking-leather text-viking-brown font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Suivant →
                    </button>
                </div>
            </div>
        );
    };

    // Étape 4: Traits
    const renderStep4 = () => {
        const toggleTrait = (trait) => {
            if (character.traits.some(t => t.name === trait.name)) {
                setCharacter({
                    ...character,
                    traits: character.traits.filter(t => t.name !== trait.name)
                });
            } else {
                if (canSelectTrait(character, trait, MAX_TRAITS)) {
                    setCharacter({
                        ...character,
                        traits: [...character.traits, trait]
                    });
                }
            }
        };

        return (
            <div className="space-y-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 border-2 border-viking-bronze rounded-lg text-sm text-viking-text dark:text-viking-parchment">
                    Sélectionnez entre {MIN_TRAITS} et {MAX_TRAITS} traits/backgrounds. Vérifiez les prérequis et incompatibilités.
                </div>
                <div className="p-4 bg-viking-bronze dark:bg-viking-leather rounded-lg text-center font-semibold text-viking-brown dark:text-viking-parchment">
                    Traits sélectionnés : {character.traits.length} / {MAX_TRAITS}
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                    {TRAITS.map(trait => {
                        const isSelected = character.traits.some(t => t.name === trait.name);
                        const canSelect = canSelectTrait(character, trait, MAX_TRAITS);
                        
                        return (
                            <div 
                                key={trait.name} 
                                onClick={() => canSelect && toggleTrait(trait)}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                    isSelected 
                                        ? 'bg-viking-bronze/20 border-viking-bronze dark:border-viking-bronze border-4' 
                                        : canSelect
                                        ? 'bg-white dark:bg-viking-brown border-viking-leather dark:border-viking-bronze hover:border-viking-bronze hover:shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="font-bold text-lg text-viking-brown dark:text-viking-parchment">
                                        {isSelected ? '✓ ' : ''}{trait.name}
                                    </div>
                                    {isSelected && (
                                        <span className="px-2 py-1 bg-viking-success text-white text-xs rounded-full">
                                            Sélectionné
                                        </span>
                                    )}
                                </div>
                                
                                <div className="text-sm text-viking-text dark:text-viking-parchment mb-2">
                                    {trait.description}
                                </div>
                                
                                {(trait.effects.actions || trait.effects.armure || trait.effects.seuilCombat || trait.effects.runePoints || trait.effects.sagaBonus || trait.effects.description) && (
                                    <div className="text-sm text-viking-success dark:text-green-400 mb-2">
                                        <strong>Effets :</strong>{' '}
                                        {trait.effects.actions && `+${trait.effects.actions} Action `}
                                        {trait.effects.armure && `+${trait.effects.armure} Armure `}
                                        {trait.effects.seuilCombat && `+${trait.effects.seuilCombat} Seuil `}
                                        {trait.effects.runePoints && `${trait.effects.runePoints} pts Runes `}
                                        {trait.effects.sagaBonus && `+${trait.effects.sagaBonus} SAGA `}
                                        {trait.effects.description && trait.effects.description}
                                    </div>
                                )}
                                
                                {trait?.requirements != null && Object.keys(trait.requirements).length > 0 && (
                                    <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                        <strong>Requis :</strong> {Object.entries(trait.requirements).map(([k,v]) => `${CARACNAMES[k]} ${v}+`).join(', ')}
                                    </div>
                                )}
                                
                                {trait.incompatible.length > 0 && (
                                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        <strong>Incompatible :</strong> {trait.incompatible.join(', ')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => setStep(3)} className="flex-1 px-6 py-3 bg-viking-leather hover:bg-viking-brown text-viking-parchment font-semibold rounded-lg transition-colors">
                        ← Précédent
                    </button>
                    <button 
                        onClick={() => setStep(5)} 
                        disabled={character.traits.length < MIN_TRAITS || character.traits.length > MAX_TRAITS}
                        className="flex-1 px-6 py-3 bg-viking-bronze hover:bg-viking-leather text-viking-brown font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Suivant →
                    </button>
                </div>
            </div>
        );
    };

    // Étape 5: Runes
    const renderStep5 = () => {
        const totalRunePoints = character.traits.reduce((sum, trait) => {
            const traitData = TRAITS.find(t => t.name === trait.name);
            return sum + (traitData?.effects?.runePoints || 0);
        }, 0);

        const remaining = getRemainingRunePoints();

        const changeRuneLevel = (runeName, delta) => {
            const existingRune = character.runes.find(r => r.name === runeName);
            
            if (existingRune) {
                const newLevel = Math.max(0, Math.min(5, existingRune.level + delta));
                setCharacter({
                    ...character,
                    runes: character.runes.map(r => r.name === runeName ? {...r, level: newLevel} : r).filter(r => r.level > 0)
                });
            } else if (delta > 0) {
                const runeData = RUNES.find(r => r.name === runeName);
                setCharacter({
                    ...character,
                    runes: [...character.runes, { name: runeName, symbol: runeData.symbol, level: 1 }]
                });
            }
        };

        if (totalRunePoints === 0) {
            return (
                <div className="space-y-4">
                    <div className="p-4 bg-amber-100 dark:bg-amber-900/30 border-2 border-viking-bronze rounded-lg text-sm text-viking-text dark:text-viking-parchment">
                        Aucun trait ne vous donne accès aux runes à la création. Vous pourrez en apprendre par la suite via le roleplay.
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setStep(4)} className="flex-1 px-6 py-3 bg-viking-leather hover:bg-viking-brown text-viking-parchment font-semibold rounded-lg transition-colors">
                            ← Précédent
                        </button>
                        <button onClick={() => setStep(6)} className="flex-1 px-6 py-3 bg-viking-bronze hover:bg-viking-leather text-viking-brown font-semibold rounded-lg transition-colors">
                            Suivant →
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="p-4 bg-viking-bronze dark:bg-viking-leather rounded-lg text-center font-semibold text-viking-brown dark:text-viking-parchment">
                    Points Runes restants : {remaining} / {totalRunePoints}
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border-2 border-viking-bronze rounded-lg text-sm text-viking-text dark:text-viking-parchment">
                    <strong>Niveaux :</strong> 1 = Légende | 2 = Sensoriel | 3+ = Actif (majeur) | 4+ = Objets/Tatouages | 5 = Artefacts permanents
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {RUNES.map(rune => {
                        const charRune = character.runes.find(r => r.name === rune.name);
                        const level = charRune?.level || 0;
                        
                        return (
                            <div key={rune.name} className="p-3 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg text-center">
                                <div className="text-4xl mb-2">{rune.symbol}</div>
                                <div className="font-semibold text-sm text-viking-brown dark:text-viking-parchment mb-1">{rune.name}</div>
                                <div className="text-xs text-viking-leather dark:text-viking-bronze mb-2">{rune.literal}</div>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <button
                                        onClick={() => changeRuneLevel(rune.name, -1)}
                                        disabled={level <= 0}
                                        className="w-6 h-6 flex items-center justify-center bg-viking-bronze hover:bg-viking-leather rounded-full text-viking-brown text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        -
                                    </button>
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(i => (
                                            <div
                                                key={i}
                                                className={`w-2 h-2 rounded-full border ${
                                                    i <= level 
                                                        ? 'bg-viking-bronze border-viking-bronze' 
                                                        : 'bg-transparent border-viking-leather dark:border-viking-bronze'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => changeRuneLevel(rune.name, 1)}
                                        disabled={level >= 5 || remaining <= 0}
                                        className="w-6 h-6 flex items-center justify-center bg-viking-bronze hover:bg-viking-leather rounded-full text-viking-brown text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="text-xs text-viking-text dark:text-viking-parchment">
                                    Niveau {level}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => setStep(4)} className="flex-1 px-6 py-3 bg-viking-leather hover:bg-viking-brown text-viking-parchment font-semibold rounded-lg transition-colors">
                        ← Précédent
                    </button>
                    <button 
                        onClick={() => setStep(6)} 
                        disabled={remaining !== 0}
                        className="flex-1 px-6 py-3 bg-viking-bronze hover:bg-viking-leather text-viking-brown font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Suivant →
                    </button>
                </div>
            </div>
        );
    };

    // Étape 6: Finalisation
    const renderStep6 = () => {
        const fullName = formatFullName(character);

        const handleComplete = () => {
            const characterToSave = customCode 
                ? { ...character, accessCode: customCode }
                : character;
            onComplete(characterToSave);
        };

        return (
            <div className="space-y-4">
                <h3 className="text-2xl font-viking font-bold text-viking-brown dark:text-viking-parchment mb-4">
                    Récapitulatif
                </h3>
                
                <div className="p-4 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                    <h4 className="font-bold text-lg text-viking-brown dark:text-viking-parchment mb-2">{fullName}</h4>
                    <p className="text-viking-text dark:text-viking-parchment">
                        {character.sexe === 'homme' ? 'Homme' : 'Femme'}, {character.age} ans
                    </p>
                    <p className="text-viking-text dark:text-viking-parchment">{character.activite}</p>
                    <p className="text-viking-leather dark:text-viking-bronze">Joueur : {character.playerName}</p>
                </div>

                <div className="p-4 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                    <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Caractéristiques</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm text-viking-text dark:text-viking-parchment">
                        <div>Force : {character.force}</div>
                        <div>Agilité : {character.agilite}</div>
                        <div>Perception : {character.perception}</div>
                        <div>Intelligence : {character.intelligence}</div>
                        <div>Charisme : {character.charisme}</div>
                        <div>Chance : {character.chance}</div>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                    <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Compétences ({character.skills.length})</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {character.skills.map(s => (
                            <div key={s.name} className="text-viking-text dark:text-viking-parchment">
                                • {s.name} ({s.level})
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                    <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Traits ({character.traits.length})</h4>
                    <div className="space-y-1 text-sm">
                        {character.traits.map(t => (
                            <div key={t.name} className="text-viking-text dark:text-viking-parchment">
                                • <strong>{t.name}</strong> - {t.description}
                            </div>
                        ))}
                    </div>
                </div>

                {character.runes.length > 0 && (
                    <div className="p-4 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                        <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Runes ({character.runes.length})</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {character.runes.map(r => (
                                <div key={r.name} className="text-viking-text dark:text-viking-parchment">
                                    {r.symbol} {r.name} (Niv {r.level})
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-4 bg-viking-bronze/20 dark:bg-viking-leather/20 border-2 border-viking-bronze rounded-lg">
                    <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Ressources de départ</h4>
                    <div className="text-sm text-viking-text dark:text-viking-parchment">
                        <div>SAGA Actuelle : {character.sagaActuelle} / 5</div>
                        <div>Actions par tour : {character.actionsDisponibles}</div>
                        <div>Seuil de combat : {character.seuilCombat}</div>
                        <div>Armure : {character.armure}</div>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-viking-brown border-2 border-viking-leather dark:border-viking-bronze rounded-lg">
                    <h4 className="font-bold text-viking-brown dark:text-viking-parchment mb-2">Code d'accès personnalisé (optionnel)</h4>
                    <input 
                        value={customCode}
                        onChange={e => setCustomCode(e.target.value.toUpperCase().substring(0, 6))}
                        placeholder="Laisser vide pour génération automatique"
                        maxLength={6}
                        className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-mono"
                    />
                    <div className="text-xs text-viking-leather dark:text-viking-bronze mt-2">
                        6 caractères max. Plusieurs personnages peuvent partager le même code (utile pour groupes).
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button onClick={() => setStep(5)} className="flex-1 px-6 py-3 bg-viking-leather hover:bg-viking-brown text-viking-parchment font-semibold rounded-lg transition-colors">
                        ← Précédent
                    </button>
                    <button 
                        onClick={handleComplete}
                        className="flex-1 px-6 py-3 bg-viking-success hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-colors shadow-lg"
                    >
                        ✓ Créer le personnage
                    </button>
                </div>
            </div>
        );
    };
    
    const steps = ['Identité', 'Caractéristiques', 'Compétences', 'Traits', 'Runes', 'Finalisation'];
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-viking-parchment to-amber-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl overflow-hidden border-4 border-viking-leather dark:border-viking-bronze">
                    {/* Step Indicator */}
                    <div className="flex border-b-2 border-viking-leather dark:border-viking-bronze">
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className={`flex-1 p-3 text-center text-sm font-medium border-r border-viking-leather dark:border-viking-bronze last:border-r-0 ${
                                    i + 1 === step
                                        ? 'bg-viking-bronze text-viking-brown'
                                        : i + 1 < step
                                        ? 'bg-viking-success text-white'
                                        : 'bg-viking-parchment dark:bg-gray-800 text-viking-leather dark:text-viking-bronze'
                                }`}
                            >
                                {s}
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                        {step === 5 && renderStep5()}
                        {step === 6 && renderStep6()}
                    </div>
                </div>
            </div>
            {showSpecModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-viking-parchment dark:bg-viking-brown p-6 rounded-lg border-2 border-viking-bronze max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment mb-2">
                            Spécialisation requise
                        </h3>
                        <p className="text-sm text-viking-leather mb-4">
                            Définissez une spécialité pour <strong>{pendingSkill}</strong>.
                            <br/><span className="italic opacity-75">Ex: {getSkillExamples(pendingSkill)}</span>
                        </p>

                        <input
                            autoFocus
                            value={specValue}
                            onChange={(e) => {
                                setSpecValue(e.target.value);
                                setSpecError('');
                            }}
                            className="w-full p-2 border-2 border-viking-leather rounded bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
                            placeholder="Ex: Épée longue, Pistage..."
                        />

                        {specError && <p className="text-red-600 text-xs mt-1 font-bold">{specError}</p>}

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowSpecModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded font-bold hover:bg-gray-400 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    const val = specValue.trim();
                                    if (!val) {
                                        setSpecError('Une spécialisation est requise.');
                                        return;
                                    }
                                    if (character.skills.some(s => s.name === pendingSkill && s.specialization === val)) {
                                        setSpecError(`Doublon : ${pendingSkill} (${val}) existe déjà.`);
                                        return;
                                    }

                                    // ICI : Appelle ta fonction finale d'ajout
                                    handleFinalAddSkill(pendingSkill, val);
                                    setShowSpecModal(false);
                                }}
                                className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-bold hover:bg-viking-leather transition-colors"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CharacterCreation;