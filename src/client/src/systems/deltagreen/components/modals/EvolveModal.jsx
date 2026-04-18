// src/client/src/systems/deltagreen/components/modals/EvolveModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Évolution post-session :
//   1. Affiche les compétences et langues dont la case est cochée
//   2. Lance les D4 via diceEngine (animations incluses)
//   3. Envoie les résultats au parent (POST /evolve)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { roll }                         from '../../../../tools/diceEngine.js';
import { useSystem }                    from '../../../../hooks/useSystem.js';
import {useFetch}                         from '../../../../hooks/useFetch.js';
import deltgreenConfig, { SKILL_BY_KEY } from '../../config.jsx';

const EvolveModal = ({ character, onSubmit, onClose }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();

    const failedSkills = (character.skills ?? []).filter(s => s.failedCheck);
    const failedLangs  = (character.languages ?? []).filter(l => l.failedCheck);

    const [results,  setResults]  = useState([]); // [{ skillId?, languageId?, gain, label }]
    const [rolling,  setRolling]  = useState(false);
    const [done,     setDone]     = useState(false);

    const handleRollAll = useCallback(async () => {
        setRolling(true);
        const res = [];

        // Compétences
        for (const skill of failedSkills) {
            const label = SKILL_BY_KEY[skill.skillKey]?.label ?? skill.skillKey;
            const fullLabel = skill.specialty ? `${label} : ${skill.specialty}` : label;
            try {
                const ctx = {
                    apiBase,
                    fetchFn:       fetchWithAuth,
                    characterId:   character.id,
                    characterName: character.nom ?? 'Agent',
                    sessionId:     null,
                    label:         `Évolution — ${fullLabel}`,  // ← manquait
                    rollType:      'dg_evolve',                 // ← manquait
                    systemData:    { diceType: 'd4', rollLabel: `Évolution — ${fullLabel}` },
                };
                const result = await roll('1d4', ctx, deltgreenConfig.dice);
                res.push({ skillId: skill.id, gain: result.value, label: fullLabel });
            } catch (_) {
                res.push({ skillId: skill.id, gain: 1, label: fullLabel });
            }
        }

        // Langues
        for (const lang of failedLangs) {
            try {
                const ctx = {
                    apiBase,
                    fetchFn:       fetchWithAuth,
                    characterId:   character.id,
                    characterName: character.nom ?? 'Agent',
                    sessionId:     null,
                    systemData:    { diceType: 'd4', rollLabel: `Évolution — ${lang.name}` },
                };
                const result = await roll('1d4', ctx, deltgreenConfig.dice);
                res.push({ languageId: lang.id, gain: result.value, label: lang.name });
            } catch (_) {
                res.push({ languageId: lang.id, gain: 1, label: lang.name });
            }
        }

        setResults(res);
        setRolling(false);
        setDone(true);
    }, [failedSkills, failedLangs, character, apiBase, fetchWithAuth]);

    const totalEligible = failedSkills.length + failedLangs.length;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-default border border-default shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
                 style={{ fontFamily: 'var(--dg-font-body)' }}>

                <div className="dg-header px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">
                        ÉVOLUTION POST-SESSION
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {totalEligible === 0 ? (
                        <p className="text-sm text-muted font-mono italic">
                            Aucune compétence n'a de case d'échec cochée.
                        </p>
                    ) : (
                        <>
                            <p className="text-xs text-muted font-mono">
                                {totalEligible} compétence{totalEligible > 1 ? 's' : ''} éligible{totalEligible > 1 ? 's' : ''} (+1D4 chacune)
                            </p>

                            <div className="space-y-1">
                                {[...failedSkills.map(s => ({
                                    id: s.id, type: 'skill',
                                    label: (SKILL_BY_KEY[s.skillKey]?.label ?? s.skillKey) + (s.specialty ? ` : ${s.specialty}` : ''),
                                    score: s.score,
                                })),
                                    ...failedLangs.map(l => ({ id: l.id, type: 'lang', label: l.name, score: l.score }))
                                ].map((item, i) => {
                                    const r = results.find(r => r.skillId === item.id || r.languageId === item.id);
                                    return (
                                        <div key={i} className="flex items-center justify-between border-b border-default/20 py-1">
                                            <span className="text-xs font-mono">{item.label}</span>
                                            <div className="flex items-center gap-2 text-xs font-mono">
                                                <span className="text-muted">{item.score}%</span>
                                                {r && (
                                                    <span className="text-success font-bold">+{r.gain} → {Math.min(99, item.score + r.gain)}%</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="border-t border-default p-3 flex gap-2 justify-end">
                    {!done && totalEligible > 0 && (
                        <button onClick={handleRollAll} disabled={rolling}
                                className="px-4 py-2 bg-success text-white text-xs font-mono uppercase tracking-wider disabled:opacity-40 hover:opacity-90">
                            {rolling ? 'Lancer…' : 'Lancer les D4'}
                        </button>
                    )}
                    {done && (
                        <button onClick={() => onSubmit(results)}
                                className="px-4 py-2 bg-success text-white text-xs font-mono uppercase tracking-wider hover:opacity-90">
                            Appliquer
                        </button>
                    )}
                    <button onClick={onClose}
                            className="px-4 py-2 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default">
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EvolveModal;