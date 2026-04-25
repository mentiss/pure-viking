import { OMBRE_TYPES } from '../../config.jsx';

// ── Ligne Ombre ───────────────────────────────────────────────────────────────
const OmbreRow = ({ ombre }) => {
    // L'effet : champ stocké en base, sinon fallback sur la constante de référence
    const effect = ombre.effect?.trim() || OMBRE_TYPES[ombre.type]?.effect || '';

    return (
        <li className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
                <span className="text-muted text-xs">✦</span>
                <span className="text-default text-sm font-semibold"
                      style={{ color: 'var(--ns-ombre)' }}>
                    {OMBRE_TYPES[ombre.type].label ?? ombre.type}
                </span>
                {ombre.description && (
                    <span className="text-muted text-xs italic">
                        — {ombre.description}
                    </span>
                )}
            </div>
            {effect && (
                <p className="text-xs leading-snug pl-4"
                   style={{ color: 'var(--color-muted)', opacity: 0.8 }}>
                    ↳ {effect}
                </p>
            )}
        </li>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────
const EclatsCard = ({ character, onPatch }) => {
    const current = character.eclats_current ?? 1;
    const max     = character.eclats_max     ?? 1;

    return (
        <div className="ns-card ns-paper space-y-3">

            {/* ── En-tête ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h3 className="ns-domain-header text-primary">Éclats</h3>
                <span className="text-muted text-xs font-mono">{current}/{max}</span>
            </div>

            {/* ── Tokens médaille ────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onPatch({ eclats_current: Math.max(0, current - 1) })}
                    disabled={current <= 0}
                    className="w-7 h-7 rounded-sm bg-surface-alt border border-default text-muted
                               hover:text-default disabled:opacity-25 transition-colors text-sm"
                >
                    −
                </button>

                <div className="flex gap-2">
                    {Array.from({ length: max }, (_, i) => (
                        i < current
                            ? <div key={i} className="ns-eclat-token" title={`Éclat ${i + 1}`} />
                            : <div key={i} className="ns-eclat-token-empty" title="Vide" />
                    ))}
                </div>

                <button
                    onClick={() => onPatch({ eclats_current: Math.min(max, current + 1) })}
                    disabled={current >= max}
                    className="w-7 h-7 rounded-sm bg-surface-alt border border-default text-muted
                               hover:text-default disabled:opacity-25 transition-colors text-sm"
                >
                    +
                </button>
            </div>

            {/* ── Rappel mécanique ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded px-2 py-1.5 space-y-0.5"
                     style={{ background: 'var(--color-surface-alt)',
                         border:     '1px solid var(--color-border)' }}>
                    <p className="text-muted uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>
                        Le Sursaut
                    </p>
                    <p className="text-default leading-snug">
                        Sur un <span className="font-bold">échec</span> → réussite simple
                    </p>
                </div>
                <div className="rounded px-2 py-1.5 space-y-0.5"
                     style={{ background: 'var(--color-surface-alt)',
                         border:     '1px solid var(--color-border)' }}>
                    <p className="text-muted uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>
                        Le Panache
                    </p>
                    <p className="text-default leading-snug">
                        Sur une <span className="font-bold">réussite</span> → +2 succès
                    </p>
                </div>
            </div>

            {/* ── Ombres ─────────────────────────────────────────────────── */}
            {character.ombres?.length > 0 && (
                <>
                    <hr className="ns-divider-ornate" />
                    <div>
                        <p className="text-xs uppercase tracking-widest font-bold mb-2"
                           style={{ color: 'var(--ns-ombre)', letterSpacing: '0.15em' }}>
                            Ombres
                        </p>
                        <ul className="space-y-2">
                            {character.ombres.map((o, i) => (
                                <OmbreRow key={i} ombre={o} />
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default EclatsCard;