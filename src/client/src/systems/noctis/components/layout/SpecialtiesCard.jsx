import { useState } from 'react';
import {
    SPECIALTY_TYPES,
    SPECIALTY_NIVEAUX,
    SPECIALTIES_REFERENCE,
} from '../../config.jsx';

const TYPE_OPTIONS  = Object.entries(SPECIALTY_TYPES);
const NIVEAU_OPTIONS = Object.entries(SPECIALTY_NIVEAUX);
const NIVEAU_COLORS = {
    debutant: 'var(--color-muted)',
    confirme: 'var(--ns-ornament)',
    expert:   'var(--color-accent)',
};

// ── Ligne spécialité ──────────────────────────────────────────────────────────
const SpecialtyRow = ({ spec, editMode, onRemove, onChangeNiveau, onToggleDormant, onRoll }) => {
    const [showNotes, setShowNotes] = useState(false);
    const niveauData    = SPECIALTY_NIVEAUX[spec.niveau];
    const isFractureType = spec.type === 'fracture';
    const isDormant      = isFractureType && spec.is_dormant;

    return (
        <li className={`space-y-1 ${isFractureType ? 'ns-faille' : ''}`}>
            <div className="flex items-center gap-2 py-1 group">

                {/* Badge type */}
                {isFractureType ? (
                    isDormant
                        ? <span className="ns-fracture-badge-dormant shrink-0">DORMANT</span>
                        : <span className="ns-fracture-badge shrink-0">FRACTURE</span>
                ) : spec.type !== 'normale' ? (
                    <span className="shrink-0 text-muted text-xs font-bold opacity-60">
                        [{SPECIALTY_TYPES[spec.type]?.badge}]
                    </span>
                ) : null}

                {/* Nom */}
                <span className={`ns-item-name flex-1 leading-snug
                    ${isDormant ? 'italic' : ''}`}
                      style={{
                          ...(isFractureType && !isDormant ? { color: 'var(--ns-fracture)' }   : {}),
                          ...(isDormant                   ? { color: 'var(--color-muted)' }    : {}),
                          ...(!isFractureType && !isDormant ? { color: 'var(--color-default)' } : {}),
                      }}
                >
                    {spec.name}
                </span>

                {/* Niveau */}
                <span
                    className="ns-niveau-badge shrink-0"
                    style={{
                        color:       NIVEAU_COLORS[spec.niveau] ?? 'var(--color-muted)',
                        borderColor: NIVEAU_COLORS[spec.niveau] ?? 'var(--color-border)',
                    }}
                >
                    {niveauData?.label}&nbsp;+{niveauData?.bonus ?? 0}D
                </span>

                {/* Notes toggle */}
                {spec.notes && (
                    <button
                        onClick={() => setShowNotes(v => !v)}
                        className="text-muted hover:text-default text-xs shrink-0 transition-colors"
                    >
                        {showNotes ? '▴' : '▾'}
                    </button>
                )}

                {/* Bouton dés — visible, sauf dormante */}
                {!editMode && !isDormant && onRoll && (
                    <button
                        onClick={() => onRoll(spec)}
                        className="text-xs px-1.5 py-0.5 rounded-sm border shrink-0 transition-colors"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                        title={`Lancer avec ${spec.name}`}
                    >
                        ⬡
                    </button>
                )}

                {/* Actions édition */}
                {editMode && (
                    <div className="flex gap-1 shrink-0">
                        <button
                            onClick={() => {
                                const ordre = ['debutant', 'confirme', 'expert'];
                                const next  = ordre[(ordre.indexOf(spec.niveau) + 1) % ordre.length];
                                onChangeNiveau(next);
                            }}
                            className="text-xs px-1.5 py-0.5 rounded border border-default text-muted
                                       hover:text-default hover:border-muted transition-colors"
                        >
                            ⇅
                        </button>
                        {isFractureType && (
                            <button
                                onClick={onToggleDormant}
                                className="text-xs px-1.5 py-0.5 rounded border transition-colors"
                                style={{
                                    borderColor: isDormant ? 'var(--ns-fracture)' : 'var(--ns-fracture-dormant)',
                                    color:       isDormant ? 'var(--ns-fracture)' : 'var(--ns-fracture-dormant)',
                                }}
                            >
                                {isDormant ? '⚡' : '◌'}
                            </button>
                        )}
                        <button
                            onClick={onRemove}
                            className="text-xs px-1.5 py-0.5 rounded border border-default text-muted
                                       hover:text-danger hover:border-danger transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {showNotes && spec.notes && (
                <p className="text-muted text-xs italic pl-2 pb-1 leading-snug border-l-2"
                   style={{ borderColor: 'var(--ns-ornament)', opacity: 0.7 }}>
                    {spec.notes}
                </p>
            )}
        </li>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────
const SpecialtiesCard = ({ character, editMode, onChange, onRoll }) => {
    const specialties      = character.specialties ?? [];
    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [draft,  setDraft]  = useState({
        name: '', type: 'normale', niveau: 'debutant', is_dormant: 0, notes: '',
    });

    const fractureCount    = specialties.filter(s => s.type === 'fracture').length;
    const limiteCorruption = (character.volonte ?? 1) + (character.sante ?? 1);

    const handleAdd = () => {
        if (!draft.name.trim()) return;
        if (draft.type === 'fracture' && fractureCount >= limiteCorruption) return;
        const newSpec = {
            ...draft,
            name:       draft.name.trim(),
            is_dormant: draft.type === 'fracture' ? 1 : 0, // Fracture = dormante par défaut
        };
        onChange([...specialties, newSpec]);
        setDraft({ name: '', type: 'normale', niveau: 'debutant', is_dormant: 0, notes: '' });
        setAdding(false);
        setSearch('');
    };

    const handleRemove       = (idx) => onChange(specialties.filter((_, i) => i !== idx));
    const handleChangeNiveau = (idx, niveau) =>
        onChange(specialties.map((s, i) => i === idx ? { ...s, niveau } : s));
    const handleToggleDormant = (idx) =>
        onChange(specialties.map((s, i) =>
            i === idx ? { ...s, is_dormant: s.is_dormant ? 0 : 1 } : s
        ));

    const suggestions = search.length >= 2
        ? SPECIALTIES_REFERENCE.filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase()) &&
            !specialties.some(ex => ex.name.toLowerCase() === s.name.toLowerCase())
        ).slice(0, 6)
        : [];

    // Séparer normales et fracture pour l'affichage
    const normalSpecs   = specialties.filter(s => s.type !== 'fracture');
    const fractureSpecs = specialties.filter(s => s.type === 'fracture');

    return (
        <div className="ns-card ns-paper space-y-3">

            {/* ── En-tête ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h3 className="ns-domain-header text-primary">Spécialités</h3>
                <div className="flex items-center gap-3">
                    {!!character.is_fracture && (
                        <span className="text-xs"
                              style={{ color: 'var(--ns-fracture)', opacity: 0.85 }}>
                            Fracture {fractureCount}/{limiteCorruption}
                        </span>
                    )}
                    {editMode && (
                        <button
                            onClick={() => setAdding(a => !a)}
                            className="text-xs px-2 py-0.5 rounded border border-primary text-primary
                                       hover:bg-primary/10 transition-colors"
                        >
                            {adding ? '✕ Annuler' : '+ Ajouter'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Spécialités normales ───────────────────────────────────── */}
            {normalSpecs.length > 0 && (
                <ul className="space-y-0.5 divide-y divide-default/30">
                    {specialties
                        .map((s, i) => ({ s, i }))
                        .filter(({ s }) => s.type !== 'fracture')
                        .map(({ s, i }) => (
                            <SpecialtyRow
                                key={i}
                                spec={s}
                                editMode={editMode}
                                onRemove={() => handleRemove(i)}
                                onChangeNiveau={n => handleChangeNiveau(i, n)}
                                onToggleDormant={() => handleToggleDormant(i)}
                                onRoll={onRoll}
                            />
                        ))}
                </ul>
            )}

            {/* ── Séparateur + spécialités Fracture ─────────────────────── */}
            {fractureSpecs.length > 0 && (
                <>
                    {normalSpecs.length > 0 && <hr className="ns-divider" />}
                    <div>
                        <p className="ns-section-label" style={{ color: 'var(--ns-fracture)' }}>
                            ⬡ Pouvoirs des Anciens
                        </p>
                        <ul className="space-y-1">
                            {specialties
                                .map((s, i) => ({ s, i }))
                                .filter(({ s }) => s.type === 'fracture')
                                .map(({ s, i }) => (
                                    <SpecialtyRow
                                        key={i}
                                        spec={s}
                                        editMode={editMode}
                                        onRemove={() => handleRemove(i)}
                                        onChangeNiveau={n => handleChangeNiveau(i, n)}
                                        onToggleDormant={() => handleToggleDormant(i)}
                                        isFracture
                                    />
                                ))}
                        </ul>
                    </div>
                </>
            )}

            {/* ── État vide ─────────────────────────────────────────────── */}
            {specialties.length === 0 && !adding && (
                <p className="text-center py-3"
                   style={{ fontFamily: 'var(--ns-font-body)', fontStyle: 'italic',
                       color: 'var(--color-muted)', fontSize: '0.85rem', opacity: 0.7 }}>
                    — Aucune spécialité acquise —
                </p>
            )}

            {/* ── Formulaire d'ajout ────────────────────────────────────── */}
            {adding && (
                <div className="ns-add-form space-y-2">

                    {/* Recherche avec suggestions */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Nom de la spécialité…"
                            className="ns-input"
                            value={search || draft.name}
                            onChange={e => {
                                setSearch(e.target.value);
                                setDraft(d => ({ ...d, name: e.target.value }));
                            }}
                            autoFocus
                        />
                        {suggestions.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 z-10 shadow-lg mt-0.5
                                           divide-y divide-default/30"
                                style={{ background: 'var(--color-surface)',
                                    border: '1px solid var(--ns-ornament)',
                                    borderTop: '2px solid var(--ns-ornament)',
                                    borderRadius: '0 0 2px 2px' }}>
                                {suggestions.map(s => (
                                    <li key={s.name}>
                                        <button
                                            onClick={() => {
                                                setDraft(d => ({ ...d, name: s.name, type: s.type }));
                                                setSearch('');
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-default
                                                       hover:bg-surface-alt transition-colors flex items-center justify-between"
                                            style={{ fontFamily: 'var(--ns-font-body)', fontSize: '0.9rem' }}
                                        >
                                            <span>{s.name}</span>
                                            {s.type !== 'normale' && (
                                                <span className="ns-item-meta">
                                                    [{SPECIALTY_TYPES[s.type]?.badge}]
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            className="ns-select"
                            value={draft.type}
                            onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
                        >
                            {TYPE_OPTIONS
                                .filter(([k]) => k !== 'fracture' || character.is_fracture)
                                .map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                        </select>
                        <select
                            className="ns-select"
                            value={draft.niveau}
                            onChange={e => setDraft(d => ({ ...d, niveau: e.target.value }))}
                        >
                            {NIVEAU_OPTIONS.map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>

                    <input
                        type="text"
                        placeholder="Notes (optionnel)"
                        className="ns-input"
                        value={draft.notes}
                        onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                    />

                    {/* Avertissement limite corruption */}
                    {draft.type === 'fracture' && fractureCount >= limiteCorruption && (
                        <p className="text-danger text-xs">
                            Limite de corruption atteinte ({limiteCorruption}).
                        </p>
                    )}

                    <button
                        onClick={handleAdd}
                        disabled={!draft.name.trim() ||
                            (draft.type === 'fracture' && fractureCount >= limiteCorruption)}
                        className="ns-btn-primary w-full"
                    >
                        ✓ Ajouter la spécialité
                    </button>
                </div>
            )}
        </div>
    );
};

export default SpecialtiesCard;