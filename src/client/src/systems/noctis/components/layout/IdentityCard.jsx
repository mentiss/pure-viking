const IdentityCard = ({ character, editMode, onChange }) => {
    const field = (key, type = 'text') => ({
        value:    character[key] ?? '',
        onChange: editMode ? (e => onChange(key, type === 'number' ? (+e.target.value || null) : e.target.value)) : undefined,
        readOnly: !editMode,
        className: `w-full bg-surface-alt border rounded px-2 py-1 text-default text-sm mt-1
            ${editMode ? 'border-default' : 'border-transparent cursor-default'}`,
    });

    return (
        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
            <h2 className="text-primary font-bold text-lg tracking-wide uppercase">Identité</h2>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-muted text-xs uppercase">Joueur</label>
                    <input type="text" {...field('player_name')} />
                </div>
                <div>
                    <label className="text-muted text-xs uppercase">Activité</label>
                    <input type="text" {...field('activite')} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-muted text-xs uppercase">Prénom</label>
                    <input type="text" {...field('prenom')} />
                </div>
                <div>
                    <label className="text-muted text-xs uppercase">Nom</label>
                    <input type="text" {...field('nom')} />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                <div>
                    <label className="text-muted text-xs uppercase">Sexe</label>
                    {editMode ? (
                        <select
                            className="w-full bg-surface-alt border border-default rounded px-2 py-1 text-default text-sm mt-1"
                            value={character.sexe ?? ''}
                            onChange={e => onChange('sexe', e.target.value || null)}
                        >
                            <option value="">—</option>
                            <option value="homme">Homme</option>
                            <option value="femme">Femme</option>
                            <option value="autre">Autre</option>
                        </select>
                    ) : (
                        <p className="text-default text-sm mt-1 px-2 py-1">
                            {character.sexe ?? '—'}
                        </p>
                    )}
                </div>
                <div>
                    <label className="text-muted text-xs uppercase">Âge</label>
                    {editMode
                        ? <input type="number" min="0" {...field('age', 'number')} />
                        : <p className="text-default text-sm mt-1 px-2 py-1">{character.age ?? '—'}</p>
                    }
                </div>
                <div>
                    <label className="text-muted text-xs uppercase">Taille (cm)</label>
                    {editMode
                        ? <input type="number" min="0" {...field('taille', 'number')} />
                        : <p className="text-default text-sm mt-1 px-2 py-1">{character.taille ?? '—'}</p>
                    }
                </div>
                <div>
                    <label className="text-muted text-xs uppercase">Poids (kg)</label>
                    {editMode
                        ? <input type="number" min="0" {...field('poids', 'number')} />
                        : <p className="text-default text-sm mt-1 px-2 py-1">{character.poids ?? '—'}</p>
                    }
                </div>
            </div>

            <div>
                <label className="text-muted text-xs uppercase">Notes</label>
                {editMode ? (
                    <textarea
                        rows={3}
                        className="w-full bg-surface-alt border border-default rounded px-2 py-1 text-default text-sm mt-1 resize-none"
                        value={character.notes ?? ''}
                        onChange={e => onChange('notes', e.target.value)}
                    />
                ) : (
                    <p className="text-default text-sm mt-1 px-2 py-1 whitespace-pre-wrap min-h-[3rem]">
                        {character.notes || <span className="text-muted italic">Aucune note.</span>}
                    </p>
                )}
            </div>

            {/* Selvarins — patch direct même hors editMode */}
            <div className="flex gap-3 border-t border-default pt-3">
                <div className="flex-1">
                    <label className="text-muted text-xs uppercase">Selvarins</label>
                    <input type="number" min="0"
                           className="w-full bg-surface-alt border border-default rounded px-2 py-1 text-default text-sm mt-1"
                           value={character.selvarins_current ?? 0}
                           onChange={e => onChange('selvarins_current', +e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <label className="text-muted text-xs uppercase">Revenu mensuel</label>
                    <input type="number" min="0"
                           className="w-full bg-surface-alt border border-default rounded px-2 py-1 text-default text-sm mt-1"
                           value={character.selvarins_month ?? 0}
                           onChange={e => onChange('selvarins_month', +e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default IdentityCard;