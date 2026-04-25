import { DOMAINES, STAT_LABELS } from '../../config.jsx';

const StatEditRow = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between gap-2">
        <span className="text-muted text-xs w-24 shrink-0">{label}</span>
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
                <button
                    key={i}
                    onClick={() => onChange(i + 1)}
                    className={`w-5 h-5 rounded-sm text-xs font-bold border transition-colors
                        ${i < value
                        ? 'bg-primary border-primary text-bg'
                        : 'bg-surface-alt border-default text-muted hover:border-muted'
                    }`}
                >
                    {i + 1}
                </button>
            ))}
        </div>
    </div>
);

const DomainCard = ({ domaine: domaineKey, character, editMode, onChange, onRoll }) => {
    const domaine = DOMAINES[domaineKey];
    if (!domaine) return null;

    const total = domaine.stats.reduce((acc, s) => acc + (character[s] ?? 1), 0);

    return (
        <div className="ns-card ns-paper">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-2">
                <h3 className={`ns-domain-header text-${domaine.color}`}>
                    {domaine.label}
                </h3>
                <span className="text-muted text-xs font-mono">{total}</span>
            </div>

            {/* Lecture */}
            {!editMode && (
                <div className="space-y-1">
                    {domaine.stats.map(stat => (
                        <div key={stat}
                             className="flex items-center justify-between gap-2 group py-0.5">
                            <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className="text-muted text-xs truncate">
                                    {STAT_LABELS[stat]}
                                </span>
                                <span className={`font-bold text-sm text-${domaine.color}`}>
                                    {character[stat] ?? 1}
                                </span>
                            </div>
                            {onRoll && (
                                <button
                                    onClick={() => onRoll(stat)}
                                    className="text-xs px-1.5 py-0.5 rounded-sm border opacity-0 group-hover:opacity-100
                                               transition-all shrink-0"
                                    style={{
                                        borderColor: `var(--color-${domaine.color})`,
                                        color:       `var(--color-${domaine.color})`,
                                    }}
                                    title={`Lancer ${STAT_LABELS[stat]}`}
                                >
                                    ⬡
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Édition */}
            {editMode && (
                <div className="space-y-1.5 mt-1">
                    {domaine.stats.map(stat => (
                        <StatEditRow
                            key={stat}
                            label={STAT_LABELS[stat]}
                            value={character[stat] ?? 1}
                            onChange={val => onChange(stat, val)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DomainCard;