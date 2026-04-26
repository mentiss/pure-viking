const RESERVE_CONFIG = {
    effort: {
        label:       'Réserve d\'Effort',
        sublabel:    'Physique & Manuel',
        currentKey:  'reserve_effort_current',
        maxKey:      'reserve_effort_max',
        fillClass:   'bg-ns-effort',
        textClass:   'text-ns-effort',
        borderClass: 'border-ns-effort',
    },
    sangfroid: {
        label:       'Sang-Froid',
        sublabel:    'Mental & Social',
        currentKey:  'reserve_sangfroid_current',
        maxKey:      'reserve_sangfroid_max',
        fillClass:   'bg-ns-sangfroid',
        textClass:   'text-ns-sangfroid',
        borderClass: 'border-ns-sangfroid',
    },
};

const ReserveCard = ({ type, character, onPatch }) => {
    const cfg     = RESERVE_CONFIG[type];
    const current = character[cfg.currentKey] ?? 0;
    const max     = character[cfg.maxKey]     ?? 0;
    const pct     = max > 0 ? Math.min(100, (current / max) * 100) : 0;

    const spend   = () => onPatch({ [cfg.currentKey]: Math.max(0,   current - 1) });
    const recover = () => onPatch({ [cfg.currentKey]: Math.min(max, current + 1) });

    return (
        <div className="ns-card ns-paper flex flex-col justify-between gap-2">

            {/* En-tête */}
            <div>
                <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`ns-domain-header ${cfg.textClass}`}>
                        {cfg.label}
                    </h3>
                    <span className="text-muted font-mono text-xs">
                        {current}<span className="opacity-50">/{max}</span>
                    </span>
                </div>
                <p className="text-muted text-xs opacity-60">{cfg.sublabel}</p>
            </div>

            {/* Manomètre */}
            {max <= 18 ? (
                <div className="ns-segments">
                    {Array.from({ length: max }, (_, i) => (
                        <div
                            key={i}
                            className={
                                i < current
                                    ? `ns-segment ns-segment-filled ${cfg.fillClass}`
                                    : 'ns-segment ns-segment-empty'
                            }
                        />
                    ))}
                </div>
            ) : (
                /* Fallback barre continue pour max > 18 (Fracturés extrêmes) */
                <div className={`ns-gauge-track border ${cfg.borderClass}`}>
                    <div
                        className={`ns-gauge-fill ${cfg.fillClass}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}

            {/* Contrôles */}
            <div className="flex gap-1">
                <button
                    onClick={spend}
                    disabled={current <= 0}
                    className="flex-1 py-1 text-xs rounded-sm bg-surface-alt border border-default text-muted
                               hover:text-default hover:border-muted disabled:opacity-25 transition-colors"
                >
                    − Dépenser
                </button>
                <button
                    onClick={recover}
                    disabled={current >= max}
                    className="flex-1 py-1 text-xs rounded-sm bg-surface-alt border border-default text-muted
                               hover:text-default hover:border-muted disabled:opacity-25 transition-colors"
                >
                    + Récupérer
                </button>
            </div>
        </div>
    );
};

export default ReserveCard;