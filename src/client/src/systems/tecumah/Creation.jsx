// src/client/src/systems/tecumah/Creation.jsx
// Wizard de création de personnage — public, sans authentification.
// 6 étapes : Identité → Attributs → Compétences → Backgrounds → Freebies → Finalisation
//
// Budget de création (tout en pips, affiché en XD+Y) :
//   - Attributs  : 24 pips = 8D à répartir au-dessus du minimum (1D offert par attribut)
//   - Compétences: 21 pips = 7D à répartir (0 = non investie, peut être +1 ou +2 pips)
//   - Backgrounds: 3 pts (1 pt = 1 niveau)
//   - Freebies   : 30 pips = 10D libres — état local uniquement
//
// Granularité : ±1 pip par clic.
// Affichage   : pipsToNotation → "2D", "2D+1", "1D+2", "—" si 0, etc.

import React, { useState, useCallback } from 'react';
import './theme.css';
import { useSystem }   from '../../hooks/useSystem.js';
import {
    ATTRIBUTS, ATTRIBUT_LABELS, SKILLS, SKILLS_BY_ATTR,
    BACKGROUNDS, BACKGROUNDS_BY_ID,
    pipsToNotation,
} from './config.jsx';

// ── Constantes wizard ─────────────────────────────────────────────────────────

const ATTR_BUDGET_PIPS = 24;   // 8D en pips
const COMP_BUDGET_PIPS = 21;   // 7D en pips
const BG_BUDGET        = 3;    // niveaux
const FREEBIES_PIPS    = 30;   // 10D en pips

const ATTR_MIN_PIPS = 3;       // 1D minimum obligatoire
const ATTR_MAX_PIPS = 36;      // 12D maximum

const ptsUsedBgs = (bgs) => bgs.reduce((acc, b) => acc + (b.niveau ?? 1), 0);

const STEPS = [
    { id: 1, label: 'Identité'    },
    { id: 2, label: 'Attributs'   },
    { id: 3, label: 'Compétences' },
    { id: 4, label: 'Backgrounds' },
    { id: 5, label: 'Freebies'    },
    { id: 6, label: 'Finalisation'},
];

// ── StepBar ───────────────────────────────────────────────────────────────────

const StepBar = ({ current }) => (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
                <div className="flex flex-col items-center flex-shrink-0">
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                            background: s.id < current ? 'var(--color-success)' : s.id === current ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                            color:      s.id <= current ? '#fff' : 'var(--color-text-muted)',
                        }}
                    >
                        {s.id < current ? '✓' : s.id}
                    </div>
                    <span className="text-[8px] mt-0.5 hidden sm:block" style={{ color: s.id === current ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                        {s.label}
                    </span>
                </div>
                {i < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5" style={{ background: s.id < current ? 'var(--color-success)' : 'var(--color-border)', minWidth: 12 }} />
                )}
            </React.Fragment>
        ))}
    </div>
);

// ── Composant principal ───────────────────────────────────────────────────────

