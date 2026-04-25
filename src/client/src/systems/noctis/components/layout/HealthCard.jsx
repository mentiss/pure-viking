import { computeMalusBlessure } from '../../config.jsx';

// Seuils de blessure selon la caractéristique Santé (spec §6.1)
function computeThresholds(sante) {
    const s = Math.max(1, Math.min(5, sante ?? 1));
    return {
        touche: s + 2,
        blesse: s + 4,
        tue:    Math.min(s + 6, 10),
    };
}

const NIVEAUX = [
    { key: 'touche', label: 'Touché',  malus: '−1D', activeClass: 'active-touche' },
    { key: 'blesse', label: 'Blessé',  malus: '−2D', activeClass: 'active-blesse' },
    { key: 'tue',    label: 'Tué',     malus: '−3D', activeClass: 'active-tue'    },
];

const HealthCard = ({ character, onPatch, isGM = false }) => {
    const malus      = computeMalusBlessure(character);
    const thresholds = computeThresholds(character.sante);

    const toggle = (niveau, index) => {
        const key     = `sante_${niveau}_current`;
        const current = character[key] ?? 0;
        // Clic sur case cochée → décoche jusqu'à cet index ; sinon coche jusqu'à index+1
        const next = index < current ? index : index + 1;
        onPatch({ [key]: next });
    };

    return (
        <div className="ns-card ns-paper space-y-3">

            {/* ── En-tête ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h3 className="ns-domain-header text-primary">Santé</h3>
                {malus < 0 && (
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                          style={{
                              color:      'var(--ns-wound-blesse)',
                              border:     '1px solid var(--ns-wound-blesse)',
                              background: 'color-mix(in srgb, var(--ns-wound-blesse) 10%, transparent)',
                          }}>
                        {malus}D
                    </span>
                )}
            </div>

            {/* ── Niveaux de blessure ────────────────────────────────────── */}
            {NIVEAUX.map(({ key, label, malus: m, activeClass }) => {
                const maxKey     = `sante_${key}_max`;
                const currentKey = `sante_${key}_current`;
                const max        = character[maxKey]     ?? (key === 'touche' ? 4 : key === 'blesse' ? 2 : 1);
                const current    = character[currentKey] ?? 0;
                const threshold  = thresholds[key];

                return (
                    <div key={key}>
                        {/* Label + seuil de référence + malus */}
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                                    {label}
                                </span>
                                <span className="text-muted opacity-50 text-xs">
                                    (seuil {threshold}+)
                                </span>
                            </div>
                            <span className="text-xs font-mono text-muted opacity-60">{m}</span>
                        </div>

                        {/* Cases poinçon */}
                        <div className="flex items-center gap-1 flex-wrap">
                            {Array.from({ length: max }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => toggle(key, i)}
                                    className={`ns-wound-box ${i < current ? activeClass : ''}`}
                                    title={`${label} ${i + 1}${i < current ? ' — coché' : ''}`}
                                />
                            ))}

                            {/* Ajout de cases (GM + Fracturé) */}
                            {isGM && character.is_fracture && (
                                <button
                                    onClick={() => onPatch({ [maxKey]: max + 1 })}
                                    className="w-6 h-6 rounded-sm border border-dashed border-muted
                                               text-muted text-xs hover:border-default hover:text-default
                                               transition-colors"
                                    title="Ajouter une case"
                                >
                                    +
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* ── Récupération rapide ────────────────────────────────────── */}
            {(character.sante_touche_current > 0 ||
                character.sante_blesse_current > 0 ||
                character.sante_tue_current    > 0) && (
                <>
                    <hr className="ns-divider" />
                    <button
                        onClick={() => onPatch({
                            sante_touche_current: 0,
                            sante_blesse_current: 0,
                            sante_tue_current:    0,
                        })}
                        className="w-full py-1 text-xs text-muted border border-dashed border-default rounded-sm
                                   hover:text-default hover:border-muted transition-colors"
                    >
                        Récupération complète
                    </button>
                </>
            )}
        </div>
    );
};

export default HealthCard;