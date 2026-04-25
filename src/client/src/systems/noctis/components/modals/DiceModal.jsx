import { useState } from 'react';
import { useSystem }        from '../../../../hooks/useSystem.js';
import { roll, RollError }   from '../../../../tools/diceEngine.js';
import noctisConfig, { DOMAINES, STAT_LABELS, SPECIALTY_NIVEAUX, computeMalusBlessure } from '../../config.jsx';
import {useFetch} from "../../../../hooks/useFetch.js";

const DiceModal = ({ character, activeSession, preset = null, onClose }) => {
    const { apiBase }   = useSystem();
    const { fetchWithAuth } = useFetch();

    // Pool construction
    const [selectedStat, setSelectedStat] = useState(
        preset?.stat ?? 'force'
    );
    const [selectedSpecialty, setSelectedSpecialty] = useState(() => {
        if (!preset?.specialty) return null;
        const idx = (character.specialties ?? []).findIndex(
            s => s.name === preset.specialty.name
        );
        return idx >= 0 ? idx : null;
    });
    const [reserveSpent,      setReserveSpent]      = useState(0);
    const [threshold,         setThreshold]         = useState('');   // optionnel, post-roll
    const [label,             setLabel]             = useState('');
    const [rolling,           setRolling]           = useState(false);
    const [result,            setResult]            = useState(null);

    const malus       = computeMalusBlessure(character);
    const statValue   = character[selectedStat] ?? 1;

    const specialty   = selectedSpecialty !== null
        ? character.specialties?.[selectedSpecialty]
        : null;
    const specBonus   = specialty ? SPECIALTY_NIVEAUX[specialty.niveau]?.bonus ?? 0 : 0;
    const reserveMax  = specialty ? SPECIALTY_NIVEAUX[specialty.niveau]?.reserveMax ?? 1 : 1;

    const pool = Math.max(1, statValue + specBonus + reserveSpent + malus);



    const handleRoll = async () => {
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
                    characterName: character.prenom ?? character.nom,
                    sessionId:     activeSession?.id ?? null,
                    label:         label || `${STAT_LABELS[selectedStat]}${specialty ? ` + ${specialty.name}` : ''}`,
                    systemData:    {
                        pool,
                        threshold: threshold !== '' ? parseInt(threshold, 10) : null,
                    },
                },
                noctisConfig.dice,
            );
            setResult(res);
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

    const dieColor = (face) => {
        if (face >= 10) return 'bg-primary text-accent';
        if (face >= 7)  return 'bg-success text-bg';
        return 'bg-surface-alt text-muted';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
            <div className="bg-surface border border-default rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                <div className="flex justify-between items-center">
                    <h2 className="text-primary font-bold text-lg uppercase tracking-wide">
                        Lancer les dés
                    </h2>
                    <button onClick={onClose} className="text-muted hover:text-default">✕</button>
                </div>

                {/* Label */}
                <input
                    placeholder="Description du jet (optionnel)"
                    className="w-full bg-surface-alt border border-default rounded px-3 py-1.5 text-sm text-default"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                />

                {/* Sélection caractéristique */}
                <div>
                    <label className="text-muted text-xs uppercase">Caractéristique</label>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                        {Object.entries(DOMAINES).map(([, domaine]) =>
                            domaine.stats.map(stat => (
                                <button
                                    key={stat}
                                    onClick={() => setSelectedStat(stat)}
                                    className={`py-1 text-xs rounded border transition-colors ${
                                        selectedStat === stat
                                            ? 'bg-primary border-primary text-bg font-bold'
                                            : 'bg-surface-alt border-default text-muted'
                                    }`}
                                >
                                    {STAT_LABELS[stat]}<br />
                                    <span className="font-bold">{character[stat] ?? 1}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Sélection spécialité */}
                <div>
                    <label className="text-muted text-xs uppercase">Spécialité</label>
                    {/* Spécialités actives — chips */}
                    {(() => {
                        const activeSpecs = (character.specialties ?? [])
                            .map((s, i) => ({ ...s, _idx: i }))
                            .filter(s => !(s.type === 'fracture' && s.is_dormant));

                        if (activeSpecs.length === 0) return null;

                        return (
                            <div>
                                <label className="text-muted text-xs uppercase tracking-widest">
                                    Spécialité
                                </label>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {/* Chip "Aucune" */}
                                    <button
                                        onClick={() => { setSelectedSpecialty(null); setReserveSpent(0); }}
                                        className={`px-2 py-1 text-xs rounded-sm border transition-colors
                        ${selectedSpecialty === null
                                            ? 'border-default text-default bg-surface-alt'
                                            : 'border-default text-muted hover:text-default'}`}
                                    >
                                        Aucune
                                    </button>
                                    {activeSpecs.map(s => {
                                        const bonus = SPECIALTY_NIVEAUX[s.niveau]?.bonus ?? 0;
                                        const isSelected = selectedSpecialty === s._idx;
                                        const isFracture = s.type === 'fracture';
                                        return (
                                            <button
                                                key={s._idx}
                                                onClick={() => {
                                                    setSelectedSpecialty(isSelected ? null : s._idx);
                                                    setReserveSpent(0);
                                                }}
                                                className="px-2 py-1 text-xs rounded-sm border transition-colors"
                                                style={{
                                                    borderColor: isSelected
                                                        ? (isFracture ? 'var(--ns-fracture)' : 'var(--color-primary)')
                                                        : 'var(--color-border)',
                                                    background: isSelected
                                                        ? (isFracture
                                                            ? 'color-mix(in srgb, var(--ns-fracture) 15%, transparent)'
                                                            : 'color-mix(in srgb, var(--color-primary) 15%, transparent)')
                                                        : 'transparent',
                                                    color: isSelected
                                                        ? (isFracture ? 'var(--ns-fracture)' : 'var(--color-primary)')
                                                        : 'var(--color-muted)',
                                                }}
                                            >
                                                {s.name}
                                                <span className="ml-1 opacity-70">+{bonus}D</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Dépense de réserve */}
                <div>
                    <label className="text-muted text-xs uppercase">
                        Dépense de réserve (max {reserveMax}D)
                    </label>
                    <div className="flex gap-2 mt-1">
                        {Array.from({ length: reserveMax + 1 }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => setReserveSpent(i)}
                                className={`flex-1 py-1 text-sm rounded border transition-colors ${
                                    reserveSpent === i
                                        ? 'bg-secondary border-secondary text-bg font-bold'
                                        : 'bg-surface-alt border-default text-muted'
                                }`}
                            >
                                +{i}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Résumé pool */}
                <div className="bg-surface-alt rounded p-3 text-center">
                    <div className="text-muted text-xs space-x-2">
                        <span>Stat <strong className="text-default">{statValue}</strong></span>
                        {specBonus > 0 && <span>+ Spé <strong className="text-primary">{specBonus}</strong></span>}
                        {reserveSpent > 0 && <span>+ Réserve <strong className="text-secondary">{reserveSpent}</strong></span>}
                        {malus < 0 && <span>+ Malus <strong className="text-danger">{malus}</strong></span>}
                    </div>
                    <p className="text-primary font-bold text-3xl mt-1">{pool}D10</p>
                </div>

                {/* Difficulté optionnelle */}
                <div>
                    <label className="text-muted text-xs uppercase">
                        Seuil de difficulté (optionnel — annoncé après le jet)
                    </label>
                    <input type="number" min="0" max="10"
                           className="w-full bg-surface-alt border border-default rounded px-2 py-1 text-sm text-default mt-1"
                           value={threshold}
                           onChange={e => setThreshold(e.target.value)}
                           placeholder="Laisser vide si non connu"
                    />
                </div>

                {/* Bouton de jet */}
                <button
                    onClick={handleRoll}
                    disabled={rolling}
                    className="w-full py-3 rounded-lg bg-primary text-accent font-bold text-lg disabled:opacity-50"
                >
                    {rolling ? 'Lancer…' : `Lancer ${pool}D10`}
                </button>

                {/* Résultat */}
                {result && (
                    <div className="bg-surface-alt rounded-lg p-4 space-y-3">
                        {/* Dés */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {result.values.map((face, i) => (
                                <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${dieColor(face)}`}>
                                    {face}
                                </div>
                            ))}
                        </div>

                        {/* Succès */}
                        <div className="text-center">
                            <p className="text-muted text-xs uppercase">Succès</p>
                            <p className="text-primary font-bold text-4xl">{result.successes}</p>
                        </div>

                        {/* Marge si seuil renseigné */}
                        {result.threshold != null && (
                            <div className="text-center border-t border-default pt-2">
                                <p className="text-muted text-xs">
                                    Seuil {result.threshold} —{' '}
                                    {result.margin < 0
                                        ? <span className="text-danger font-bold">Échec ({result.margin})</span>
                                        : result.margin === 0
                                            ? <span className="text-secondary font-bold">Réussite simple</span>
                                            : <span className="text-success font-bold">+{result.margin} Marge</span>
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiceModal;