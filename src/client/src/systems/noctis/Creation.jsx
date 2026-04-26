import { useState, useCallback } from 'react';
import { useSystem }  from '../../hooks/useSystem.js';
import { useNavigate } from 'react-router-dom';
import ThemeToggle    from '../../components/ui/ThemeToggle.jsx';
import {
    DOMAINES, STAT_LABELS, SPECIALTY_TYPES, SPECIALTY_NIVEAUX,
    SPECIALTIES_REFERENCE, OMBRE_TYPES, computeReserveMax, computeInitiative,
} from './config.jsx';
import NoctisLogo from "./components/ui/NoctisLogo.jsx";
import SteamTrainProgress from "./components/ui/SteamTrainProgress.jsx";

// ── Constantes ────────────────────────────────────────────────────────────────

const STEPS = [
    { id: 'identite',        label: 'Identité' },
    { id: 'caracteristiques', label: 'Caractéristiques' },
    { id: 'specialites',     label: 'Spécialités' },
    { id: 'eclats',          label: 'Éclats & Ombres' },
    { id: 'recapitulatif',   label: 'Récapitulatif' },
];

const STATS_DEFAULT = {
    force: 1, sante: 1, athletisme: 1,
    agilite: 1, precision: 1, technique: 1,
    connaissance: 1, perception: 1, volonte: 1,
    persuasion: 1, psychologie: 1, entregent: 1,
};

const POINTS_TOTAL   = 16;
const STAT_MAX       = 5;
const DOMAINE_MIN    = 3;
const DOMAINE_MAX    = 10;
const SPECIALTY_BUDGET = 6;
const NIVEAU_COST    = { debutant: 1, confirme: 2, expert: 3 };

// ── Composant principal ───────────────────────────────────────────────────────

