import { RollError } from '../../tools/diceEngine.js';

// ── Constantes système ────────────────────────────────────────────────────────

export const DOMAINES = {
    physique: { label: 'Physique', color: 'danger',    stats: ['force', 'sante', 'athletisme'] },
    manuel:   { label: 'Manuel',   color: 'primary',   stats: ['agilite', 'precision', 'technique'] },
    mental:   { label: 'Mental',   color: 'secondary', stats: ['connaissance', 'perception', 'volonte'] },
    social:   { label: 'Social',   color: 'success',   stats: ['persuasion', 'psychologie', 'entregent'] },
};

export const STAT_LABELS = {
    force:        'Force',
    sante:        'Santé',
    athletisme:   'Athlétisme',
    agilite:      'Agilité',
    precision:    'Précision',
    technique:    'Technique',
    connaissance: 'Connaissance',
    perception:   'Perception',
    volonte:      'Volonté',
    persuasion:   'Persuasion',
    psychologie:  'Psychologie',
    entregent:    'Entregent',
};

export const SPECIALTY_TYPES = {
    normale:  { label: 'Normale',  badge: ''  },
    complexe: { label: 'Complexe', badge: 'C' },
    rare:     { label: 'Rare',     badge: 'R' },
    fracture: { label: 'Fracture', badge: 'F' },
};

export const SPECIALTY_NIVEAUX = {
    debutant: { label: 'Débutant',  bonus: 1, reserveMax: 1 },
    confirme: { label: 'Confirmé',  bonus: 1, reserveMax: 2 },
    expert:   { label: 'Expert',    bonus: 2, reserveMax: 3 },
};

export const OMBRE_TYPES = {
    dette:       { label: 'Dette ou Obligation', effect: "La faction créditrice peut exiger remboursement à tout moment." },
    recherche:   { label: 'Recherché',           effect: "Toute exposition publique peut déclencher une complication." },
    addiction:   { label: 'Addiction',           effect: "Sans satisfaction quotidienne : −1D à la réserve de Sang-Froid au réveil." },
    sequelle:    { label: 'Séquelle Physique',   effect: "−1D aux jets de Santé lors d'efforts prolongés." },
    traumatisme: { label: 'Traumatisme',         effect: "Face au déclencheur : jet de Volonté requis ou paralysie/panique." },
};

