import { DOMAINES, STAT_LABELS } from '../../config.jsx';

const StatEditRow = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between gap-2">
        <span className="ns-stat-label w-24 shrink-0">{label}</span>
        <div className="flex items-center gap-2">
            <button
                onClick={() => onChange(Math.max(1, value - 1))}
                disabled={value <= 1}
                className="ns-btn-ghost disabled:opacity-30"
                style={{ padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}
            >−</button>
            <span style={{
                fontFamily: 'var(--ns-font-tech)',
                fontWeight: 700,
                fontSize:   '1.2rem',
                color:      'var(--ns-ornament)',
                minWidth:   '1.5rem',
                textAlign:  'center',
            }}>
                {value}
            </span>
            <button
                onClick={() => onChange(value + 1)}
                className="ns-btn-ghost"
                style={{ padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}
            >+</button>
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
            <div className="flex items-center gap-2 mb-2">
                {/* Titre — border-bottom neutralisé : le filet JSX le remplace */}
                <h3
                    className={`ns-domain-header text-${domaine.color}`}
                    style={{ borderBottom: 'none', paddingBottom: 0 }}
                >
                    {domaine.label}
                </h3>
                {/* Filet horizontal couleur domaine */}
                <div
                    className="flex-1 h-px"
                    style={{ background: `var(--color-${domaine.color})`, opacity: 0.22 }}
                />
                {/* Total en Rajdhani */}
                <span className="ns-stat-total">{total}</span>
            </div>

            {/* Lecture */}
            {!editMode && (
                <div className="mt-1">
                    {domaine.stats.map(stat => (
                        <div key={stat} className="ns-stat-row group">

                            {/* Label Rajdhani */}
                            <span className="ns-stat-label">{STAT_LABELS[stat]}</span>

                            {/* Valeur + bouton jet */}
                            <div className="flex items-center gap-2">
                                <span className={`ns-stat-value text-${domaine.color}`}>
                                    {character[stat] ?? 1}
                                </span>
                                {onRoll && (
                                    <button
                                        onClick={() => onRoll(stat)}
                                        className="text-xs px-1.5 py-0.5 rounded-sm border
                                                   opacity-0 group-hover:opacity-100
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