const Creation = ({ darkMode, onToggleDarkMode }) => {
    const { apiBase, slug } = useSystem();
    const navigate          = useNavigate();

    const [step,    setStep]    = useState(0);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);
    const [created, setCreated] = useState(null);
    const [copied,  setCopied]  = useState(false);

    // ── État du formulaire ────────────────────────────────────────────────────

    const [identity, setIdentity] = useState({
        player_name: '', nom: '', prenom: '',
        sexe: '', age: '', taille: '', poids: '', activite: '',
    });

    const [stats, setStats] = useState({ ...STATS_DEFAULT });

    const [specialties, setSpecialties] = useState([]);
    const [specSearch,  setSpecSearch]  = useState('');
    const [specDraft,   setSpecDraft]   = useState({ name: '', type: 'normale', niveau: 'debutant' });

    const [eclatsMax, setEclatsMax] = useState(1);
    const [ombres,    setOmbres]    = useState([]);

    // ── Calculs ───────────────────────────────────────────────────────────────

    const pointsSpent = Object.values(stats).reduce((acc, v) => acc + (v - 1), 0);
    const pointsLeft  = POINTS_TOTAL - pointsSpent;

    const specBudgetSpent = specialties.reduce((acc, s) => acc + NIVEAU_COST[s.niveau], 0);
    const specBudgetLeft  = SPECIALTY_BUDGET - specBudgetSpent;

    const reserves   = computeReserveMax(stats);
    const initiative = computeInitiative(stats);

    // ── Validation par étape ──────────────────────────────────────────────────

    const canNext = useCallback(() => {
        switch (step) {
            case 0: return identity.player_name.trim() && identity.nom.trim() && identity.prenom.trim();
            case 1: return pointsLeft === 0;
            case 2: return true;
            case 3: return true;
            default: return true;
        }
    }, [step, identity, pointsLeft]);

    // ── Handlers stats ────────────────────────────────────────────────────────

    const getDomainTotal = (domainStats, currentStats) =>
        domainStats.reduce((acc, s) => acc + currentStats[s], 0);

    const getDomainForStat = (stat) =>
        Object.entries(DOMAINES).find(([, d]) => d.stats.includes(stat))?.[1];

    const handleStatChange = (stat, val) => {
        const current = stats[stat];
        const delta   = val - current;

        // Borne caractéristique
        if (val < 1 || val > STAT_MAX) return;

        // Budget global
        if (delta > 0 && pointsLeft < delta) return;

        // Borne domaine
        const domaine = getDomainForStat(stat);
        if (domaine) {
            const domainTotal = getDomainTotal(domaine.stats, stats) + delta;
            if (domainTotal > DOMAINE_MAX) return;
            if (domainTotal < DOMAINE_MIN && delta < 0) return;
        }

        setStats(prev => ({ ...prev, [stat]: val }));
    };

    // ── Handlers spécialités ──────────────────────────────────────────────────

    const handleAddSpec = () => {
        if (!specDraft.name.trim()) return;
        const cost = NIVEAU_COST[specDraft.niveau];
        if (specBudgetLeft < cost) return;
        setSpecialties(prev => [...prev, { ...specDraft, name: specDraft.name.trim() }]);
        setSpecDraft({ name: '', type: 'normale', niveau: 'debutant' });
        setSpecSearch('');
    };

    const handleRemoveSpec = (idx) => setSpecialties(prev => prev.filter((_, i) => i !== idx));

    const specSuggestions = specSearch.length >= 2
        ? SPECIALTIES_REFERENCE.filter(s =>
            s.name.toLowerCase().includes(specSearch.toLowerCase()) &&
            !specialties.some(ex => ex.name.toLowerCase() === s.name.toLowerCase())
        ).slice(0, 6)
        : [];

    // ── Handlers éclats / ombres ──────────────────────────────────────────────

    const handleEclatsChange = (val) => {
        setEclatsMax(val);
        // Tronquer les ombres si on descend
        setOmbres(prev => prev.slice(0, val - 1));
    };

    const handleOmbreChange = (idx, field, value) => {
        setOmbres(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
    };

    const ensureOmbres = (targetEclats) => {
        const needed = targetEclats - 1;
        setOmbres(prev => {
            const next = [...prev];
            while (next.length < needed) next.push({ type: 'dette', description: '' });
            return next.slice(0, needed);
        });
    };

    // ── Soumission ────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                player_name: identity.player_name.trim(),
                nom:         identity.nom.trim(),
                prenom:      identity.prenom.trim(),
                sexe:        identity.sexe    || null,
                age:         identity.age     ? +identity.age     : null,
                taille:      identity.taille  ? +identity.taille  : null,
                poids:       identity.poids   ? +identity.poids   : null,
                activite:    identity.activite || '',
                ...stats,
                eclats_max:     eclatsMax,
                eclats_current: eclatsMax,
                specialties,
                ombres,
            };

            const res = await fetch(`${apiBase}/characters`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Erreur lors de la création');
            }

            setCreated(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(created.access_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Écran post-création ───────────────────────────────────────────────────

    if (created) {
        return (
            <div
                className="ns-page min-h-screen flex items-center justify-center"
                data-theme={darkMode ? 'dark' : ''}
            >
                <div className="ns-card ns-paper max-w-md w-full text-center space-y-6 mx-4"
                     style={{ padding: '2.5rem' }}>

                    {/* Médaillon */}
                    <div style={{
                        fontFamily: 'var(--ns-font-title)',
                        fontSize:   '2.5rem',
                        color:      'var(--ns-ornament)',
                        lineHeight: 1,
                    }}>✦</div>

                    {/* Nom du personnage */}
                    <div>
                        <p style={{
                            fontFamily:  'var(--ns-font-body)',
                            fontSize:    '0.75rem',
                            color:       'var(--color-muted)',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            marginBottom: '0.4rem',
                        }}>
                            Personnage créé
                        </p>
                        <h2 style={{
                            fontFamily:  'var(--ns-font-title)',
                            fontSize:    '1.6rem',
                            fontWeight:  700,
                            color:       'var(--color-default)',
                            fontVariant: 'small-caps',
                        }}>
                            {created.prenom}{' '}
                            <span style={{ color: 'var(--ns-ornament)' }}>{created.nom}</span>
                        </h2>
                    </div>

                    <hr className="ns-divider-ornate" />

                    {/* Code d'accès — style tampon officiel */}
                    <div className="space-y-3">
                        <p className="ns-section-label" style={{ textAlign: 'center' }}>
                            Code d'accès
                        </p>
                        <div style={{
                            fontFamily:    'var(--ns-font-tech)',
                            fontSize:      '2.5rem',
                            fontWeight:    700,
                            letterSpacing: '0.3em',
                            color:         'var(--ns-ornament)',
                            textAlign:     'center',
                            padding:       '1rem',
                            background:    'var(--color-surface-alt)',
                            border:        '2px solid var(--ns-ornament)',
                            borderRadius:  '2px',
                        }}>
                            {created.access_code}
                        </div>
                        <button
                            onClick={copyCode}
                            className="ns-btn-ghost w-full"
                        >
                            {copied ? '✓ Code copié' : '⎘ Copier le code'}
                        </button>
                        <p style={{
                            fontFamily: 'var(--ns-font-body)',
                            fontStyle:  'italic',
                            fontSize:   '0.8rem',
                            color:      'var(--color-muted)',
                        }}>
                            Conservez ce code — c'est votre clé d'accès permanente.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate(`/${slug}/${created.access_url}`)}
                        className="ns-btn-primary w-full"
                        style={{ fontSize: '0.75rem', padding: '0.75rem 1rem' }}
                    >
                        ✦ Rejoindre la partie
                    </button>
                </div>
            </div>
        );
    }

    // ── Wizard ────────────────────────────────────────────────────────────────

    return (
        <div
            className="ns-page"
            data-theme={darkMode ? 'dark' : ''}
        >
            {/* Header */}
            <header className="ns-header px-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/${slug}`)}
                        className="ns-btn-ghost"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.6rem' }}
                    >
                        ← Retour
                    </button>
                    <NoctisLogo />
                    <div className="w-px h-5 shrink-0"
                         style={{ background: 'color-mix(in srgb, var(--ns-ornament) 30%, transparent)' }} />
                    <span style={{
                        fontFamily: 'var(--ns-font-body)',
                        fontSize:   '0.85rem',
                        fontStyle:  'italic',
                        color:      'var(--color-muted)',
                    }}>
                        Création de personnage
                    </span>
                </div>
                <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
            </header>

            {/* Barre de progression */}
            <div className="border-b px-6 pt-2 pb-0"
                 style={{ borderColor: 'var(--color-border)',
                     background:  'var(--color-surface-alt)' }}>
                <div className="max-w-3xl mx-auto">
                    <SteamTrainProgress steps={STEPS} currentStep={step} />
                </div>
            </div>

            {/* Contenu de l'étape */}
            <main className="max-w-3xl mx-auto mt-3 px-4 pb-6 space-y-4">

                {/* ── Étape 1 : Identité ────────────────────────────────── */}
                {step === 0 && (
                    <div className="space-y-4">
                        <h2 className="ns-domain-header" style={{ color: 'var(--ns-ornament)', fontSize: '0.7rem' }}>Identité</h2>

                        <div className="ns-card ns-paper space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="ns-section-label">Nom du joueur *</label>
                                    <input
                                        className="ns-input mt-1"
                                        value={identity.player_name}
                                        onChange={e => setIdentity(p => ({ ...p, player_name: e.target.value }))}
                                        placeholder="Votre prénom"
                                    />
                                </div>
                                <div>
                                    <label className="ns-section-label">Activité / Métier</label>
                                    <input
                                        className="ns-input mt-1"
                                        value={identity.activite}
                                        onChange={e => setIdentity(p => ({ ...p, activite: e.target.value }))}
                                        placeholder="ex: Détective privé"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="ns-section-label">Prénom du personnage *</label>
                                    <input
                                        className="ns-input mt-1"
                                        value={identity.prenom}
                                        onChange={e => setIdentity(p => ({ ...p, prenom: e.target.value }))}
                                        placeholder="ex: Elara"
                                    />
                                </div>
                                <div>
                                    <label className="ns-section-label">Nom du personnage *</label>
                                    <input
                                        className="ns-input mt-1"
                                        value={identity.nom}
                                        onChange={e => setIdentity(p => ({ ...p, nom: e.target.value }))}
                                        placeholder="ex: Duskwood"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="ns-section-label">Sexe</label>
                                    <select
                                        className="ns-select mt-1"
                                        value={identity.sexe}
                                        onChange={e => setIdentity(p => ({ ...p, sexe: e.target.value }))}
                                    >
                                        <option value="">—</option>
                                        <option value="homme">Homme</option>
                                        <option value="femme">Femme</option>
                                        <option value="autre">Autre</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="ns-section-label">Âge</label>
                                    <input type="number" min="1"
                                           className="w-full bg-surface-alt border border-default rounded px-2 py-1.5 text-default text-sm mt-1"
                                           value={identity.age}
                                           onChange={e => setIdentity(p => ({ ...p, age: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="ns-section-label">Taille (cm)</label>
                                    <input type="number" min="1"
                                           className="w-full bg-surface-alt border border-default rounded px-2 py-1.5 text-default text-sm mt-1"
                                           value={identity.taille}
                                           onChange={e => setIdentity(p => ({ ...p, taille: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="ns-section-label">Poids (kg)</label>
                                    <input type="number" min="1"
                                           className="w-full bg-surface-alt border border-default rounded px-2 py-1.5 text-default text-sm mt-1"
                                           value={identity.poids}
                                           onChange={e => setIdentity(p => ({ ...p, poids: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Étape 2 : Caractéristiques ────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="ns-domain-header" style={{ color: 'var(--ns-ornament)', fontSize: '0.7rem' }}>Caractéristiques</h2>
                            <div className={`text-sm font-bold px-3 py-1 rounded-full border ${
                                pointsLeft === 0
                                    ? 'text-success border-success bg-success/10'
                                    : pointsLeft < 0
                                        ? 'text-danger border-danger bg-danger/10'
                                        : 'text-secondary border-secondary bg-secondary/10'
                            }`}>
                                {pointsLeft} point{pointsLeft !== 1 ? 's' : ''} restant{pointsLeft !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <p className="text-muted text-sm">
                            Tous les personnages commencent avec 1 dans chaque caractéristique.
                            Répartissez vos {POINTS_TOTAL} points (max {STAT_MAX} par caractéristique).
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(DOMAINES).map(([domKey, domaine]) => (
                                <div key={domKey} className="ns-card ns-paper space-y-3">
                                    <h3 className={`text-${domaine.color} text-xs font-bold uppercase tracking-widest`}>
                                        {domaine.label}
                                        <span className={`ml-2 text-xs mt-1 ${
                                            getDomainTotal(domaine.stats, stats) < DOMAINE_MIN ? 'text-danger' :
                                                getDomainTotal(domaine.stats, stats) >= DOMAINE_MAX ? 'text-muted' : 'text-success'
                                        }`}>
                                            ({getDomainTotal(domaine.stats, stats)} / {DOMAINE_MAX})
                                        </span>
                                    </h3>

                                    {domaine.stats.map(stat => (
                                        <div key={stat} className="flex items-center justify-between gap-2">
                                            <span className="text-default text-sm w-28">{STAT_LABELS[stat]}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleStatChange(stat, stats[stat] - 1)}
                                                    disabled={stats[stat] <= 1}
                                                    className="w-7 h-7 rounded border border-default text-muted disabled:opacity-30"
                                                >−</button>
                                                <div className="flex gap-0.5">
                                                    {Array.from({ length: STAT_MAX }, (_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleStatChange(stat, i + 1)}
                                                            className={`w-6 h-6 rounded text-xs font-bold border transition-colors
                                                                ${i < stats[stat]
                                                                ? 'bg-primary border-primary text-surface'
                                                                : 'bg-surface-alt border-default text-muted'
                                                            }`}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => handleStatChange(stat, stats[stat] + 1)}
                                                    disabled={stats[stat] >= STAT_MAX || pointsLeft <= 0}
                                                    className="w-7 h-7 rounded border border-default text-muted disabled:opacity-30"
                                                >+</button>
                                            </div>
                                        </div>
                                    ))}

                                </div>
                            ))}
                        </div>

                        {/* Valeurs dérivées */}
                        <div className="bg-surface border border-default rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="ns-section-label">Initiative</p>
                                <p className="text-primary font-bold text-2xl">{initiative}</p>
                            </div>
                            <div>
                                <p className="ns-section-label">Effort max</p>
                                <p className="text-primary font-bold text-2xl">{reserves.effort}</p>
                            </div>
                            <div>
                                <p className="ns-section-label">Sang-Froid max</p>
                                <p className="text-primary font-bold text-2xl">{reserves.sangfroid}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Étape 3 : Spécialités ─────────────────────────────── */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="ns-domain-header" style={{ color: 'var(--ns-ornament)', fontSize: '0.7rem' }}>Spécialités</h2>
                            <div className={`text-sm font-bold px-3 py-1 rounded-full border ${
                                specBudgetLeft === 0
                                    ? 'text-success border-success bg-success/10'
                                    : 'text-secondary border-secondary bg-secondary/10'
                            }`}>
                                {specBudgetLeft} pt{specBudgetLeft !== 1 ? 's' : ''} restant{specBudgetLeft !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <p className="text-muted text-sm">
                            Vous disposez de {SPECIALTY_BUDGET} points. Débutant = 1pt, Confirmé = 2pts, Expert = 3pts.
                            Choisissez parmi la liste ou inventez vos propres spécialités.
                        </p>

                        {/* Formulaire ajout */}
                        <div className="ns-card ns-paper space-y-3">
                            <div className="relative z-50">
                                <input
                                    placeholder="Rechercher ou nommer une spécialité…"
                                    className="w-full bg-surface-alt border border-default rounded px-3 py-1.5 text-default text-sm"
                                    value={specSearch || specDraft.name}
                                    onChange={e => {
                                        setSpecSearch(e.target.value);
                                        setSpecDraft(d => ({ ...d, name: e.target.value }));
                                    }}
                                />
                                {specSuggestions.length > 0 && (
                                    <ul className="absolute z-[100] w-full bg-surface border border-default rounded mt-1 shadow-lg">
                                        {specSuggestions.map(s => (
                                            <li
                                                key={s.name}
                                                onClick={() => {
                                                    setSpecDraft(d => ({ ...d, name: s.name, type: s.type }));
                                                    setSpecSearch('');
                                                }}
                                                className="px-3 py-1.5 text-sm text-default hover:bg-surface-alt cursor-pointer flex justify-between"
                                            >
                                                <span>{s.name}</span>
                                                <span className="text-muted text-xs">{SPECIALTY_TYPES[s.type]?.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="space-y-2">
                                {/* Type */}
                                <div className="flex gap-1.5">
                                    {Object.entries(SPECIALTY_TYPES)
                                        .filter(([k]) => k !== 'fracture')
                                        .map(([k, v]) => (
                                            <button
                                                key={k}
                                                onClick={() => setSpecDraft(d => ({ ...d, type: k }))}
                                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                                    specDraft.type === k
                                                        ? 'bg-primary border-primary text-surface font-bold'
                                                        : 'bg-surface-alt border-default text-muted hover:text-default'
                                                }`}
                                            >
                                                {v.label}
                                            </button>
                                        ))
                                    }
                                </div>

                                {/* Niveau */}
                                <div className="flex gap-1.5">
                                    {Object.entries(SPECIALTY_NIVEAUX).map(([k, v]) => {
                                        const disabled = NIVEAU_COST[k] > specBudgetLeft;
                                        return (
                                            <button
                                                key={k}
                                                onClick={() => !disabled && setSpecDraft(d => ({ ...d, niveau: k }))}
                                                disabled={disabled}
                                                className={`flex-1 py-1.5 rounded border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                                    specDraft.niveau === k
                                                        ? 'bg-secondary border-secondary text-surface font-bold'
                                                        : 'bg-surface-alt border-default text-muted hover:text-default'
                                                }`}
                                            >
                                                <span className="block text-xs">{v.label}</span>
                                                <span className="block text-xs opacity-70">+{v.bonus}D · {NIVEAU_COST[k]}pt</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={handleAddSpec}
                                disabled={!specDraft.name.trim() || NIVEAU_COST[specDraft.niveau] > specBudgetLeft}
                                className="w-full py-1.5 text-sm rounded bg-primary text-surface font-bold disabled:opacity-40"
                            >
                                + Ajouter
                            </button>
                        </div>

                        {/* Liste */}
                        <div className="space-y-1">
                            {specialties.length === 0 && (
                                <p className="text-muted text-xs italic text-center py-4">
                                    Aucune spécialité ajoutée.
                                </p>
                            )}
                            {specialties.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 bg-surface border border-default rounded px-3 py-2">
                                    <div className="flex-1">
                                        <span className="text-default text-sm font-medium">{s.name}</span>
                                        <span className="text-muted text-xs ml-2">
                                            {SPECIALTY_TYPES[s.type]?.label} · {SPECIALTY_NIVEAUX[s.niveau]?.label} (+{SPECIALTY_NIVEAUX[s.niveau]?.bonus}D)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveSpec(i)}
                                        className="text-danger text-xs"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Étape 4 : Éclats & Ombres ─────────────────────────── */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="ns-domain-header" style={{ color: 'var(--ns-ornament)', fontSize: '0.7rem' }}>Éclats & Ombres</h2>

                        <p className="text-muted text-sm">
                            Tous les personnages commencent avec 1 Éclat. Vous pouvez en acquérir
                            jusqu'à 2 supplémentaires en acceptant des Ombres — des fardeaux que
                            le MJ peut activer en jeu.
                        </p>

                        {/* Choix éclats */}
                        <div className="ns-card ns-paper space-y-3">
                            <p className="text-default text-sm font-semibold">Nombre d'Éclats</p>
                            <div className="flex gap-3">
                                {[1, 2, 3].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            handleEclatsChange(val);
                                            ensureOmbres(val);
                                        }}
                                        className={`flex-1 py-3 rounded-lg border-2 font-bold text-lg transition-colors ${
                                            eclatsMax === val
                                                ? 'border-accent bg-accent/10 text-accent'
                                                : 'border-default text-muted'
                                        }`}
                                    >
                                        {val}
                                        <div className="text-xs font-normal mt-0.5 text-muted">
                                            {val === 1 ? 'Aucune ombre' : `${val - 1} ombre${val > 2 ? 's' : ''}`}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ombres */}
                        {ombres.map((o, i) => (
                            <div key={i} className="ns-card ns-paper space-y-3">
                                <p className="text-secondary font-semibold text-sm">
                                    Ombre {i + 1}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(OMBRE_TYPES).map(([k, v]) => (
                                        <button
                                            key={k}
                                            onClick={() => handleOmbreChange(i, 'type', k)}
                                            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                                                o.type === k
                                                    ? 'bg-secondary border-secondary text-surface font-bold'
                                                    : 'bg-surface-alt border-default text-muted hover:text-default'
                                            }`}
                                        >
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    rows={2}
                                    placeholder="Décrivez cette ombre en quelques mots…"
                                    className="ns-textarea mt-1"
                                    value={o.description}
                                    onChange={e => handleOmbreChange(i, 'description', e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Étape 5 : Récapitulatif ───────────────────────────── */}
                {step === 4 && (
                    <div className="space-y-4">
                        <h2 className="ns-domain-header" style={{ color: 'var(--ns-ornament)', fontSize: '0.7rem' }}>Récapitulatif</h2>

                        {/* Identité */}
                        <div className="ns-card ns-paper space-y-1">
                            <p className="text-muted text-xs uppercase mb-2">Identité</p>
                            <p className="text-default">
                                <span className="text-muted text-xs">Joueur</span> {identity.player_name}
                            </p>
                            <p className="text-primary font-bold text-lg">{identity.prenom} {identity.nom}</p>
                            {identity.activite && (
                                <p className="text-muted text-sm">{identity.activite}</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="bg-surface border border-default rounded-lg p-4">
                            <p className="text-muted text-xs uppercase mb-3">Caractéristiques</p>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(DOMAINES).map(([, domaine]) => (
                                    <div key={domaine.label}>
                                        <p className={`text-${domaine.color} text-xs font-bold uppercase mb-1`}>
                                            {domaine.label}
                                        </p>
                                        {domaine.stats.map(stat => (
                                            <div key={stat} className="flex justify-between text-sm">
                                                <span className="text-muted">{STAT_LABELS[stat]}</span>
                                                <span className="text-primary font-bold">{stats[stat]}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-default grid grid-cols-3 gap-2 text-center text-sm">
                                <div>
                                    <p className="text-muted text-xs">Initiative</p>
                                    <p className="text-primary font-bold">{initiative}</p>
                                </div>
                                <div>
                                    <p className="text-muted text-xs">Effort</p>
                                    <p className="text-primary font-bold">{reserves.effort}</p>
                                </div>
                                <div>
                                    <p className="text-muted text-xs">Sang-Froid</p>
                                    <p className="text-primary font-bold">{reserves.sangfroid}</p>
                                </div>
                            </div>
                        </div>

                        {/* Spécialités */}
                        <div className="bg-surface border border-default rounded-lg p-4">
                            <p className="text-muted text-xs uppercase mb-2">Spécialités</p>
                            {specialties.length === 0
                                ? <p className="text-muted text-xs italic">Aucune spécialité.</p>
                                : specialties.map((s, i) => (
                                    <div key={i} className="flex justify-between text-sm py-0.5">
                                        <span className="text-default">{s.name}</span>
                                        <span className="text-muted text-xs">
                                            {SPECIALTY_NIVEAUX[s.niveau]?.label} (+{SPECIALTY_NIVEAUX[s.niveau]?.bonus}D)
                                        </span>
                                    </div>
                                ))
                            }
                        </div>

                        {/* Éclats & Ombres */}
                        <div className="ns-card ns-paper space-y-2">
                            <p className="ns-section-label">Éclats & Ombres</p>
                            <p className="text-accent font-bold">{'✦'.repeat(eclatsMax)} {eclatsMax} Éclat{eclatsMax > 1 ? 's' : ''}</p>
                            {ombres.map((o, i) => (
                                <p key={i} className="text-sm">
                                    <span className="text-secondary font-semibold">{OMBRE_TYPES[o.type].label}</span>
                                    {o.description && <span className="text-muted"> — {o.description}</span>}
                                </p>
                            ))}
                        </div>

                        {error && (
                            <p className="text-danger text-sm bg-danger/10 border border-danger/30 rounded px-3 py-2">
                                {error}
                            </p>
                        )}
                    </div>
                )}

                {/* ── Navigation ────────────────────────────────────────── */}
                <div className="flex gap-3 pt-2">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className="ns-btn-ghost flex-1"
                        >
                            ← Précédent
                        </button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canNext()}
                            className="ns-btn-primary flex-1 disabled:opacity-40"
                        >
                            Suivant →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="ns-btn-primary flex-1 disabled:opacity-50"
                        >
                            {loading ? 'Création…' : '✦ Créer le personnage'}
                        </button>
                    )}
                </div>

            </main>
        </div>
    );
};

export default Creation;