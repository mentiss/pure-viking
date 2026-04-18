// src/client/src/systems/deltagreen/Creation.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard de création de personnage Delta Green — 5 étapes :
//   1. Statistiques (tirage 4D6 ou répartition 72 pts)
//   2. Attributs dérivés (calculés, lecture seule)
//   3. Profession & Compétences
//   4. Attaches (Bonds)
//   5. Détails finaux + récapitulatif
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { useNavigate }   from 'react-router-dom';
import { useSystem }     from '../../hooks/useSystem.js';
import { BASE_SKILLS, PROFESSIONS, SKILL_BY_KEY } from './config.jsx';
import './theme.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const roll4d6DropLowest = () => {
    const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    dice.sort((a, b) => a - b);
    return dice.slice(1).reduce((a, b) => a + b, 0); // somme des 3 plus hauts
};

const calcDerived = (stats) => ({
    hpMax:      Math.ceil((stats.str + stats.con) / 2),
    hpCurrent:  Math.ceil((stats.str + stats.con) / 2),
    wpMax:      stats.pow,
    wpCurrent:  stats.pow,
    sanMax:     stats.pow * 5,
    sanCurrent: stats.pow * 5,
    sr:         stats.pow * 5 - stats.pow,
});

const CARACS = ['str', 'con', 'dex', 'int', 'pow', 'cha'];
const CARAC_LABELS = { str: 'FOR', con: 'CON', dex: 'DEX', int: 'INT', pow: 'POU', cha: 'CHA' };
const TOTAL_POINTS = 72;
const MIN_STAT = 3;
const MAX_STAT = 18;

// ── Étape 1 — Statistiques ────────────────────────────────────────────────────

