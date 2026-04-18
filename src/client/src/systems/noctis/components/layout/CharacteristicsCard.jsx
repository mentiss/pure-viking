import { DOMAINES, STAT_LABELS, computeInitiative } from '../../config.jsx';

const StatBlock = ({ label, value, editMode, onChange, max = 5 }) => {
    if (editMode) {
        return (
            <div className="flex flex-col items-center gap-1">
                <span className="text-muted text-xs text-center leading-tight">{label}</span>
                <div className="flex gap-1">
                    {Array.from({ length: max }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => onChange(i + 1 === value ? i : i + 1)}
                            className={`w-6 h-6 rounded text-xs font-bold border transition-colors
                                ${i < value
                                ? 'bg-primary border-primary text-bg'
                                : 'bg-surface-alt border-default text-muted'
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-muted text-xs text-center leading-tight">{label}</span>
            <span className="text-primary font-bold text-lg">{value}</span>
        </div>
    );
};

const CharacteristicsCard = ({ character, editMode, onChange }) => {
    const initiative = computeInitiative(character);

    return (
        <div className="bg-surface border border-default rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-primary font-bold text-lg tracking-wide uppercase">
                    Caractéristiques
                </h2>
                <span className="text-secondary text-sm">
                    Initiative : <strong className="text-primary">{initiative}</strong>
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(DOMAINES).map(([key, domaine]) => (
                    <div key={key} className="space-y-3">
                        <h3 className={`text-${domaine.color} text-xs font-bold uppercase tracking-widest border-b border-default pb-1`}>
                            {domaine.label}
                        </h3>
                        {domaine.stats.map(stat => (
                            <StatBlock
                                key={stat}
                                label={STAT_LABELS[stat]}
                                value={character[stat] ?? 1}
                                editMode={editMode}
                                onChange={val => onChange(stat, val)}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CharacteristicsCard;