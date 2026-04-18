const ReserveBar = ({ label, current, max, onSpend, onRecover }) => {
    const pct = max > 0 ? (current / max) * 100 : 0;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <span className="text-default text-sm font-semibold">{label}</span>
                <span className="text-muted text-xs">{current} / {max}</span>
            </div>
            <div className="h-3 bg-surface-alt rounded-full overflow-hidden border border-default">
                <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onSpend(1)}
                    disabled={current <= 0}
                    className="flex-1 py-1 text-xs rounded bg-surface-alt border border-default text-muted disabled:opacity-30"
                >
                    −1 Dépenser
                </button>
                <button
                    onClick={() => onRecover(1)}
                    disabled={current >= max}
                    className="flex-1 py-1 text-xs rounded bg-surface-alt border border-default text-secondary disabled:opacity-30"
                >
                    +1 Récupérer
                </button>
            </div>
        </div>
    );
};

const ReservesCard = ({ character, onPatch }) => (
    <div className="bg-surface border border-default rounded-lg p-4 space-y-4">
        <h2 className="text-primary font-bold text-sm uppercase tracking-wide">Réserves</h2>

        <ReserveBar
            label="Effort"
            current={character.reserve_effort_current ?? 0}
            max={character.reserve_effort_max ?? 0}
            onSpend={n => onPatch({ reserve_effort_current: Math.max(0, (character.reserve_effort_current ?? 0) - n) })}
            onRecover={n => onPatch({ reserve_effort_current: Math.min(character.reserve_effort_max ?? 0, (character.reserve_effort_current ?? 0) + n) })}
        />

        <ReserveBar
            label="Sang-Froid"
            current={character.reserve_sangfroid_current ?? 0}
            max={character.reserve_sangfroid_max ?? 0}
            onSpend={n => onPatch({ reserve_sangfroid_current: Math.max(0, (character.reserve_sangfroid_current ?? 0) - n) })}
            onRecover={n => onPatch({ reserve_sangfroid_current: Math.min(character.reserve_sangfroid_max ?? 0, (character.reserve_sangfroid_current ?? 0) + n) })}
        />
    </div>
);

export default ReservesCard;