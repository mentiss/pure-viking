/**
 * DiceModal.jsx — Noctis Solis
 *
 * Corrections fonctionnelles :
 *   - useFetch : const fetchWithAuth = useFetch() (pas de destructuring)
 *   - sessionId : activeSession est l'integer directement, pas un objet
 *   - Réserves : patch après jet (effort + débord sang-froid), réserve groupe
 *   - Relancer : même pool, réserves non re-patchées
 *
 * Suppressions : champ label (auto-généré), champ threshold (hors système)
 *
 * Nouvelles fonctionnalités :
 *   - Layout collapsible (stat / spécialité / réserve perso / réserve groupe)
 *   - Affichage conditionnel selon preset (stat ou specialty masque la section)
 *   - Overflow effort → sang-froid automatique
 *   - Résultat en dés hexagonaux + compteur Rajdhani
 */

import { useState } from 'react';
import { useSystem }       from '../../../../hooks/useSystem.js';
import { useFetch }        from '../../../../hooks/useFetch.js';
import { roll, RollError } from '../../../../tools/diceEngine.js';
import { useGroupReserve } from '../../hooks/useGroupReserve.jsx';
import noctisConfig, {
    DOMAINES, STAT_LABELS, SPECIALTY_NIVEAUX, computeMalusBlessure,
} from '../../config.jsx';

/* ── Mapping stat → réserve primaire ────────────────────────────────────────── */
const STAT_RESERVE = Object.fromEntries(
    Object.entries(DOMAINES).flatMap(([key, dom]) =>
        dom.stats.map(stat => [stat, ['physique', 'manuel'].includes(key) ? 'effort' : 'sangfroid'])
    )
);

/* ── Collapsible ─────────────────────────────────────────────────────────────── */
const Collapsible = ({ label, summary, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-default last:border-b-0">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left
                           hover:bg-surface-alt transition-colors"
            >
                <span style={{ color: 'var(--color-muted)', fontSize: '0.6rem' }}>
                    {open ? '▾' : '▸'}
                </span>
                <span className="ns-stat-label flex-1">{label}</span>
                {!open && summary !== undefined && (
                    <span className="ns-stat-label" style={{ color: 'var(--ns-ornament)' }}>
                        {summary}
                    </span>
                )}
            </button>
            {open && <div className="px-3 pb-3">{children}</div>}
        </div>
    );
};

/* ── Hexagone de dé ──────────────────────────────────────────────────────────── */
const DieFace = ({ value }) => {
    const bg    = value >= 10 ? 'var(--ns-ornament)'
        : value >= 7  ? 'var(--color-success)'
            :               'var(--color-surface-alt)';
    const color = value >= 7  ? 'var(--color-bg)' : 'var(--color-muted)';
    return (
        <div style={{
            width:          '2.4rem',
            height:         '2.4rem',
            clipPath:       'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            background:     bg,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontFamily:     'var(--ns-font-tech)',
            fontWeight:     700,
            fontSize:       '0.85rem',
            color,
            flexShrink:     0,
        }}>
            {value}
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════════ */
const DiceModal = ({ character, activeSession, preset = null, onClose, onPatch }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();                        // ← pas de destructuring
    const { groupReserve, hasSession, applyFluctuation } = useGroupReserve();

    /* ── État ─────────────────────────────────────────────────────────────── */
    const [selectedStat, setSelectedStat] = useState(preset?.stat ?? 'force');

    const [selectedSpecIdx, setSelectedSpecIdx] = useState(() => {
        if (!preset?.specialty) return null;
        const idx = (character.specialties ?? []).findIndex(
            s => s.name === preset.specialty.name
        );
        return idx >= 0 ? idx : null;
    });

    const [reserveSpent,      setReserveSpent]      = useState(0);
    const [groupReserveSpent, setGroupReserveSpent] = useState(0);
    const [rolling,           setRolling]           = useState(false);
    const [result,            setResult]            = useState(null);

    /* ── Dérivés ──────────────────────────────────────────────────────────── */
    const specialty  = selectedSpecIdx !== null
        ? (character.specialties?.[selectedSpecIdx] ?? null)
        : null;

    const specBonus  = specialty ? (SPECIALTY_NIVEAUX[specialty.niveau]?.bonus      ?? 0) : 0;
    const reserveCap = specialty ? (SPECIALTY_NIVEAUX[specialty.niveau]?.reserveMax ?? 1) : 1;

    const primary   = STAT_RESERVE[selectedStat] ?? 'effort';
    const secondary = primary === 'effort' ? 'sangfroid' : 'effort';

    const primaryKey   = `reserve_${primary}_current`;
    const secondaryKey = `reserve_${secondary}_current`;

    const primaryCurrent   = character[primaryKey]   ?? 0;
    const secondaryCurrent = character[secondaryKey] ?? 0;
    const reserveAvailable = primaryCurrent + secondaryCurrent;
    const reserveMax       = Math.min(reserveCap, reserveAvailable);

    const groupCurrent = groupReserve.current ?? 0;

    const malus     = computeMalusBlessure(character);
    const statValue = character[selectedStat] ?? 1;
    const pool      = Math.max(1,
        statValue + specBonus + reserveSpent + groupReserveSpent + malus
    );

    const autoLabel = [STAT_LABELS[selectedStat], specialty?.name].filter(Boolean).join(' + ');

    /* Spécialités disponibles (non dormantes) */
    const availableSpecs = (character.specialties ?? [])
        .map((s, i) => ({ ...s, idx: i }))
        .filter(s => s.is_dormant !== 1);

    /* ── Handlers ─────────────────────────────────────────────────────────── */
    const handleStatChange = (stat) => {
        setSelectedStat(stat);
        setReserveSpent(0);    // reset — la réserve primaire peut changer
    };

    const handleSpecChange = (idx) => {
        setSelectedSpecIdx(idx);
        setReserveSpent(0);    // reset — le cap réserve peut changer
    };

    /* ── Jet ──────────────────────────────────────────────────────────────── */
    const doRoll = async (patchReserves = true) => {
        if (rolling) return;
        setRolling(true);
        setResult(null);

        try {
            const notation = noctisConfig.dice.buildNotation({ systemData: { pool } });

            const res = await roll(
                notation,
                {
                    apiBase,
                    fetchFn:       fetchWithAuth,
                    characterId:   character.id,
                    characterName: `${character.prenom ?? ''} ${character.nom ?? ''}`.trim(),
                    sessionId:     activeSession ?? null,   // ← integer direct
                    label:         autoLabel,
                    systemData:    { pool, threshold: null },
                },
                noctisConfig.dice,
            );

            setResult(res);

            /* Patch réserves perso — seulement au premier jet */
            if (patchReserves && reserveSpent > 0) {
                const fromPrimary   = Math.min(reserveSpent, primaryCurrent);
                const fromSecondary = reserveSpent - fromPrimary;
                await onPatch({
                    ...(fromPrimary   > 0 && { [primaryKey]:   primaryCurrent   - fromPrimary   }),
                    ...(fromSecondary > 0 && { [secondaryKey]: secondaryCurrent - fromSecondary }),
                });
            }

            /* Patch réserve groupe — seulement au premier jet */
            if (patchReserves && groupReserveSpent > 0) {
                await applyFluctuation(-groupReserveSpent, `Jet — ${autoLabel}`);
            }

        } catch (err) {
            if (err instanceof RollError) {
                console.warn('[noctis] RollError:', err.code, err.message);
            } else {
                console.error('[noctis] roll error:', err);
            }
        } finally {
            setRolling(false);
        }
    };

    const handleRoll     = ()  => doRoll(true);
    const handleRelancer = ()  => { setResult(null); doRoll(true); };

    /* ── Pool — décomposition ─────────────────────────────────────────────── */
    const poolParts = [
        { label: STAT_LABELS[selectedStat], value: statValue,         color: `var(--color-${DOMAINES[Object.keys(DOMAINES).find(k => DOMAINES[k].stats.includes(selectedStat))]?.color ?? 'primary'})` },
        specBonus > 0         && { label: 'Spé',       value: `+${specBonus}`,         color: 'var(--ns-ornament)' },
        reserveSpent > 0      && { label: 'Réserve',   value: `+${reserveSpent}`,      color: `var(--ns-${primary})` },
        groupReserveSpent > 0 && { label: 'Compagnie', value: `+${groupReserveSpent}`, color: 'var(--color-accent)' },
        malus < 0             && { label: 'Blessure',  value: malus,                   color: 'var(--color-danger)' },
    ].filter(Boolean);

    /* ── Couleur du compteur de succès ───────────────────────────────────── */
    const successColor = !result ? undefined
        : result.successes === 0 ? 'var(--color-muted)'
            : result.successes <= 2  ? 'var(--color-default)'
                :                          'var(--color-success)';

    /* ══════════════════════════════════════════════════════════════════════ */
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--color-bg) 82%, transparent)',
                backdropFilter: 'blur(3px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="ns-card ns-paper w-full shadow-2xl"
                style={{ maxWidth: '24rem', maxHeight: '90vh',
                    overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-default"
                     style={{ flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--ns-font-title)', fontSize: '0.6rem',
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        color: 'var(--ns-ornament)' }}>
                        Jet — {autoLabel}
                    </span>
                    <button onClick={onClose}
                            className="text-muted hover:text-default text-sm transition-colors ml-3 shrink-0">
                        ✕
                    </button>
                </div>

                {/* ── PHASE RÉSULTAT ─────────────────────────────────────── */}
                {result ? (
                    <div className="flex flex-col items-center gap-5 px-4 py-6">

                        {/* Dés hexagonaux */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {result.values.map((v, i) => <DieFace key={i} value={v} />)}
                        </div>

                        {/* Compteur succès */}
                        <div className="text-center">
                            <div style={{ fontFamily: 'var(--ns-font-tech)', fontWeight: 700,
                                fontSize: '4rem', lineHeight: 1, color: successColor }}>
                                {result.successes}
                            </div>
                            <div style={{ fontFamily: 'var(--ns-font-title)', fontSize: '0.55rem',
                                letterSpacing: '0.22em', textTransform: 'uppercase',
                                color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                                {result.successes === 0 ? 'Aucun succès' : 'Succès'}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 w-full">
                            <button onClick={handleRelancer} disabled={rolling}
                                    className="ns-btn-ghost flex-1">
                                {rolling ? '…' : '⬡ Relancer'}
                            </button>
                            <button onClick={onClose} className="ns-btn-primary flex-1">
                                Fermer
                            </button>
                        </div>
                    </div>

                ) : (
                    /* ── PHASE CONFIGURATION ─────────────────────────────── */
                    <>
                        {/* ─ Sélection stat — masquée si preset.stat ─ */}
                        {!preset?.stat && (
                            <Collapsible
                                label="Caractéristique"
                                summary={`${STAT_LABELS[selectedStat]} ${statValue}`}
                                defaultOpen
                            >
                                <div className="grid grid-cols-4 gap-1 pt-1">
                                    {Object.entries(DOMAINES).map(([, dom]) =>
                                        dom.stats.map(stat => {
                                            const active = selectedStat === stat;
                                            return (
                                                <button key={stat}
                                                        onClick={() => handleStatChange(stat)}
                                                        className="rounded-sm border transition-colors text-center py-1.5"
                                                        style={{
                                                            borderColor: active
                                                                ? `var(--color-${dom.color})`
                                                                : 'var(--color-border)',
                                                            background: active
                                                                ? `color-mix(in srgb, var(--color-${dom.color}) 14%, transparent)`
                                                                : 'var(--color-surface-alt)',
                                                        }}
                                                >
                                                    <div style={{
                                                        fontFamily:    'var(--ns-font-tech)',
                                                        fontSize:      '0.55rem',
                                                        fontWeight:    500,
                                                        letterSpacing: '0.04em',
                                                        color:         active
                                                            ? `var(--color-${dom.color})`
                                                            : 'var(--color-muted)',
                                                    }}>
                                                        {STAT_LABELS[stat]}
                                                    </div>
                                                    <div style={{
                                                        fontFamily: 'var(--ns-font-tech)',
                                                        fontWeight: 700,
                                                        fontSize:   '1.1rem',
                                                        lineHeight: 1.1,
                                                        color:      active
                                                            ? `var(--color-${dom.color})`
                                                            : 'var(--color-muted)',
                                                    }}>
                                                        {character[stat] ?? 1}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </Collapsible>
                        )}

                        {/* ─ Spécialité — masquée si preset.specialty ou aucune dispo ─ */}
                        {!preset?.specialty && availableSpecs.length > 0 && (
                            <Collapsible
                                label="Spécialité"
                                summary={specialty
                                    ? `${specialty.name} +${specBonus}D`
                                    : 'aucune'}
                                defaultOpen={!!preset?.stat && !preset?.specialty}
                            >
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {/* Pill "Aucune" */}
                                    <button
                                        onClick={() => handleSpecChange(null)}
                                        className="ns-niveau-badge"
                                        style={{
                                            color:       selectedSpecIdx === null ? 'var(--ns-ornament)' : 'var(--color-muted)',
                                            borderColor: selectedSpecIdx === null ? 'var(--ns-ornament)' : 'var(--color-border)',
                                        }}
                                    >
                                        Aucune
                                    </button>

                                    {availableSpecs.map(s => {
                                        const active  = selectedSpecIdx === s.idx;
                                        const isFrac  = s.type === 'fracture';
                                        const clr     = isFrac ? 'var(--ns-fracture)' : 'var(--ns-ornament)';
                                        const bonus   = SPECIALTY_NIVEAUX[s.niveau]?.bonus ?? 0;
                                        return (
                                            <button
                                                key={s.idx}
                                                onClick={() => handleSpecChange(s.idx)}
                                                className="ns-niveau-badge"
                                                style={{
                                                    color:       active ? clr : 'var(--color-muted)',
                                                    borderColor: active ? clr : 'var(--color-border)',
                                                }}
                                            >
                                                {s.name} +{bonus}D
                                            </button>
                                        );
                                    })}
                                </div>
                            </Collapsible>
                        )}

                        {/* ─ Réserve perso ─ */}
                        <Collapsible
                            label="Réserve"
                            summary={reserveSpent > 0
                                ? `+${reserveSpent}`
                                : `${primaryCurrent + secondaryCurrent} dispo`}
                            defaultOpen={false}
                        >
                            <div className="space-y-2 pt-1">
                                {/* Disponible */}
                                <div className="flex justify-between text-xs"
                                     style={{ fontFamily: 'var(--ns-font-tech)' }}>
                                    <span style={{ color: 'var(--color-muted)' }}>
                                        {primary === 'effort' ? 'Effort' : 'Sang-Froid'}{' '}
                                        <strong style={{ color: `var(--ns-${primary})` }}>
                                            {primaryCurrent}
                                        </strong>
                                    </span>
                                    <span style={{ color: 'var(--color-muted)' }}>
                                        {secondary === 'effort' ? 'Effort' : 'Sang-Froid'}{' '}
                                        <strong style={{ color: `var(--ns-${secondary})` }}>
                                            {secondaryCurrent}
                                        </strong>
                                    </span>
                                </div>

                                {/* Contrôle − / valeur / + */}
                                <div className="flex items-center gap-3 justify-center">
                                    <button
                                        onClick={() => setReserveSpent(v => Math.max(0, v - 1))}
                                        disabled={reserveSpent === 0}
                                        className="ns-btn-ghost"
                                        style={{ padding: '0.2rem 0.75rem' }}
                                    >−</button>
                                    <span style={{ fontFamily: 'var(--ns-font-tech)', fontSize: '1.5rem',
                                        fontWeight: 700, color: 'var(--ns-ornament)',
                                        minWidth: '2rem', textAlign: 'center' }}>
                                        {reserveSpent}
                                    </span>
                                    <button
                                        onClick={() => setReserveSpent(v => Math.min(reserveMax, v + 1))}
                                        disabled={reserveSpent >= reserveMax}
                                        className="ns-btn-ghost"
                                        style={{ padding: '0.2rem 0.75rem' }}
                                    >+</button>
                                </div>

                                {/* Débord visible */}
                                {reserveSpent > primaryCurrent && (
                                    <p className="text-center text-xs italic"
                                       style={{ color: `var(--ns-${secondary})` }}>
                                        Débord → {secondary === 'effort' ? 'Effort' : 'Sang-Froid'} :
                                        {' '}{reserveSpent - primaryCurrent} pt
                                    </p>
                                )}
                            </div>
                        </Collapsible>

                        {/* ─ Réserve de groupe — masquée si pas de session ─ */}
                        {hasSession && (
                            <Collapsible
                                label="Compagnie"
                                summary={groupReserveSpent > 0
                                    ? `+${groupReserveSpent}`
                                    : `${groupCurrent} disponible${groupCurrent > 1 ? 's' : ''}`}
                                defaultOpen={false}
                            >
                                <div className="flex items-center gap-3 justify-center pt-1">
                                    <button
                                        onClick={() => setGroupReserveSpent(v => Math.max(0, v - 1))}
                                        disabled={groupReserveSpent === 0}
                                        className="ns-btn-ghost"
                                        style={{ padding: '0.2rem 0.75rem' }}
                                    >−</button>
                                    <span style={{ fontFamily: 'var(--ns-font-tech)', fontSize: '1.5rem',
                                        fontWeight: 700, color: 'var(--color-accent)',
                                        minWidth: '2rem', textAlign: 'center' }}>
                                        {groupReserveSpent}
                                    </span>
                                    <button
                                        onClick={() => setGroupReserveSpent(v => Math.min(groupCurrent, v + 1))}
                                        disabled={groupReserveSpent >= groupCurrent}
                                        className="ns-btn-ghost"
                                        style={{ padding: '0.2rem 0.75rem' }}
                                    >+</button>
                                </div>
                            </Collapsible>
                        )}

                        {/* ─ Malus blessure — visible seulement si actif ─ */}
                        {malus < 0 && (
                            <div className="flex items-center justify-between px-3 py-2 border-b border-default">
                                <span className="ns-stat-label" style={{ color: 'var(--color-danger)' }}>
                                    ⚠ Malus blessure
                                </span>
                                <span style={{ fontFamily: 'var(--ns-font-tech)', fontWeight: 700,
                                    color: 'var(--color-danger)' }}>
                                    {malus}
                                </span>
                            </div>
                        )}

                        {/* ─ Résumé pool + bouton lancer ─ */}
                        <div className="px-3 py-3 space-y-2" style={{ flexShrink: 0 }}>
                            {/* Décomposition inline */}
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 justify-center"
                                 style={{ fontFamily: 'var(--ns-font-tech)', fontSize: '0.75rem' }}>
                                {poolParts.map((p, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                        {i > 0 && (
                                            <span style={{ color: 'var(--color-muted)' }}>+</span>
                                        )}
                                        <span style={{ color: p.color, fontWeight: 600 }}>
                                            {p.value}
                                        </span>
                                        <span style={{ color: 'var(--color-muted)', fontSize: '0.6rem' }}>
                                            {p.label}
                                        </span>
                                    </span>
                                ))}
                                <span style={{ color: 'var(--color-muted)' }}>=</span>
                                <span style={{ color: 'var(--ns-ornament)', fontWeight: 700,
                                    fontSize: '1rem' }}>
                                    {pool}D10
                                </span>
                            </div>

                            {/* Bouton lancer */}
                            <button
                                onClick={handleRoll}
                                disabled={rolling}
                                className="ns-btn-primary w-full"
                                style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}
                            >
                                {rolling ? 'Lancer…' : `⬡ Lancer ${pool}D10`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DiceModal;