// Liste de référence des spécialités (suggestions dans le wizard)
export const SPECIALTIES_REFERENCE = [
    { name: 'Bagarre',          type: 'normale' },
    { name: 'Esquive',          type: 'normale' },
    { name: 'Parade',           type: 'normale' },
    { name: 'Arc',              type: 'normale' },
    { name: 'Épée',             type: 'normale' },
    { name: 'Hache',            type: 'normale' },
    { name: 'Fusil',            type: 'normale' },
    { name: 'Arme à feu',       type: 'complexe' },
    { name: 'Pistolet',         type: 'normale' },
    { name: 'Médecine',         type: 'complexe' },
    { name: 'Chirurgie',        type: 'rare' },
    { name: 'Chimie',           type: 'rare' },
    { name: 'Botanique',        type: 'rare' },
    { name: 'Zoologie',         type: 'rare' },
    { name: 'Psychologie',      type: 'complexe' },
    { name: 'Théologie solaire',type: 'complexe' },
    { name: 'Droit canonique',  type: 'complexe' },
    { name: 'Histoire',         type: 'rare' },
    { name: 'Linguistique',     type: 'rare' },
    { name: 'Astronomie',       type: 'rare' },
    { name: 'Cartographie',     type: 'normale' },
    { name: 'Pharmacologie',    type: 'complexe' },
    { name: 'Alchimie',         type: 'rare' },
    { name: 'Forgeron',         type: 'normale' },
    { name: 'Menuisier',        type: 'normale' },
    { name: 'Calligraphe',      type: 'complexe' },
    { name: 'Métallurgiste',    type: 'rare' },
    { name: 'Verrier',          type: 'complexe' },
    { name: 'Persuasion',       type: 'normale' },
    { name: 'Intimidation',     type: 'normale' },
    { name: 'Marchandage',      type: 'normale' },
    { name: 'Étiquette',        type: 'normale' },
    { name: 'Commandement',     type: 'normale' },
    { name: 'Mécanique',        type: 'complexe' },
    { name: 'Horlogerie',       type: 'rare' },
    { name: 'Navigation',       type: 'complexe' },
    { name: 'Pyrotechnie',      type: 'rare' },
    { name: 'Pistage',          type: 'normale' },
    { name: 'Pièges',           type: 'normale' },
    { name: 'Discrétion',       type: 'normale' },
    { name: 'Sens du danger',   type: 'normale' },
    { name: 'Empathie animale', type: 'normale' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function computeReserveMax(char) {
    return {
        effort:    char.force + char.sante + char.athletisme
            + char.agilite + char.precision + char.technique,
        sangfroid: char.connaissance + char.perception + char.volonte
            + char.persuasion + char.psychologie + char.entregent,
    };
}

export function computeInitiative(char) {
    return char.agilite + char.athletisme;
}

export function computeMalusBlessure(char) {
    if (char.sante_tue_current   > 0) return -3;
    if (char.sante_blesse_current > 0) return -2;
    if (char.sante_touche_current > 0) return -1;
    return 0;
}

export function computeLimiteCorruption(char) {
    return char.volonte + char.sante;
}

// Coût XP d'upgrade spécialité selon type
export function xpCostUpgrade(fromNiveau, type) {
    const multiplier = type === 'rare' ? 3 : type === 'complexe' ? 2 : 1;
    const base = fromNiveau === 'debutant' ? 20 : 30;
    return base * multiplier;
}

// ── Config dés ────────────────────────────────────────────────────────────────

const noctisConfig = {
    slug:  'noctis',
    label: 'Noctis Solis',

    dice: {
        // buildNotation est appelé par DiceModal AVANT roll()
        buildNotation: (ctx) => {
            const { pool } = ctx.systemData;
            if (!pool || pool < 1) throw new RollError('NO_DICE', 'Aucun dé à lancer');
            return `${pool}d10`;
        },

        beforeRoll: (ctx) => {
            const { pool } = ctx.systemData;
            if (pool < 1) throw new RollError('INVALID_POOL', `Pool invalide : ${pool}`);
            // Clamp à 1 minimum même avec malus blessure important
            if (pool > 20) throw new RollError('INVALID_POOL', `Pool trop grand : ${pool}`);
            return ctx;
        },

        // 1-6 → 0 succès / 7-9 → 1 succès / 10 → 2 succès
        afterRoll: (raw, ctx) => {
            const values    = raw.groups[0].values;
            const successes = values.reduce((acc, v) => {
                if (v >= 10) return acc + 2;
                if (v >= 7)  return acc + 1;
                return acc;
            }, 0);

            return {
                values,
                successes,
                pool:      ctx.systemData.pool,
                threshold: ctx.systemData.threshold ?? null,
                margin:    ctx.systemData.threshold != null
                    ? Math.max(-1, successes - ctx.systemData.threshold)
                    : null,
            };
        },

        buildAnimationSequence: (raw, ctx) => {
            const values = raw.groups[0].values;
            return {
                waves: [{
                    dice: values.map((face, i) => ({
                        dieType:  'd10',
                        face,
                        // Or sur 10, vert sur 7-9, rouge sinon
                        color: face >= 10 ? '#bf9b30'
                            : face >= 7  ? '#3a8a3a'
                                : '#a61c1c',
                    })),
                }],
            };
        },

        renderHistoryEntry: (entry) => {
            const result = entry.roll_result ?? {};
            const values = result.values ?? [];
            const successes = result.successes ?? 0;
            const pool = result.pool ?? values.length;

            const dieColor = (v) => {
                if (v >= 10) return { bg: 'var(--color-primary)',  color: 'var(--color-bg)' };
                if (v >= 7)  return { bg: 'var(--color-success)',  color: 'var(--color-bg)' };
                return           { bg: 'var(--color-surface-alt)', color: 'var(--color-muted)' };
            };

            return (
                <div className="px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                <span className="text-default text-xs font-semibold"
                      style={{ fontFamily: 'var(--ns-font-title)', letterSpacing: '0.05em' }}>
                    {entry.roll_type ?? 'Jet'}
                </span>
                        <span className="text-xs font-bold font-mono"
                              style={{ color: successes > 0 ? 'var(--color-success)' : 'var(--color-muted)' }}>
                    {successes} succès
                </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {values.map((v, i) => {
                            const { bg, color } = dieColor(v);
                            return (
                                <span key={i}
                                      className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold font-mono"
                                      style={{ background: bg, color }}>
                            {v}
                        </span>
                            );
                        })}
                    </div>
                    {result.threshold != null && (
                        <p className="text-muted text-xs">
                            Seuil {result.threshold}
                            {result.margin != null && (
                                <span className={result.margin >= 0 ? 'text-success' : 'text-danger'}>
                            {' '}({result.margin >= 0 ? '+' : ''}{result.margin})
                        </span>
                            )}
                        </p>
                    )}
                </div>
            );
        },
    },

    // Pas de combat géré en v1
    combat: null,
};

export default noctisConfig;