// src/client/src/systems/tecumah/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration CLIENT du système Tecumah Gulch (D6 System + Wild Die).
//
// Contient tout ce qui est propre au système :
//   - Fonctions de calcul (pips, défense, blessure)
//   - Données statiques (attributs, compétences, backgrounds, difficultés)
//   - Hooks dés + bloc combat (sans référence à des modales)
//
// ⚠️ N'importe AUCUNE modale.
//    TecumahDiceModal → importe config (sens unique).
//    combat.renderRollStep = null (injecté par TabCombat).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { RollError }        from '../../tools/diceEngine.js';
import HealthDisplay        from './components/HealthDisplay.jsx';
import TecumahHistoryEntry  from './components/TecumahHistoryEntry.jsx';
import TecumahNPCForm from "./components/gm/npc/TecumahNPCForm.jsx";

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS DE CALCUL
// ═══════════════════════════════════════════════════════════════════════════════

export function pipsToNotation(pips) {
    if (!pips || pips <= 0) return '—';
    const dice = Math.floor(pips / 3);
    const rest  = pips % 3;
    return rest === 0 ? `${dice}D` : `${dice}D+${rest}`;
}

export function pipsToPool(pips)    { return Math.floor(pips / 3); }
export function pipsResidual(pips)  { return pips % 3; }

export function getDefenseNaturelle(esquivePips) {
    if (esquivePips < 6)   return 9;
    if (esquivePips <= 12) return 10;
    if (esquivePips <= 18) return 11;
    if (esquivePips <= 24) return 12;
    return 13;
}
export function getDefenseActive(esquivePips)  { return esquivePips; }
export function getDefenseTotale(esquivePips)  { return getDefenseNaturelle(esquivePips) + esquivePips; }
export function getResistanceFixe(vigueurPips) { return vigueurPips; }

export function getDegatsNaturels(vigueurPips, puissancePips) {
    return Math.ceil(Math.floor((vigueurPips + puissancePips) / 3) / 2);
}

export const BLESSURE_LABELS = [
    'Sain', 'Stunned', 'Wounded', 'Severely Wounded', 'Incapacitated', 'Mortal',
];

const BLESSURE_MALUS = [0, 1, 2, 3, Infinity, Infinity];
export function getBlessureMalus(niveau) {
    return BLESSURE_MALUS[Math.min(5, Math.max(0, niveau))] ?? 0;
}

