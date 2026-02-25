/**
 * useDiceConfig.js
 * Emplacement : src/client/src/hooks/useDiceConfig.js
 *
 * Hook de gestion de la configuration des dés 3D.
 * Persiste en localStorage, expose buildDiceBoxConfig() qui traduit
 * vers l'API exacte de @3d-dice/dice-box-threejs.
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'vtt_dice_config';

// ─────────────────────────────────────────────────────────────────────────────
// COLORSETS — liste complète issue de colorsets.js (lib officielle)
// On filtre les sets Star Wars et trop spécifiques pour garder ce qui est
// pertinent en JDR générique/viking.
// Chaque entry a : key, name, category, preview { bg (string|array), fg }
// ─────────────────────────────────────────────────────────────────────────────
export const COLORSET_PRESETS = [
    // ── Couleurs simples ──────────────────────────────────────────────────────
    { key: 'white',        name: 'Blanc',            category: 'Couleurs',  preview: { bg: '#FFFFFF', fg: '#000000' } },
    { key: 'black',        name: 'Noir',             category: 'Couleurs',  preview: { bg: '#000000', fg: '#ffffff' } },
    { key: 'rainbow',      name: 'Arc-en-ciel',      category: 'Couleurs',  preview: { bg: ['#900000','#CE3900','#BCBC00','#00B500','#00008E','#008282','#A500A5'], fg: '#FFFFFF' } },

    // ── Types de dommages / Éléments ──────────────────────────────────────────
    { key: 'fire',         name: 'Feu',              category: 'Éléments',  preview: { bg: ['#f8d84f','#f9b02d','#f43c04','#910200','#4c1009'], fg: '#f8d84f' } },
    { key: 'ice',          name: 'Glace',            category: 'Éléments',  preview: { bg: ['#214fa3','#3c6ac1','#253f70','#0b56e2','#09317a'], fg: '#60E9FF' } },
    { key: 'water',        name: 'Eau',              category: 'Éléments',  preview: { bg: ['#87b8c4','#6b98a3','#4b757f'], fg: '#60E9FF' } },
    { key: 'earth',        name: 'Terre',            category: 'Éléments',  preview: { bg: ['#346804','#184200','#3a1d04'], fg: '#6C9943' } },
    { key: 'air',          name: 'Air',              category: 'Éléments',  preview: { bg: ['#d0e5ea','#a4ccd6','#80a4ad'], fg: '#ffffff' } },
    { key: 'lightning',    name: 'Foudre',           category: 'Éléments',  preview: { bg: ['#f17105','#f3ca40','#df9a57'], fg: '#FFC500' } },
    { key: 'poison',       name: 'Poison',           category: 'Éléments',  preview: { bg: ['#313866','#504099','#c949fc'], fg: '#D6A8FF' } },
    { key: 'acid',         name: 'Acide',            category: 'Éléments',  preview: { bg: ['#a6ff00','#5ace04','#93bc25'], fg: '#A9FF70' } },
    { key: 'thunder',      name: 'Tonnerre',         category: 'Éléments',  preview: { bg: '#7D7D7D',   fg: '#FFC500' } },
    { key: 'radiant',      name: 'Radiant',          category: 'Éléments',  preview: { bg: '#FFFFFF',   fg: '#F9B333' } },

    // ── JDR / Magie ───────────────────────────────────────────────────────────
    { key: 'bloodmoon',    name: 'Lune de sang',     category: 'JDR',       preview: { bg: '#6F0000',   fg: '#CDB800' } },
    { key: 'necrotic',     name: 'Nécrotique',       category: 'JDR',       preview: { bg: '#6F0000',   fg: '#ffffff' } },
    { key: 'force',        name: 'Force',            category: 'JDR',       preview: { bg: ['#FF97FF','#FF68FF','#C651C6'], fg: 'white' } },
    { key: 'psychic',      name: 'Psychique',        category: 'JDR',       preview: { bg: ['#313866','#504099','#C949FC'], fg: '#D6A8FF' } },
    { key: 'starynight',   name: 'Nuit étoilée',     category: 'JDR',       preview: { bg: ['#091636','#233660','#4F708F'], fg: '#4F708F' } },
    { key: 'astralsea',    name: 'Mer astrale',      category: 'JDR',       preview: { bg: '#ffffff',   fg: '#565656' } },
    { key: 'dragons',      name: 'Dragons',          category: 'JDR',       preview: { bg: ['#B80000','#4D5A5A','#5BB8FF','#7E934E'], fg: '#FFFFFF' } },

    // ── Métal / Personnalisés ─────────────────────────────────────────────────
    { key: 'bronze',       name: 'Bronze de Thylée', category: 'Métal',     preview: { bg: ['#705206','#7A4E06','#643100'], fg: '#FF9159' } },
    { key: 'inspired',     name: 'Acier',            category: 'Métal',     preview: { bg: '#C4C4B6',   fg: '#FFD800' } },

    // ── Fun / Autres ──────────────────────────────────────────────────────────
    { key: 'tigerking',    name: 'Félin',            category: 'Fun',       preview: { bg: '#FFCC40',   fg: '#ffffff' } },
    { key: 'birdup',       name: 'Oiseaux',          category: 'Fun',       preview: { bg: ['#F11602','#FFC000','#6EC832','#0094BC'], fg: '#FFFFFF' } },
    { key: 'glitterparty', name: 'Paillettes',       category: 'Fun',       preview: { bg: ['#FFB5F5','#7FC9FF','#A17FFF'], fg: 'white' } },
    { key: 'starynight',   name: 'Nuit étoilée',     category: 'Fun',       preview: { bg: ['#091636','#233660','#8597AD'], fg: '#4F708F' } },
    { key: 'breebaby',     name: 'Pastel',           category: 'Fun',       preview: { bg: ['#FE89CF','#DFD4F2','#CCE7FA'], fg: '#5E175E' } },
    { key: 'pinkdreams',   name: 'Rose',             category: 'Fun',       preview: { bg: ['#ff007c','#df73ff','#df00ff'], fg: 'white' } },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEXTURES — liste exhaustive de texturelist.js (skulls exclu car asset manquant)
// ─────────────────────────────────────────────────────────────────────────────
export const TEXTURE_OPTIONS = [
    { key: '',            name: 'Aucune'              },
    // Naturelles
    { key: 'fire',        name: 'Feu'                 },
    { key: 'ice',         name: 'Glace'               },
    { key: 'water',       name: 'Eau'                 },
    { key: 'marble',      name: 'Marbre'              },
    { key: 'wood',        name: 'Bois'                },
    { key: 'metal',       name: 'Acier'               },
    { key: 'paper',       name: 'Parchemin'           },
    { key: 'stars',       name: 'Étoiles'             },
    { key: 'astral',      name: 'Astral'              },
    // Nuages
    { key: 'cloudy',      name: 'Nuages (transp.)'    },
    { key: 'cloudy_2',    name: 'Nuages'              },
    // Motifs
    { key: 'speckles',    name: 'Mouchetures'         },
    { key: 'glitter',     name: 'Paillettes'          },
    { key: 'glitter_2',   name: 'Paillettes (transp.)'},
    { key: 'stainedglass',name: 'Vitrail'             },
    // Animaux
    { key: 'dragon',      name: 'Dragon'              },
    { key: 'lizard',      name: 'Lézard'              },
    { key: 'leopard',     name: 'Léopard'             },
    { key: 'tiger',       name: 'Tigre'               },
    { key: 'cheetah',     name: 'Guépard'             },
    { key: 'bird',        name: 'Plumes'              },
    // Bronze (variantes)
    { key: 'bronze01',    name: 'Bronze I'            },
    { key: 'bronze02',    name: 'Bronze II'           },
    { key: 'bronze03',    name: 'Bronze III'          },
    { key: 'bronze03a',   name: 'Bronze IIIa'         },
    { key: 'bronze03b',   name: 'Bronze IIIb'         },
    { key: 'bronze04',    name: 'Bronze IV'           },
    // Divers
    { key: 'acleaf',      name: 'Feuille'             },
];

// ─────────────────────────────────────────────────────────────────────────────
// MATÉRIAUX
// ─────────────────────────────────────────────────────────────────────────────
export const MATERIAL_OPTIONS = [
    { key: 'glass',   name: 'Verre'     },
    { key: 'metal',   name: 'Métal'     },
    { key: 'wood',    name: 'Bois'      },
    { key: 'plastic', name: 'Plastique' },
    { key: 'none',    name: 'Aucun'     },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG PAR DÉFAUT
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
    mode: 'preset',       // 'preset' | 'custom'
    preset: 'bloodmoon',
    custom: {
        foreground: '#c9922a',
        background: '#1a1208',
        outline: '#000000',
        edge: '',           // optionnel, '' = non utilisé
        texture: '',
        material: 'metal',
    },
    strength: 5,
    gravity: 500,
    sounds: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// buildDiceBoxConfig : traduit notre format → format API de la lib
// ─────────────────────────────────────────────────────────────────────────────
export const buildDiceBoxConfig = (config) => {
    const base = {
        strength: config.strength ?? DEFAULT_CONFIG.strength,
        gravity_multiplier: config.gravity ?? DEFAULT_CONFIG.gravity,
        baseScale: 100,
        light_intensity: 1.0,
        color_spotlight: 0xffd080,
        shadows: true,
        sounds: config.sounds ?? false,
        volume: 100,
    };

    if (config.mode === 'preset') {
        return {
            ...base,
            theme_colorset: config.preset || 'bloodmoon',
            theme_customColorset: null,
            theme_texture: '',
        };
    }

    // Mode custom
    const { foreground, background, outline, edge, texture, material } = config.custom;
    const colorset = {
        foreground: foreground || '#c9922a',
        background: background || '#1a1208',
        outline: outline || 'black',
    };
    // edge est optionnel — on ne l'ajoute que s'il est renseigné
    if (edge && edge !== '') colorset.edge = edge;

    return {
        ...base,
        theme_colorset: null,
        theme_customColorset: colorset,
        theme_texture: texture || '',
        theme_material: material || 'metal',
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
const useDiceConfig = () => {
    const loadFromStorage = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Fusion profonde pour préserver les clés par défaut non stockées
                return {
                    ...DEFAULT_CONFIG,
                    ...parsed,
                    custom: { ...DEFAULT_CONFIG.custom, ...(parsed.custom || {}) },
                };
            }
        } catch (_) {}
        return { ...DEFAULT_CONFIG, custom: { ...DEFAULT_CONFIG.custom } };
    };

    const [config, setConfig] = useState(loadFromStorage);

    const updateConfig = useCallback((updates) => {
        setConfig(prev => {
            const next = { ...prev, ...updates };
            if (updates.custom) {
                next.custom = { ...prev.custom, ...updates.custom };
            }
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    }, []);

    const resetConfig = useCallback(() => {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        setConfig({ ...DEFAULT_CONFIG, custom: { ...DEFAULT_CONFIG.custom } });
    }, []);

    return {
        config,
        updateConfig,
        resetConfig,
        getDiceBoxConfig: () => buildDiceBoxConfig(config),
    };
};

export default useDiceConfig;