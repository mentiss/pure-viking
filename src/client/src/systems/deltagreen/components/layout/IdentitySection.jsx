// src/client/src/systems/deltagreen/components/sheet/sections/IdentitySection.jsx
import React from 'react';

const FIELD = ({ label, value, editMode, onChange, type = 'text', degradation = 0, children }) => (
    <div className="flex flex-col gap-0.5">
        <span className="dg-section-label">{label}</span>
        {editMode
            ? children
            ?? (
            <input
                type={type}
                className="dg-field-input px-2 py-0.5 text-sm w-full"
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
            />
        )
            : <span className={`dg-form-line py-0.5 text-sm font-mono min-h-[1.5rem] ${degradation === 4 ? 'dg-censured' : ''}`}>{value || '\u00A0'}</span>
        }
    </div>
);

const IdentitySection = ({ char, editMode, set }) => (
    <div className="space-y-2">
        <p className="dg-section-label text-base mb-2 border-b border-default pb-1">
            DONNÉES PERSONNELLES
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <FIELD label="1. Dénomination / Alias"
                   editMode={editMode} value={`${char.nom ?? ''} ${char.prenom ?? ''} ${char.alias ? `/ ${char.alias}` : ''}`.trim()}
                   onChange={() => {}}>
                {editMode && (
                    <div className="flex gap-1">
                        <input className="dg-field-input px-2 py-0.5 text-sm flex-1" placeholder="Nom"
                               value={char.nom ?? ''} onChange={e => set('nom', e.target.value)} />
                        <input className="dg-field-input px-2 py-0.5 text-sm flex-1" placeholder="Prénom"
                               value={char.prenom ?? ''} onChange={e => set('prenom', e.target.value)} />
                        <input className="dg-field-input px-2 py-0.5 text-sm flex-1" placeholder="Alias"
                               value={char.alias ?? ''} onChange={e => set('alias', e.target.value)} />
                    </div>
                )}
            </FIELD>

            <FIELD label="2. Profession & rang"
                   editMode={editMode} value={char.profession}
                   onChange={v => set('profession', v)}
                   degradation={char.degradationPalier ?? 0}
            />

            <FIELD label="3. Employeur"
                   editMode={editMode} value={char.employer}
                   onChange={v => set('employer', v)}
                   degradation={char.degradationPalier ?? 0} />

            <FIELD label="4. Nationalité"
                   editMode={editMode} value={char.nationality}
                   onChange={v => set('nationality', v)} />
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <FIELD label="5. Genre"
                   editMode={editMode} value={char.sexe}
                   onChange={v => set('sexe', v)}
                   degradation={char.degradationPalier ?? 0} />

            <FIELD label="6. Âge / DoB"
                   editMode={editMode}
                   value={[char.age, char.birthDate].filter(Boolean).join(' — ')}
                   onChange={() => {}}>
                {editMode && (
                    <div className="flex gap-1">
                        <input type="number" className="dg-field-input px-2 py-0.5 text-sm w-16" placeholder="Âge"
                               value={char.age ?? ''} onChange={e => set('age', Number(e.target.value) || null)} />
                        <input className="dg-field-input px-2 py-0.5 text-sm flex-1" placeholder="Date de naissance"
                               value={char.birthDate ?? ''} onChange={e => set('birthDate', e.target.value)} />
                    </div>
                )}
            </FIELD>

            <FIELD label="7. Études"
                   editMode={editMode} value={char.education}
                   onChange={v => set('education', v)} />
        </div>

        <FIELD label="10. Description physique"
               editMode={editMode} value={char.physicalDescription}
               onChange={v => set('physicalDescription', v)}
               degradation={char.degradationPalier ?? 0} />
    </div>
);

export default IdentitySection;