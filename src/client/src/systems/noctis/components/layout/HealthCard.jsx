import {computeMalusBlessure} from "../../config.jsx";

const NIVEAUX = [
    { key: 'touche', label: 'Touché',  malus: '-1D', colorClass: 'text-secondary' },
    { key: 'blesse', label: 'Blessé',  malus: '-2D', colorClass: 'text-danger' },
    { key: 'tue',    label: 'Tué',     malus: '-3D', colorClass: 'text-danger' },
];

const HealthCard = ({ character, onPatch, isGM = false }) => {
    const malus = computeMalusBlessure(character);

    const toggle = (niveau, index) => {
        const currentKey = `sante_${niveau}_current`;
        const current    = character[currentKey] ?? 0;
        const next       = index < current ? index : index + 1;
        onPatch({ [currentKey]: next });
    };

    return (
        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-primary font-bold text-sm uppercase tracking-wide">Santé</h2>
                {malus < 0 && (
                    <span className="text-danger text-xs font-bold">{malus}D</span>
                )}
            </div>

            {NIVEAUX.map(({ key, label, malus: m, colorClass }) => {
                const maxKey     = `sante_${key}_max`;
                const currentKey = `sante_${key}_current`;
                const max        = character[maxKey]     ?? (key === 'touche' ? 4 : key === 'blesse' ? 2 : 1);
                const current    = character[currentKey] ?? 0;

                return (
                    <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold ${colorClass}`}>{label}</span>
                            <span className="text-muted text-xs">{m}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                            {Array.from({ length: max }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => toggle(key, i)}
                                    className={`w-6 h-6 rounded border transition-colors
                                        ${i < current
                                        ? 'bg-danger border-danger'
                                        : 'bg-surface-alt border-default'
                                    }`}
                                    title={`${label} ${i + 1}`}
                                />
                            ))}
                            {/* Ajout de cases si GM et Fracturé */}
                            {isGM && character.is_fracture ? (
                                <button
                                    onClick={() => onPatch({ [maxKey]: max + 1 })}
                                    className="w-6 h-6 rounded border border-dashed border-muted text-muted text-xs"
                                    title="Ajouter une case"
                                >+</button>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HealthCard;