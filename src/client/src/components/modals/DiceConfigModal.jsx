import React, {useState, useCallback, useEffect, useRef} from 'react';
import { useSystem } from '../../hooks/useSystem.js';
import useDiceConfig, {COLORSET_PRESETS, DICE_FALLBACK_CONFIG, readDiceConfig, writeDiceConfig} from "../../hooks/useDiceConfig.js";
import useSlugConfig from "../../hooks/useSlugConfig.js";
import useConfirm from "../../hooks/useConfirm.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants UI
// ─────────────────────────────────────────────────────────────────────────────

const PreviewSwatch = ({ colors }) => {
    const list = Array.isArray(colors) ? colors : [colors];
    return (
        <div className="w-full h-full rounded-lg overflow-hidden flex">
            {list.map((c, i) => (
                <div key={i} className="flex-1 h-full" style={{ background: c }} />
            ))}
        </div>
    );
};

const SliderField = ({ label, value, min, max, step = 1, onChange, formatValue }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
                <span className="text-xs text-muted">{label}</span>
                <span className="text-xs font-mono text-primary">
                    {formatValue ? formatValue(value) : value}
                </span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-surface-alt) 0%)` }}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

const DiceConfigModal = ({ onClose, slugDefaults }) => {
    const { config, saveConfig  } = useDiceConfig();
    const initialized = useRef(false);
    const [draft, setDraft] = useState(null);
    const { confirm, confirmEl } = useConfirm();

    useEffect(() => {
        if (!initialized.current && config) {
            setDraft(config);
            initialized.current = true;
        }
    }, [config]);

    const [activeCategory, setActiveCategory] = useState('JDR');

    useEffect(() => {
        if (draft?.preset) {
            setActiveCategory(
                COLORSET_PRESETS.find(p => p.key === draft.preset)?.category ?? 'JDR'
            );
        }
    }, [draft?.preset]);

    const updateDraft = useCallback((updates) => {
        setDraft(prev => {
            const next = { ...prev, ...updates };
            if (updates.custom) next.custom = { ...prev.custom, ...updates.custom };
            return next;
        });
    }, []);

    const handleSave = async () => {
        const ok = await confirm({
            title: 'Appliquer la configuration',
            message: 'La page va être rechargée pour appliquer les changements.',
            confirmText: 'Recharger',
        });
        if (!ok) return;
        saveConfig(draft);
        window.location.reload();
    };

    const handleReset = async () => {
        const ok = await confirm({
            title: 'Réinitialiser la configuration',
            message: 'La configuration sera réinitialisée et la page rechargée.',
            confirmText: 'Réinitialiser',
            danger: true,
        });
        if (!ok) return;
        const base = {
            ...DICE_FALLBACK_CONFIG,
            ...(slugDefaults ?? {}),
            custom: {...DICE_FALLBACK_CONFIG.custom, ...(slugDefaults?.custom ?? {})},
        };
        setDraft(base);
        saveConfig(base);
        window.location.reload();
    };

    if(draft === null) return null;

    const categories    = [...new Set(COLORSET_PRESETS.map(p => p.category))];
    const filteredPresets = COLORSET_PRESETS.filter(p => p.category === activeCategory);

    return (
        <>
            {confirmEl}
            <div
                className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75"
                style={{ backdropFilter: 'blur(6px)' }}
                onClick={onClose}
            >
                <div
                    className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl overflow-hidden bg-surface border border-base"
                    onClick={e => e.stopPropagation()}
                >
                    {/* En-tête */}
                    <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-base">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-surface-alt border border-base">
                                🎲
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-primary tracking-wider uppercase">Mes dés</h2>
                                <p className="text-xs text-muted mt-0.5">Apparence de l'animation</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-default hover:bg-surface-alt transition-all text-sm cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Corps scrollable */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* Switcher preset / custom */}
                        <div className="flex gap-1 p-1 rounded-xl bg-surface-alt border border-base">
                            {[{ key: 'preset', icon: '🎨', label: 'Preset' }, { key: 'custom', icon: '🛠', label: 'Personnalisé' }].map(m => (
                                <button
                                    key={m.key}
                                    onClick={() => updateDraft({ mode: m.key })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                                        draft.mode === m.key
                                            ? 'bg-primary text-base shadow-lg'
                                            : 'text-muted hover:text-default hover:bg-surface'
                                    }`}
                                >
                                    <span>{m.icon}</span><span>{m.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Mode PRESET */}
                        {draft.mode === 'preset' && (
                            <div className="space-y-3">
                                {/* Chips catégories */}
                                <div className="flex flex-wrap gap-1.5">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                                                activeCategory === cat
                                                    ? 'bg-primary text-base border-primary'
                                                    : 'bg-surface-alt text-muted border-base hover:border-accent hover:text-default'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Grille presets */}
                                <div className="grid grid-cols-3 gap-2">
                                    {filteredPresets.map(p => {
                                        const selected = draft.preset === p.key;
                                        return (
                                            <button
                                                key={p.key}
                                                onClick={() => updateDraft({ preset: p.key })}
                                                className={`flex flex-col gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                                    selected
                                                        ? 'border-primary bg-surface-alt'
                                                        : 'border-base bg-surface hover:border-accent'
                                                }`}
                                            >
                                                <div className="w-full h-8 rounded-lg overflow-hidden">
                                                    <PreviewSwatch colors={p.preview.bg} />
                                                </div>
                                                <span className={`text-xs font-medium text-center truncate w-full ${selected ? 'text-primary' : 'text-muted'}`}>
                                                {p.name}
                                            </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Mode CUSTOM */}
                        {draft.mode === 'custom' && (
                            <div className="space-y-4">
                                {[
                                    { key: 'foreground', label: 'Faces (texte/chiffres)' },
                                    { key: 'background', label: 'Corps du dé' },
                                    { key: 'outline',    label: 'Contour' },
                                    { key: 'edge',       label: 'Tranche (optionnel)' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-muted">{label}</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-8 h-8 rounded-lg border border-base"
                                                style={{ background: draft.custom[key] || 'transparent' }}
                                            />
                                            <input
                                                type="color"
                                                value={draft.custom[key] || '#000000'}
                                                onChange={e => updateDraft({ custom: { [key]: e.target.value } })}
                                                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* Matière */}
                                <div>
                                    <span className="text-xs text-muted block mb-1.5">Matière</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['metal', 'wood', 'glass', 'plastic', 'pristine'].map(mat => (
                                            <button
                                                key={mat}
                                                onClick={() => updateDraft({ custom: { material: mat } })}
                                                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                    draft.custom.material === mat
                                                        ? 'bg-primary text-base border-primary'
                                                        : 'bg-surface-alt text-muted border-base hover:border-accent'
                                                }`}
                                            >
                                                {mat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Physique */}
                        <div className="space-y-4 pt-2 border-t border-base">
                            <SliderField
                                label="Force de lancer"
                                value={draft.strength}
                                min={1} max={10}
                                onChange={v => updateDraft({ strength: v })}
                            />
                            <SliderField
                                label="Gravité"
                                value={draft.gravity}
                                min={100} max={2000} step={100}
                                onChange={v => updateDraft({ gravity: v })}
                                formatValue={v => `${v}`}
                            />
                        </div>

                        {/* Lumière */}
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-base">
                            <span className="text-xs text-muted">Couleur lumière</span>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg border border-base" style={{ background: draft.lightColor }} />
                                <input
                                    type="color"
                                    value={draft.lightColor}
                                    onChange={e => updateDraft({ lightColor: e.target.value })}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Sons */}
                        <div className="pt-2 border-t border-base">
                            <button
                                onClick={() => updateDraft({ sounds: !draft.sounds })}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-base hover:border-accent transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{draft.sounds ? '🔊' : '🔇'}</span>
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-default">Sons</div>
                                        <div className="text-xs text-muted">{draft.sounds ? 'Activés' : 'Désactivés'}</div>
                                    </div>
                                </div>
                                <div className={`w-11 h-6 rounded-full transition-all duration-200 relative shrink-0 ${draft.sounds ? 'bg-primary' : 'bg-surface'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${draft.sounds ? 'left-6' : 'left-1'}`} />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Pied de page */}
                    <div className="flex gap-2 px-6 py-4 shrink-0 border-t border-base">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 rounded-lg text-xs text-muted hover:text-default transition-colors cursor-pointer"
                        >
                            Réinitialiser
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-xs text-muted hover:text-default border border-base hover:border-accent transition-all cursor-pointer"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-2 rounded-lg text-sm font-bold bg-primary text-default hover:opacity-90 transition-all cursor-pointer shadow-lg"
                        >
                            Appliquer
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DiceConfigModal;