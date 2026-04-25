import { useRef } from 'react';

const IdentityCard = ({ character, editMode, onChange }) => {
    const avatarRef = useRef(null);

    // Helper pour les champs texte standards
    const field = (key, type = 'text') => ({
        value:    character[key] ?? '',
        onChange: editMode
            ? (e => onChange(key, type === 'number' ? (+e.target.value || null) : e.target.value))
            : undefined,
        readOnly: !editMode,
        className: `w-full bg-surface-alt border rounded px-2 py-1 text-default text-sm mt-1
            ${editMode ? 'border-default' : 'border-transparent cursor-default'}`,
    });

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onChange('avatar', ev.target.result);
        reader.readAsDataURL(file);
    };

    return (
        <div className="ns-card ns-paper space-y-3">

            {/* ── Bandeau supérieur : avatar + identité + tampon année ──── */}
            <div className="flex items-start gap-4">

                {/* Avatar — cadre en cuivre oxydé */}
                <div className="shrink-0">
                    <button
                        onClick={() => editMode && avatarRef.current?.click()}
                        className={`relative w-20 h-20 rounded overflow-hidden border-2
                            bg-surface-alt transition-opacity
                            ${editMode ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
                        style={{
                            borderColor: 'var(--ns-ornament)',
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.35), 0 0 0 1px color-mix(in srgb, var(--ns-ornament) 30%, transparent)',
                        }}
                        title={editMode ? "Changer l'avatar" : undefined}
                    >
                        {character.avatar ? (
                            <img
                                src={character.avatar}
                                alt="portrait"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="w-full h-full flex items-center justify-center text-3xl"
                                  style={{ color: 'var(--ns-ornament)', opacity: 0.25 }}>
                                ☽
                            </span>
                        )}
                        {editMode && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center
                                            opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs tracking-wide">Portrait</span>
                            </div>
                        )}
                    </button>
                    <input
                        ref={avatarRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                    />
                </div>

                {/* Bloc central : nom, activité, faction */}
                <div className="flex-1 min-w-0 space-y-1">
                    {editMode ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-muted text-xs uppercase tracking-widest">Prénom</label>
                                <input type="text" {...field('prenom')} />
                            </div>
                            <div>
                                <label className="text-muted text-xs uppercase tracking-widest">Nom</label>
                                <input type="text" {...field('nom')} />
                            </div>
                        </div>
                    ) : (
                        <p className="text-default font-bold text-xl leading-tight"
                           style={{ fontVariant: 'small-caps', letterSpacing: '0.04em' }}>
                            {character.prenom} <span style={{ color: 'var(--ns-ornament)' }}>{character.nom}</span>
                        </p>
                    )}

                    {/* Activité — identité fonctionnelle, plus importante que les stats physiques */}
                    {editMode ? (
                        <div>
                            <label className="text-muted text-xs uppercase tracking-widest">Activité</label>
                            <input type="text" {...field('activite')} placeholder="Métier, rôle dans le groupe…" />
                        </div>
                    ) : (
                        <p className="text-primary text-sm italic">
                            {character.activite || <span className="text-muted not-italic">—</span>}
                        </p>
                    )}

                    {/* Faction */}
                    {editMode ? (
                        <div>
                            <label className="text-muted text-xs uppercase tracking-widest">Faction</label>
                            <input type="text" {...field('faction')} placeholder="Optionnel" />
                        </div>
                    ) : (
                        character.faction && (
                            <p className="text-muted text-xs" style={{ letterSpacing: '0.06em' }}>
                                ⧖ {character.faction}
                            </p>
                        )
                    )}

                    {/* Joueur */}
                    {!editMode && (
                        <p className="text-muted text-xs">
                            — <span className="text-default">{character.player_name}</span>
                        </p>
                    )}
                    {editMode && (
                        <div>
                            <label className="text-muted text-xs uppercase tracking-widest">Joueur</label>
                            <input type="text" {...field('player_name')} />
                        </div>
                    )}
                </div>

                {/* Tampon année de campagne */}
                <div className="shrink-0">
                    {editMode ? (
                        <div>
                            <label className="text-muted text-xs uppercase tracking-widest block text-right">Année</label>
                            <input
                                type="number" min="1850" max="1950"
                                className="w-20 bg-surface-alt border border-default rounded px-2 py-1
                                           text-default text-sm mt-1 text-center font-mono"
                                value={character.annee_campagne ?? 1881}
                                onChange={e => onChange('annee_campagne', +e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="text-center px-2 py-1.5 rounded"
                             style={{
                                 border: '2px double var(--ns-ornament)',
                                 opacity: 0.75,
                             }}>
                            <p className="text-muted text-xs uppercase tracking-widest leading-none mb-0.5">An.</p>
                            <p className="font-bold text-sm font-mono"
                               style={{ color: 'var(--ns-ornament)' }}>
                                {character.annee_campagne ?? 1881}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <hr className="ns-divider" />

            {/* ── Description physique — carnet d'observations ─────────── */}
            <div>
                <label className="text-muted text-xs uppercase tracking-widest">
                    Observations physiques
                </label>
                {editMode ? (
                    <textarea
                        rows={3}
                        className="w-full bg-surface-alt border border-default rounded px-2 py-1.5
                                   text-default text-sm mt-1 resize-none"
                        value={character.description_physique ?? ''}
                        onChange={e => onChange('description_physique', e.target.value)}
                        placeholder="Apparence, traits marquants, signes particuliers…"
                    />
                ) : (
                    <p className="text-default text-sm mt-1 px-1 whitespace-pre-wrap min-h-[2.5rem] italic"
                       style={{ opacity: 0.85 }}>
                        {character.description_physique
                            || <span className="text-muted not-italic">—</span>}
                    </p>
                )}
            </div>

            <hr className="ns-divider" />

            {/* ── Détails physiques inline ──────────────────────────────── */}
            <div className="grid grid-cols-4 gap-3">
                <div>
                    <label className="text-muted text-xs uppercase tracking-widest">Sexe</label>
                    {editMode ? (
                        <select
                            className="w-full bg-surface-alt border border-default rounded px-2 py-1
                                       text-default text-sm mt-1"
                            value={character.sexe ?? ''}
                            onChange={e => onChange('sexe', e.target.value || null)}
                        >
                            <option value="">—</option>
                            <option value="homme">Homme</option>
                            <option value="femme">Femme</option>
                            <option value="autre">Autre</option>
                        </select>
                    ) : (
                        <p className="text-default text-sm mt-1">{character.sexe ?? '—'}</p>
                    )}
                </div>
                <div>
                    <label className="text-muted text-xs uppercase tracking-widest">Âge</label>
                    {editMode
                        ? <input type="number" min="0" {...field('age', 'number')} />
                        : <p className="text-default text-sm mt-1">{character.age ?? '—'}</p>}
                </div>
                <div>
                    <label className="text-muted text-xs uppercase tracking-widest">Taille</label>
                    {editMode
                        ? <input type="number" min="0" {...field('taille', 'number')} />
                        : <p className="text-default text-sm mt-1">
                            {character.taille ? `${character.taille} cm` : '—'}
                        </p>}
                </div>
                <div>
                    <label className="text-muted text-xs uppercase tracking-widest">Poids</label>
                    {editMode
                        ? <input type="number" min="0" {...field('poids', 'number')} />
                        : <p className="text-default text-sm mt-1">
                            {character.poids ? `${character.poids} kg` : '—'}
                        </p>}
                </div>
            </div>

            <hr className="ns-divider" />

            {/* ── Selvarins — accessible même hors editMode ────────────── */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="text-muted text-xs uppercase tracking-widest">
                        ⊕ Selvarins
                    </label>
                    <input
                        type="number" min="0"
                        className="w-full bg-surface-alt border border-default rounded px-2 py-1
                                   text-default text-sm mt-1"
                        value={character.selvarins_current ?? 0}
                        onChange={e => onChange('selvarins_current', +e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <label className="text-muted text-xs uppercase tracking-widest">Revenu mensuel</label>
                    <input
                        type="number" min="0"
                        className="w-full bg-surface-alt border border-default rounded px-2 py-1
                                   text-default text-sm mt-1"
                        value={character.selvarins_month ?? 0}
                        onChange={e => onChange('selvarins_month', +e.target.value)}
                    />
                </div>
            </div>

            {/* ── Notes libres ──────────────────────────────────────────── */}
            <div>
                <label className="text-muted text-xs uppercase tracking-widest">Notes</label>
                {editMode ? (
                    <textarea
                        rows={3}
                        className="w-full bg-surface-alt border border-default rounded px-2 py-1.5
                                   text-default text-sm mt-1 resize-none"
                        value={character.notes ?? ''}
                        onChange={e => onChange('notes', e.target.value)}
                    />
                ) : (
                    <p className="text-default text-sm mt-1 px-1 whitespace-pre-wrap min-h-[3rem]">
                        {character.notes
                            || <span className="text-muted italic">—</span>}
                    </p>
                )}
            </div>
        </div>
    );
};

export default IdentityCard;