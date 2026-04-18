import { useState } from 'react';
import { SPECIALTY_TYPES, SPECIALTY_NIVEAUX, SPECIALTIES_REFERENCE } from '../../config.jsx';

const NIVEAU_OPTIONS = Object.entries(SPECIALTY_NIVEAUX);
const TYPE_OPTIONS   = Object.entries(SPECIALTY_TYPES);

const SpecialtiesCard = ({ character, editMode, onChange }) => {
    const specialties      = character.specialties ?? [];
    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [draft,  setDraft]  = useState({ name: '', type: 'normale', niveau: 'debutant', notes: '' });

    const fractureCount    = specialties.filter(s => s.type === 'fracture').length;
    const limiteCorruption = (character.volonte ?? 1) + (character.sante ?? 1);

    const handleAdd = () => {
        if (!draft.name.trim()) return;
        if (draft.type === 'fracture' && fractureCount >= limiteCorruption) return;
        onChange([...specialties, { ...draft, name: draft.name.trim() }]);
        setDraft({ name: '', type: 'normale', niveau: 'debutant', notes: '' });
        setAdding(false);
        setSearch('');
    };

    const handleRemove = (idx) => onChange(specialties.filter((_, i) => i !== idx));

    const handleNiveauChange = (idx, niveau) =>
        onChange(specialties.map((s, i) => i === idx ? { ...s, niveau } : s));

    const suggestions = search.length >= 2
        ? SPECIALTIES_REFERENCE.filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase()) &&
            !specialties.some(ex => ex.name.toLowerCase() === s.name.toLowerCase())
        ).slice(0, 6)
        : [];

    return (
        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-primary font-bold text-sm uppercase tracking-wide">
                    Spécialités
                    {character.is_fracture ? (
                        <span className="ml-2 text-xs text-muted font-normal">
                            Fracture : {fractureCount}/{limiteCorruption}
                        </span>
                    ) : null}
                </h2>
                {editMode && (
                    <button
                        onClick={() => setAdding(a => !a)}
                        className="text-xs px-2 py-1 rounded border border-primary text-primary"
                    >
                        {adding ? 'Annuler' : '+ Ajouter'}
                    </button>
                )}
            </div>

            {/* Formulaire d'ajout — editMode seulement */}
            {editMode && adding && (
                <div className="bg-surface-alt rounded p-3 space-y-2 border border-default">
                    <div className="relative">
                        <input
                            placeholder="Nom de la spécialité…"
                            className="w-full bg-surface border border-default rounded px-2 py-1 text-default text-sm"
                            value={search || draft.name}
                            onChange={e => {
                                setSearch(e.target.value);
                                setDraft(d => ({ ...d, name: e.target.value }));
                            }}
                        />
                        {suggestions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-surface border border-default rounded mt-1 shadow-lg">
                                {suggestions.map(s => (
                                    <li
                                        key={s.name}
                                        onClick={() => {
                                            setDraft(d => ({ ...d, name: s.name, type: s.type }));
                                            setSearch('');
                                        }}
                                        className="px-3 py-1 text-sm text-default hover:bg-surface-alt cursor-pointer flex justify-between"
                                    >
                                        <span>{s.name}</span>
                                        <span className="text-muted text-xs">
                                            {SPECIALTY_TYPES[s.type]?.badge}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            className="bg-surface border border-default rounded px-2 py-1 text-default text-sm"
                            value={draft.type}
                            onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
                        >
                            {TYPE_OPTIONS
                                .filter(([k]) => k !== 'fracture' || character.is_fracture)
                                .map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))
                            }
                        </select>
                        <select
                            className="bg-surface border border-default rounded px-2 py-1 text-default text-sm"
                            value={draft.niveau}
                            onChange={e => setDraft(d => ({ ...d, niveau: e.target.value }))}
                        >
                            {NIVEAU_OPTIONS.map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                    <input
                        placeholder="Notes (optionnel)"
                        className="w-full bg-surface border border-default rounded px-2 py-1 text-default text-sm"
                        value={draft.notes}
                        onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!draft.name.trim()}
                        className="w-full py-1 text-sm rounded bg-primary text-accent font-bold disabled:opacity-40"
                    >
                        Ajouter
                    </button>
                </div>
            )}

            {/* Liste */}
            <div className="space-y-1">
                {specialties.length === 0 && (
                    <p className="text-muted text-xs italic">Aucune spécialité.</p>
                )}
                {specialties.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 border-b border-default last:border-0">
                        <div className="flex-1">
                            <span className="text-default text-sm">{s.name}</span>
                            {SPECIALTY_TYPES[s.type]?.badge && (
                                <span className="ml-1 text-xs text-accent">
                                    ({SPECIALTY_TYPES[s.type].badge})
                                </span>
                            )}
                            {s.notes && (
                                <span className="ml-1 text-muted text-xs">— {s.notes}</span>
                            )}
                        </div>
                        {editMode ? (
                            <>
                                <select
                                    className="bg-surface-alt border border-default rounded px-1 py-0.5 text-xs text-default"
                                    value={s.niveau}
                                    onChange={e => handleNiveauChange(i, e.target.value)}
                                >
                                    {NIVEAU_OPTIONS.map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v.label} (+{v.bonus}D)
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleRemove(i)}
                                    className="text-danger text-xs px-1"
                                >✕</button>
                            </>
                        ) : (
                            <span className="text-muted text-xs">
                                {SPECIALTY_NIVEAUX[s.niveau]?.label} (+{SPECIALTY_NIVEAUX[s.niveau]?.bonus}D)
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpecialtiesCard;