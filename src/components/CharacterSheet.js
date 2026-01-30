// CharacterSheet.js - Fiche de personnage (LAYOUT CORRIGÉ V3)

const CharacterSheet = ({ character, onUpdate, onChangeTab }) => {
    console.log('[Render] CharacterSheet Fatigue:', character?.tokensFatigue);
    const { useState } = React;
    
    const [editMode, setEditMode] = useState(false);
    const [editableChar, setEditableChar] = useState({...character});
    const [showDiceModal, setShowDiceModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null);
    const [showEvolutionModal, setShowEvolutionModal] = useState(false);
    const [diceContext, setDiceContext] = useState(null);

    const char = editMode ? editableChar : character;
    
    const toggleEditMode = () => {
        if (editMode) onUpdate(editableChar);
        else setEditableChar({...character});
        setEditMode(!editMode);
    };

    const toggleToken = (type, index) => {
        const key = type === 'blessure' ? 'tokensBlessure' : 'tokensFatigue';
        const max = type === 'blessure' ? 5 : 9;
        const curr = character[key];
        onUpdate({ ...character, [key]: index < curr ? index : Math.min(index + 1, max) });
    };

    const adjustSaga = (delta) => {
        const newSaga = Math.max(0, Math.min(5, character.sagaActuelle + delta));
        onUpdate({...character, sagaActuelle: newSaga});
    };

    const recoverSkillPoints = (skill) => {
        const newSkills = character.skills.map(s => 
            (s.name === skill.name && s.specialization === skill.specialization) ? {...s, currentPoints: s.level} : s
        );
        onUpdate({...character, skills: newSkills});
    };

    const recoverAllSkillPoints = () => {
        const newSkills = character.skills.map(s => ({...s, currentPoints: s.level}));
        onUpdate({...character, skills: newSkills});
    };

    const openDiceRoller = (type, data) => {
        setDiceContext({ type, data });
        setShowDiceModal(true);
    };

    const blessureMalus = getBlessureMalus(character.tokensBlessure);
    const fatigueMalus = getFatigueMalus(character.tokensFatigue);

    // Status tags
    const renderStatusTags = () => {
        const tags = [];
        if (character.tokensBlessure === 5) tags.push({ text: '⚠️ KO / Mourant', color: 'bg-red-600 text-white' });
        else if (blessureMalus > 0) tags.push({ text: `-${blessureMalus}d10`, color: 'bg-viking-danger text-white' });
        
        if (character.tokensFatigue === 9) tags.push({ text: '⚠️ Épuisé', color: 'bg-amber-600 text-white' });
        else if (fatigueMalus > 0) tags.push({ text: `+${fatigueMalus} succès`, color: 'bg-viking-leather text-white' });

        return tags.length > 0 ? (
            <div className="flex gap-2">
                {tags.map((tag, i) => (
                    <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tag.color}`}>
                        {tag.text}
                    </div>
                ))}
            </div>
        ) : null;
    };

    React.useEffect(() => {
        if (!editMode) {
            setEditableChar({ ...character });
        } else {
            // Optionnel : Si tu veux que les tokens se mettent à jour MÊME pendant que l'utilisateur édite le nom
            setEditableChar(prev => ({
                ...prev,
                tokensFatigue: character.tokensFatigue,
                tokensBlessure: character.tokensBlessure
            }));
        }
    }, [character, editMode]);

    return (
        <div>
            {/* Status + Actions */}
            <div className="flex justify-between items-center mb-4">
                {renderStatusTags()}
                <div className="flex gap-2 ml-auto">
                    {!editMode && (
                        <button onClick={() => setShowEvolutionModal(true)} className="px-4 py-2 rounded text-xs font-semibold bg-viking-bronze text-viking-brown hover:bg-viking-leather transition-colors">
                            💎 Évolution
                        </button>
                    )}
                    <button onClick={toggleEditMode} className={`px-4 py-2 rounded text-xs font-semibold ${editMode ? 'bg-viking-success text-white' : 'bg-viking-leather text-viking-parchment'}`}>
                        {editMode ? '✓ Sauvegarder' : '⚙️ Édition'}
                    </button>
                    {editMode && (
                        <>
                            <button onClick={() => onUpdate({...character, tokensBlessure: 0})} className="px-3 py-2 bg-viking-success text-white rounded text-xs">Soigner</button>
                            <button onClick={() => onUpdate({...character, tokensFatigue: 0})} className="px-3 py-2 bg-viking-bronze text-viking-brown rounded text-xs">Repos</button>
                        </>
                    )}
                </div>
            </div>

            {/* Grid Layout - 2 colonnes distribution manuelle */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" style={{gridAutoRows: 'min-content'}}>
                {/* COLONNE 1 */}
                <div className="space-y-3">
                    {/* Info Générale */}
                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                        <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment mb-2">Informations</h3>
                        {editMode ? (
                            <div className="space-y-1.5 text-xs">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <input value={editableChar.prenom} onChange={e => setEditableChar({...editableChar, prenom: e.target.value})} placeholder="Prénom" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                    <input value={editableChar.surnom} onChange={e => setEditableChar({...editableChar, surnom: e.target.value})} placeholder="Surnom" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                </div>
                                <input value={editableChar.nomParent} onChange={e => setEditableChar({...editableChar, nomParent: e.target.value})} placeholder="Parent" className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                <div className="grid grid-cols-3 gap-1.5">
                                    <input type="number" value={editableChar.age} onChange={e => setEditableChar({...editableChar, age: parseInt(e.target.value)||25})} placeholder="Âge" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                    <input type="number" value={editableChar.taille||''} onChange={e => setEditableChar({...editableChar, taille: parseInt(e.target.value)||undefined})} placeholder="Taille" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                    <input type="number" value={editableChar.poids||''} onChange={e => setEditableChar({...editableChar, poids: parseInt(e.target.value)||undefined})} placeholder="Poids" className="px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                </div>
                                <input value={editableChar.activite} onChange={e => setEditableChar({...editableChar, activite: e.target.value})} placeholder="Activité" className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                <div className="mt-2 pt-2 border-t border-viking-leather dark:border-viking-bronze">
                                    <label className="block text-xs text-viking-leather dark:text-viking-bronze mb-1">Code d'accès (partageable)</label>
                                    <input 
                                        value={editableChar.accessCode || ''} 
                                        onChange={e => setEditableChar({...editableChar, accessCode: e.target.value.toUpperCase().substring(0,6)})}
                                        placeholder="ABC123"
                                        maxLength={6}
                                        className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-mono"
                                    />
                                    <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                                        Plusieurs persos peuvent avoir le même code (groupe)
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs space-y-1 text-viking-text dark:text-viking-parchment">
                                <div className="font-bold text-sm">{formatFullName(char)}</div>
                                <div>{char.playerName} | {char.sexe === 'homme' ? 'H' : 'F'}, {char.age}a{char.taille && `, ${char.taille}cm`}{char.poids && `, ${char.poids}kg`}</div>
                                <div>{char.activite}</div>
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-viking-leather dark:border-viking-bronze">
                            <div className="text-center p-1.5 bg-viking-parchment dark:bg-gray-800 rounded">
                                <div className="text-xs text-viking-leather dark:text-viking-bronze">Armure</div>
                                <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">{char.armure}</div>
                            </div>
                            <div className="text-center p-1.5 bg-viking-parchment dark:bg-gray-800 rounded">
                                <div className="text-xs text-viking-leather dark:text-viking-bronze">Actions</div>
                                <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">{char.actionsDisponibles}</div>
                            </div>
                            <div className="text-center p-1.5 bg-viking-parchment dark:bg-gray-800 rounded">
                                <div className="text-xs text-viking-leather dark:text-viking-bronze">Seuil</div>
                                <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">{char.seuilCombat}</div>
                            </div>
                        </div>
                    </div>

                    {/* Caractéristiques */}
                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                        <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment mb-2">Caractéristiques</h3>
                        <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(CARACNAMES).map(([key, label]) => {
                                const lv = char[key];
                                return (
                                    <div key={key} className="p-1.5 bg-viking-parchment dark:bg-gray-800 rounded">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5 flex-1">
                                                <span className="font-semibold text-xs text-viking-brown dark:text-viking-parchment">{label}</span>
                                                {editMode && (
                                                    <>
                                                        <button onClick={() => lv > 1 && setEditableChar({...editableChar, [key]: lv-1})} disabled={lv<=1} className="w-4 h-4 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown">-</button>
                                                        <button onClick={() => lv < 5 && setEditableChar({...editableChar, [key]: lv+1})} disabled={lv>=5} className="w-4 h-4 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown">+</button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full border ${i<=lv?'bg-viking-bronze border-viking-bronze':'bg-transparent border-viking-leather dark:border-viking-bronze'}`} />)}</div>
                                                {!editMode && <button onClick={() => openDiceRoller('carac', key)} className="text-xs px-1 py-0.5 bg-viking-bronze rounded text-viking-brown hover:bg-viking-leather transition-colors ml-1">🎲</button>}
                                            </div>
                                        </div>
                                        <div className="text-xs text-viking-leather dark:text-viking-bronze italic mt-0.5">Expl: {formatExplosion(lv)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Compétences */}
                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment">Compétences</h3>
                            <div className="flex gap-1">
                                {editMode && (
                                    <button onClick={() => setShowEditModal('addSkill')} className="text-xs px-2 py-1 bg-viking-bronze text-viking-brown rounded hover:bg-viking-leather transition-colors">+ Ajout</button>
                                )}
                                {!editMode && (
                                    <button onClick={recoverAllSkillPoints} className="text-xs px-2 py-1 bg-viking-success text-white rounded hover:bg-green-700 transition-colors">Récup tous</button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1 max-h-80 overflow-y-auto">
                            {char.skills.map(skill => {
                                const bc = getBestCharacteristic(char, skill);
                                const th = getSuccessThreshold(skill.level);
                                return (
                                    <div key={`${skill.name}-${skill.specialization || 'default'}`} className="p-1.5 bg-viking-parchment dark:bg-gray-800 rounded">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 text-xs text-viking-text dark:text-viking-parchment">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold">
                                                        {formatSkillName(skill)} (Niv {skill.level})
                                                    </span>
                                                    {editMode && (
                                                        <>
                                                            <button onClick={() => {
                                                                const newSkills = editableChar.skills.map(s => 
                                                                    (s.name !== skill.name || s.specialization !== skill.specialization) ? s : {...s, level: Math.max(0, s.level-1), currentPoints: Math.max(0, s.level-1)}
                                                                );
                                                                setEditableChar({...editableChar, skills: newSkills});
                                                            }} disabled={skill.level <= 0} className="w-3 h-3 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown flex items-center justify-center leading-none">-</button>
                                                            <button onClick={() => {
                                                                const newSkills = editableChar.skills.map(s => 
                                                                    (s.name !== skill.name || s.specialization !== skill.specialization) ? s : {...s, level: Math.min(5, s.level+1), currentPoints: Math.min(5, s.level+1)}
                                                                );
                                                                setEditableChar({...editableChar, skills: newSkills});
                                                            }} disabled={skill.level >= 5} className="w-3 h-3 bg-viking-bronze rounded-full text-xs font-bold disabled:opacity-30 text-viking-brown flex items-center justify-center leading-none">+</button>
                                                            <button onClick={() => {
                                                                const newSkills = editableChar.skills.filter(s => 
                                                                    s.name !== skill.name || s.specialization !== skill.specialization
                                                                );
                                                                setEditableChar({...editableChar, skills: newSkills});
                                                            }} className="text-xs px-1 bg-red-600 text-white rounded leading-none">✕</button>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="text-viking-leather dark:text-viking-bronze">{CARACNAMES[bc.name]} | Seuil: {th}+ | Expl: {formatExplosion(bc.level)}</div>
                                            </div>
                                            {!editMode && <button onClick={() => openDiceRoller('skill', skill)} className="text-xs px-1 py-0.5 bg-viking-bronze rounded text-viking-brown hover:bg-viking-leather transition-colors">🎲</button>}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs mt-1">
                                            <div className="flex gap-0.5">{[...Array(skill.level)].map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i < skill.currentPoints ? 'bg-viking-success' : 'bg-gray-400 dark:bg-gray-600'}`} />)}</div>
                                            {!editMode && skill.currentPoints < skill.level && <button onClick={() => recoverSkillPoints(skill)} className="px-1 py-0.5 bg-viking-success text-white rounded text-xs hover:bg-green-700 transition-colors">Récup</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* COLONNE 2 */}
                <div className="space-y-3">
                    {/* SAGA + Tokens */}
                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                        <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment mb-2">SAGA & État physique</h3>
                        
                        {/* SAGA */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-viking-leather dark:border-viking-bronze">
                            <div className="flex items-center gap-2">
                                <button onClick={() => adjustSaga(-1)} disabled={character.sagaActuelle <= 0} className="w-6 h-6 bg-viking-bronze rounded-full font-bold text-sm disabled:opacity-30 text-viking-brown hover:bg-viking-leather transition-colors">-</button>
                                <span className="text-3xl font-bold text-viking-bronze">{char.sagaActuelle}</span>
                                <button onClick={() => adjustSaga(1)} disabled={character.sagaActuelle >= 5} className="w-6 h-6 bg-viking-bronze rounded-full font-bold text-sm disabled:opacity-30 text-viking-brown hover:bg-viking-leather transition-colors">+</button>
                            </div>
                            <div className="text-xs text-viking-text dark:text-viking-parchment">
                                <span className="font-semibold">Réput:</span> 
                                {editMode ? (
                                    <input type="number" value={editableChar.sagaTotale} onChange={e => setEditableChar({...editableChar, sagaTotale: parseInt(e.target.value)||0})} className="ml-1 w-14 px-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment" />
                                ) : (
                                    <span className="ml-1 font-bold">{char.sagaTotale}</span>
                                )}
                            </div>
                        </div>

                        {/* Tokens - 2 COLONNES */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Blessures */}
                            <div>
                                <div className="text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">BLESSURES</div>
                                <div className="flex flex-wrap gap-1">
                                    {[0,1,2,3,4].map(i => (
                                        <div key={i} onClick={() => toggleToken('blessure',i)} className={`w-7 h-7 rounded border-2 cursor-pointer transition-all ${
                                            i < character.tokensBlessure 
                                                ? i === 4 ? 'bg-viking-danger border-amber-800' : 'bg-viking-danger border-viking-danger' 
                                                : i === 0 
                                                    ? 'border-dashed border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger' 
                                                    : i === 4 ? 'border-amber-800 hover:border-viking-danger dark:hover:border-viking-danger'  : 'border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger'
                                        }`} title={i === 0 ? 'Gratuit' : i === 4 ? 'KO' : ''} />
                                    ))}
                                </div>
                            </div>
                            
                            {/* Fatigue */}
                            <div>
                                <div className="text-xs font-semibold text-viking-brown dark:text-viking-parchment mb-1">FATIGUE</div>
                                <div className="space-y-0.5">
                                    <div className="flex gap-1 justify-center">
                                        {[0,1,2,4,6,8].map(i => (
                                            <div 
                                                key={i} 
                                                onClick={() => toggleToken('fatigue',i)}
                                                className={`w-6 h-6 rounded border-2 cursor-pointer transition-all ${
                                                    i < character.tokensFatigue 
                                                        ? i === 8 ? 'bg-viking-leather border-amber-800' : 'bg-viking-leather border-viking-leather' 
                                                        : i === 0 
                                                            ? 'border-dashed border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger'  // SEUL 0 en pointillé
                                                            : i === 8 ? 'border-solid border-amber-800 hover:border-viking-danger dark:hover:border-viking-danger' : 'border-solid border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger'
                                                }`}
                                                title={i === 0 ? 'Gratuit (buffer)' : i === 8 ? 'Épuisé (+5 succès)' : `+${getFatigueMalus(i)} succès requis`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-1 justify-center">
                                        <div className="w-6 h-6"></div>
                                        <div className="w-6 h-6"></div>
                                        {[3,5,7].map(i => (
                                            <div 
                                                key={i} 
                                                onClick={() => toggleToken('fatigue',i)} 
                                                className={`w-6 h-6 rounded border-2 cursor-pointer transition-all ${
                                                    i < character.tokensFatigue 
                                                        ? 'bg-viking-leather border-viking-leather' 
                                                        : 'border-solid border-viking-leather dark:border-viking-bronze hover:border-viking-danger dark:hover:border-viking-danger'
                                                }`}
                                                title={`+${getFatigueMalus(i)} succès requis`}
                                            />
                                        ))}
                                        <div className="w-6 h-6"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Traits */}
                    <div className="bg-white dark:bg-viking-brown rounded-lg p-3 border-2 border-viking-leather dark:border-viking-bronze">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-viking-brown dark:text-viking-parchment">Traits & Backgrounds</h3>
                            {editMode && (
                                <button onClick={() => setShowEditModal('addTrait')} className="text-xs px-2 py-1 bg-viking-bronze text-viking-brown rounded hover:bg-viking-leather transition-colors">+ Ajout</button>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {char.traits.map(trait => {
                                const td = TRAITS.find(t => t.name === trait.name);
                                return (
                                    <div key={trait.name} className="p-1.5 bg-viking-parchment dark:bg-gray-800 rounded text-xs">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-semibold text-viking-brown dark:text-viking-parchment">{trait.name}</div>
                                                <div className="text-viking-text dark:text-viking-parchment">{td?.description}</div>
                                                {td?.effects && <div className="text-viking-success mt-0.5">{td.effects.actions && `+${td.effects.actions} Action `}{td.effects.armure && `+${td.effects.armure} Armure `}{td.effects.description}</div>}
                                            </div>
                                            {editMode && (
                                                <button onClick={() => {
                                                    const newTraits = editableChar.traits.filter(t => t.name !== trait.name);
                                                    setEditableChar({...editableChar, traits: newTraits});
                                                }} className="ml-2 text-xs px-1 bg-red-600 text-white rounded">✕</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modales */}
            {showDiceModal && <DiceModal character={character} isBerserk={false} context={diceContext} onClose={() => setShowDiceModal(false)} onUpdate={onUpdate} />}
            {showEditModal && <EditModals type={showEditModal} character={editableChar} onClose={() => setShowEditModal(null)} onUpdate={(newChar) => { setEditableChar(newChar); setShowEditModal(null); }} />}
            {showEvolutionModal && <EvolutionModal character={character} onClose={() => setShowEvolutionModal(false)} onUpdate={onUpdate} />}
        </div>
    );
};
