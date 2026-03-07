// src/client/src/systems/dune/Creation.jsx
// Wizard de création personnage — public, sans authentification.
// 7 étapes : Identité → Compétences → Principes → Talents → Atouts → Freebies → Finalisation
//
// Chargé dynamiquement par PlayerPage via import.meta.glob('../systems/*/Creation.jsx').
// Rendu en pleine page — contrat props : { onCreated, onCancel, darkMode, onToggleDarkMode }
//
// Freebies : état local uniquement, non persistés en BDD.
// POST /api/dune/characters → reçoit { accessCode, accessUrl, ... }

import React, { useState, useCallback } from 'react';
import './theme.css';
import { useSystem } from '../../hooks/useSystem.js';

const DEFAULT_COMPETENCES = [
    { key: 'analyse',    label: 'Analyse',    rang: 1, specialisation: '' },
    { key: 'combat',     label: 'Combat',     rang: 1, specialisation: '' },
    { key: 'discipline', label: 'Discipline', rang: 1, specialisation: '' },
    { key: 'mobilite',   label: 'Mobilité',   rang: 1, specialisation: '' },
    { key: 'rhetorique', label: 'Rhétorique', rang: 1, specialisation: '' },
];

const DEFAULT_PRINCIPES = [
    { key: 'devoir',     label: 'Devoir',     rang: 1, maxime: '' },
    { key: 'domination', label: 'Domination', rang: 1, maxime: '' },
    { key: 'foi',        label: 'Foi',        rang: 1, maxime: '' },
    { key: 'justice',    label: 'Justice',    rang: 1, maxime: '' },
    { key: 'verite',     label: 'Vérité',     rang: 1, maxime: '' },
];

const MAX_PRINCIPE_RANG    = 8;
const FREEBIES_INITIAL     = 5;
const SEUIL_SPECIALISATION = 6;

const STEPS = [
    { id: 1, label: 'Identité' },
    { id: 2, label: 'Compétences' },
    { id: 3, label: 'Principes' },
    { id: 4, label: 'Talents' },
    { id: 5, label: 'Atouts' },
    { id: 6, label: 'Freebies' },
    { id: 7, label: 'Finalisation' },
];

const StepBar = ({ current }) => (
    <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
                <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                         style={{
                             background: s.id < current ? 'var(--dune-success)' : s.id === current ? 'var(--dune-gold)' : 'var(--dune-surface-alt)',
                             color: s.id <= current ? 'var(--dune-dark)' : 'var(--dune-text-muted)',
                         }}>
                        {s.id < current ? '✓' : s.id}
                    </div>
                    <span className="text-[8px] mt-0.5 hidden sm:block"
                          style={{ color: s.id === current ? 'var(--dune-gold)' : 'var(--dune-text-muted)' }}>
                        {s.label}
                    </span>
                </div>
                {i < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mb-3"
                         style={{ background: s.id < current ? 'var(--dune-success)' : 'var(--dune-border)' }} />
                )}
            </React.Fragment>
        ))}
    </div>
);

