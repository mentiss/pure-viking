// src/client/src/systems/cyberpunk/Creation.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard de création de personnage Cyberpunk — public, sans authentification.
//
// 7 étapes :
//   1. Playbook
//   2. Identité
//   3. Stats
//   4. Manœuvres
//   5. Directives
//   6. Relations & Cyberware
//   7. Finalisation
//
// POST /api/cyberpunk/characters → access_code + access_url affichés à la fin.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useSystem } from '../../hooks/useSystem.js';
import './theme.css';

import cyberpunkConfig, {
    PLAYBOOKS, STAT_PROFILES, STATS, STAT_LABELS, DIRECTIVES_PERSONNELLES, CYBERWARE_ALL,
} from './config.jsx';

// ── Étapes ────────────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: 'Playbook'   },
    { id: 2, label: 'Identité'   },
    { id: 3, label: 'Stats'      },
    { id: 4, label: 'Manœuvres'  },
    { id: 5, label: 'Directives' },
    { id: 6, label: 'Relations'  },
    { id: 7, label: 'Finalisation'},
];

const STAT_BADGE_CLASS = {
    cran:   'cp-stat-badge-cran',
    pro:    'cp-stat-badge-pro',
    chair:  'cp-stat-badge-chair',
    esprit: 'cp-stat-badge-esprit',
    style:  'cp-stat-badge-style',
    synth:  'cp-stat-badge-synth',
};

const DESCRIPTIONS_STATS = {
    cran:   'Garder votre calme et rester concentré durant des situations tendues',
    pro:    'Faire appel à votre sens de la débrouillardise et à votre expérience ou donner l’impression que vous êtes un dur',
    chair:  'Surmonter un problème par un effort physique sans l’aide de la cybernétique',
    esprit: 'Vous sortir des emmerdes par la logique, l’instinct, la créativité ou tout autre processus mental',
    style:  'Gérer une situation avec votre charisme, votre présence ou votre aplomb',
    synth:  'Vous interfacer sans heurt avec la technologie',
};

const CHIP_COLORS = {
    2:  { bg: 'rgba(0,229,255,0.15)',  border: 'rgba(0,229,255,0.5)',  text: 'var(--cp-neon-cyan)'    },
    1:  { bg: 'rgba(32,192,96,0.15)',  border: 'rgba(32,192,96,0.5)',  text: 'var(--color-success)'   },
    0:  { bg: 'rgba(106,106,144,0.2)', border: 'rgba(106,106,144,0.4)',text: 'var(--color-text-muted)'},
    '-1': { bg: 'rgba(255,170,0,0.15)', border: 'rgba(255,170,0,0.4)', text: 'var(--cp-neon-amber)'  },
    '-2': { bg: 'rgba(255,45,120,0.15)',border: 'rgba(255,45,120,0.4)',text: 'var(--cp-neon-magenta)' },
};

const chipStyle = (value, dragging = false) => {
    const c = CHIP_COLORS[String(value)] ?? CHIP_COLORS['0'];
    return {
        background:  c.bg,
        border:      `1.5px solid ${c.border}`,
        color:       c.text,
        opacity:     dragging ? 0.4 : 1,
        cursor:      'grab',
        userSelect:  'none',
        transition:  'transform 0.1s, opacity 0.15s',
    };
};

// Chip draggable
const StatChip = ({ chip, onDragStart }) => (
    <div
        draggable
        onDragStart={e => { e.dataTransfer.setData('chipId', chip.id); onDragStart?.(chip.id); }}
        onDragEnd={() => onDragStart?.(null)}
        className="px-3 py-1.5 rounded-lg font-mono font-bold text-sm select-none"
        style={chipStyle(chip.value)}
        title="Dépose sur une stat"
    >
        {chip.value > 0 ? `+${chip.value}` : chip.value}
    </div>
);