const StepStats = ({ stats, setStats, onNext }) => {
    const [mode, setMode] = useState('repartition'); // 'tirage' | 'repartition'
    const [pool, setPool] = useState([]); // résultats de tirage non placés

    const spent = CARACS.reduce((sum, k) => sum + (stats[k] - MIN_STAT), 0);
    const remaining = TOTAL_POINTS - CARACS.reduce((sum, k) => sum + stats[k], 0) + MIN_STAT * 6;

    const rollAll = () => {
        const rolled = CARACS.map(() => roll4d6DropLowest());
        setPool(rolled);
        // Auto-assigne dans l'ordre
        const next = {};
        CARACS.forEach((k, i) => { next[k] = rolled[i]; });
        setStats(next);
    };

    const canAdvance = CARACS.every(k => stats[k] >= MIN_STAT && stats[k] <= MAX_STAT);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="dg-section-label text-base mb-1 border-b border-default pb-1">
                    ÉTAPE 1 — STATISTIQUES
                </h2>
                <p className="text-xs text-muted font-mono">
                    Chaque statistique représente une capacité fondamentale de votre agent.
                </p>
            </div>

            {/* Sélection de mode */}
            <div className="flex gap-2">
                <button
                    onClick={() => setMode('tirage')}
                    className={['px-4 py-1.5 text-xs font-mono border transition-colors uppercase tracking-wider',
                        mode === 'tirage' ? 'border-accent text-accent bg-accent/10' : 'border-default text-muted hover:border-default'
                    ].join(' ')}
                >
                    Tirage (4D6)
                </button>
                <button
                    onClick={() => setMode('repartition')}
                    className={['px-4 py-1.5 text-xs font-mono border transition-colors uppercase tracking-wider',
                        mode === 'repartition' ? 'border-accent text-accent bg-accent/10' : 'border-default text-muted hover:border-default'
                    ].join(' ')}
                >
                    Répartition (72 pts)
                </button>
            </div>

            {mode === 'repartition' && (
                <p className="text-xs font-mono text-muted">
                    Points restants : <span className={remaining < 0 ? 'text-danger font-bold' : 'font-bold'}>{remaining}</span>
                    {' '}/ {TOTAL_POINTS} — min {MIN_STAT}, max {MAX_STAT} par stat
                </p>
            )}

            {mode === 'tirage' && (
                <button
                    onClick={rollAll}
                    className="px-4 py-2 border border-accent text-accent text-xs font-mono uppercase tracking-wider hover:bg-accent/10"
                >
                    Lancer 4D6 × 6
                </button>
            )}

            {/* Grille des stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {CARACS.map(k => (
                    <div key={k} className="border border-default bg-surface p-3">
                        <p className="dg-section-label mb-2">{CARAC_LABELS[k]}</p>
                        <div className="flex items-center gap-2">
                            {mode === 'repartition' ? (
                                <>
                                    <button
                                        onClick={() => setStats(p => ({ ...p, [k]: Math.max(MIN_STAT, p[k] - 1) }))}
                                        className="w-7 h-7 border border-default text-muted hover:text-danger hover:border-danger font-bold"
                                    >−</button>
                                    <span className="font-mono text-xl font-black w-10 text-center">{stats[k]}</span>
                                    <button
                                        onClick={() => setStats(p => ({ ...p, [k]: Math.min(MAX_STAT, p[k] + 1) }))}
                                        disabled={remaining <= 0}
                                        className="w-7 h-7 border border-default text-muted hover:text-success hover:border-success font-bold disabled:opacity-30"
                                    >+</button>
                                </>
                            ) : (
                                <input
                                    type="number" min={MIN_STAT} max={MAX_STAT}
                                    className="dg-field-input w-16 text-center font-mono text-xl font-black px-1"
                                    value={stats[k]}
                                    onChange={e => setStats(p => ({ ...p, [k]: Math.min(MAX_STAT, Math.max(MIN_STAT, Number(e.target.value))) }))}
                                />
                            )}
                            <span className="text-xs text-muted font-mono">×5 = {stats[k] * 5}%</span>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={onNext}
                disabled={!canAdvance || (mode === 'repartition' && remaining !== 0)}
                className="px-6 py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider disabled:opacity-40 hover:opacity-90"
            >
                Suivant →
            </button>
        </div>
    );
};

// ── Étape 2 — Attributs dérivés ───────────────────────────────────────────────

const StepDerived = ({ stats, onNext, onBack }) => {
    const d = calcDerived(stats);
    return (
        <div className="space-y-6">
            <h2 className="dg-section-label text-base border-b border-default pb-1">
                ÉTAPE 2 — ATTRIBUTS DÉRIVÉS
            </h2>
            <p className="text-xs text-muted font-mono">Calculés automatiquement depuis vos statistiques.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'PV max',  value: d.hpMax,      formula: `⌈(FOR ${stats.str} + CON ${stats.con}) / 2⌉` },
                    { label: 'VOL max', value: d.wpMax,      formula: `POU ${stats.pow}` },
                    { label: 'SAN',     value: d.sanCurrent, formula: `POU ${stats.pow} × 5` },
                    { label: 'SR',      value: d.sr,         formula: `SAN ${d.sanCurrent} − POU ${stats.pow}` },
                ].map(item => (
                    <div key={item.label} className="border border-default bg-surface p-3 text-center">
                        <p className="dg-section-label mb-1">{item.label}</p>
                        <p className="font-mono text-3xl font-black">{item.value}</p>
                        <p className="text-xs text-muted font-mono mt-1">{item.formula}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button onClick={onBack} className="px-4 py-2 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default">← Retour</button>
                <button onClick={onNext} className="px-6 py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider hover:opacity-90">Suivant →</button>
            </div>
        </div>
    );
};

// ── Étape 3 — Profession & Compétences ───────────────────────────────────────

const StepProfession = ({ stats, profession, setProfession, skills, setSkills, onNext, onBack }) => {
    const [selectedProf, setSelectedProf] = useState(profession?.key ?? null);
    const [choices, setChoices] = useState({}); // { blockIndex: [skillKeys] }

    const prof = PROFESSIONS.find(p => p.key === selectedProf);

    const handleSelectProfession = (key) => {
        setSelectedProf(key);
        setChoices({});
        const p = PROFESSIONS.find(x => x.key === key);
        if (!p) return;

        // Initialise les compétences avec les valeurs de base
        const baseSkillsMap = {};
        BASE_SKILLS.forEach(s => { baseSkillsMap[s.key] = s.base; });

        // Applique les compétences fixées de la profession
        (p.skills ?? []).forEach(s => {
            baseSkillsMap[s.key] = Math.max(baseSkillsMap[s.key] ?? 0, s.score);
        });

        setProfession(p);
        setSkills(BASE_SKILLS.map(s => ({
            skillKey:    s.key,
            specialty:   null,
            score:       baseSkillsMap[s.key] ?? s.base,
            failedCheck: false,
        })));
    };

    const toggleChoice = (blockIdx, option) => {
        const block = prof?.choices?.[blockIdx];
        if (!block) return;
        const current = choices[blockIdx] ?? [];
        const exists  = current.includes(option.key);
        if (exists) {
            setChoices(c => ({ ...c, [blockIdx]: current.filter(k => k !== option.key) }));
            // Retire le bonus
            setSkills(prev => prev.map(s => s.skillKey === option.key
                ? { ...s, score: Math.max(SKILL_BY_KEY[option.key]?.base ?? 0, s.score - option.score) }
                : s
            ));
        } else if (current.length < block.pick) {
            setChoices(c => ({ ...c, [blockIdx]: [...current, option.key] }));
            // Applique le bonus
            setSkills(prev => prev.map(s => s.skillKey === option.key
                ? { ...s, score: Math.max(s.score, option.score) }
                : s
            ));
        }
    };

    const canAdvance = !!selectedProf && prof?.choices?.every((block, i) =>
        (choices[i] ?? []).length === block.pick
    );

    return (
        <div className="space-y-6">
            <h2 className="dg-section-label text-base border-b border-default pb-1">
                ÉTAPE 3 — PROFESSION & COMPÉTENCES
            </h2>

            {/* Liste professions */}
            <div>
                <p className="text-xs text-muted font-mono mb-2">Choisissez votre profession</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PROFESSIONS.map(p => (
                        <button
                            key={p.key}
                            onClick={() => handleSelectProfession(p.key)}
                            className={[
                                'text-left px-3 py-2 border text-xs font-mono transition-colors',
                                selectedProf === p.key
                                    ? 'border-accent text-default bg-accent/10'
                                    : 'border-default text-muted hover:border-default hover:text-default',
                            ].join(' ')}
                        >
                            <span className="font-bold">{p.label}</span>
                            <br />
                            <span className="text-muted">{p.bondsCount} attaches · {p.recommended?.map(k => CARAC_LABELS[k]).join(', ')}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Choix optionnels */}
            {prof?.choices?.map((block, i) => (
                <div key={i} className="border border-default p-3 bg-surface">
                    <p className="dg-section-label mb-2">
                        Choisissez {block.pick} compétence{block.pick > 1 ? 's' : ''} parmi
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {block.options.map(opt => {
                            const selected = (choices[i] ?? []).includes(opt.key);
                            const full     = !selected && (choices[i] ?? []).length >= block.pick;
                            return (
                                <button
                                    key={opt.key}
                                    onClick={() => toggleChoice(i, opt)}
                                    disabled={full}
                                    className={[
                                        'text-xs font-mono border px-2 py-1 transition-colors',
                                        selected ? 'border-accent text-accent bg-accent/10'
                                            : full ? 'border-default/20 text-muted/40 cursor-not-allowed'
                                                : 'border-default text-muted hover:border-default',
                                    ].join(' ')}
                                >
                                    {SKILL_BY_KEY[opt.key]?.label ?? opt.key} {opt.score}%
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="flex gap-2">
                <button onClick={onBack} className="px-4 py-2 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default">← Retour</button>
                <button onClick={onNext} disabled={!canAdvance}
                        className="px-6 py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider disabled:opacity-40 hover:opacity-90">
                    Suivant →
                </button>
            </div>
        </div>
    );
};

// ── Étape 4 — Attaches ────────────────────────────────────────────────────────

const StepBonds = ({ stats, profession, bonds, setBonds, onNext, onBack }) => {
    const count = profession?.bondsCount ?? 3;

    // Initialise les bonds si nécessaire
    const ensured = Array.from({ length: count }, (_, i) => bonds[i] ?? { name: '', score: stats.cha ?? 10, isDamaged: false, position: i });

    const update = (i, value) => {
        const next = [...ensured];
        next[i] = { ...next[i], name: value };
        setBonds(next);
    };

    const canAdvance = ensured.every(b => b.name.trim().length > 0);

    return (
        <div className="space-y-6">
            <h2 className="dg-section-label text-base border-b border-default pb-1">
                ÉTAPE 4 — ATTACHES ({count} requises)
            </h2>
            <p className="text-xs text-muted font-mono">
                Valeur initiale = CHA ({stats.cha ?? 10}). Nommez chaque personne qui compte pour votre agent.
            </p>

            <div className="space-y-3">
                {ensured.map((bond, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted font-mono w-4">{i + 1}.</span>
                        <input
                            className="dg-field-input flex-1 px-3 py-1.5 text-sm"
                            value={bond.name}
                            onChange={e => update(i, e.target.value)}
                            placeholder={`Attache ${i + 1} — nom ou description…`}
                        />
                        <span className="font-mono text-sm font-bold text-muted w-8 text-right">{bond.score}</span>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button onClick={onBack} className="px-4 py-2 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default">← Retour</button>
                <button onClick={() => { setBonds(ensured); onNext(); }} disabled={!canAdvance}
                        className="px-6 py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider disabled:opacity-40 hover:opacity-90">
                    Suivant →
                </button>
            </div>
        </div>
    );
};

// ── Étape 5 — Détails finaux ──────────────────────────────────────────────────

const StepDetails = ({ stats, profession, skills, bonds, details, setDetails, onSubmit, onBack, submitting }) => {
    const d = calcDerived(stats);

    return (
        <div className="space-y-6">
            <h2 className="dg-section-label text-base border-b border-default pb-1">
                ÉTAPE 5 — DÉTAILS FINAUX
            </h2>

            <div className="grid grid-cols-2 gap-4">
                {[
                    { key: 'playerName',  label: 'Nom du joueur',         placeholder: 'Votre nom' },
                    { key: 'nom',         label: "Nom de l'agent",         placeholder: 'Nom de famille' },
                    { key: 'prenom',      label: 'Prénom',                 placeholder: 'Prénom' },
                    { key: 'alias',       label: 'Alias / Nom de code',    placeholder: 'CODENAME' },
                    { key: 'sexe',        label: 'Genre',                  placeholder: 'F / M / …' },
                    { key: 'age',         label: 'Âge',                    placeholder: '35', type: 'number' },
                    { key: 'nationality', label: 'Nationalité',            placeholder: 'Américain(e)' },
                    { key: 'employer',    label: 'Employeur',              placeholder: 'FBI, CIA, …' },
                ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                        <p className="dg-section-label mb-1">{label}</p>
                        <input
                            type={type ?? 'text'}
                            className="dg-field-input w-full px-2 py-1 text-sm"
                            value={details[key] ?? ''}
                            placeholder={placeholder}
                            onChange={e => setDetails(p => ({ ...p, [key]: e.target.value }))}
                        />
                    </div>
                ))}
            </div>

            <div>
                <p className="dg-section-label mb-1">Description physique</p>
                <textarea
                    className="dg-field-input w-full px-2 py-1 text-sm min-h-[4rem] resize-y"
                    value={details.physicalDescription ?? ''}
                    placeholder="Apparence physique de l'agent…"
                    onChange={e => setDetails(p => ({ ...p, physicalDescription: e.target.value }))}
                />
            </div>

            {/* Récapitulatif */}
            <div className="border border-default bg-surface p-4 space-y-2">
                <p className="dg-section-label mb-2">Récapitulatif</p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    {CARACS.map(k => (
                        <span key={k}>{CARAC_LABELS[k]} {stats[k]} ({stats[k] * 5}%)</span>
                    ))}
                </div>
                <p className="text-xs font-mono text-muted mt-2">
                    PV {d.hpMax} · VOL {d.wpMax} · SAN {d.sanCurrent} · SR {d.sr}
                </p>
                <p className="text-xs font-mono">Profession : {profession?.label ?? '—'}</p>
                <p className="text-xs font-mono">Attaches : {bonds.map(b => b.name).join(', ')}</p>
            </div>

            <div className="flex gap-2">
                <button onClick={onBack} className="px-4 py-2 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default">← Retour</button>
                <button
                    onClick={onSubmit}
                    disabled={submitting || !details.playerName || !details.nom}
                    className="px-6 py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider disabled:opacity-40 hover:opacity-90"
                >
                    {submitting ? 'Création en cours…' : 'Créer l\'agent'}
                </button>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// Composant principal
// ══════════════════════════════════════════════════════════════════════════════

const Creation = ({ darkMode, onToggleDarkMode }) => {
    const { apiBase, slug } = useSystem();
    const navigate          = useNavigate();

    const [step,       setStep]       = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState('');
    const [accessCode, setAccessCode] = useState(null);

    // Données du wizard
    const [stats,      setStats]      = useState({ str: 10, con: 10, dex: 10, int: 10, pow: 10, cha: 10 });
    const [profession, setProfession] = useState(null);
    const [skills,     setSkills]     = useState([]);
    const [bonds,      setBonds]      = useState([]);
    const [details,    setDetails]    = useState({});

    const derived = calcDerived(stats);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                ...details,
                ...stats,
                ...derived,
                profession: profession?.label ?? '',
                skills,
                bonds:       bonds.map((b, i) => ({ ...b, position: i })),
                motivations: [],
                languages:   [],
            };

            const res = await fetch(`${apiBase}/characters`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? 'Erreur de création');
            }

            const char = await res.json();
            setAccessCode(char.accessCode);
            // Ne pas naviguer immédiatement — afficher le code d'accès d'abord
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Affichage du code d'accès après création ──────────────────────────────

    if (accessCode) {
        return (
            <div className="min-h-screen bg-default text-default flex items-center justify-center p-4"
                 data-theme={darkMode ? 'dark' : 'light'}>
                <div className="max-w-md w-full border border-default bg-surface p-8 text-center space-y-4"
                     style={{ fontFamily: 'var(--dg-font-body)' }}>
                    <div className="dg-header py-4 px-6 mb-6">
                        <h1 className="text-white font-black uppercase tracking-widest dg-font-delta">DELTA GREEN</h1>
                        <p className="text-gray-400 text-xs font-mono mt-1">AGENT ENREGISTRÉ</p>
                    </div>

                    <p className="text-xs text-muted font-mono">Conservez ce code — il est votre accès à votre fiche.</p>

                    <div className="border border-accent p-4 bg-accent/5">
                        <p className="dg-section-label mb-1">CODE D'ACCÈS</p>
                        <p className="font-mono text-3xl font-black tracking-widest">{accessCode}</p>
                    </div>

                    <p className="text-xs text-muted font-mono italic">
                        Ne partagez pas ce code. Il vous identifie comme Agent Delta Green.
                    </p>

                    <button
                        onClick={() => navigate(`/${slug}/`)}
                        className="w-full py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider hover:opacity-90 mt-4"
                    >
                        Accéder à ma fiche
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-default text-default" data-theme={darkMode ? 'dark' : 'light'}
             style={{ fontFamily: 'var(--dg-font-body)' }}>

            {/* En-tête */}
            <header className="dg-header px-6 py-3 flex items-center justify-between">
                <div className="dg-font-admin font-black uppercase tracking-widest text-white">
                    <h1 className="dg-font-delta text-3xl">
                        DELTA GREEN
                    </h1>
                    <p className="text-sm text-center">RECRUTEMENT</p>
                </div>

                <button onClick={onToggleDarkMode} className="text-gray-400 hover:text-white text-xs font-mono px-2 py-1 border border-gray-700">
                    {darkMode ? '◑' : '○'}
                </button>
            </header>

            {/* Indicateur d'étapes */}
            <div className="flex border-b border-default bg-surface">
                {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} className={[
                        'flex-1 py-2 text-center text-xs font-mono border-b-2 transition-colors',
                        step === n ? 'border-danger text-default' : step > n ? 'border-success/50 text-muted' : 'border-transparent text-muted/40',
                    ].join(' ')}>
                        {n}
                    </div>
                ))}
            </div>

            {/* Contenu */}
            <div className="max-w-3xl mx-auto px-4 py-8">
                {error && (
                    <div className="border border-danger bg-danger/10 text-danger text-xs font-mono px-4 py-2 mb-4">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <StepStats stats={stats} setStats={setStats} onNext={() => setStep(2)} />
                )}
                {step === 2 && (
                    <StepDerived stats={stats} onNext={() => setStep(3)} onBack={() => setStep(1)} />
                )}
                {step === 3 && (
                    <StepProfession
                        stats={stats} profession={profession} setProfession={setProfession}
                        skills={skills} setSkills={setSkills}
                        onNext={() => setStep(4)} onBack={() => setStep(2)}
                    />
                )}
                {step === 4 && (
                    <StepBonds
                        stats={stats} profession={profession}
                        bonds={bonds} setBonds={setBonds}
                        onNext={() => setStep(5)} onBack={() => setStep(3)}
                    />
                )}
                {step === 5 && (
                    <StepDetails
                        stats={stats} profession={profession} skills={skills} bonds={bonds}
                        details={details} setDetails={setDetails}
                        onSubmit={handleSubmit} onBack={() => setStep(4)}
                        submitting={submitting}
                    />
                )}
            </div>

            {/* Pied de page */}
            <footer className="dg-footer text-center py-2 mt-8">
                DD FORMULAIRE ÉTATS-UNIS 315 — SECRET DÉFENSE//ORCON//AUTORISATION SPÉCIALE REQUISE_DELTA GREEN — 112382
            </footer>
        </div>
    );
};

export default Creation;