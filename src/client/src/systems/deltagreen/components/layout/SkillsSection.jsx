// src/client/src/systems/deltagreen/components/sheet/sections/SkillsSection.jsx
import React, { useMemo } from 'react';
import {BASE_SKILLS, SKILL_BY_KEY} from "../../config.jsx";

// ── Ligne de compétence ───────────────────────────────────────────────────────

const SkillRow = ({ skill, baseScore, label, editMode, onScoreChange, onRoll, onPatchImmediate, char }) => {
    const isAtBase  = skill.score === baseScore && !skill.specialty;
    const isHidden  = !editMode && skill.score === 0 && !skill.specialty; // masqué en lecture si à 0

    if (isHidden) return null;

    const handleCheckFail = () => {
        // Cochage immédiat de la case d'échec (patch immédiat)
        const updatedSkills = (char.skills ?? []).map(s =>
            s.id === skill.id ? { ...s, failedCheck: !s.failedCheck } : s
        );
        onPatchImmediate({ skills: updatedSkills });
    };

    const handleRoll = () => {
        onRoll({
            diceType:    'd100',
            targetScore: skill.score,
            rollLabel:   label,
            skillId:     skill.id,
        });
    };

    return (
        <div className={[
            'dg-skill-row flex items-center gap-2 py-0.5 px-1 border-b border-default/20',
            skill.failedCheck ? 'dg-failed' : '',
        ].join(' ')}>

            {/* Case d'échec */}
            <input
                type="checkbox"
                className="dg-checkbox shrink-0"
                checked={!!skill.failedCheck}
                onChange={handleCheckFail}
                title="Échec — cochez en cas d'échec, +1D4 après session"
            />

            {/* Nom compétence */}
            <span className={[
                'flex-1 text-xs font-mono dg-skill-label',
                skill.failedCheck ? 'font-bold' : '',
                isAtBase && !editMode ? 'text-muted' : '',
            ].join(' ')}>
                {label}
                {skill.specialty && (
                    <span className="text-muted"> : {skill.specialty}</span>
                )}
                {!editMode && isAtBase && (
                    <span className="text-muted/60"> ({baseScore}%)</span>
                )}
            </span>

            {/* Score */}
            {editMode ? (
                <input
                    type="number" min={0} max={99}
                    className="dg-field-input w-12 text-center text-xs px-1"
                    value={skill.score ?? 0}
                    onChange={e => onScoreChange(Number(e.target.value))}
                />
            ) : (
                <span className={[
                    'font-mono text-xs font-bold w-8 text-right',
                    skill.score > 0 && !isAtBase ? 'text-default' : 'text-muted',
                ].join(' ')}>
                    {skill.score}%
                </span>
            )}

            {/* Bouton jet */}
            <button
                onClick={handleRoll}
                className="text-xs font-mono border border-default/40 px-1.5 py-0.5 hover:border-accent hover:text-accent transition-colors flex-shrink-0"
                title={`Jet ${label} (${skill.score}%)`}
            >
                ⊕
            </button>
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

const SkillsSection = ({ char, editMode, setArr, onRoll, onPatchImmediate }) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const skills    = char.skills    ?? [];
    const languages = char.languages ?? [];
    const matchSkill = (s, key) => s.id === key || s._tempId === key;

    // Map skill_key → entrées (peut y en avoir plusieurs pour les spécialités)
    const skillMap = useMemo(() => {
        const map = {};
        for (const s of skills) {
            if (!map[s.skillKey]) map[s.skillKey] = [];
            map[s.skillKey].push(s);
        }
        return map;
    }, [skills]);

    const updateSkillScore = (skillKey, score) => {
        const next = skills.map(s => matchSkill(s, skillKey) ? { ...s, score } : s);
        setArr('skills', next);
    };

    const addSpecialty = (skillKey) => {
        // Ajoute une nouvelle entrée de spécialité (sans id → sera inséré côté serveur)
        const base = SKILL_BY_KEY[skillKey];
        setArr('skills', [...skills, {
            _tempId:     `temp_${Date.now()}`,
            skillKey,
            specialty:   '',
            score:       base?.base ?? 0,
            failedCheck: false,
        }]);
    };

    const updateSpecialtyName = (skillId, name) => {
        setArr('skills', skills.map(s => matchSkill(s, skillId) ? { ...s, specialty: name } : s));
    };

    const removeSkillEntry = (skillId) => {
        setArr('skills', skills.filter(s => !matchSkill(s, skillId)));
    };

    const updateLang = (langId, field, value) => {
        setArr('languages', languages.map(l => l.id === langId ? { ...l, [field]: value } : l));
    };

    const addLanguage = () => {
        setArr('languages', [...languages, { name: '', score: 0, failedCheck: false }]);
    };

    const removeLang = (langId) => {
        setArr('languages', languages.filter(l => l.id !== langId));
    };

    const patchLangFail = (langId) => {
        const updated = languages.map(l => l.id === langId ? { ...l, failedCheck: !l.failedCheck } : l);
        onPatchImmediate({ languages: updated });
    };

    // ── Compétences de base (colonne gauche / droite) ─────────────────────────
    // On affiche les 42 compétences en deux colonnes
    const half = Math.ceil(BASE_SKILLS.length / 2);
    const leftSkills  = BASE_SKILLS.slice(0, half);
    const rightSkills = BASE_SKILLS.slice(half);

    const renderSkillBlock = (baseDef) => {
        const entries = skillMap[baseDef.key] ?? [];

        // Entrée de base (specialty = null)
        const baseEntry = entries.find(e => !e.specialty) ?? {
            id:          null,
            skillKey:    baseDef.key,
            specialty:   null,
            score:       baseDef.base,
            failedCheck: false,
        };
        // Entrées spécialités
        const specialties = entries.filter(e => e.specialty !== null);

        return (
            <div key={baseDef.key}>
                {/* Compétence de base */}
                <SkillRow
                    skill={baseEntry}
                    baseScore={baseDef.base}
                    label={baseDef.label}
                    editMode={editMode}
                    onScoreChange={v => baseEntry.id && updateSkillScore(baseEntry.id, v)}
                    onRoll={onRoll}
                    onPatchImmediate={onPatchImmediate}
                    char={char}
                />

                {/* Spécialités */}
                {specialties.map(sp => (
                    <div key={sp._tempId ?? sp.id ?? sp.specialty} className="ml-3 min-w-0">
                        {editMode ? (
                            <div className="grid grid-cols-[5%_60%_20%_5%] items-center gap-1 py-0.5">
                                <input type="checkbox" className="dg-checkbox"
                                       checked={!!sp.failedCheck}
                                       onChange={() => {
                                           const key = sp._tempId ?? sp.id;
                                           const next = skills.map(s => matchSkill(s, key)
                                               ? { ...s, failedCheck: !s.failedCheck } : s);
                                           onPatchImmediate({ skills: next });
                                       }}
                                />
                                <input className="dg-field-input min-w-0 px-1 py-0.5 text-xs"
                                       value={sp.specialty ?? ''}
                                       onChange={e => updateSpecialtyName(sp._tempId ?? sp.id, e.target.value)}
                                       placeholder="Spécialité…"
                                />
                                <input type="number" min={0} max={99}
                                       className="dg-field-input w-10 text-center text-xs px-1"
                                       value={sp.score ?? 0}
                                       onChange={e => updateSkillScore(sp._tempId ?? sp.id, Number(e.target.value))}
                                />
                                <button onClick={() => removeSkillEntry(sp._tempId ?? sp.id)}
                                        className="text-danger text-xs">✕</button>
                            </div>
                        ) : (
                            <SkillRow
                                skill={sp}
                                baseScore={baseDef.base}
                                label={baseDef.label}
                                editMode={false}
                                onScoreChange={() => {}}
                                onRoll={onRoll}
                                onPatchImmediate={onPatchImmediate}
                                char={char}
                            />
                        )}
                    </div>
                ))}

                {/* Bouton ajouter spécialité */}
                {editMode && baseDef.hasSpecialty && (
                    <button onClick={() => addSpecialty(baseDef.key)}
                            className="ml-4 text-xs text-muted hover:text-accent font-mono mt-0.5">
                        + spécialité
                    </button>
                )}
            </div>
        );
    };

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                11. COMPÉTENCES ACQUISES
            </p>

            {/* Grille deux colonnes */}
            <div className="grid grid-cols-2 gap-x-6">
                <div className="min-w-0 overflow-hidden">{leftSkills.map(renderSkillBlock)}</div>
                <div className="min-w-0 overflow-hidden">{rightSkills.map(renderSkillBlock)}</div>
            </div>

            {/* Langues étrangères et autres compétences */}
            {(editMode || languages.length > 0)  && (
                <div className="mt-4">
                    <p className="dg-section-label mb-2">Langues étrangères et autres compétences</p>
                    <hr className="dg-divider" />
                    {languages.map((lang, i) => (
                        <div key={lang.id ?? i} className="flex items-center gap-2 py-0.5 border-b border-default/20">
                            <input type="checkbox" className="dg-checkbox"
                                   checked={!!lang.failedCheck}
                                   onChange={() => patchLangFail(lang.id)}
                            />
                            {editMode ? (
                                <>
                                    <input className="dg-field-input flex-1 px-2 py-0.5 text-xs"
                                           value={lang.name ?? ''}
                                           onChange={e => updateLang(lang.id, 'name', e.target.value)}
                                           placeholder="Langue ou compétence…"
                                    />
                                    <input type="number" min={0} max={99}
                                           className="dg-field-input w-12 text-center text-xs px-1"
                                           value={lang.score ?? 0}
                                           onChange={e => updateLang(lang.id, 'score', Number(e.target.value))}
                                    />
                                    <button onClick={() => removeLang(lang.id)}
                                            className="text-danger text-xs">✕</button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 text-xs font-mono">{lang.name || '—'}</span>
                                    <span className="font-mono text-xs font-bold w-8 text-right">{lang.score}%</span>
                                    <button onClick={() => onRoll({ diceType: 'd100', targetScore: lang.score, rollLabel: lang.name, languageId: lang.id })}
                                            className="text-xs font-mono border border-default/40 px-1.5 py-0.5 hover:border-accent hover:text-accent">⊕</button>
                                </>
                            )}
                        </div>
                    ))}

                    {editMode && (
                        <button onClick={addLanguage}
                                className="mt-2 text-xs font-mono border border-default px-3 py-1 hover:border-accent hover:text-accent transition-colors">
                            + Langue / compétence
                        </button>
                    )}
                </div>
            )}


            {/*<p className="text-xs text-muted font-mono mt-3 italic">*/}
            {/*    Cochez une case quand vous échouez un test de compétence.*/}
            {/*    Après la partie, ajoutez 1D4 aux compétences cochées, puis gommez-les.*/}
            {/*</p>*/}
        </div>
    );
};

export default SkillsSection;