// Cellule stat (drop target)
const StatDropCell = ({ statKey, value, onDrop, onReturn, isDragOver, onDragOver, onDragLeave, onHover, onLeave }) => {
    const occupied = value !== null;
    const c = occupied ? (CHIP_COLORS[String(value)] ?? CHIP_COLORS['0']) : null;

    return (
        <>
            <div
                onDragOver={e => { e.preventDefault(); onDragOver(); }}
                onDragLeave={onDragLeave}
                onDrop={e => { e.preventDefault(); if (!occupied) onDrop(e.dataTransfer.getData('chipId')); }}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
                className="rounded-xl flex flex-col items-center gap-1.5 py-3 px-2 transition-all"
                style={{
                    background:  isDragOver && !occupied
                        ? 'rgba(0,229,255,0.1)'
                        : occupied ? c.bg : 'var(--color-surface-alt)',
                    border:      `1.5px ${isDragOver && !occupied ? 'dashed' : 'solid'} ${
                        isDragOver && !occupied
                            ? 'var(--color-primary)'
                            : occupied ? c.border : 'var(--color-border)'
                    }`,
                    boxShadow:   isDragOver && !occupied ? 'var(--cp-glow-cyan)' : 'none',
                    cursor:      occupied ? 'default' : 'copy',
                    minHeight:   '80px',
                    position:    'relative',
                }}
            >
                {/* Label stat */}
                <span
                    className="text-xs cp-font-ui uppercase tracking-widest"
                    style={{ color: occupied ? c.text : 'var(--color-text-muted)' }}
                >
                    {STAT_LABELS[statKey]}
                </span>

                {/* Valeur ou placeholder */}
                {occupied ? (
                    <span
                        className="font-mono font-bold text-2xl"
                        style={{ color: c.text }}
                    >
                        {value > 0 ? `+${value}` : value}
                    </span>
                ) : (
                    <span
                        className="font-mono text-xl"
                        style={{ color: 'var(--color-border)', lineHeight: 1 }}
                    >
                        —
                    </span>
                )}

                {/* Bouton retour */}
                {occupied && (
                    <button
                        onClick={onReturn}
                        title="Remettre au pool"
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs leading-none"
                        style={{
                            background: 'var(--color-surface)',
                            border:     `1px solid ${c.border}`,
                            color:      c.text,
                            cursor:     'pointer',
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>
        </>
    );
};

// ── StepBar ───────────────────────────────────────────────────────────────────

const StepBar = ({ current }) => (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
                <div className="flex flex-col items-center flex-shrink-0">
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                            background: s.id < current
                                ? 'var(--color-success)'
                                : s.id === current
                                    ? 'var(--color-primary)'
                                    : 'var(--color-surface-alt)',
                            color:   s.id <= current ? 'var(--color-bg)' : 'var(--color-text-muted)',
                            boxShadow: s.id === current ? 'var(--cp-glow-cyan)' : 'none',
                        }}
                    >
                        {s.id < current ? '✓' : s.id}
                    </div>
                    <span
                        className="text-[9px] mt-0.5 hidden sm:block cp-font-ui uppercase tracking-wide"
                        style={{ color: s.id === current ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                    >
                        {s.label}
                    </span>
                </div>
                {i < STEPS.length - 1 && (
                    <div
                        className="flex-1 h-px"
                        style={{
                            background: s.id < current
                                ? 'var(--color-success)'
                                : 'var(--color-border)',
                            minWidth: '12px',
                        }}
                    />
                )}
            </React.Fragment>
        ))}
    </div>
);

// ── Boutons nav ───────────────────────────────────────────────────────────────

const NavButtons = ({ step, totalSteps, onPrev, onNext, onNextLabel, disabledNext = false, loading = false }) => (
    <div className="flex gap-3 mt-6">
        {step > 1 && (
            <button
                onClick={onPrev}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{
                    background: 'var(--color-surface-alt)',
                    color:      'var(--color-text-muted)',
                    border:     '1px solid var(--color-border)',
                }}
            >
                ← Précédent
            </button>
        )}
        <button
            onClick={onNext}
            disabled={disabledNext || loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold cp-font-ui uppercase tracking-wide transition-all"
            style={{
                background: (disabledNext || loading) ? 'var(--color-border)' : 'var(--color-primary)',
                color:      (disabledNext || loading) ? 'var(--color-text-muted)' : 'var(--color-bg)',
                border:     'none',
                boxShadow:  (disabledNext || loading) ? 'none' : 'var(--cp-glow-cyan)',
                cursor:     (disabledNext || loading) ? 'not-allowed' : 'pointer',
            }}
        >
            {loading ? '…' : (onNextLabel ?? (step === totalSteps ? '✦ Créer le personnage' : 'Suivant →'))}
        </button>
    </div>
);

// ── Section card ──────────────────────────────────────────────────────────────

const Card = ({ children, glow = false }) => (
    <div
        className="rounded-xl p-5 flex flex-col gap-4"
        style={{
            background: 'var(--color-surface)',
            border:     `1px solid ${glow ? 'var(--color-primary)' : 'var(--color-border)'}`,
            boxShadow:  glow ? 'var(--cp-glow-cyan)' : 'none',
        }}
    >
        {children}
    </div>
);

const Label = ({ children }) => (
    <span
        className="text-xs font-bold cp-font-ui uppercase tracking-widest block mb-1"
        style={{ color: 'var(--color-text-muted)' }}
    >
        {children}
    </span>
);

const Input = ({ value, onChange, placeholder, type = 'text', rows }) => {
    const style = {
        background: 'var(--color-surface-alt)',
        border:     '1px solid var(--color-border)',
        color:      'var(--color-text)',
        borderRadius: '8px',
        padding:    '10px 12px',
        fontSize:   '0.875rem',
        outline:    'none',
        width:      '100%',
    };
    return rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={style} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — Playbook
// ─────────────────────────────────────────────────────────────────────────────

const Step1Playbook = ({ selected, onSelect, onNext }) => (
    <div className="flex flex-col gap-4">
        <div>
            <h2 className="text-xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                Choisis ton Playbook
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Le Playbook définit le rôle de ton personnage et les manœuvres à ta disposition.
            </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLAYBOOKS.map(pb => (
                <button
                    key={pb.id}
                    onClick={() => onSelect(pb.id)}
                    className="text-left rounded-xl p-3 flex flex-col gap-1 transition-all"
                    style={{
                        background: selected === pb.id ? 'rgba(0,229,255,0.08)' : 'var(--color-surface-alt)',
                        border:     `1px solid ${selected === pb.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        boxShadow:  selected === pb.id ? 'var(--cp-glow-cyan)' : 'none',
                        cursor:     'pointer',
                    }}
                >
                    <span
                        className="font-bold text-sm cp-font-ui uppercase tracking-wide"
                        style={{ color: selected === pb.id ? 'var(--color-primary)' : 'var(--color-text)' }}
                    >
                        {pb.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {pb.description}
                    </span>
                    <span className="text-xs italic" style={{ color: 'var(--color-accent)' }}>
                        {pb.statHint}
                    </span>
                </button>
            ))}
        </div>

        <NavButtons step={1} totalSteps={7} onNext={onNext} disabledNext={!selected} />
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — Identité
// ─────────────────────────────────────────────────────────────────────────────

const Step2Identite = ({ data, onChange, onPrev, onNext }) => (
    <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
            Identité
        </h2>

        <Card>
            <div className="flex flex-col gap-3">
                <div>
                    <Label>Prénom du joueur *</Label>
                    <Input value={data.playerName} onChange={v => onChange('playerName', v)} placeholder="Ton prénom ou pseudo" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Prénom du personnage *</Label>
                        <Input value={data.prenom} onChange={v => onChange('prenom', v)} placeholder="Ex: Kai" />
                    </div>
                    <div>
                        <Label>Nom</Label>
                        <Input value={data.nom} onChange={v => onChange('nom', v)} placeholder="Ex: Nakamura" />
                    </div>
                </div>
                <div>
                    <Label>Sexe</Label>
                    <Input value={data.sexe} onChange={v => onChange('sexe', v)} placeholder="Libre" />
                </div>
                <div>
                    <Label>Apparence</Label>
                    <Input value={data.apparence} onChange={v => onChange('apparence', v)} placeholder="Description physique, style vestimentaire, traits marquants…" rows={3} />
                </div>
            </div>
        </Card>

        <NavButtons
            step={2} totalSteps={7}
            onPrev={onPrev} onNext={onNext}
            disabledNext={!data.playerName.trim() || !data.prenom.trim()}
        />
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 3 — Stats
// ─────────────────────────────────────────────────────────────────────────────

const Step3Stats = ({ profile, stats, pool, onProfileSelect, onDrop, onReturn, onPrev, onNext }) => {
    const [draggingId,   setDraggingId]   = useState(null);
    const [dragOverStat, setDragOverStat] = useState(null);
    const [hoveredStat,  setHoveredStat]  = useState(null);

    const allPlaced   = pool.length === 0 && STATS.every(s => stats[s] !== null);
    const selectedProfile = STAT_PROFILES.find(p => p.id === profile);

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h2 className="text-xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                    Répartition des stats
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Choisis un profil puis dépose chaque valeur sur la stat de ton choix.
                </p>
            </div>

            {/* ── Sélection de profil ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STAT_PROFILES.map(p => (
                    <button
                        key={p.id}
                        onClick={() => onProfileSelect(p.id)}
                        className="text-left rounded-xl p-3 flex flex-col gap-1 transition-all"
                        style={{
                            background: profile === p.id ? 'rgba(0,229,255,0.08)' : 'var(--color-surface-alt)',
                            border:     `1.5px solid ${profile === p.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            boxShadow:  profile === p.id ? 'var(--cp-glow-cyan)' : 'none',
                            cursor:     'pointer',
                        }}
                    >
                        <span
                            className="font-bold text-sm cp-font-ui uppercase tracking-wide"
                            style={{ color: profile === p.id ? 'var(--color-primary)' : 'var(--color-text)' }}
                        >
                            {p.label}
                        </span>
                        <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                            {p.description}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Pool de chips ─────────────────────────────────────────── */}
            {profile && (
                <>
                    <div
                        className="rounded-xl p-3 flex flex-col gap-2"
                        style={{
                            background: 'var(--color-surface)',
                            border:     '1px solid var(--color-border)',
                        }}
                    >
                        <span
                            className="text-xs cp-font-ui uppercase tracking-widest"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            Valeurs à placer {pool.length > 0 ? `(${pool.length} restante${pool.length > 1 ? 's' : ''})` : '— tout est placé ✓'}
                        </span>
                        <div className="flex flex-wrap gap-2 min-h-[36px]">
                            {pool.length === 0 ? (
                                <span className="text-xs italic" style={{ color: 'var(--color-success)' }}>
                                    ✦ Toutes les valeurs sont placées
                                </span>
                            ) : (
                                pool.map(chip => (
                                    <StatChip
                                        key={chip.id}
                                        chip={chip}
                                        onDragStart={setDraggingId}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Grille des stats ─────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {STATS.map(stat => (
                            <StatDropCell
                                key={stat}
                                statKey={stat}
                                value={stats[stat]}
                                isDragOver={dragOverStat === stat}
                                onDragOver={() => setDragOverStat(stat)}
                                onDragLeave={() => setDragOverStat(null)}
                                onDrop={(chipId) => {
                                    setDragOverStat(null);
                                    onDrop(stat, chipId);
                                }}
                                onReturn={() => onReturn(stat)}
                                onHover={() => setHoveredStat(stat)}
                                onLeave={() => setHoveredStat(null)}
                            />
                        ))}
                    </div>

                    {/* Bandeau de description — remplace le message de validation */}
                    <div
                        className={`
                            flex items-center justify-center
                            rounded-lg px-4 py-2.5 text-center transition-all duration-200 bg-surface
                            border ${hoveredStat ? 'border-primary' : 'border-default'}
                            hover:cp-glow-cyan min-h-[60px]
                        `}
                    >
                        {hoveredStat ? (
                            <p className="text-xs cp-font-mono text-primary w-full">
                                <span className="font-bold uppercase tracking-widest mr-2">
                                    {STAT_LABELS[hoveredStat]}
                                </span>
                                — {DESCRIPTIONS_STATS[hoveredStat]}
                            </p>
                        ) : (
                            <p className="text-xs text-muted w-full">
                                {pool.length > 0
                                    ? 'Dépose toutes les valeurs pour continuer.'
                                    : '✦ Toutes les stats sont placées.'
                                }
                            </p>
                        )}
                    </div>
                </>
            )}

            <NavButtons
                step={3} totalSteps={7}
                onPrev={onPrev}
                onNext={onNext}
                disabledNext={!allPlaced}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 4 — Manœuvres
// ─────────────────────────────────────────────────────────────────────────────

const Step4Moves = ({ playbook, selectedMoveIds, onToggleMove, onPrev, onNext }) => {
    const { apiBase } = useSystem();
    const [moves,   setMoves]   = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!playbook) return;
        setLoading(true);
        fetch(`${apiBase}/moves/playbook/${playbook}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setMoves(Array.isArray(data) ? data : []))
            .catch(() => setMoves([]))
            .finally(() => setLoading(false));
    }, [apiBase, playbook]);

    const playbookMoves = moves.filter(m => m.playbook === playbook);
    const baseMoves     = moves.filter(m => m.playbook === null);
    const pickedCount   = selectedMoveIds.length;

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                    Manœuvres
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Choisis <strong style={{ color: 'var(--color-primary)' }}>2 manœuvres</strong> dans la liste de ton playbook.
                    Les manœuvres de base sont accessibles à tous — elles ne comptent pas dans les 2 picks.
                </p>
            </div>

            {loading && (
                <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Chargement…
                </p>
            )}

            {!loading && (
                <>
                    {/* Manœuvres du playbook */}
                    <div>
                        <Label>Playbook — {playbook} (choisis 2)</Label>
                        <div className="flex flex-col gap-2">
                            {playbookMoves.map(move => {
                                const checked = selectedMoveIds.includes(move.id);
                                const disabled = !checked && pickedCount >= 2;
                                return (
                                    <button
                                        key={move.id}
                                        onClick={() => !disabled && onToggleMove(move.id, move)}
                                        className="text-left rounded-xl p-3 flex gap-3 items-start transition-all"
                                        style={{
                                            background: checked
                                                ? 'rgba(0,229,255,0.08)'
                                                : disabled ? 'transparent' : 'var(--color-surface-alt)',
                                            border:     `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            boxShadow:  checked ? 'var(--cp-glow-cyan)' : 'none',
                                            opacity:    disabled ? 0.4 : 1,
                                            cursor:     disabled ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        <div
                                            className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                                            style={{
                                                background: checked ? 'var(--color-primary)' : 'var(--color-surface)',
                                                border:     `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                color:      checked ? 'var(--color-bg)' : 'transparent',
                                            }}
                                        >
                                            ✓
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    className="font-semibold text-sm"
                                                    style={{ color: checked ? 'var(--color-primary)' : 'var(--color-text)' }}
                                                >
                                                    {move.name}
                                                </span>
                                                {move.stat && (
                                                    <span className={`cp-stat-badge ${STAT_BADGE_CLASS[move.stat] ?? ''}`}>
                                                        {STAT_LABELS[move.stat]}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                                                {move.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Manœuvres de base — lecture seule */}
                    <details>
                        <summary
                            className="text-xs cursor-pointer cp-font-ui uppercase tracking-wide mb-2"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            ▶ Manœuvres de base (accessibles à tous — {baseMoves.length})
                        </summary>
                        <div className="flex flex-col gap-1.5 mt-2">
                            {baseMoves.map(move => (
                                <div
                                    key={move.id}
                                    className="rounded-lg px-3 py-2"
                                    style={{
                                        background: 'var(--color-surface-alt)',
                                        border:     '1px solid var(--color-border)',
                                        opacity:    0.7,
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{move.name}</span>
                                        {move.stat && (
                                            <span className={`cp-stat-badge ${STAT_BADGE_CLASS[move.stat] ?? ''}`}>
                                                {STAT_LABELS[move.stat]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                </>
            )}

            <NavButtons
                step={4} totalSteps={7}
                onPrev={onPrev} onNext={onNext}
                disabledNext={pickedCount !== 2}
                onNextLabel={pickedCount === 2 ? `Suivant (${pickedCount}/2) →` : `Choisis ${2 - pickedCount} manœuvre${2 - pickedCount > 1 ? 's' : ''}`}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 5 — Directives
// ─────────────────────────────────────────────────────────────────────────────

const Step5Directives = ({ directives, onToggle, onBlankChange, onPrev, onNext }) => {
    const selected = directives.filter(d => d.selected);

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                    Directives personnelles
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Choisis <strong style={{ color: 'var(--color-primary)' }}>2 Directives</strong>.
                    Ce sont tes moteurs de comportement — quand tu agis en accord avec elles, tu gagnes de l'expérience.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                {DIRECTIVES_PERSONNELLES.map(dir => {
                    const found   = directives.find(d => d.id === dir.id);
                    const checked = found?.selected ?? false;
                    const disabled = !checked && selected.length >= 2;

                    return (
                        <div
                            key={dir.id}
                            className="rounded-xl overflow-hidden transition-all"
                            style={{
                                border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                boxShadow: checked ? 'var(--cp-glow-cyan)' : 'none',
                                opacity:   disabled ? 0.4 : 1,
                            }}
                        >
                            <button
                                onClick={() => !disabled && onToggle(dir.id)}
                                className="w-full text-left px-4 py-3 flex items-center gap-3"
                                style={{
                                    background: checked ? 'rgba(0,229,255,0.08)' : 'var(--color-surface-alt)',
                                    cursor:     disabled ? 'not-allowed' : 'pointer',
                                    border:     'none',
                                }}
                            >
                                <div
                                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold"
                                    style={{
                                        background: checked ? 'var(--color-primary)' : 'var(--color-surface)',
                                        border:     `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        color:      checked ? 'var(--color-bg)' : 'transparent',
                                    }}
                                >
                                    ✓
                                </div>
                                <span
                                    className="font-semibold text-sm"
                                    style={{ color: checked ? 'var(--color-primary)' : 'var(--color-text)' }}
                                >
                                    {dir.label}
                                </span>
                                {dir.hasBlank && checked && (
                                    <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
                                        — {dir.blankHint}
                                    </span>
                                )}
                            </button>

                            {/* Champ blank si directive sélectionnée et hasBlank */}
                            {checked && dir.hasBlank && (
                                <div
                                    className="px-4 py-2"
                                    style={{
                                        background:  'var(--color-surface)',
                                        borderTop:   '1px solid var(--color-border)',
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={found?.blankValue ?? ''}
                                        onChange={e => onBlankChange(dir.id, e.target.value)}
                                        placeholder={dir.blankHint}
                                        className="w-full text-sm"
                                        style={{
                                            background: 'transparent',
                                            border:     'none',
                                            outline:    'none',
                                            color:      'var(--color-text)',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <NavButtons
                step={5} totalSteps={7}
                onPrev={onPrev} onNext={onNext}
                disabledNext={selected.length !== 2}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 6 — Relations & Cyberware
// ─────────────────────────────────────────────────────────────────────────────

const Step6RelationsAndCyberware = ({
                                        relations, onAddRelation, onUpdateRelation, onRemoveRelation,
                                        cyberware, onAddCyberware, onRemoveCyberware,
                                        playbook, hasChromeMove,
                                        onPrev, onNext,
                                    }) => {
    const pb = PLAYBOOKS.find(p => p.id === playbook);
    const maxPicks = (pb?.defaultPicks ?? 1) + (hasChromeMove ? 1 : 0);
    const [customName, setCustomName] = useState('');

    // Cyberwares suggérés par le playbook (avec leur fiche CYBERWARE_ALL si disponible)
    const playbookSuggestions = (pb?.cyberware ?? []).map(name =>
        CYBERWARE_ALL.find(cw => cw.name === name) ?? { name, description: null, optionHint: null }
    );

    // Reste de CYBERWARE_ALL non déjà dans les suggestions du playbook
    const playbookNames   = new Set(pb?.cyberware ?? []);
    const otherCyberware  = CYBERWARE_ALL.filter(cw => !playbookNames.has(cw.name));

    const handleAddCustom = () => {
        const trimmed = customName.trim();
        if (!trimmed || cyberware.length >= maxPicks) return;
        onAddCyberware(trimmed);
        setCustomName('');
    };


    // Bouton de sélection d'un cyberware
    const CwItem = ({ cw, isSuggestion }) => {
        const selected = cyberware.includes(cw.name);
        const disabled = !selected && cyberware.length >= maxPicks;
        return (
            <button
                onClick={() => {
                    if (disabled) return;
                    selected ? onRemoveCyberware(cw.name) : onAddCyberware(cw.name);
                }}
                className="text-left rounded-lg px-3 py-2 flex items-start gap-3 transition-all w-full"
                style={{
                    background: selected
                        ? 'rgba(0,229,255,0.08)'
                        : 'var(--color-surface-alt)',
                    border:    `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    boxShadow: selected ? 'var(--cp-glow-cyan)' : 'none',
                    opacity:   disabled ? 0.4 : 1,
                    cursor:    disabled ? 'not-allowed' : 'pointer',
                }}
            >
                <span style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }}>⬡</span>
                <div className="flex-1 min-w-0">
                    <span
                        className="font-semibold text-sm block"
                        style={{ color: selected ? 'var(--color-primary)' : 'var(--color-text)' }}
                    >
                        {cw.name}
                        {pb?.mandatoryCyberware === cw.name && (
                            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-accent)' }}>
                                obligatoire
                            </span>
                        )}
                    </span>
                    {cw.description && (
                        <span className="text-xs leading-snug block mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {cw.description}
                        </span>
                    )}
                    {cw.optionHint && (
                        <span className="text-xs italic block mt-0.5" style={{ color: 'var(--color-accent)' }}>
                            {cw.optionHint}
                        </span>
                    )}
                </div>
            </button>
        );
    };

    return (
        <div className="flex flex-col gap-5">

            {/* ── Relations ─────────────────────────────────────────────── */}
            <div>
                <h2 className="text-xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                    Relations & Cyberware
                </h2>
                <p className="text-sm mt-1 mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Définis <strong style={{ color: 'var(--color-primary)' }}>2 à 3 Relations</strong> importantes
                    et choisis ton <strong style={{ color: 'var(--color-primary)' }}>cyberware</strong> de départ.
                </p>

                <Label>Relations (2 minimum)</Label>
                <div className="flex flex-col gap-2">
                    {relations.map((r, i) => (
                        <div
                            key={i}
                            className="rounded-xl p-3 flex flex-col gap-2"
                            style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
                        >
                            <div className="flex gap-2 items-center">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => onUpdateRelation(i, { link_score: Math.max(-3, (r.link_score ?? 1) - 1) })}
                                        className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center"
                                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                                    >−</button>
                                    <span
                                        className="font-mono font-bold text-sm w-8 text-center"
                                        style={{
                                            color: (r.link_score ?? 1) > 0
                                                ? 'var(--color-success)'
                                                : (r.link_score ?? 1) < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                                        }}
                                    >
                                        {(r.link_score ?? 1) > 0 ? `+${r.link_score}` : r.link_score}
                                    </span>
                                    <button
                                        onClick={() => onUpdateRelation(i, { link_score: Math.min(3, (r.link_score ?? 1) + 1) })}
                                        className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center"
                                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                                    >+</button>
                                </div>
                                <input
                                    type="text"
                                    value={r.name}
                                    onChange={e => onUpdateRelation(i, { name: e.target.value })}
                                    placeholder="Nom de la relation…"
                                    className="flex-1 rounded-lg px-2 py-1 text-sm"
                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', outline: 'none' }}
                                />
                                {relations.length > 2 && (
                                    <button
                                        onClick={() => onRemoveRelation(i)}
                                        className="text-xs"
                                        style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >✕</button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={r.description}
                                onChange={e => onUpdateRelation(i, { description: e.target.value })}
                                placeholder="Description courte (qui c'est, lien narratif)…"
                                className="w-full rounded-lg px-2 py-1 text-xs"
                                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', outline: 'none' }}
                            />
                        </div>
                    ))}

                    {relations.length < 3 && (
                        <button
                            onClick={onAddRelation}
                            className="py-2 rounded-xl text-sm"
                            style={{ background: 'var(--color-surface-alt)', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', cursor: 'pointer' }}
                        >
                            + Ajouter une relation
                        </button>
                    )}
                </div>
            </div>

            {/* ── Cyberware ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                    <Label>Cyberware ({cyberware.length}/{maxPicks} slot{maxPicks > 1 ? 's' : ''})</Label>
                    {hasChromeMove && (
                        <span className="text-xs" style={{ color: 'var(--color-success)' }}>
                            +1 slot via Chromé
                        </span>
                    )}
                </div>

                {/* Suggestions du playbook */}
                <div className="flex flex-col gap-1.5">
                    {playbookSuggestions.map(cw => (
                        <CwItem key={cw.name} cw={cw} isSuggestion />
                    ))}
                </div>

                {/* Tous les autres cyberwares */}
                {otherCyberware.length > 0 && (
                    <details>
                        <summary
                            className="text-xs cursor-pointer cp-font-ui uppercase tracking-wide py-1"
                            style={{ color: 'var(--color-text-muted)', listStyle: 'none' }}
                        >
                            ▶ Tous les cyberwares ({otherCyberware.length} autres)
                        </summary>
                        <div className="flex flex-col gap-1.5 mt-2">
                            {otherCyberware.map(cw => (
                                <CwItem key={cw.name} cw={cw} isSuggestion={false} />
                            ))}
                        </div>
                    </details>
                )}

                {/* Saisie libre — implant custom */}
                <div
                    className="flex gap-2 items-center rounded-lg px-3 py-2"
                    style={{ background: 'var(--color-surface-alt)', border: '1px dashed var(--color-border)' }}
                >
                    <input
                        type="text"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        placeholder="Implant custom…"
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--color-text)' }}
                    />
                    <button
                        onClick={handleAddCustom}
                        disabled={!customName.trim() || cyberware.length >= maxPicks}
                        className="text-xs px-3 py-1 rounded-lg flex-shrink-0"
                        style={{
                            background: (!customName.trim() || cyberware.length >= maxPicks)
                                ? 'var(--color-border)'
                                : 'var(--color-primary)',
                            color:  (!customName.trim() || cyberware.length >= maxPicks)
                                ? 'var(--color-text-muted)'
                                : 'var(--color-bg)',
                            border: 'none',
                            cursor: (!customName.trim() || cyberware.length >= maxPicks) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        + Ajouter
                    </button>
                </div>

                {/* Récap des sélections */}
                {cyberware.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {cyberware.map(name => (
                            <div
                                key={name}
                                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                                style={{
                                    background: 'rgba(0,229,255,0.1)',
                                    border:     '1px solid var(--color-primary)',
                                    color:      'var(--color-primary)',
                                }}
                            >
                                {name}
                                <button
                                    onClick={() => onRemoveCyberware(name)}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', lineHeight: 1, padding: 0 }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <NavButtons
                step={6} totalSteps={7}
                onPrev={onPrev} onNext={onNext}
                disabledNext={
                    relations.length < 2 ||
                    relations.some(r => !r.name.trim()) ||
                    cyberware.length === 0
                }
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 7 — Finalisation
// ─────────────────────────────────────────────────────────────────────────────

const Step7Finalisation = ({
                               data, playbook, stats, selectedMoveIds,
                               directives, relations, cyberware,
                               darkSecret, onDarkSecretChange,
                               onPrev, onSubmit, loading, error, created, onCreated,
                           }) => {
    const pb = PLAYBOOKS.find(p => p.id === playbook);

    if (created) {
        return (
            <div className="flex flex-col items-center gap-6 py-4 text-center">
                <div style={{ fontSize: '3rem' }}>⬡</div>
                <div>
                    <h2 className="text-2xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                        {data.prenom} {data.nom}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {pb?.label} · {data.playerName}
                    </p>
                </div>

                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Ton personnage a été créé. Note ton code d'accès — c'est le seul moyen de te reconnecter.
                </p>

                <div
                    className="rounded-2xl p-6 flex flex-col items-center gap-2 w-full max-w-xs"
                    style={{
                        background: 'var(--color-surface)',
                        border:     '2px solid var(--color-primary)',
                        boxShadow:  'var(--cp-glow-active)',
                    }}
                >
                    <span className="text-xs cp-font-ui uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                        Code d'accès
                    </span>
                    <span
                        className="font-mono font-bold text-4xl tracking-widest cp-text-glow-cyan"
                    >
                        {created.accessCode}
                    </span>
                    <CopyButton text={created.accessCode} />
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreated(created);
                    }}
                    className="px-8 py-3 rounded-xl font-bold cp-font-ui uppercase tracking-wide text-sm"
                    style={{
                        background: 'var(--color-primary)',
                        color:      'var(--color-bg)',
                        boxShadow:  'var(--cp-glow-cyan)',
                        textDecoration: 'none',
                    }}
                >
                    ⬡ Accéder à la fiche
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold cp-font-ui" style={{ color: 'var(--color-primary)' }}>
                Finalisation
            </h2>

            {/* Récap */}
            <Card>
                <div className="flex flex-col gap-2 text-sm">
                    <RecapLine label="Joueur" value={data.playerName} />
                    <RecapLine label="Personnage" value={`${data.prenom} ${data.nom}`.trim()} />
                    <RecapLine label="Playbook" value={pb?.label} />
                    <RecapLine
                        label="Stats"
                        value={STATS.map(s => `${STAT_LABELS[s]} ${stats[s] >= 0 ? '+' : ''}${stats[s]}`).join(' · ')}
                    />
                    <RecapLine label="Manœuvres" value={`${selectedMoveIds.length} sélectionnée${selectedMoveIds.length > 1 ? 's' : ''}`} />
                    <RecapLine
                        label="Directives"
                        value={directives.filter(d => d.selected).map(d => {
                            const def = DIRECTIVES_PERSONNELLES.find(x => x.id === d.id);
                            return def?.label ?? d.id;
                        }).join(' · ')}
                    />
                    <RecapLine label="Relations" value={`${relations.length} relation${relations.length > 1 ? 's' : ''}`} />
                    <RecapLine label="Cyberware" value={cyberware.join(', ') || '—'} />
                </div>
            </Card>

            {/* Dark Secret optionnel */}
            <Card>
                <div>
                    <Label>Dark Secret *(optionnel)*</Label>
                    <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        Un élément lourd du passé de ton personnage. Stable — il ne change pas en cours de campagne, il se révèle.
                    </p>
                    <textarea
                        value={darkSecret}
                        onChange={e => onDarkSecretChange(e.target.value)}
                        placeholder="Ex : ancien agent d'une megacorp retourné, identité volée, responsable involontaire d'une catastrophe…"
                        rows={3}
                        style={{
                            width:        '100%',
                            background:   'var(--color-surface-alt)',
                            border:       '1px solid var(--color-border)',
                            borderRadius: '8px',
                            padding:      '10px 12px',
                            fontSize:     '0.875rem',
                            color:        'var(--color-text)',
                            outline:      'none',
                            resize:       'vertical',
                        }}
                    />
                </div>
            </Card>

            {error && (
                <p className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>
                    {error}
                </p>
            )}

            <NavButtons
                step={7} totalSteps={7}
                onPrev={onPrev}
                onNext={onSubmit}
                loading={loading}
                onNextLabel="✦ Créer le personnage"
            />
        </div>
    );
};

// ── Helpers UI ────────────────────────────────────────────────────────────────

const RecapLine = ({ label, value }) => (
    <div className="flex gap-2">
        <span className="flex-shrink-0 w-28 text-xs cp-font-ui uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            {label}
        </span>
        <span style={{ color: 'var(--color-text)' }}>{value ?? '—'}</span>
    </div>
);

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-xs px-3 py-1 rounded-lg"
            style={{
                background: 'var(--color-surface-alt)',
                border:     '1px solid var(--color-border)',
                color:      'var(--color-text-muted)',
                cursor:     'pointer',
            }}
        >
            {copied ? '✅ Copié !' : '📋 Copier'}
        </button>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const Creation = ({ darkMode, onToggleDarkMode, onCreated, onCancel }) => {
    const { apiBase } = useSystem();

    const [step, setStep] = useState(1);

    // État de chaque étape
    const [playbook,        setPlaybook]       = useState('');
    const [identite,        setIdentite]       = useState({ playerName: '', prenom: '', nom: '', sexe: '', apparence: '' });
    const [statProfile,     setStatProfile]    = useState('');
    const [stats,           setStats]          = useState({ cran: null, pro: null, chair: null, esprit: null, style: null, synth: null });
    const [statPool,        setStatPool]       = useState([]);                   // chips disponibles
    const [selectedMoveIds, setSelectedMoveIds]= useState([]);
    const [selectedMoveObjs, setSelectedMoveObjs] = useState([]);
    const [directives,      setDirectives]     = useState(
        DIRECTIVES_PERSONNELLES.map(d => ({ id: d.id, selected: false, blankValue: '' }))
    );
    const [relations, setRelations] = useState([
        { name: '', description: '', link_score: 1 },
        { name: '', description: '', link_score: 1 },
    ]);
    const [cyberware,    setCyberware]    = useState([]);
    const [darkSecret,   setDarkSecret]  = useState('');
    const [loading,      setLoading]     = useState(false);
    const [error,        setError]       = useState(null);
    const [created,      setCreated]     = useState(null);

    // Profil → initialise les stats
    const handleProfileSelect = useCallback((profileId) => {
        setStatProfile(profileId);
        const p = STAT_PROFILES.find(x => x.id === profileId);
        if (!p) return;
        setStats({ cran: null, pro: null, chair: null, esprit: null, style: null, synth: null });
        setStatPool([...p.values].map((v, i) => ({ id: `chip-${profileId}-${i}`, value: v })));
    }, []);

    // Toggle move
    const handleToggleMove = useCallback((moveId, moveObj) => {
        setSelectedMoveIds(prev => {
            if (prev.includes(moveId)) {
                setSelectedMoveObjs(objs => objs.filter(m => m.id !== moveId));
                return prev.filter(id => id !== moveId);
            } else {
                if (moveObj) setSelectedMoveObjs(objs => [...objs, moveObj]);
                return [...prev, moveId];
            }
        });
    }, []);

    // Directives
    const handleToggleDirective = useCallback((id) => {
        setDirectives(prev => prev.map(d =>
            d.id === id ? { ...d, selected: !d.selected } : d
        ));
    }, []);
    const handleBlankChange = useCallback((id, value) => {
        setDirectives(prev => prev.map(d => d.id === id ? { ...d, blankValue: value } : d));
    }, []);

    // Relations
    const addRelation    = () => setRelations(prev => [...prev, { name: '', description: '', link_score: 1 }]);
    const removeRelation = (i) => setRelations(prev => prev.filter((_, j) => j !== i));
    const updateRelation = (i, updates) => setRelations(prev => prev.map((r, j) => j === i ? { ...r, ...updates } : r));

    // Cyberware — check si Chromé est dans les moves sélectionnés
    const hasChromeMove = selectedMoveObjs.some(m => m.name === 'Chromé' || m.name === 'Plus machine qu\'homme'); // sera déterminé après chargement des moves si nécessaire

    const addCyberware    = (name) => setCyberware(prev => [...prev, name]);
    const removeCyberware = (name) => setCyberware(prev => prev.filter(c => c !== name));

    // Playbook change → reset cyberware
    const handlePlaybookSelect = (pb) => {
        setPlaybook(pb);
        setSelectedMoveIds([]);
        setSelectedMoveObjs([]);
        setCyberware([]);
        // Cyberware obligatoire (Nomad)
        const pbDef = PLAYBOOKS.find(p => p.id === pb);
        if (pbDef?.mandatoryCyberware) {
            setCyberware([pbDef.mandatoryCyberware]);
        }
    };

    // Submit
    const handleSubmit = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            const selectedDirs = directives.filter(d => d.selected).map(d => ({
                type:       'personal',
                text:       DIRECTIVES_PERSONNELLES.find(x => x.id === d.id)?.label ?? d.id,
                blankValue: d.blankValue ?? '',
                completed:  false,
            }));

            const body = {
                playerName: identite.playerName.trim(),
                prenom:     identite.prenom.trim(),
                nom:        identite.nom.trim(),
                sexe:       identite.sexe,
                apparence:  identite.apparence,
                playbook,
                cran:       stats.cran   ?? 0,
                pro:        stats.pro    ?? 0,
                chair:      stats.chair  ?? 0,
                esprit:     stats.esprit ?? 0,
                style:      stats.style  ?? 0,
                synth:      stats.synth  ?? 0,
                darkSecret,
                directives: selectedDirs,
                relations:  relations.map(r => ({ ...r })),
                cyberware:  cyberware.map(name => ({ name, option_text: '', notes: '', tags: [] })),
                moves:      selectedMoveIds.map(id => ({ id })),
            };

            const res = await fetch(`${apiBase}/characters`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? 'Erreur lors de la création');
            }

            const char = await res.json();
            setCreated(char);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [loading, identite, playbook, stats, darkSecret, directives, relations, cyberware, selectedMoveIds, apiBase]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className="min-h-screen flex items-start justify-center px-4 py-8"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            data-theme={darkMode ? 'dark' : undefined}
        >
            <div className="w-full max-w-2xl flex flex-col gap-0">

                {/* ── Header ───────────────────────────────────────────── */}
                <div className="text-center mb-6">
                    <div
                        className="text-4xl font-black cp-font-title text-accent tracking-widest"
                        style={{ textShadow: '0 0 25px rgba(0,229,255,0.6)' }}
                    >
                        CyberPunk
                    </div>
                    <p className="text-xs mt-1 cp-font-ui uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                        The Sprawl — Création de personnage
                    </p>
                </div>

                {/* ── Card wizard ──────────────────────────────────────── */}
                <div
                    className="rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                        background: 'var(--color-surface)',
                        border:     '1px solid var(--color-border)',
                    }}
                >
                    {/* StepBar */}
                    <div
                        className="px-6 py-4"
                        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}
                    >
                        <StepBar current={step} />
                    </div>

                    {/* Contenu de l'étape */}
                    <div className="px-6 py-6">
                        {step === 1 && (
                            <Step1Playbook
                                selected={playbook}
                                onSelect={handlePlaybookSelect}
                                onNext={() => setStep(2)}
                            />
                        )}
                        {step === 2 && (
                            <Step2Identite
                                data={identite}
                                onChange={(field, val) => setIdentite(prev => ({ ...prev, [field]: val }))}
                                onPrev={() => setStep(1)}
                                onNext={() => setStep(3)}
                            />
                        )}
                        {step === 3 && (
                            <Step3Stats
                                profile={statProfile}
                                stats={stats}
                                pool={statPool}
                                onProfileSelect={handleProfileSelect}
                                onDrop={(stat, chipId) => {
                                    const chip = statPool.find(c => c.id === chipId);
                                    if (!chip || stats[stat] !== null) return;
                                    setStats(prev => ({ ...prev, [stat]: chip.value }));
                                    setStatPool(prev => prev.filter(c => c.id !== chipId));
                                }}
                                onReturn={(stat) => {
                                    const val = stats[stat];
                                    if (val === null) return;
                                    setStatPool(prev => [...prev, { id: `chip-returned-${stat}-${Date.now()}`, value: val }]);
                                    setStats(prev => ({ ...prev, [stat]: null }));
                                }}
                                onPrev={() => setStep(2)}
                                onNext={() => setStep(4)}
                            />
                        )}
                        {step === 4 && (
                            <Step4Moves
                                playbook={playbook}
                                selectedMoveIds={selectedMoveIds}
                                onToggleMove={handleToggleMove}
                                onPrev={() => setStep(3)}
                                onNext={() => setStep(5)}
                            />
                        )}
                        {step === 5 && (
                            <Step5Directives
                                directives={directives}
                                onToggle={handleToggleDirective}
                                onBlankChange={handleBlankChange}
                                onPrev={() => setStep(4)}
                                onNext={() => setStep(6)}
                            />
                        )}
                        {step === 6 && (
                            <Step6RelationsAndCyberware
                                relations={relations}
                                onAddRelation={addRelation}
                                onUpdateRelation={updateRelation}
                                onRemoveRelation={removeRelation}
                                cyberware={cyberware}
                                onAddCyberware={addCyberware}
                                onRemoveCyberware={removeCyberware}
                                playbook={playbook}
                                hasChromeMove={hasChromeMove}
                                onPrev={() => setStep(5)}
                                onNext={() => setStep(7)}
                            />
                        )}
                        {step === 7 && (
                            <Step7Finalisation
                                data={identite}
                                playbook={playbook}
                                stats={stats}
                                selectedMoveIds={selectedMoveIds}
                                directives={directives}
                                relations={relations}
                                cyberware={cyberware}
                                darkSecret={darkSecret}
                                onDarkSecretChange={setDarkSecret}
                                onPrev={() => setStep(6)}
                                onSubmit={handleSubmit}
                                loading={loading}
                                error={error}
                                created={created}
                                onCreated={onCreated}
                            />
                        )}
                    </div>
                </div>

                {/* Lien annuler */}
                {!created && onCancel && (
                    <button
                        onClick={onCancel}
                        className="mt-4 text-xs text-center w-full"
                        style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        ← Retour à l'accueil
                    </button>
                )}
            </div>
        </div>
    );
};

export default Creation;