const Creation = ({ onCreated, onCancel, darkMode, onToggleDarkMode }) => {
    const { apiBase, slug } = useSystem();

    const [step, setStep] = useState(1);

    // Étape 1 — Identité
    const [identite, setIdentite] = useState({
        playerName: '', prenom: '', nom: '',
        age: '', taille: '', sexe: '', description: '',
    });

    // Étape 2 — Attributs (pips, démarrent à 1D = 3 pips)
    const [attrs, setAttrs] = useState(
        Object.fromEntries(ATTRIBUTS.map(k => [k, ATTR_MIN_PIPS]))
    );

    // Étape 3 — Compétences (pips, 0 = non investie, 1 = +1 pip, 2 = +2 pips, 3 = 1D…)
    const [comps, setComps] = useState(
        Object.fromEntries(SKILLS.map(s => [s.key, 0]))
    );

    // Étape 4 — Backgrounds
    const [backgrounds, setBackgrounds] = useState([]);
    const [newBgType,   setNewBgType]   = useState('');

    // Étape 5 — Freebies (copies locales)
    const [freebiesPips, setFreebiesPips] = useState(FREEBIES_PIPS);
    const [freeAttrs,    setFreeAttrs]    = useState({});
    const [freeComps,    setFreeComps]    = useState({});
    const [freeBgs,      setFreeBgs]      = useState([]);

    // Étape 6
    const [creating,    setCreating]    = useState(false);
    const [createError, setCreateError] = useState(null);
    const [created,     setCreated]     = useState(null);
    const [copied,      setCopied]      = useState(false);

    // ── Budgets ───────────────────────────────────────────────────────────
    // Attributs : pips dépensés au-dessus du minimum (1D offert)
    const attrPipsSpent = ATTRIBUTS.reduce((acc, k) => acc + Math.max(0, (attrs[k] ?? ATTR_MIN_PIPS) - ATTR_MIN_PIPS), 0);
    const attrPipsLeft  = ATTR_BUDGET_PIPS - attrPipsSpent;

    // Compétences : total des pips investis
    const compPipsSpent = SKILLS.reduce((acc, s) => acc + (comps[s.key] ?? 0), 0);
    const compPipsLeft  = COMP_BUDGET_PIPS - compPipsSpent;

    const bgSpent = ptsUsedBgs(backgrounds);
    const bgLeft  = BG_BUDGET - bgSpent;

    // ── Navigation ────────────────────────────────────────────────────────
    const initFreebies = useCallback(() => {
        setFreeAttrs({ ...attrs });
        setFreeComps({ ...comps });
        setFreeBgs(backgrounds.map(b => ({ ...b })));
        setFreebiesPips(FREEBIES_PIPS);
    }, [attrs, comps, backgrounds]);

    const goNext = () => { if (step === 4) initFreebies(); setStep(s => Math.min(6, s + 1)); };
    const goPrev = () => setStep(s => Math.max(1, s - 1));
    const step1Valid = identite.playerName.trim() && identite.prenom.trim();

    // ── Freebies helpers ──────────────────────────────────────────────────
    const applyFreeAttr = (key, delta) => {
        if (delta > 0 && freebiesPips <= 0) return;
        const cur = freeAttrs[key] ?? ATTR_MIN_PIPS;
        const nxt = Math.max(ATTR_MIN_PIPS, Math.min(ATTR_MAX_PIPS, cur + delta));
        if (nxt === cur) return;
        setFreeAttrs(p => ({ ...p, [key]: nxt }));
        setFreebiesPips(f => f - delta);
    };

    const applyFreeComp = (key, delta) => {
        if (delta > 0 && freebiesPips <= 0) return;
        const cur = freeComps[key] ?? 0;
        const nxt = Math.max(0, Math.min(ATTR_MAX_PIPS, cur + delta));
        if (nxt === cur) return;
        setFreeComps(p => ({ ...p, [key]: nxt }));
        setFreebiesPips(f => f - delta);
    };

    const applyFreeBg = (i, delta) => {
        if (delta > 0 && freebiesPips <= 0) return;
        const bg  = freeBgs[i];
        const def = BACKGROUNDS_BY_ID[bg.type];
        if (!def) return;
        const nxt = Math.max(1, Math.min(def.maxNiveau, (bg.niveau ?? 1) + delta));
        if (nxt === bg.niveau) return;
        setFreeBgs(p => p.map((b, idx) => idx === i ? { ...b, niveau: nxt } : b));
        // 1 niveau de background = 3 pips (1D) pour rester cohérent avec l'unité
        setFreebiesPips(f => f - delta * 3);
    };

    // ── Soumission ────────────────────────────────────────────────────────
    const handleCreate = useCallback(async () => {
        if (creating) return;
        setCreating(true); setCreateError(null);

        const finalAttrs = Object.fromEntries(ATTRIBUTS.map(k => [k, freeAttrs[k] ?? attrs[k] ?? ATTR_MIN_PIPS]));
        const finalComps = Object.fromEntries(SKILLS.map(s => [s.key, freeComps[s.key] ?? comps[s.key] ?? 0]));
        const finalBgs   = freeBgs.length ? freeBgs : backgrounds;

        try {
            const r = await fetch(`${apiBase}/characters`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName:  identite.playerName.trim(),
                    prenom:      identite.prenom.trim(),
                    nom:         identite.nom.trim(),
                    age:         identite.age     || null,
                    taille:      identite.taille  || '',
                    sexe:        identite.sexe    || '',
                    description: identite.description || '',
                    ...finalAttrs,
                    ...finalComps,
                    backgrounds: finalBgs,
                }),
            });
            if (!r.ok) { const err = await r.json(); throw new Error(err.error ?? 'Erreur lors de la création'); }
            setCreated(await r.json());
        } catch (err) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    }, [creating, identite, attrs, comps, backgrounds, freeAttrs, freeComps, freeBgs, apiBase]);

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 py-8"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            data-theme={darkMode ? 'dark' : undefined}
        >
            <div className="w-full max-w-4xl">
                <div className="text-center mb-6">
                    <h1 className="tecumah-font" style={{ fontWeight: 900, fontSize: '1.6rem', color: 'var(--color-primary)' }}>
                        Tecumah Gulch
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Création de personnage</p>
                </div>

                <div className="rounded-2xl shadow-xl" style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <div className="p-5">
                        <StepBar current={step} />

                        {/* ══ ÉTAPE 1 — Identité ══ */}
                        {step === 1 && (
                            <div className="flex flex-col gap-3">
                                <h2 className="tecumah-title-font" style={stepTitle}>Identité</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Prénom personnage *">
                                        <input type="text" value={identite.prenom} onChange={e => setIdentite(p => ({ ...p, prenom: e.target.value }))} className="w-full rounded px-2 py-1 text-sm" style={inputSt} placeholder="Billy" />
                                    </Field>
                                    <Field label="Nom / Surnom">
                                        <input type="text" value={identite.nom} onChange={e => setIdentite(p => ({ ...p, nom: e.target.value }))} className="w-full rounded px-2 py-1 text-sm" style={inputSt} placeholder="the Kid" />
                                    </Field>
                                    <Field label="Âge">
                                        <input type="number" min={1} value={identite.age} onChange={e => setIdentite(p => ({ ...p, age: e.target.value }))} className="w-full rounded px-2 py-1 text-sm" style={inputSt} />
                                    </Field>
                                    <Field label="Taille">
                                        <input type="text" value={identite.taille} onChange={e => setIdentite(p => ({ ...p, taille: e.target.value }))} className="w-full rounded px-2 py-1 text-sm" style={inputSt} placeholder="1m75" />
                                    </Field>
                                    <Field label="Sexe">
                                        <input type="text" value={identite.sexe} onChange={e => setIdentite(p => ({ ...p, sexe: e.target.value }))} className="w-full rounded px-2 py-1 text-sm" style={inputSt} />
                                    </Field>
                                    <Field label="Joueur *">
                                        <input type="text" value={identite.playerName} onChange={e => setIdentite(p => ({ ...p, playerName: e.target.value }))} className="w-full rounded px-2 py-1 text-sm" style={inputSt} placeholder="Votre prénom" />
                                    </Field>
                                </div>
                                <Field label="Description">
                                    <textarea value={identite.description} onChange={e => setIdentite(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded px-2 py-1 text-sm" style={inputSt} placeholder="Apparence, personnalité…" />
                                </Field>
                            </div>
                        )}

                        {/* ══ ÉTAPE 2 — Attributs ══ */}
                        {step === 2 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="tecumah-title-font" style={stepTitle}>Attributs</h2>
                                    <BudgetPips left={attrPipsLeft} total={ATTR_BUDGET_PIPS} />
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                    ±1 pip par clic. Chaque attribut démarre à 1D (offert). Min 1D, max 12D.
                                </p>
                                {ATTRIBUTS.map(k => {
                                    const pips = attrs[k] ?? ATTR_MIN_PIPS;
                                    return (
                                        <div key={k} className="flex items-center justify-between py-1">
                                            <span style={{ fontWeight: 600, color: 'var(--color-primary)', minWidth: 110 }}>{ATTRIBUT_LABELS[k]}</span>
                                            <PipControl
                                                pips={pips}
                                                onDec={() => setAttrs(p => ({ ...p, [k]: pips - 1 }))}
                                                onInc={() => setAttrs(p => ({ ...p, [k]: pips + 1 }))}
                                                disableDec={pips <= ATTR_MIN_PIPS}
                                                disableInc={attrPipsLeft <= 0 || pips >= ATTR_MAX_PIPS}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ══ ÉTAPE 3 — Compétences ══ */}
                        {step === 3 && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="tecumah-title-font" style={stepTitle}>Compétences</h2>
                                    <BudgetPips left={compPipsLeft} total={COMP_BUDGET_PIPS} />
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                                    ±1 pip par clic. 0 = non investie. +1 pip = bonus sans dé entier.
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {ATTRIBUTS.map(attrKey => (
                                        <div key={attrKey} className="border-2 p-1" style={{"border-color": 'var(--color-border'}}>
                                            <p className="border-b-1" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>
                                                {ATTRIBUT_LABELS[attrKey]} <span style={{fontSize: '0.95rem', color: 'var(--color-secondary'}}>{pipsToNotation(attrs[attrKey])}</span>
                                            </p>
                                            {(SKILLS_BY_ATTR[attrKey] ?? []).map(skill => {
                                                const pips = comps[skill.key] ?? 0;
                                                return (
                                                    <div key={skill.key} className="flex items-center justify-between py-0.5">
                                                    <span style={{ fontSize: '0.85rem', color: pips > 0 ? 'var(--color-text)' : 'var(--color-text-muted)', flex: 1 }}>
                                                        {skill.label}
                                                    </span>
                                                        <PipControl
                                                            pips={pips}
                                                            small
                                                            showDash
                                                            onDec={() => setComps(p => ({ ...p, [skill.key]: pips - 1 }))}
                                                            onInc={() => setComps(p => ({ ...p, [skill.key]: pips + 1 }))}
                                                            disableDec={pips <= 0}
                                                            disableInc={compPipsLeft <= 0}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ══ ÉTAPE 4 — Backgrounds ══ */}
                        {step === 4 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="tecumah-title-font" style={stepTitle}>Backgrounds</h2>
                                    <Budget left={bgLeft} total={BG_BUDGET} />
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                    1 pt = 1 niveau. Cliquez sur un background pour l'ajouter.
                                </p>

                                <div className="flex flex-col gap-2">
                                    {BACKGROUNDS.map(def => {
                                        const existing = backgrounds.find(b => b.type === def.id);
                                        const niveau   = existing?.niveau ?? 0;
                                        const added    = !!existing;
                                        const effect   = added ? (def.effects[niveau - 1] ?? '') : def.effects[0];

                                        return (
                                            <div
                                                key={def.id}
                                                className="rounded-lg p-3"
                                                style={{
                                                    background: added ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                                                    border:     `1.5px solid ${added ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                                    transition: 'border-color 0.15s',
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    {/* Infos */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                                                                {def.name}
                                                            </span>
                                                            {added && (
                                                                <span
                                                                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                                                                    style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                                                                >
                                                                    Niv. {niveau}
                                                                </span>
                                                            )}
                                                            {def.note && (
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>
                                                                    {def.note}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p style={{color: 'var(--color-secondary)', fontSize: '0.9rem'}}>
                                                            {def.description}
                                                        </p>
                                                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                            {added ? `Niv. ${niveau} : ${effect}` : `Niv. 1 : ${effect}`}
                                                        </p>
                                                    </div>

                                                    {/* Contrôles */}
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {!added ? (
                                                            /* Ajouter */
                                                            <button
                                                                onClick={() => {
                                                                    if (bgLeft <= 0) return;
                                                                    setBackgrounds(p => [...p, { type: def.id, niveau: 1, notes: '' }]);
                                                                }}
                                                                disabled={bgLeft <= 0}
                                                                className="px-2 py-1 rounded text-xs font-semibold"
                                                                style={{
                                                                    background: bgLeft > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                                                                    color:      'var(--color-bg)',
                                                                    opacity:    bgLeft <= 0 ? 0.4 : 1,
                                                                }}
                                                            >
                                                                + Ajouter
                                                            </button>
                                                        ) : (
                                                            /* Niveau +/− + retirer */
                                                            <>
                                                                <Btn small
                                                                     onClick={() => {
                                                                         if (niveau <= 1) {
                                                                             setBackgrounds(p => p.filter(b => b.type !== def.id));
                                                                         } else {
                                                                             setBackgrounds(p => p.map(b => b.type === def.id ? { ...b, niveau: b.niveau - 1 } : b));
                                                                         }
                                                                     }}
                                                                >
                                                                    −
                                                                </Btn>
                                                                <Btn small
                                                                     onClick={() => setBackgrounds(p => p.map(b => b.type === def.id ? { ...b, niveau: b.niveau + 1 } : b))}
                                                                     disabled={bgLeft <= 0 || niveau >= def.maxNiveau}
                                                                >
                                                                    +
                                                                </Btn>
                                                                <button
                                                                    onClick={() => setBackgrounds(p => p.filter(b => b.type !== def.id))}
                                                                    style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginLeft: 4 }}
                                                                    title="Retirer"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Niveaux disponibles (dépliés quand ajouté) */}
                                                {added && def.effects.length > 1 && (
                                                    <div className="mt-2 flex flex-col gap-0.5">
                                                        {def.effects.map((eff, i) => (
                                                            <p
                                                                key={i}
                                                                style={{
                                                                    fontSize:   '0.72rem',
                                                                    color:      i + 1 === niveau ? 'var(--color-text)' : 'var(--color-text-muted)',
                                                                    fontWeight: i + 1 === niveau ? 600 : 400,
                                                                    paddingLeft: 8,
                                                                    borderLeft: `2px solid ${i + 1 === niveau ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                                                }}
                                                            >
                                                                Niv. {i + 1} : {eff}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ══ ÉTAPE 5 — Freebies ══ */}
                        {step === 5 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="tecumah-title-font" style={stepTitle}>Points libres</h2>
                                    <BudgetPips left={freebiesPips} total={FREEBIES_PIPS} />
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                    ±1 pip par clic sur attributs et compétences. ±1 niveau sur backgrounds (coûte 3 pips).
                                </p>

                                <details open>
                                    <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.85rem', marginBottom: 6 }}>Attributs</summary>
                                    {ATTRIBUTS.map(k => {
                                        const pips = freeAttrs[k] ?? attrs[k] ?? ATTR_MIN_PIPS;
                                        return (
                                            <div key={k} className="flex items-center justify-between py-0.5">
                                                <span style={{ fontSize: '0.85rem', flex: 1 }}>{ATTRIBUT_LABELS[k]}</span>
                                                <PipControl
                                                    pips={pips}
                                                    small
                                                    onDec={() => applyFreeAttr(k, -1)}
                                                    onInc={() => applyFreeAttr(k, +1)}
                                                    disableDec={pips <= ATTR_MIN_PIPS}
                                                    disableInc={freebiesPips <= 0 || pips >= ATTR_MAX_PIPS}
                                                />
                                            </div>
                                        );
                                    })}
                                </details>

                                <details>
                                    <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.85rem', marginBottom: 6 }}>Compétences</summary>

                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-3 gap-3">
                                            {ATTRIBUTS.map(attrKey => {
                                                const attribute = (freeAttrs[attrKey] !== undefined ? freeAttrs[attrKey] : attrs[attrKey]);
                                                return (
                                                <div key={attrKey} className="border-2 p-1" style={{"border-color": 'var(--color-border'}}>
                                                    <p className="border-b-1" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>
                                                        {ATTRIBUT_LABELS[attrKey]} <span style={{fontSize: '0.95rem', color: 'var(--color-secondary'}}>{pipsToNotation(attribute)}</span>
                                                    </p>
                                                    {(SKILLS_BY_ATTR[attrKey] ?? []).map(skill => {
                                                        const pips = freeComps[skill.key] ?? comps[skill.key] ?? 0;
                                                        return (
                                                            <div key={skill.key} className="flex items-center justify-between py-0.5">
                                                                <span style={{ fontSize: '0.85rem', color: pips > 0 ? 'var(--color-text)' : 'var(--color-text-muted)', flex: 1 }}>
                                                                    {skill.label}
                                                                </span>
                                                                <PipControl
                                                                    pips={pips}
                                                                    small
                                                                    showDash
                                                                    onDec={() => applyFreeComp(skill.key, -1)}
                                                                    onInc={() => applyFreeComp(skill.key, +1)}
                                                                    disableDec={pips <= 0}
                                                                    disableInc={freebiesPips <= 0}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                            })}
                                        </div>
                                    </div>
                                </details>

                                {/* Section Backgrounds — freebies (step 5)
                                    Affiche TOUS les backgrounds :
                                    - Déjà sélectionnés (step 4) → contrôles +/− niveau, coût 3 pips/niveau
                                    - Non sélectionnés           → bouton "Ajouter" (coût 3 pips, démarre à Niv. 1)
                                    1 niveau = 3 pips dans tous les cas (cohérence avec l'unité pip).
                                */}
                                <details>
                                    <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.85rem', marginBottom: 8 }}>
                                        Backgrounds <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>(−3 pips / niveau)</span>
                                    </summary>

                                    <div className="flex flex-col gap-2 mt-2">
                                        {BACKGROUNDS.map(def => {
                                            const existing = freeBgs.find(b => b.type === def.id);
                                            const niveau   = existing?.niveau ?? 0;
                                            const added    = !!existing;
                                            const atMax    = niveau >= def.maxNiveau;
                                            const effect   = added
                                                ? (def.effects[niveau - 1] ?? '')
                                                : def.effects[0]; // aperçu niveau 1 si pas encore ajouté

                                            return (
                                                <div
                                                    key={def.id}
                                                    className="rounded-lg p-3"
                                                    style={{
                                                        background: added ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                                                        border:     `1.5px solid ${added ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                                                                    {def.name}
                                                                </span>
                                                                {added && (
                                                                    <span
                                                                        className="px-1.5 py-0.5 rounded text-xs font-bold"
                                                                        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                                                                    >
                                                                        Niv. {niveau}
                                                                    </span>
                                                                )}
                                                                {atMax && added && (
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>max</span>
                                                                )}
                                                                {def.note && (
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>
                                                                        {def.note}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p style={{color: 'var(--color-secondary)', fontSize: '0.9rem'}}>
                                                                {def.description}
                                                            </p>
                                                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                                {added ? `Niv. ${niveau} : ${effect}` : `Niv. 1 : ${effect}`}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            {!added ? (
                                                                /* Pas encore dans les freebies → Ajouter à Niv. 1 */
                                                                <button
                                                                    onClick={() => {
                                                                        if (freebiesPips < 3) return;
                                                                        setFreeBgs(p => [...p, { type: def.id, niveau: 1, notes: '' }]);
                                                                        setFreebiesPips(f => f - 3);
                                                                    }}
                                                                    disabled={freebiesPips < 3}
                                                                    className="px-2 py-1 rounded text-xs font-semibold"
                                                                    style={{
                                                                        background: freebiesPips >= 3 ? 'var(--color-accent)' : 'var(--color-border)',
                                                                        color:      'var(--color-bg)',
                                                                        opacity:    freebiesPips < 3 ? 0.4 : 1,
                                                                    }}
                                                                >
                                                                    + Ajouter
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <Btn small
                                                                         onClick={() => {
                                                                             if (niveau <= 1) {
                                                                                 // Retrait complet — rembourse 3 pips
                                                                                 setFreeBgs(p => p.filter(b => b.type !== def.id));
                                                                                 setFreebiesPips(f => f + 3);
                                                                             } else {
                                                                                 setFreeBgs(p => p.map(b => b.type === def.id ? { ...b, niveau: b.niveau - 1 } : b));
                                                                                 setFreebiesPips(f => f + 3);
                                                                             }
                                                                         }}
                                                                    >−</Btn>
                                                                    <Btn small
                                                                         onClick={() => {
                                                                             if (freebiesPips < 3 || atMax) return;
                                                                             setFreeBgs(p => p.map(b => b.type === def.id ? { ...b, niveau: b.niveau + 1 } : b));
                                                                             setFreebiesPips(f => f - 3);
                                                                         }}
                                                                         disabled={freebiesPips < 3 || atMax}
                                                                    >+</Btn>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Tous les niveaux avec le courant mis en évidence (si ajouté) */}
                                                    {added && def.effects.length > 1 && (
                                                        <div className="mt-2 flex flex-col gap-0.5">
                                                            {def.effects.map((eff, j) => (
                                                                <p
                                                                    key={j}
                                                                    style={{
                                                                        fontSize:    '0.72rem',
                                                                        color:       j + 1 === niveau ? 'var(--color-text)' : 'var(--color-text-muted)',
                                                                        fontWeight:  j + 1 === niveau ? 600 : 400,
                                                                        paddingLeft: 8,
                                                                        borderLeft:  `2px solid ${j + 1 === niveau ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                                                    }}
                                                                >
                                                                    Niv. {j + 1} : {eff}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </details>
                            </div>
                        )}

                        {/* ══ ÉTAPE 6 — Finalisation ══ */}
                        {step === 6 && (
                            <div className="flex flex-col gap-4">
                                <h2 className="tecumah-title-font" style={stepTitle}>Finalisation</h2>
                                {!created ? (
                                    <>
                                        <div className="rounded-lg p-3 text-sm flex flex-col gap-1" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                                            <p><strong>{identite.prenom} {identite.nom}</strong> — {identite.playerName}</p>
                                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                Attributs : {ATTRIBUTS.map(k => `${ATTRIBUT_LABELS[k]} ${pipsToNotation(freeAttrs[k] ?? attrs[k] ?? ATTR_MIN_PIPS)}`).join(' · ')}
                                            </p>
                                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                Compétences : {SKILLS.filter(s => (freeComps[s.key] ?? comps[s.key] ?? 0) > 0).map(s => `${s.label} ${pipsToNotation(freeComps[s.key] ?? comps[s.key])}`).join(', ') || 'Aucune'}
                                            </p>
                                            {(freeBgs.length || backgrounds.length) > 0 && (
                                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                    Backgrounds : {(freeBgs.length ? freeBgs : backgrounds).map(b => `${BACKGROUNDS_BY_ID[b.type]?.name} Niv.${b.niveau}`).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        {createError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>⚠️ {createError}</p>}
                                        <button onClick={handleCreate} disabled={creating} className="w-full py-3 rounded font-semibold" style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', opacity: creating ? 0.6 : 1 }}>
                                            {creating ? 'Création en cours…' : '✨ Créer mon personnage'}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center flex flex-col gap-4 py-4">
                                        <div style={{ fontSize: '3rem' }}>🤠</div>
                                        <h3 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--color-primary)' }}>
                                            {created.prenom} {created.nom} est né·e !
                                        </h3>
                                        <div className="rounded-xl p-4 mx-auto max-w-xs" style={{ background: 'var(--color-surface-alt)', border: '2px solid var(--color-accent)' }}>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>Votre code d'accès</p>
                                            <p className="font-mono text-4xl font-bold tracking-widest" style={{ color: 'var(--color-accent)' }}>{created.accessCode}</p>
                                            <button onClick={() => { navigator.clipboard.writeText(created.accessCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="mt-3 px-4 py-1 rounded text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                                                {copied ? '✅ Copié !' : '📋 Copier'}
                                            </button>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 8 }}>Conservez ce code — c'est votre clé d'accès permanente.</p>
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                            URL : <span className="font-mono">{created.accessUrl}</span>
                                        </p>
                                        <button onClick={() => onCreated(created)} className="w-full py-3 rounded font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                                            Accéder à ma fiche →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Navigation ── */}
                        {step < 6 && (
                            <div className="flex gap-3 mt-6">
                                {step > 1 && (
                                    <button onClick={goPrev} className="px-5 py-2 rounded text-sm" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                        ← Retour
                                    </button>
                                )}
                                <button
                                    onClick={goNext}
                                    disabled={step === 1 && !step1Valid}
                                    className="flex-1 py-2 rounded text-sm font-semibold"
                                    style={{
                                        background: step === 1 && !step1Valid ? 'var(--color-border)' : 'var(--color-primary)',
                                        color:      step === 1 && !step1Valid ? 'var(--color-text-muted)' : '#fff',
                                    }}
                                >
                                    {step === 5 ? 'Voir le récap →' : 'Suivant →'}
                                </button>
                            </div>
                        )}
                        {step === 6 && !created && (
                            <button onClick={goPrev} className="w-full mt-3 py-2 rounded text-sm" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}>
                                ← Retour
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Creation;

// ── Sous-composants internes ──────────────────────────────────────────────────

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1">
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</span>
        {children}
    </label>
);

// Affiche le budget restant en notation XD+Y
const BudgetPips = ({ left, total }) => (
    <span
        className="px-3 py-1 rounded-full text-xs font-bold"
        style={{
            background: left === 0 ? 'var(--color-success)' : left < 0 ? 'var(--color-danger)' : 'var(--color-accent)',
            color: '#fff',
        }}
    >
        {left > 0 ? pipsToNotation(left) : left === 0 ? '0' : `−${pipsToNotation(-left)}`} / {pipsToNotation(total)}
    </span>
);

// Budget en niveaux (backgrounds)
const Budget = ({ left, total }) => (
    <span
        className="px-3 py-1 rounded-full text-xs font-bold"
        style={{
            background: left === 0 ? 'var(--color-success)' : left < 0 ? 'var(--color-danger)' : 'var(--color-accent)',
            color: '#fff',
        }}
    >
        {left} / {total} pts
    </span>
);

// Contrôle pip avec affichage XD+Y (ou — si 0 et showDash)
const PipControl = ({ pips, onDec, onInc, disableDec, disableInc, small, showDash }) => (
    <div className="flex items-center gap-1">
        <Btn small={small} onClick={onDec} disabled={disableDec}>−</Btn>
        <span style={{ fontWeight: 700, minWidth: small ? 30 : 36, textAlign: 'center', fontSize: small ? '0.8rem' : '0.9rem' }}>
            {showDash && pips === 0 ? '—' : pipsToNotation(pips)}
        </span>
        <Btn small={small} onClick={onInc} disabled={disableInc}>+</Btn>
    </div>
);

const Btn = ({ onClick, disabled, children, small }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`${small ? 'w-6 h-6 text-xs' : 'w-7 h-7'} rounded flex items-center justify-center`}
        style={{
            background: 'var(--color-surface)',
            border:     '1px solid var(--color-border)',
            color:      'var(--color-text)',
            cursor:     'pointer',
            opacity:    disabled ? 0.3 : 1,
        }}
    >
        {children}
    </button>
);

const stepTitle = { fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem', marginBottom: 8 };
const inputSt   = { background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' };