const Creation = ({ onCreated, onCancel }) => {
    const { apiBase } = useSystem();
    const [step, setStep] = useState(1);

    const [identite,    setIdentite]    = useState({ nom: '', playerName: '', statutSocial: '', description: '' });
    const [competences, setCompetences] = useState(DEFAULT_COMPETENCES.map(c => ({ ...c })));
    const [principes,   setPrincipes]   = useState(DEFAULT_PRINCIPES.map(p => ({ ...p })));
    const [talents,     setTalents]     = useState([]);
    const [atouts,      setAtouts]      = useState([]);

    const [freebies,  setFreebies]  = useState(FREEBIES_INITIAL);
    const [freeComp,  setFreeComp]  = useState(competences.map(c => ({ ...c })));
    const [freePrinc, setFreePrinc] = useState(principes.map(p => ({ ...p })));

    const [creating,    setCreating]    = useState(false);
    const [created,     setCreated]     = useState(null);
    const [createError, setCreateError] = useState(null);
    const [copied,      setCopied]      = useState(false);

    const [newTalentName, setNewTalentName] = useState('');
    const [newTalentDesc, setNewTalentDesc] = useState('');
    const addTalent = () => {
        if (!newTalentName.trim()) return;
        setTalents(t => [...t, { talentName: newTalentName.trim(), description: newTalentDesc.trim() }]);
        setNewTalentName(''); setNewTalentDesc('');
    };

    const [newAtoutNom,  setNewAtoutNom]  = useState('');
    const [newAtoutDesc, setNewAtoutDesc] = useState('');
    const [newAtoutQte,  setNewAtoutQte]  = useState(1);
    const addAtout = () => {
        if (!newAtoutNom.trim()) return;
        setAtouts(a => [...a, { nom: newAtoutNom.trim(), description: newAtoutDesc.trim(), quantite: Math.max(1, newAtoutQte) }]);
        setNewAtoutNom(''); setNewAtoutDesc(''); setNewAtoutQte(1);
    };

    const applyFreeComp = (key, delta) => {
        if (delta > 0 && freebies <= 0) return;
        setFreeComp(prev => prev.map(c => c.key === key ? { ...c, rang: Math.max(1, c.rang + delta) } : c));
        setFreebies(f => f - delta);
    };
    const applyFreePrinc = (key, delta) => {
        if (delta > 0 && freebies <= 0) return;
        setFreePrinc(prev => prev.map(p => p.key === key ? { ...p, rang: Math.min(MAX_PRINCIPE_RANG, Math.max(1, p.rang + delta)) } : p));
        setFreebies(f => f - delta);
    };

    const initFreebies = useCallback(() => {
        setFreeComp(competences.map(c => ({ ...c })));
        setFreePrinc(principes.map(p => ({ ...p })));
        setFreebies(FREEBIES_INITIAL);
    }, [competences, principes]);

    const goNext = () => { if (step === 5) initFreebies(); setStep(s => Math.min(7, s + 1)); };
    const goPrev = () => setStep(s => Math.max(1, s - 1));
    const step1Valid = identite.nom.trim() !== '' && identite.playerName.trim() !== '';

    const handleCreate = useCallback(async () => {
        if (creating) return;
        setCreating(true); setCreateError(null);
        try {
            const r = await fetch(`${apiBase}/characters`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom: identite.nom.trim(), playerName: identite.playerName.trim(), statutSocial: identite.statutSocial.trim(), description: identite.description.trim(), competences: freeComp, principes: freePrinc, talents, items: atouts }),
            });
            if (!r.ok) { const err = await r.json(); throw new Error(err.error ?? 'Erreur lors de la création'); }
            setCreated(await r.json());
        } catch (err) { setCreateError(err.message); } finally { setCreating(false); }
    }, [creating, freeComp, freePrinc, identite, talents, atouts, apiBase]);

    const copyCode = () => {
        if (!created) return;
        navigator.clipboard.writeText(created.accessCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    const updateComp = (i, delta) => setCompetences(prev => prev.map((x, j) => j === i ? { ...x, rang: Math.max(1, x.rang + delta) } : x));
    const updatePrinc = (i, delta) => setPrincipes(prev => prev.map((x, j) => j === i ? { ...x, rang: Math.min(MAX_PRINCIPE_RANG, Math.max(1, x.rang + delta)) } : x));

    return (
        <div className="min-h-screen py-8 px-4" style={{ background: 'var(--dune-bg)' }}>

            {/* BANDEAU TITRE */}
            <div className="max-w-3xl mx-auto mb-6 text-center">
                <div className="text-5xl mb-2">🏜️</div>
                <h1 className="text-3xl font-bold uppercase" style={{ color: 'var(--dune-gold)', letterSpacing: '0.15em' }}>
                    Dune
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--dune-sand)', letterSpacing: '0.05em' }}>
                    Adventures in the Imperium — Création de personnage
                </p>
                <div className="mt-3 h-px" style={{ background: 'var(--dune-gold)', opacity: 0.3 }} />
            </div>

            {/* CARTE WIZARD */}
            <div className="max-w-3xl mx-auto rounded-2xl shadow-2xl overflow-hidden"
                 style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-gold)' }}>

                <div className="flex items-center justify-between px-6 py-3"
                     style={{ background: 'var(--dune-dark)', borderBottom: '1px solid var(--dune-border)' }}>
                    <span className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                        Étape {step} / {STEPS.length} — {STEPS[step - 1].label}
                    </span>
                    <button onClick={onCancel} className="text-xs px-3 py-1 rounded"
                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text-muted)' }}>
                        ✕ Annuler
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    <StepBar current={step} />

                    {/* ÉTAPE 1 — Identité */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-base mb-4" style={{ color: 'var(--dune-gold)' }}>Identité du personnage</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="dune-label mb-1">Nom du personnage *</div>
                                    <input value={identite.nom} onChange={e => setIdentite(p => ({ ...p, nom: e.target.value }))}
                                           className="dune-input" placeholder="Nom du personnage…" autoFocus />
                                </div>
                                <div>
                                    <div className="dune-label mb-1">Prénom du joueur *</div>
                                    <input value={identite.playerName} onChange={e => setIdentite(p => ({ ...p, playerName: e.target.value }))}
                                           className="dune-input" placeholder="Votre prénom…" />
                                </div>
                            </div>
                            <div>
                                <div className="dune-label mb-1">Statut social</div>
                                <input value={identite.statutSocial} onChange={e => setIdentite(p => ({ ...p, statutSocial: e.target.value }))}
                                       className="dune-input" placeholder="Mentat, Bene Gesserit, Fremen, noble de Maison…" />
                            </div>
                            <div>
                                <div className="dune-label mb-1">Description libre</div>
                                <textarea value={identite.description} onChange={e => setIdentite(p => ({ ...p, description: e.target.value }))}
                                          className="dune-input" rows={4} placeholder="Apparence, traits de caractère, origine, motivations…" />
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 2 — Compétences */}
                    {step === 2 && (
                        <div className="space-y-3">
                            <div className="mb-4">
                                <h2 className="font-bold text-base" style={{ color: 'var(--dune-gold)' }}>Compétences</h2>
                                <p className="text-xs mt-1" style={{ color: 'var(--dune-text-muted)' }}>
                                    Rang minimum 1, pas de maximum. La spécialisation se débloque à partir du rang {SEUIL_SPECIALISATION}.
                                </p>
                            </div>
                            {competences.map((c, i) => (
                                <div key={c.key} className="dune-card-alt">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold flex-1" style={{ color: 'var(--dune-text)' }}>{c.label}</span>
                                        <button onClick={() => updateComp(i, -1)} className="w-7 h-7 rounded font-bold text-sm"
                                                style={{ background: 'var(--dune-surface)', color: 'var(--dune-text)' }}>−</button>
                                        <span className="w-8 text-center font-bold text-lg" style={{ color: 'var(--dune-gold)' }}>{c.rang}</span>
                                        <button onClick={() => updateComp(i, 1)} className="w-7 h-7 rounded font-bold text-sm"
                                                style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}>+</button>
                                    </div>
                                    {c.rang >= SEUIL_SPECIALISATION ? (
                                        <div className="mt-2">
                                            <input value={c.specialisation}
                                                   onChange={e => setCompetences(prev => prev.map((x, j) => j === i ? { ...x, specialisation: e.target.value } : x))}
                                                   className="dune-input text-sm" placeholder={`Spécialisation — votre domaine en ${c.label.toLowerCase()}…`} />
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-[10px] italic" style={{ color: 'var(--dune-text-muted)' }}>
                                            Spécialisation disponible au rang {SEUIL_SPECIALISATION}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ÉTAPE 3 — Principes */}
                    {step === 3 && (
                        <div className="space-y-3">
                            <div className="mb-4">
                                <h2 className="font-bold text-base" style={{ color: 'var(--dune-gold)' }}>Principes</h2>
                                <p className="text-xs mt-1" style={{ color: 'var(--dune-text-muted)' }}>
                                    Rang de 1 à {MAX_PRINCIPE_RANG}. La maxime se débloque au rang {SEUIL_SPECIALISATION} — une phrase qui incarne ce principe.
                                </p>
                            </div>
                            {principes.map((p, i) => (
                                <div key={p.key} className="dune-card-alt">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold flex-1" style={{ color: 'var(--dune-text)' }}>{p.label}</span>
                                        <button onClick={() => updatePrinc(i, -1)} disabled={p.rang <= 1}
                                                className="w-7 h-7 rounded font-bold text-sm disabled:opacity-30"
                                                style={{ background: 'var(--dune-surface)', color: 'var(--dune-text)' }}>−</button>
                                        <span className="w-8 text-center font-bold text-lg" style={{ color: 'var(--dune-spice)' }}>{p.rang}</span>
                                        <button onClick={() => updatePrinc(i, 1)} disabled={p.rang >= MAX_PRINCIPE_RANG}
                                                className="w-7 h-7 rounded font-bold text-sm disabled:opacity-30"
                                                style={{ background: 'var(--dune-spice)', color: 'var(--dune-dark)' }}>+</button>
                                        <span className="text-[10px] w-5 text-right" style={{ color: 'var(--dune-text-muted)' }}>/{MAX_PRINCIPE_RANG}</span>
                                    </div>
                                    {p.rang >= SEUIL_SPECIALISATION ? (
                                        <div className="mt-2">
                                            <input value={p.maxime}
                                                   onChange={e => setPrincipes(prev => prev.map((x, j) => j === i ? { ...x, maxime: e.target.value } : x))}
                                                   className="dune-input text-sm italic" placeholder={`Maxime — votre ${p.label.toLowerCase()}…`} />
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-[10px] italic" style={{ color: 'var(--dune-text-muted)' }}>
                                            Maxime disponible au rang {SEUIL_SPECIALISATION}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ÉTAPE 4 — Talents */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="mb-4">
                                <h2 className="font-bold text-base" style={{ color: 'var(--dune-gold)' }}>Talents</h2>
                                <p className="text-xs mt-1" style={{ color: 'var(--dune-text-muted)' }}>Capacités spéciales. Optionnel — modifiable en jeu.</p>
                            </div>
                            <div className="space-y-2">
                                {talents.length === 0 && <p className="text-xs italic text-center py-4" style={{ color: 'var(--dune-text-muted)' }}>Aucun talent ajouté.</p>}
                                {talents.map((t, i) => (
                                    <div key={i} className="dune-card-alt flex gap-3 items-start">
                                        <div className="flex-1">
                                            <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>{t.talentName}</div>
                                            {t.description && <div className="text-xs mt-0.5" style={{ color: 'var(--dune-text-muted)' }}>{t.description}</div>}
                                        </div>
                                        <button onClick={() => setTalents(prev => prev.filter((_, j) => j !== i))}
                                                className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                                                style={{ background: 'var(--dune-red)', color: 'white' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--dune-border)' }}>
                                <input value={newTalentName} onChange={e => setNewTalentName(e.target.value)} className="dune-input" placeholder="Nom du talent…" />
                                <textarea value={newTalentDesc} onChange={e => setNewTalentDesc(e.target.value)} className="dune-input text-sm" rows={2} placeholder="Description du talent…" />
                                <button onClick={addTalent} disabled={!newTalentName.trim()} className="dune-btn-secondary w-full disabled:opacity-40">+ Ajouter ce talent</button>
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 5 — Atouts */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <div className="mb-4">
                                <h2 className="font-bold text-base" style={{ color: 'var(--dune-gold)' }}>Atouts de départ</h2>
                                <p className="text-xs mt-1" style={{ color: 'var(--dune-text-muted)' }}>Objets, contacts, ressources… Optionnel — modifiable en jeu.</p>
                            </div>
                            <div className="space-y-2">
                                {atouts.length === 0 && <p className="text-xs italic text-center py-4" style={{ color: 'var(--dune-text-muted)' }}>Aucun atout ajouté.</p>}
                                {atouts.map((a, i) => (
                                    <div key={i} className="dune-card-alt flex gap-3 items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>{a.nom}</span>
                                                {a.quantite > 1 && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--dune-surface)', color: 'var(--dune-sand)' }}>×{a.quantite}</span>}
                                            </div>
                                            {a.description && <div className="text-xs mt-0.5" style={{ color: 'var(--dune-text-muted)' }}>{a.description}</div>}
                                        </div>
                                        <button onClick={() => setAtouts(prev => prev.filter((_, j) => j !== i))}
                                                className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                                                style={{ background: 'var(--dune-red)', color: 'white' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--dune-border)' }}>
                                <div className="flex gap-2 items-center">
                                    <input value={newAtoutNom} onChange={e => setNewAtoutNom(e.target.value)} className="dune-input flex-1" placeholder="Nom de l'atout…" />
                                    <div className="flex flex-col items-center flex-shrink-0">
                                        <span className="dune-label text-[9px] mb-0.5">Qté</span>
                                        <input type="number" min={1} value={newAtoutQte}
                                               onChange={e => setNewAtoutQte(Math.max(1, parseInt(e.target.value) || 1))}
                                               className="dune-input text-sm text-center w-14" />
                                    </div>
                                </div>
                                <textarea value={newAtoutDesc} onChange={e => setNewAtoutDesc(e.target.value)} className="dune-input text-sm" rows={2} placeholder="Description…" />
                                <button onClick={addAtout} disabled={!newAtoutNom.trim()} className="dune-btn-secondary w-full disabled:opacity-40">+ Ajouter cet atout</button>
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 6 — Freebies */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="font-bold text-base" style={{ color: 'var(--dune-gold)' }}>Points libres</h2>
                                    <p className="text-xs mt-1" style={{ color: 'var(--dune-text-muted)' }}>Répartissez vos points sur compétences et principes.</p>
                                </div>
                                <span className="px-4 py-1.5 rounded-full font-bold text-lg flex-shrink-0 ml-4"
                                      style={{ background: freebies > 0 ? 'var(--dune-gold)' : 'var(--dune-success)', color: 'var(--dune-dark)' }}>
                                    {freebies} pt{freebies > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="dune-card">
                                    <div className="dune-label mb-3">Compétences</div>
                                    {freeComp.map(c => {
                                        const bonus = c.rang - competences.find(x => x.key === c.key).rang;
                                        return (
                                            <div key={c.key} className="flex items-center gap-2 py-1.5">
                                                <span className="text-xs flex-1" style={{ color: 'var(--dune-text)' }}>{c.label}</span>
                                                <button onClick={() => applyFreeComp(c.key, -1)} disabled={bonus <= 0}
                                                        className="w-5 h-5 rounded text-xs font-bold disabled:opacity-30"
                                                        style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>−</button>
                                                <span className="w-7 text-center text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>{c.rang}</span>
                                                <button onClick={() => applyFreeComp(c.key, 1)} disabled={freebies <= 0}
                                                        className="w-5 h-5 rounded text-xs font-bold disabled:opacity-30"
                                                        style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}>+</button>
                                                {bonus > 0 && <span className="text-[9px] w-5" style={{ color: 'var(--dune-gold)' }}>+{bonus}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="dune-card">
                                    <div className="dune-label mb-3">Principes</div>
                                    {freePrinc.map(p => {
                                        const bonus = p.rang - principes.find(x => x.key === p.key).rang;
                                        return (
                                            <div key={p.key} className="flex items-center gap-2 py-1.5">
                                                <span className="text-xs flex-1" style={{ color: 'var(--dune-text)' }}>{p.label}</span>
                                                <button onClick={() => applyFreePrinc(p.key, -1)} disabled={bonus <= 0}
                                                        className="w-5 h-5 rounded text-xs font-bold disabled:opacity-30"
                                                        style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}>−</button>
                                                <span className="w-7 text-center text-sm font-bold" style={{ color: 'var(--dune-spice)' }}>{p.rang}</span>
                                                <button onClick={() => applyFreePrinc(p.key, 1)} disabled={freebies <= 0 || p.rang >= MAX_PRINCIPE_RANG}
                                                        className="w-5 h-5 rounded text-xs font-bold disabled:opacity-30"
                                                        style={{ background: 'var(--dune-spice)', color: 'var(--dune-dark)' }}>+</button>
                                                {bonus > 0 && <span className="text-[9px] w-5" style={{ color: 'var(--dune-spice)' }}>+{bonus}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ÉTAPE 7 — Finalisation */}
                    {step === 7 && (
                        <div className="space-y-4">
                            {!created ? (
                                <>
                                    <h2 className="font-bold text-base mb-4" style={{ color: 'var(--dune-gold)' }}>Récapitulatif</h2>
                                    <div className="dune-card-alt">
                                        <div className="font-bold text-lg" style={{ color: 'var(--dune-gold)' }}>{identite.nom}</div>
                                        <div className="text-sm" style={{ color: 'var(--dune-text-muted)' }}>
                                            {identite.playerName}{identite.statutSocial && ` · ${identite.statutSocial}`}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="dune-card-alt">
                                            <div className="dune-label mb-2">Compétences</div>
                                            {freeComp.map(c => (
                                                <div key={c.key} className="flex justify-between items-center text-sm py-0.5">
                                                    <span style={{ color: 'var(--dune-text)' }}>
                                                        {c.specialisation ? <><span style={{ color: 'var(--dune-gold)' }}>● </span>{c.label}</> : c.label}
                                                    </span>
                                                    <span className="font-bold" style={{ color: 'var(--dune-gold)' }}>{c.rang}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="dune-card-alt">
                                            <div className="dune-label mb-2">Principes</div>
                                            {freePrinc.map(p => (
                                                <div key={p.key} className="flex justify-between items-center text-sm py-0.5">
                                                    <span style={{ color: 'var(--dune-text)' }}>
                                                        {p.maxime ? <><span style={{ color: 'var(--dune-spice)' }}>● </span>{p.label}</> : p.label}
                                                    </span>
                                                    <span className="font-bold" style={{ color: 'var(--dune-spice)' }}>{p.rang}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {(talents.length > 0 || atouts.length > 0) && (
                                        <div className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                                            {talents.length > 0 && `${talents.length} talent(s)`}
                                            {talents.length > 0 && atouts.length > 0 && ' · '}
                                            {atouts.length > 0 && `${atouts.length} atout(s)`}
                                        </div>
                                    )}
                                    {createError && (
                                        <p className="text-xs text-center px-3 py-2 rounded" style={{ background: 'var(--dune-red)', color: 'white' }}>
                                            {createError}
                                        </p>
                                    )}
                                    <button onClick={handleCreate} disabled={creating} className="dune-btn-primary w-full text-base py-3 disabled:opacity-50">
                                        {creating ? 'Création en cours…' : '✨ Créer mon personnage'}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center space-y-5 py-4">
                                    <div className="text-5xl">🏜️</div>
                                    <div className="text-2xl font-bold" style={{ color: 'var(--dune-gold)' }}>{created.nom} est né·e !</div>
                                    <div className="dune-card text-center mx-auto max-w-xs">
                                        <div className="dune-label mb-2">Votre code d'accès</div>
                                        <div className="font-mono text-4xl font-bold tracking-widest mb-3" style={{ color: 'var(--dune-gold)' }}>
                                            {created.accessCode}
                                        </div>
                                        <button onClick={copyCode} className="dune-btn-secondary text-sm">
                                            {copied ? '✅ Copié !' : '📋 Copier le code'}
                                        </button>
                                        <p className="text-xs mt-2" style={{ color: 'var(--dune-text-muted)' }}>Conservez ce code — clé d'accès permanente.</p>
                                    </div>
                                    <div className="text-xs" style={{ color: 'var(--dune-text-muted)' }}>
                                        URL : <span className="font-mono" style={{ color: 'var(--dune-sand)' }}>{created.accessUrl}</span>
                                    </div>
                                    <button onClick={() => onCreated(created)} className="dune-btn-primary w-full text-base py-3">
                                        Accéder à ma fiche →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    {step < 7 && (
                        <div className="flex gap-3 mt-8">
                            {step > 1 && <button onClick={goPrev} className="dune-btn-secondary px-6">← Retour</button>}
                            <button onClick={goNext} disabled={step === 1 && !step1Valid} className="dune-btn-primary flex-1 disabled:opacity-40">
                                {step === 6 ? 'Voir le récap →' : 'Suivant →'}
                            </button>
                        </div>
                    )}
                    {step === 7 && !created && <button onClick={goPrev} className="dune-btn-secondary w-full mt-4 text-sm">← Retour</button>}
                </div>
            </div>
        </div>
    );
};

export default Creation;