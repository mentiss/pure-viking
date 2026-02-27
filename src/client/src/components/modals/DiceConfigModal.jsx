/**
 * DiceConfigModal.jsx
 * Emplacement : src/client/src/components/shared/DiceConfigModal.jsx
 *
 * Modale de personnalisation des dés 3D (cosmétique uniquement).
 * Autosuffisant : toute la logique localStorage est ici, pas de hook externe.
 * Accessible depuis le burger menu (ou n'importe où).
 *
 * Usage :
 *   import DiceConfigModal from './shared/DiceConfigModal.jsx';
 *   {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}
 */

import React, { useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES — clé localStorage et config par défaut
// ─────────────────────────────────────────────────────────────────────────────

export const DICE_STORAGE_KEY = 'vtt_dice_config';

export const DICE_DEFAULT_CONFIG = {
    mode: 'preset',       // 'preset' | 'custom'
    preset: 'bloodmoon',
    custom: {
        foreground: '#c9922a',
        background: '#1a1208',
        outline: '#000000',
        edge: '',
        texture: '',
        material: 'metal',
    },
    strength: 5,
    gravity: 500,
    sounds: false,
    lightColor: '#ffd080',  // Couleur de la lumière (hex string)
    animationEnabled: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Lecture / écriture localStorage — fonctions pures, utilisables partout
// ─────────────────────────────────────────────────────────────────────────────

export const readDiceConfig = () => {
    try {
        const raw = localStorage.getItem(DICE_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...DICE_DEFAULT_CONFIG,
                ...parsed,
                custom: { ...DICE_DEFAULT_CONFIG.custom, ...(parsed.custom || {}) },
            };
        }
    } catch (_) {}
    return { ...DICE_DEFAULT_CONFIG, custom: { ...DICE_DEFAULT_CONFIG.custom } };
};

export const writeDiceConfig = (config) => {
    try {
        localStorage.setItem(DICE_STORAGE_KEY, JSON.stringify(config));
        return true;
    } catch (_) {
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// buildDiceBoxConfig : traduit notre format → format API dice-box-threejs
// Exporté pour être utilisé dans DiceAnimationOverlay
// ─────────────────────────────────────────────────────────────────────────────

export const buildDiceBoxConfig = (config) => {
    // Convertir la couleur hex string '#rrggbb' en nombre 0xRRGGBB attendu par la lib
    const hexToNum = (hex) => parseInt((hex || '#ffd080').replace('#', ''), 16);

    const base = {
        strength: config.strength ?? 5,
        gravity_multiplier: config.gravity ?? 500,
        baseScale: 100,
        light_intensity: 1.0,
        color_spotlight: hexToNum(config.lightColor),
        shadows: true,
        sounds: config.sounds ?? false,
        volume: 100,
    };

    if (config.mode === 'preset') {
        return {
            ...base,
            theme_colorset: config.preset || 'bloodmoon',
        };
    }

    // Mode custom — structure exacte confirmée par tests :
    // - texture est DANS theme_customColorset
    // - theme_material est une prop RACINE (pas dans le colorset)
    const { foreground, background, outline, edge, texture, material } = config.custom;

    const colorset = {
        foreground: foreground || '#c9922a',
        background: background || '#1a1208',
        outline:    outline    || '',
    };
    if (texture && texture !== '') colorset.texture = texture;
    if (edge    && edge    !== '') colorset.edge    = edge;

    return {
        ...base,
        theme_customColorset: colorset,
        theme_material: material || 'metal',
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// Données UI
// ─────────────────────────────────────────────────────────────────────────────

const COLORSET_PRESETS = [
    { key: 'white',        name: 'Blanc',            category: 'Couleurs',  preview: { bg: '#FFFFFF', fg: '#000000' } },
    { key: 'black',        name: 'Noir',             category: 'Couleurs',  preview: { bg: '#000000', fg: '#ffffff' } },
    { key: 'rainbow',      name: 'Arc-en-ciel',      category: 'Couleurs',  preview: { bg: ['#900000','#00B500','#00008E'], fg: '#FFFFFF' } },
    { key: 'fire',         name: 'Feu',              category: 'Éléments',  preview: { bg: ['#f43c04','#910200'], fg: '#f8d84f' } },
    { key: 'ice',          name: 'Glace',            category: 'Éléments',  preview: { bg: ['#214fa3','#09317a'], fg: '#60E9FF' } },
    { key: 'water',        name: 'Eau',              category: 'Éléments',  preview: { bg: ['#87b8c4','#4b757f'], fg: '#60E9FF' } },
    { key: 'earth',        name: 'Terre',            category: 'Éléments',  preview: { bg: ['#346804','#3a1d04'], fg: '#6C9943' } },
    { key: 'air',          name: 'Air',              category: 'Éléments',  preview: { bg: ['#d0e5ea','#80a4ad'], fg: '#ffffff' } },
    { key: 'lightning',    name: 'Foudre',           category: 'Éléments',  preview: { bg: ['#f17105','#df9a57'], fg: '#FFC500' } },
    { key: 'poison',       name: 'Poison',           category: 'Éléments',  preview: { bg: ['#313866','#c949fc'], fg: '#D6A8FF' } },
    { key: 'acid',         name: 'Acide',            category: 'Éléments',  preview: { bg: ['#a6ff00','#93bc25'], fg: '#A9FF70' } },
    { key: 'thunder',      name: 'Tonnerre',         category: 'Éléments',  preview: { bg: '#7D7D7D',   fg: '#FFC500' } },
    { key: 'bloodmoon',    name: 'Lune de sang',     category: 'JDR',       preview: { bg: '#6F0000',   fg: '#CDB800' } },
    { key: 'necrotic',     name: 'Nécrotique',       category: 'JDR',       preview: { bg: '#6F0000',   fg: '#ffffff' } },
    { key: 'force',        name: 'Force',            category: 'JDR',       preview: { bg: ['#FF68FF','#C651C6'], fg: 'white' } },
    { key: 'psychic',      name: 'Psychique',        category: 'JDR',       preview: { bg: ['#313866','#C949FC'], fg: '#D6A8FF' } },
    { key: 'starynight',   name: 'Nuit étoilée',     category: 'JDR',       preview: { bg: ['#091636','#4F708F'], fg: '#4F708F' } },
    { key: 'astralsea',    name: 'Mer astrale',      category: 'JDR',       preview: { bg: '#ffffff',   fg: '#565656' } },
    { key: 'dragons',      name: 'Dragons',          category: 'JDR',       preview: { bg: ['#B80000','#5BB8FF'], fg: '#FFFFFF' } },
    { key: 'bronze',       name: 'Bronze de Thylée', category: 'Métal',     preview: { bg: ['#705206','#643100'], fg: '#FF9159' } },
    { key: 'inspired',     name: 'Acier',            category: 'Métal',     preview: { bg: '#C4C4B6',   fg: '#FFD800' } },
    { key: 'tigerking',    name: 'Félin',            category: 'Fun',       preview: { bg: '#FFCC40',   fg: '#ffffff' } },
    { key: 'glitterparty', name: 'Paillettes',       category: 'Fun',       preview: { bg: ['#FFB5F5','#A17FFF'], fg: 'white' } },
    { key: 'breebaby',     name: 'Pastel',           category: 'Fun',       preview: { bg: ['#FE89CF','#CCE7FA'], fg: '#5E175E' } },
    { key: 'pinkdreams',   name: 'Rose',             category: 'Fun',       preview: { bg: ['#ff007c','#df00ff'], fg: 'white' } },
];

const TEXTURE_GROUPS = [
    { label: 'Aucune',   keys: [''] },
    { label: 'Naturel',  keys: ['fire','ice','water','marble','wood','metal','paper','stars','astral'] },
    { label: 'Nuages',   keys: ['cloudy','cloudy_2'] },
    { label: 'Motifs',   keys: ['speckles','glitter','glitter_2','stainedglass'] },
    { label: 'Animaux',  keys: ['dragon','lizard','leopard','tiger','cheetah','bird'] },
    { label: 'Bronze',   keys: ['bronze01','bronze02','bronze03','bronze03a','bronze03b','bronze04'] },
];

const TEXTURE_NAMES = {
    '': 'Aucune', fire: 'Feu', ice: 'Glace', water: 'Eau', marble: 'Marbre',
    wood: 'Bois', metal: 'Acier', paper: 'Parchemin', stars: 'Étoiles', astral: 'Astral',
    cloudy: 'Nuages (transp.)', cloudy_2: 'Nuages', speckles: 'Mouchetures',
    glitter: 'Paillettes', glitter_2: 'Paillettes (transp.)', stainedglass: 'Vitrail',
    dragon: 'Dragon', lizard: 'Lézard', leopard: 'Léopard', tiger: 'Tigre',
    cheetah: 'Guépard', bird: 'Plumes',
    bronze01: 'Bronze I', bronze02: 'Bronze II', bronze03: 'Bronze III',
    bronze03a: 'Bronze IIIa', bronze03b: 'Bronze IIIb', bronze04: 'Bronze IV',
};

const MATERIAL_OPTIONS = [
    { key: 'glass',   name: 'Verre'     },
    { key: 'metal',   name: 'Métal'     },
    { key: 'wood',    name: 'Bois'      },
    { key: 'plastic', name: 'Plastique' },
    { key: 'none',    name: 'Aucun'     },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

const bgToGradient = (bg) =>
    Array.isArray(bg) ? `linear-gradient(135deg, ${bg.join(', ')})` : (bg || '#1a1208');

const ColorsetSwatch = ({ preset, isSelected, onClick }) => (
    <button
        onClick={onClick}
        title={preset.name}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
            isSelected
                ? 'ring-2 ring-viking-bronze bg-viking-bronze/10'
                : 'bg-white/3 hover:bg-white/8 ring-1 ring-white/5 hover:ring-white/15'
        }`}
    >
        <div
            className="w-8 h-8 rounded-md shrink-0 border border-black/20 flex items-center justify-center text-xs font-black"
            style={{
                background: bgToGradient(preset.preview.bg),
                color: preset.preview.fg,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
        >
            d
        </div>
        <span className={`text-xs truncate font-medium ${isSelected ? 'text-viking-bronze' : 'text-viking-parchment/70'}`}>
      {preset.name}
    </span>
        {isSelected && <span className="ml-auto text-viking-bronze text-xs shrink-0">✓</span>}
    </button>
);

const ColorField = ({ label, value, onChange }) => {
    // State local pour le picker natif — évite de remonter onChange à chaque pixel
    // déplacé dans le color picker (qui causerait un re-render du parent à 60fps)
    const [pickerValue, setPickerValue] = React.useState(
        /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#888888'
    );
    const safeHex = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#888888';

    const handlePickerChange = (e) => {
        setPickerValue(e.target.value);
    };
    const handlePickerCommit = (e) => {
        // Ne remonter la valeur au parent qu'à la fin du drag (mouseup/close du picker)
        onChange(e.target.value);
    };

    return (
        <div className="flex items-center gap-3">
            <label className="text-xs text-viking-parchment/50 w-20 shrink-0">{label}</label>
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <label className="relative cursor-pointer shrink-0">
                    <input
                        type="color"
                        value={pickerValue}
                        onChange={handlePickerChange}
                        onBlur={handlePickerCommit}
                        className="sr-only"
                    />
                    <div
                        className="w-8 h-8 rounded-md border-2 border-viking-bronze/30 hover:border-viking-bronze/70 transition-colors"
                        style={{ background: safeHex }}
                    />
                </label>
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-md px-2.5 py-1.5 text-xs font-mono text-viking-parchment focus:outline-none focus:border-viking-bronze/50 transition-colors"
                    placeholder="#rrggbb ou nom CSS"
                    spellCheck={false}
                />
            </div>
        </div>
    );
};

const SliderField = ({ label, value, min, max, step = 1, onChange, formatValue }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                <span className="text-xs text-viking-parchment/50">{label}</span>
                <span className="text-xs font-mono font-bold text-viking-bronze">
          {formatValue ? formatValue(value) : value}
        </span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #c9922a ${pct}%, rgba(255,255,255,0.08) 0%)` }}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

const DiceConfigModal = ({ onClose }) => {
    // Lire directement localStorage à l'ouverture — pas de hook intermédiaire
    const [draft, setDraft] = useState(() => readDiceConfig());

    const [activeCategory, setActiveCategory] = useState(() => {
        const saved = readDiceConfig();
        return COLORSET_PRESETS.find(p => p.key === saved.preset)?.category || 'JDR';
    });

    const updateDraft = useCallback((updates) => {
        setDraft(prev => {
            const next = { ...prev, ...updates };
            if (updates.custom) next.custom = { ...prev.custom, ...updates.custom };
            return next;
        });
    }, []);

    const handleSave = () => {
        // Écriture directe — pas de hook, pas d'abstraction
        const ok = writeDiceConfig(draft);
        console.log('[DiceConfig] Sauvegarde:', ok, draft);
        onClose();
    };

    const handleReset = () => {
        const def = { ...DICE_DEFAULT_CONFIG, custom: { ...DICE_DEFAULT_CONFIG.custom } };
        setDraft(def);
        writeDiceConfig(def);
    };

    const categories = [...new Set(COLORSET_PRESETS.map(p => p.category))];
    const filteredPresets = COLORSET_PRESETS.filter(p => p.category === activeCategory);

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            style={{ background: 'rgba(4, 2, 1, 0.88)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(170deg, #1e150a 0%, #110d06 60%, #0d0906 100%)',
                    border: '1px solid rgba(201,146,42,0.25)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(201,146,42,0.15)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(201,146,42,0.12)', border: '1px solid rgba(201,146,42,0.25)' }}>🎲</div>
                        <div>
                            <h2 className="text-sm font-bold text-viking-bronze tracking-wider uppercase">Mes dés</h2>
                            <p className="text-xs text-viking-parchment/35 mt-0.5">Apparence de l'animation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-viking-parchment/30 hover:text-viking-parchment/70 hover:bg-white/6 transition-all text-sm">✕</button>
                </div>

                {/* Corps scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Switcher mode */}
                    <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {[{ key: 'preset', icon: '🎨', label: 'Preset' }, { key: 'custom', icon: '🛠', label: 'Personnalisé' }].map(m => (
                            <button
                                key={m.key}
                                onClick={() => updateDraft({ mode: m.key })}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                                    draft.mode === m.key ? 'bg-viking-bronze text-viking-brown shadow-lg' : 'text-viking-parchment/40 hover:text-viking-parchment/70 hover:bg-white/5'
                                }`}
                            >
                                <span>{m.icon}</span><span>{m.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Mode PRESET */}
                    {draft.mode === 'preset' && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                            activeCategory === cat
                                                ? 'bg-viking-bronze/20 text-viking-bronze border border-viking-bronze/40'
                                                : 'text-viking-parchment/40 hover:text-viking-parchment/65 border border-transparent hover:border-white/10'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {filteredPresets.map(preset => (
                                    <ColorsetSwatch
                                        key={preset.key}
                                        preset={preset}
                                        isSelected={draft.preset === preset.key}
                                        onClick={() => updateDraft({ preset: preset.key })}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-viking-parchment/25 text-center pt-1">Couleurs et texture définies par le preset</p>
                        </div>
                    )}

                    {/* Mode CUSTOM */}
                    {draft.mode === 'custom' && (
                        <div className="space-y-6">
                            {/* Couleurs */}
                            <div className="space-y-3">
                                <p className="text-xs text-viking-parchment/35 uppercase tracking-widest font-semibold">Couleurs</p>
                                <div className="space-y-2.5 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <ColorField label="Corps"    value={draft.custom.background} onChange={v => updateDraft({ custom: { background: v } })} />
                                    <div className="border-t border-white/5" />
                                    <ColorField label="Chiffres" value={draft.custom.foreground} onChange={v => updateDraft({ custom: { foreground: v } })} />
                                    <div className="border-t border-white/5" />
                                    <ColorField label="Contour"  value={draft.custom.outline}    onChange={v => updateDraft({ custom: { outline: v } })} />
                                    <div className="border-t border-white/5" />
                                    <ColorField label="Tranche"  value={draft.custom.edge || ''} onChange={v => updateDraft({ custom: { edge: v } })} />
                                </div>
                            </div>

                            {/* Texture */}
                            <div className="space-y-3">
                                <p className="text-xs text-viking-parchment/35 uppercase tracking-widest font-semibold">Texture</p>
                                <div className="space-y-3">
                                    {TEXTURE_GROUPS.map(group => (
                                        <div key={group.label}>
                                            <p className="text-xs text-viking-parchment/25 mb-1.5">{group.label}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {group.keys.map(key => (
                                                    <button
                                                        key={key}
                                                        onClick={() => updateDraft({ custom: { texture: key } })}
                                                        className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                                                            draft.custom.texture === key
                                                                ? 'bg-viking-bronze/25 text-viking-bronze border border-viking-bronze/50 font-semibold'
                                                                : 'bg-white/3 text-viking-parchment/50 border border-white/5 hover:bg-white/8 hover:text-viking-parchment/80 hover:border-white/15'
                                                        }`}
                                                    >
                                                        {TEXTURE_NAMES[key] || key}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Matériau */}
                            <div className="space-y-2">
                                <p className="text-xs text-viking-parchment/35 uppercase tracking-widest font-semibold">Matériau</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {MATERIAL_OPTIONS.map(mat => (
                                        <button
                                            key={mat.key}
                                            onClick={() => updateDraft({ custom: { material: mat.key } })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                draft.custom.material === mat.key
                                                    ? 'bg-viking-bronze/25 text-viking-bronze border border-viking-bronze/50'
                                                    : 'bg-white/3 text-viking-parchment/50 border border-white/5 hover:bg-white/8 hover:text-viking-parchment/80'
                                            }`}
                                        >
                                            {mat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Physique & Lumière */}
                    <div className="space-y-4 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <p className="text-xs text-viking-parchment/35 uppercase tracking-widest font-semibold">Physique & Lumière</p>
                        <SliderField
                            label="Force du lancer" value={draft.strength} min={1} max={10}
                            onChange={v => updateDraft({ strength: v })}
                            formatValue={v => v <= 3 ? `${v} — Doux` : v <= 6 ? `${v} — Franc` : `${v} — Brutal`}
                        />
                        <SliderField
                            label="Gravité" value={draft.gravity} min={200} max={800} step={50}
                            onChange={v => updateDraft({ gravity: v })}
                            formatValue={v => v <= 300 ? `${v} — Léger` : v <= 500 ? `${v} — Normal` : `${v} — Lourd`}
                        />
                        <div className="border-t border-white/5 pt-3">
                            <ColorField
                                label="Lumière"
                                value={draft.lightColor || '#ffd080'}
                                onChange={v => updateDraft({ lightColor: v })}
                            />
                            <p className="text-xs text-viking-parchment/25 mt-1.5 pl-[92px]">
                                Teinte du projecteur 3D
                            </p>
                        </div>
                    </div>

                    {/* Sons + Animation — groupés */}
                    <div className="space-y-2">
                        <button
                            onClick={() => updateDraft({ animationEnabled: !draft.animationEnabled })}
                            className="flex items-center justify-between w-full group px-4 py-3 rounded-xl transition-all hover:bg-white/3"
                            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{draft.animationEnabled ? '🎲' : '⚡'}</span>
                                <div className="text-left">
                                    <div className="text-sm text-viking-parchment/75 group-hover:text-viking-parchment/90 transition-colors">Animation 3D</div>
                                    <div className="text-xs text-viking-parchment/35 mt-0.5">
                                        {draft.animationEnabled ? 'Les dés roulent en 3D' : 'Résultat instantané'}
                                    </div>
                                </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-all duration-200 relative shrink-0 ${draft.animationEnabled ? 'bg-viking-bronze' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${draft.animationEnabled ? 'left-6' : 'left-1'}`} />
                            </div>
                        </button>
                        <button
                            onClick={() => updateDraft({ sounds: !draft.sounds })}
                            className={`flex items-center justify-between w-full group px-4 py-3 rounded-xl transition-all ${
                                draft.animationEnabled ? 'hover:bg-white/3' : 'opacity-30 pointer-events-none'
                            }`}
                            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{draft.sounds ? '🔊' : '🔇'}</span>
                                <div className="text-left">
                                    <div className="text-sm text-viking-parchment/75 group-hover:text-viking-parchment/90 transition-colors">Sons des dés</div>
                                    <div className="text-xs text-viking-parchment/35 mt-0.5">{draft.sounds ? 'Activés' : 'Désactivés'}</div>
                                </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-all duration-200 relative shrink-0 ${draft.sounds ? 'bg-viking-bronze' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${draft.sounds ? 'left-6' : 'left-1'}`} />
                            </div>
                        </button>
                    </div>

                </div>

                {/* Pied de page */}
                <div className="flex gap-2 px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(201,146,42,0.15)' }}>
                    <button onClick={handleReset} className="px-4 py-2 rounded-lg text-xs text-viking-parchment/35 hover:text-viking-parchment/65 transition-colors">
                        Réinitialiser
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-viking-parchment/45 hover:text-viking-parchment/75 border border-white/8 hover:border-white/15 transition-all">
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2 rounded-lg text-sm font-bold transition-all bg-viking-bronze hover:bg-amber-500 text-viking-brown shadow-lg"
                        style={{ boxShadow: '0 4px 20px rgba(201,146,42,0.3)' }}
                    >
                        Appliquer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiceConfigModal;