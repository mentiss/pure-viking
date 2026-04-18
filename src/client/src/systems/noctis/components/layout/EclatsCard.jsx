import {OMBRE_TYPES} from "../../config.jsx";

const EclatsCard = ({ character, onPatch }) => {
    const current = character.eclats_current ?? 1;
    const max     = character.eclats_max     ?? 1;

    return (
        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
            <h2 className="text-primary font-bold text-sm uppercase tracking-wide">Éclats</h2>

            {/* Compteur */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onPatch({ eclats_current: Math.max(0, current - 1) })}
                    disabled={current <= 0}
                    className="w-8 h-8 rounded bg-surface-alt border border-default text-default disabled:opacity-30"
                >−</button>
                <div className="flex gap-1">
                    {Array.from({ length: max }, (_, i) => (
                        <div
                            key={i}
                            className={`w-7 h-7 rounded-full border-2 transition-colors
                                ${i < current
                                ? 'bg-accent border-accent'
                                : 'bg-surface-alt border-default'
                            }`}
                        />
                    ))}
                </div>
                <button
                    onClick={() => onPatch({ eclats_current: Math.min(max, current + 1) })}
                    disabled={current >= max}
                    className="w-8 h-8 rounded bg-surface-alt border border-default text-default disabled:opacity-30"
                >+</button>
                <span className="text-muted text-xs">{current}/{max}</span>
            </div>

            {/* Ombres */}
            {character.ombres?.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-default">
                    <p className="text-muted text-xs uppercase">Ombres</p>
                    {character.ombres.map((o, i) => (
                        <div key={i} className="text-xs text-default">
                            <span className="text-secondary font-semibold">
                                {OMBRE_TYPES[o.type] ?? o.type}
                            </span>
                            {o.description && (
                                <span className="text-muted"> — {o.description}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EclatsCard;