export function getInitiative(agilitePips, perceptionPips) {
    return agilitePips + perceptionPips;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTRIBUTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ATTRIBUTS = [
    'agilite', 'vigueur', 'coordination', 'perception', 'charisme', 'savoir',
];

export const ATTRIBUT_LABELS = {
    agilite:      'Agilité',
    vigueur:      'Vigueur',
    coordination: 'Coordination',
    perception:   'Perception',
    charisme:     'Charisme',
    savoir:       'Savoir',
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPÉTENCES
// ═══════════════════════════════════════════════════════════════════════════════

export const SKILLS = [
    // Agilité
    { key: 'comp_acrobatie',      label: 'Acrobatie',      attr: 'agilite' },
    { key: 'comp_armes_blanches', label: 'Armes blanches', attr: 'agilite' },
    { key: 'comp_discretion',     label: 'Discrétion',     attr: 'agilite' },
    { key: 'comp_esquive',        label: 'Esquive',        attr: 'agilite' },
    { key: 'comp_contorsion',     label: 'Contorsion',     attr: 'agilite' },
    { key: 'comp_lutte',          label: 'Lutte',          attr: 'agilite' },
    { key: 'comp_equitation',     label: 'Équitation',     attr: 'agilite' },
    { key: 'comp_escalade',       label: 'Escalade',       attr: 'agilite' },
    { key: 'comp_saut',           label: 'Saut',           attr: 'agilite' },
    { key: 'comp_lasso',          label: 'Lasso',          attr: 'agilite' },
    { key: 'comp_rodeo',          label: 'Rodéo',          attr: 'agilite' },
    // Vigueur
    { key: 'comp_course',         label: 'Course',         attr: 'vigueur' },
    { key: 'comp_nage',           label: 'Nage',           attr: 'vigueur' },
    { key: 'comp_puissance',      label: 'Puissance',      attr: 'vigueur' },
    { key: 'comp_endurance',      label: 'Endurance',      attr: 'vigueur' },
    // Coordination
    { key: 'comp_pistolet',         label: 'Pistolet',         attr: 'coordination' },
    { key: 'comp_fusil',            label: 'Fusil',            attr: 'coordination' },
    { key: 'comp_arc',              label: 'Arc',              attr: 'coordination' },
    { key: 'comp_artillerie',       label: 'Artillerie',       attr: 'coordination' },
    { key: 'comp_prestidigitation', label: 'Prestidigitation', attr: 'coordination' },
    { key: 'comp_crochetage',       label: 'Crochetage',       attr: 'coordination' },
    { key: 'comp_arme_de_jet',      label: 'Arme de jet',      attr: 'coordination' },
    { key: 'comp_lancer',           label: 'Lancer',           attr: 'coordination' },
    { key: 'comp_bricolage',        label: 'Bricolage',        attr: 'coordination' },
    // Perception
    { key: 'comp_recherche',    label: 'Recherche',    attr: 'perception' },
    { key: 'comp_enquete',      label: 'Enquête',      attr: 'perception' },
    { key: 'comp_intuition',    label: 'Intuition',    attr: 'perception' },
    { key: 'comp_observation',  label: 'Observation',  attr: 'perception' },
    { key: 'comp_camouflage',   label: 'Camouflage',   attr: 'perception' },
    { key: 'comp_jeux',         label: 'Jeux',         attr: 'perception' },
    { key: 'comp_survie',       label: 'Survie',       attr: 'perception' },
    { key: 'comp_chariots',     label: 'Chariots',     attr: 'perception' },
    { key: 'comp_pister',       label: 'Pister',       attr: 'perception' },
    // Charisme
    { key: 'comp_charme',       label: 'Charme',       attr: 'charisme' },
    { key: 'comp_negocier',     label: 'Négocier',     attr: 'charisme' },
    { key: 'comp_commander',    label: 'Commander',    attr: 'charisme' },
    { key: 'comp_escroquerie',  label: 'Escroquerie',  attr: 'charisme' },
    { key: 'comp_persuasion',   label: 'Persuasion',   attr: 'charisme' },
    { key: 'comp_volonte',      label: 'Volonté',      attr: 'charisme' },
    { key: 'comp_dressage',     label: 'Dressage',     attr: 'charisme' },
    { key: 'comp_deguisement',  label: 'Déguisement',  attr: 'charisme' },
    { key: 'comp_intimider',    label: 'Intimider',    attr: 'charisme' },
    { key: 'comp_comedie',      label: 'Comédie',      attr: 'charisme' },
    // Savoir
    { key: 'comp_langues',            label: 'Langues',            attr: 'savoir' },
    { key: 'comp_geographie',         label: 'Géographie',         attr: 'savoir' },
    { key: 'comp_evaluer',            label: 'Évaluer',            attr: 'savoir' },
    { key: 'comp_medecine',           label: 'Médecine',           attr: 'savoir' },
    { key: 'comp_academique',         label: 'Académique',         attr: 'savoir' },
    { key: 'comp_lois',               label: 'Lois',               attr: 'savoir' },
    { key: 'comp_falsification',      label: 'Falsification',      attr: 'savoir' },
    { key: 'comp_ingenierie',         label: 'Ingénierie',         attr: 'savoir' },
    { key: 'comp_business',           label: 'Business',           attr: 'savoir' },
    { key: 'comp_botanique',          label: 'Botanique',          attr: 'savoir' },
    { key: 'comp_cultures_indiennes', label: 'Cultures indiennes', attr: 'savoir' },
    { key: 'comp_demolition',         label: 'Démolition',         attr: 'savoir' },
];

export const SKILLS_BY_KEY  = Object.fromEntries(SKILLS.map(s => [s.key, s]));

export const SKILLS_BY_ATTR = SKILLS.reduce((acc, s) => {
    if (!acc[s.attr]) acc[s.attr] = [];
    acc[s.attr].push(s);
    return acc;
}, {});

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEAUX DE DIFFICULTÉ
// ═══════════════════════════════════════════════════════════════════════════════

export const DIFFICULTY_LEVELS = [
    { label: 'Very Easy',      value: 5  },
    { label: 'Easy',           value: 10 },
    { label: 'Moderate',       value: 15 },
    { label: 'Difficult',      value: 20 },
    { label: 'Very Difficult', value: 25 },
    { label: 'Heroic',         value: 30 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUNDS
// ═══════════════════════════════════════════════════════════════════════════════

export const BACKGROUNDS = [
    {
        id: 'rentier', name: 'Rentier', maxNiveau: 4,
        description: 'Vous percevez une rente plus ou moins importante. Propriétaire d’une concession minière, héritier d’une grande famille propriétaire...etc.',
        effects: [
            'Quelques dizaines de $/mois.', '~100 $/mois.',
            '~50 $/semaine.', '~100 $/semaine.',
        ],
    },
    {
        id: 'contacts', name: 'Contacts', maxNiveau: 3,
        description: 'Vous connaissez des gens qui vous aideront en échange d’une faveur ou d’une somme d’argent.',
        effects: [
            '1 contact moyen.',
            '2 moyens ou 1 expérimenté.',
            '3–4 moyens, 2 expérimentés ou 1 légendaire.',
        ],
    },
    {
        id: 'ressources', name: 'Ressources', maxNiveau: 4,
        description: 'Vous avez accumulé des richesses par le passé et cela vous offre un certain standing de vie.',
        effects: [
            'Résidence modeste stable.', 'Propriétaire terrien modéré.',
            'Membre éminent, ranch/ferme, qualité de vie élevée.',
            'Riche, actifs tangibles précieux.',
        ],
    },
    {
        id: 'allies', name: 'Alliés', maxNiveau: 4,
        description: 'Des personnes proches de vous qui n’hésiteront pas à vous aider et que vous n’hésiterez pas à aider en retour aussi.',
        effects: [
            '1 allié peu puissant.', '2 modestes ou 1 modérément influent.',
            '3 modérément influents ou 1 assez puissant.',
            '2 assez puissants ou 1 extrêmement influent.',
        ],
    },
    {
        id: 'recherche', name: 'Recherché', maxNiveau: 4,
        description: 'Vous êtes recherché et une prime est sur votre tête.',
        effects: [
            'Ville lointaine, petite prime.', 'Ville moyennement loin, prime modique.',
            'Proche avec prime modique ou loin avec prime moyenne.',
            'Proche avec prime moyenne ou loin avec grosse prime.',
        ],
    },
    {
        id: 'duelliste', name: 'Duelliste', maxNiveau: 3,
        description: 'Vous avez déjà participer à des duels et les avaient remportés.',
        effects: [
            'Quelques duels locaux gagnés.', 'Réputation régionale.',
            'Réputation inter-territoriale — des duellistes cherchent à vous défier.',
        ],
    },
    {
        id: 'ancien_prisonnier', name: 'Ancien prisonnier', maxNiveau: 1,
        description: 'Vous avez fait de la prison par le passé.',
        effects: ['Connexions criminelles. Les représentants de la loi défavorables par défaut.'],
    },
    {
        id: 'ancien_militaire', name: 'Ancien militaire', maxNiveau: 3,
        description: 'Vous êtes un ancien militaire confédéré ou de l’Union et avez participé à la guerre de Sécession.',
        effects: [
            'Vétéran, 1 contact militaire.',
            'Sous-officier reconnu, 2 contacts dont un officier.',
            'Officier ou héros de guerre — déférence des autorités civiles.',
        ],
    },
    {
        id: 'reputation', name: 'Réputation', maxNiveau: 4,
        description: '',
        effects: [
            'Connu dans votre ville/comté.', 'Connu dans le territoire.',
            'Légende régionale.', 'Figure mythique — jamais inaperçu.',
        ],
    },
    {
        id: 'destinee', name: 'Destinée', maxNiveau: 1,
        description: '',
        effects: ['Le MJ tisse des fils narratifs autour du personnage. Présence tend à être le centre de la scène.'],
    },
    {
        id: 'cible', name: 'Cible', maxNiveau: 3,
        description: 'Vous êtes la cible d’un assassin.',
        effects: [
            'Un ennemi isolé vous cherche.',
            'Un groupe déterminé sur votre piste.',
            'Contrat professionnel ouvert — tout étranger peut être une menace.',
        ],
    },
];

export const BACKGROUNDS_BY_ID = Object.fromEntries(BACKGROUNDS.map(b => [b.id, b]));

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG SYSTÈME
// ═══════════════════════════════════════════════════════════════════════════════

const tecumahConfig = {
    slug:  'tecumah',
    label: 'Tecumah Gulch',

    dice: {

        buildNotation: (ctx) => {
            const { poolFinal, isNPC } = ctx.systemData;
            if (!poolFinal || poolFinal < 1)
                throw new RollError('NO_DICE', 'Pool insuffisant');
            if (isNPC)           return `${poolFinal}d6`;
            if (poolFinal === 1) return '1d6!';
            return [`${poolFinal - 1}d6`, '1d6!'];
        },

        beforeRoll: (ctx) => {
            const { attrPips, compPips = 0, bonusDice = 0, malusBlessure = 0, depense, ppCount = 0 } = ctx.systemData;

            if (depense === 'pd' && ppCount > 0)
                throw new RollError('EXCLUSIVE', 'PP et PD ne peuvent pas être dépensés ensemble');

            const basePips = attrPips + compPips;
            let poolFinal  = Math.max(0, pipsToPool(basePips) + bonusDice - malusBlessure);
            if (depense === 'pp') poolFinal += ppCount;
            if (depense === 'pd') poolFinal  = poolFinal * 2;
            poolFinal = Math.max(1, poolFinal);

            return {
                ...ctx,
                systemData: {
                    ...ctx.systemData,
                    poolFinal,
                    residualPips:  pipsResidual(basePips),
                    // Stocké pour l'historique — pool de base avant modificateurs
                    attrPipsTotal: basePips,
                },
            };
        },

        afterRoll: (raw, ctx) => {
            const { residualPips = 0, bonusResultat = 0, difficulte, depense, ppCount = 0, isNPC = false } = ctx.systemData;

            if (isNPC) {
                const normalValues = raw.groups[0].values;
                const normalSum    = normalValues.reduce((a, b) => a + b, 0);
                const total        = normalSum + bonusResultat;
                return {
                    isNPC: true, normalValues, normalSum, total, difficulte,
                    reussite:  difficulte != null ? total >= difficulte : null,
                    label:     ctx.label,
                    successes: difficulte != null && total >= difficulte ? 1 : 0,
                };
            }

            let normalValues = [], wildValues, wildInitial, wildExploded;
            if (raw.groups.length === 1) {
                wildValues   = raw.groups[0].values;
                wildInitial  = wildValues[0];
                wildExploded = wildValues.length > 1;
            } else {
                normalValues = raw.groups[0].values;
                wildValues   = raw.groups[1].values;
                wildInitial  = wildValues[0];
                wildExploded = wildValues.length > 1;
            }

            const normalSum      = normalValues.reduce((a, b) => a + b, 0);
            const wildSum        = wildValues.reduce((a, b) => a + b, 0);
            const total          = normalSum + wildSum + residualPips + bonusResultat;
            const isComplication = wildInitial === 1;
            const reussite       = difficulte != null ? total >= difficulte : null;

            return {
                normalValues, normalSum, wildValues, wildInitial,
                wildSum, wildExploded, isComplication,
                residualPips, bonusResultat, total,
                difficulte, reussite, depense, ppCount,
                attrPipsTotal: ctx.systemData.attrPipsTotal ?? null,
                label: ctx.label,
                successes: reussite ? 1 : 0,
            };
        },

        buildAnimationSequence: (raw, ctx, result) => {
            // Dés normaux : toutes les faces en une vague (pas d'explosion sur dés normaux)
            const normalWaves = (g) => g.waves ?? [{ dice: g.values }];

            // Wild Die : une face par vague pour préserver la tension de l'explosion.
            // [6, 6, 3] → [{dice:[6]}, {dice:[6]}, {dice:[3]}]
            // Si la lib fournit waves, on les utilise directement.
            const wildWaves   = (g) => g.waves ?? g.values.map(v => ({ dice: [v] }));

            if (result.isNPC) {
                return {
                    mode: 'single',
                    groups: [{
                        id: 'npc', diceType: 'd6', color: 'default',
                        label: ctx.label ?? 'Jet NPC',
                        waves: normalWaves(raw.groups[0]),
                    }],
                };
            }

            if (raw.groups.length === 1) {
                // Pool = 1 → Wild Die seul
                return {
                    mode: 'single',
                    groups: [{
                        id: 'wild', diceType: 'd6', color: 'gold',
                        label: ctx.label ?? 'Wild Die',
                        waves: wildWaves(raw.groups[0]),
                    }],
                };
            }

            // Pool > 1 → dés normaux puis Wild Die (séquentiels, clearDice entre les deux)
            return {
                mode: 'single',
                groups: [
                    {
                        id: 'normal', diceType: 'd6', color: 'default',
                        label: ctx.label ?? 'Dés normaux',
                        waves: normalWaves(raw.groups[0]),
                    },
                    {
                        id: 'wild', diceType: 'd6', color: 'gold',
                        label: 'Wild Die',
                        waves: wildWaves(raw.groups[1]),
                    },
                ],
            };
        },

        renderHistoryEntry: (entry) => <TecumahHistoryEntry entry={entry} />,

        getNPCRollContext: (npc, attack, { apiBase, fetchFn, sessionId }) => ({
            apiBase, fetchFn,
            characterId:    null,
            characterName:  npc.name,
            sessionId,
            rollType:       'tecumah_npc_attack',
            label:          `${npc.name} — ${attack.name}`,
            persistHistory: false,
            systemData: { poolFinal: attack.pool, isNPC: true, bonusResultat: 0, difficulte: null },
        }),
    },

    combat: {
        // mode="badge" — label compact dans la liste des combattants
        renderHealthDisplay: (combatant) => <HealthDisplay combatant={combatant} mode="badge" />,

        canAct: ({ combatant }) => (combatant.healthData?.blessure_niveau ?? 0) < 4,

        // null — injecté par TabCombat (joueur : TecumahDiceModal via import local)
        renderRollStep: null,

        calculateDamage: (_target, weapon) => weapon?.damage ?? 0,

        renderTargetInfo: (combatant) => {
            const niveau  = combatant.healthData?.blessure_niveau ?? 0;
            const rf      = combatant.healthData?.resistance_fixe ?? '?';
            const defense = combatant.healthData?.defense_naturelle ?? '?';
            return `Défense: ${defense} | RF: ${rf} | ${BLESSURE_LABELS[niveau] ?? '?'}`;
        },

        renderNPCForm: (formData, onChange) => (
            <TecumahNPCForm formData={formData} onChange={onChange} />
        ),

        buildNPCCombatStats: (fd) => ({
            defense_naturelle: Number(fd.defense_naturelle ?? 10),
            defense_active:    Number(fd.defense_active    ?? 0),
            defense_totale:    Number(fd.defense_totale    ?? 0),
            resistance_fixe:   Number(fd.resistance_fixe   ?? 6),
            actionsMax:        Number(fd.actionsMax        ?? 1),
            attaques:          fd.attaques ?? [],
        }),

        parseNPCCombatStats: (cs) => ({
            defense_naturelle: cs.defense_naturelle ?? 10,
            defense_active:    cs.defense_active    ?? 0,
            defense_totale:    cs.defense_totale    ?? 0,
            resistance_fixe:   cs.resistance_fixe   ?? 6,
            actionsMax:        cs.actionsMax        ?? 1,
            attaques:          cs.attaques          ?? [],
        }),

        buildNPCHealthData: (cs) => ({
            blessure_niveau:   0,
            defense_naturelle: cs.defense_naturelle ?? 10,
            defense_active:    cs.defense_active    ?? 0,
            defense_totale:    cs.defense_totale    ?? 0,
            resistance_fixe:   cs.resistance_fixe   ?? 6,
        }),

        defenseOpportunity: null,
    },
};

export default tecumahConfig;