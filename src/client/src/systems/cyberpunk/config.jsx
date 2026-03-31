// src/client/src/systems/cyberpunk/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration frontend du slug Cyberpunk (The Sprawl — adaptation 2d10).
//
// Contrat diceEngine v2 :
//   - buildNotation(ctx) → string   (appelé par le composant, pas le moteur)
//   - beforeRoll(ctx)    → ctx enrichi
//   - afterRoll(raw, ctx)→ result
//   - buildAnimationSequence(raw, ctx, result) → AnimationSequence
//   - renderHistoryEntry(entry) → JSX | null
//
// Système de résolution 2d10 + modificateur :
//   15+    → succès plein
//   10-14  → succès partiel
//   9-     → échec
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import DiceEntryHistory from "./components/layout/DiceEntryHistory.jsx";

// ── Constantes ────────────────────────────────────────────────────────────────

const SEUIL_SUCCES  = 15;
const SEUIL_PARTIEL = 10;

// Couleur par stat pour l'animation
const STAT_COLOR = {
    cran:   'magenta',
    pro:    'cyan',
    chair:  'orange',
    esprit: 'purple',
    style:  'amber',
    synth:  'green',
    cred:   'gold',
    null:   'default',
};

// Label court des stats pour l'affichage
const STAT_LABEL = {
    cran:   'Cran',
    pro:    'Pro',
    chair:  'Chair',
    esprit: 'Esprit',
    style:  'Style',
    synth:  'Synth',
    cred:   'Cred',
};

export const OUTCOME_LABEL = {
    success: 'Succès plein',
    partial: 'Succès partiel',
    failure: 'Échec',
};

export const OUTCOME_CLASS = {
    success: 'cp-outcome-success',
    partial: 'cp-outcome-partial',
    failure: 'cp-outcome-failure',
};

/**
 * Interprète le total 2d10 + modificateur selon les seuils The Sprawl.
 * @param {number} total
 * @returns {'success' | 'partial' | 'failure'}
 */
function getOutcome(total) {
    if (total >= SEUIL_SUCCES)  return 'success';
    if (total >= SEUIL_PARTIEL) return 'partial';
    return 'failure';
}

// ── Bloc dice — contrat diceEngine v2 ────────────────────────────────────────

const dice = {

    /**
     * Construit la notation rpg-dice-roller.
     * Appelé par le composant (MoveModal ou clic sur stat) AVANT roll().
     *
     * ctx.systemData doit contenir :
     *   - modifier  {number}  : valeur de stat + lien + saisie manuelle
     *   - useSynth  {boolean} : substitution Synth active
     *
     * @param {object} ctx
     * @returns {string} notation rpg-dice-roller
     */
    buildNotation(ctx) {
        const mod = ctx.systemData?.modifier ?? 0;
        if (mod === 0) return '2d10';
        if (mod > 0)   return `2d10+${mod}`;
        return `2d10${mod}`; // mod négatif → "2d10-2" par ex.
    },

    /**
     * Validation et enrichissement avant le roll.
     * Ici : rien à valider, on passe le ctx tel quel.
     */
    beforeRoll(ctx) {
        return ctx;
    },

    /**
     * Interprétation du raw après le roll.
     * raw.groups[0].values = [dé1, dé2]
     * raw.groups[0].total  = total lib (dés + modificateurs arithmétiques)
     *
     * @param {object} raw
     * @param {object} ctx
     * @returns {object} result
     */
    afterRoll(raw, ctx) {
        const group    = raw.groups[0];
        const diceVals = group.values;          // [dé1, dé2] — faces brutes
        const total    = group.total;           // total avec modificateur
        const modifier = ctx.systemData?.modifier ?? 0;
        const outcome  = getOutcome(total);
        const stat     = ctx.systemData?.stat   ?? null;
        const useSynth = ctx.systemData?.useSynth ?? false;

        return {
            // Données brutes
            diceVals,
            modifier,
            total,
            // Interprétation
            outcome,
            outcomeLabel: OUTCOME_LABEL[outcome],
            // Contexte du jet
            stat:        useSynth ? 'synth' : stat,
            moveName:    ctx.systemData?.moveName ?? null,
            // Transmis à persist
            flags:       raw.flags,
        };
    },

    /**
     * Construit la séquence d'animation pour diceAnimBridge.
     * 2 dés d10, couleur selon la stat.
     *
     * @param {object} raw
     * @param {object} ctx
     * @param {object} result
     * @returns {object} AnimationSequence
     */
    buildAnimationSequence(raw, ctx, result) {
        const stat   = result.stat ?? 'null';
        const color  = STAT_COLOR[stat] ?? 'default';
        const label  = result.moveName
            ? `${result.moveName}${stat ? ` (${STAT_LABEL[stat] ?? stat})` : ''}`
            : (STAT_LABEL[stat] ?? 'Jet libre');

        return {
            mode: 'single',
            groups: [{
                id:       'main',
                diceType: 'd10',
                color,
                label,
                waves: [{ dice: raw.groups[0].values }],
            }],
        };
    },

    /**
     * Rendu custom d'une entrée dans l'historique.
     * Affiche : move/stat + total + outcome pill + dés.
     *
     * @param {object} entry - entrée dice_history désérialisée
     * @returns {JSX.Element | null}
     */
    renderHistoryEntry: (entry) => <DiceEntryHistory roll={entry} />,
};

// ── Données statiques Playbooks ───────────────────────────────────────────────

export const PLAYBOOKS = [
    {
        id:          'Fixer',
        label:       'Fixer',
        description: 'Réseau, contacts, négociation, opérations en coulisses.',
        statHint:    'Privilégie Pro et Style.',
        cyberware:   ['Neuralink comm', 'Interface neurale + stockage', 'Yeux cybernétiques'],
        extraPicksOnMove: 'Chromé', // move qui donne +1 pick cyberware
        defaultPicks: 1,
    },
    {
        id:          'Netrunner',
        label:       'Netrunner',
        description: 'Intrusion dans le Net, cyberespace, guerre de l\'information.',
        statHint:    'Privilégie Synth et Esprit.',
        cyberware:   ['Cyberdeck intégré', 'Interface neurale + stockage', 'Neuralink comm', 'Yeux cybernétiques'],
        defaultPicks: 1,
        netrunnerNote: 'Cyberdeck externe = pas de slot cyberware utilisé.',
    },
    {
        id:          'Solo',
        label:       'Solo',
        description: 'Opérations terrain, infiltration, combat discret.',
        statHint:    'Privilégie Cran et Chair.',
        cyberware:   ['Skilljam', 'Interface neurale + stockage', 'Réflexes câblés', 'Oreilles cybernétiques', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Investigator',
        label:       'Investigator',
        description: 'Investigation, traque, surveillance, renseignement.',
        statHint:    'Privilégie Pro et Esprit.',
        cyberware:   ['Skilljam', 'Oreilles cybernétiques', 'Processeur tactique', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Nomad',
        label:       'Nomad',
        description: 'Conduite, véhicules, filatures, exfiltrations mobiles.',
        statHint:    'Privilégie Pro et Synth.',
        cyberware:   ['Interface neurale + module de contrôle à distance'],
        defaultPicks: 1,
        mandatoryCyberware: 'Interface neurale + module de contrôle à distance',
    },
    {
        id:          'Rockerboy',
        label:       'Rockerboy',
        description: 'Influence, charisme, idéologie, manipulation sociale.',
        statHint:    'Privilégie Style et Pro.',
        cyberware:   ['Armement incorporé', 'Neuralink comm', 'Interface neurale + stockage', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Media',
        label:       'Media',
        description: 'Information, investigation, exposition médiatique.',
        statHint:    'Privilégie Esprit et Style.',
        cyberware:   ['Braindance Recorder', 'Neuralink comm', 'Interface neurale + stockage', 'Oreilles cybernétiques', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Edgerunner',
        label:       'Edgerunner',
        description: 'Mercenaire augmenté, freelance, combat, tactique.',
        statHint:    'Privilégie Cran et Esprit.',
        cyberware:   ['Skilljam', 'Neuralink comm', 'Interface neurale + logiciel de visée', 'Processeur tactique', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Techie',
        label:       'Techie',
        description: 'Matériel, cyberware, équipement, ingénierie.',
        statHint:    'Privilégie Esprit et Synth.',
        cyberware:   ['Bras cybernétique', 'Neuralink comm', 'Interface neurale (stockage ou module)', 'Yeux cybernétiques'],
        defaultPicks: 1,
    },
    {
        id:          'Assassin',
        label:       'Assassin',
        description: 'Neutralisation ciblée, élimination, fantôme.',
        statHint:    'Privilégie Cran et Style.',
        cyberware:   [
            'Armement incorporé', 'Sous-derme', 'Bras cybernétique',
            'Greffe musculaire', 'Interface neurale + logiciel de visée',
            'Réflexes câblés', 'Sandevistan', 'Slice \'N Dice', 'Yeux cybernétiques',
        ],
        defaultPicks: 2, // l'Assassin démarre avec 2 implants
    },
];

export const TAG_SUGGESTIONS_BY_TYPE = {
    character: [
        { text: '+blessé',       variant: 'negative' },
        { text: '+sonné',        variant: 'negative' },
        { text: '+grillé',       variant: 'negative' },
        { text: '+repéré',       variant: 'negative' },
        { text: '+endetté',      variant: 'negative' },
        { text: '+épuisé',       variant: 'negative' },
        { text: '+traumatisé',   variant: 'negative' },
        { text: '+en fuite',     variant: 'negative' },
    ],
    cyberware: [
        { text: '+défaillant',   variant: 'negative' },
        { text: '+dégradation',  variant: 'negative' },
        { text: '+douloureux',   variant: 'negative' },
        { text: '+aliénant',     variant: 'negative' },
        { text: '+médiocre',     variant: 'negative' },
        { text: '+crypté',       variant: 'positive' },
        { text: '+furtif',       variant: 'positive' },
        { text: '+modifié',      variant: 'neutral'  },
    ],
    relation: [
        { text: '+dette',        variant: 'negative' },
        { text: '+compromis',    variant: 'negative' },
        { text: '+menacé',       variant: 'negative' },
        { text: '+disparu',      variant: 'negative' },
        { text: '+fiable',       variant: 'positive' },
        { text: '+allié',        variant: 'positive' },
        { text: '+redevable',    variant: 'positive' },
        { text: '+suspect',      variant: 'neutral'  },
    ],
    item: [
        { text: '+défaillant',   variant: 'negative' },
        { text: '+dégradé',      variant: 'negative' },
        { text: '+volé',         variant: 'negative' },
        { text: '+tracé',        variant: 'negative' },
        { text: '+modifié',      variant: 'neutral'  },
        { text: '+rare',         variant: 'positive' },
        { text: '+militaire',    variant: 'neutral'  },
        { text: '+illégal',      variant: 'negative' },
    ],
};

// Profils de répartition des stats à la création
export const STAT_PROFILES = [
    {
        id:          'A',
        label:       'Profil A — Un seul point faible, moins de force',
        description: '+2 / +1 / 0 / 0 / 0 / -2',
        values:      [2, 1, 0, 0, 0, -2],
    },
    {
        id:          'B',
        label:       'Profil B — Deux points faibles, plus de force globale',
        description: '+2 / +1 / +1 / 0 / -1 / -2',
        values:      [2, 1, 1, 0, -1, -2],
    },
];

export const STATS = ['cran', 'pro', 'chair', 'esprit', 'style', 'synth'];
export const STAT_LABELS = STAT_LABEL;

// Directives personnelles disponibles
export const DIRECTIVES_PERSONNELLES = [
    { id: 'ambitieux',    label: 'Ambitieux',    hasBlank: true,  blankHint: 'Au sein de ___' },
    { id: 'celebre',      label: 'Célèbre',       hasBlank: false },
    { id: 'compatissant', label: 'Compatissant',  hasBlank: false },
    { id: 'filial',       label: 'Filial',        hasBlank: true,  blankHint: 'Conseils de ___' },
    { id: 'fureteur',     label: 'Fureteur',      hasBlank: true,  blankHint: 'À propos de ___' },
    { id: 'intime',       label: 'Intime',        hasBlank: true,  blankHint: 'Mon ami ___' },
    { id: 'masochiste',   label: 'Masochiste',    hasBlank: false },
    { id: 'motive',       label: 'Motivé',        hasBlank: true,  blankHint: 'Mon code de conduite : ___' },
    { id: 'partisan',     label: 'Partisan',      hasBlank: true,  blankHint: 'Appartenance à ___' },
    { id: 'proselyte',    label: 'Prosélyte',     hasBlank: false },
    { id: 'protecteur',   label: 'Protecteur',    hasBlank: true,  blankHint: 'Responsabilités envers ___' },
    { id: 'prudent',      label: 'Prudent',       hasBlank: false },
    { id: 'rejete',       label: 'Rejeté',        hasBlank: true,  blankHint: 'Ancienne appartenance à ___' },
    { id: 'trompeur',     label: 'Trompeur',      hasBlank: false },
    { id: 'venal',        label: 'Vénal',         hasBlank: false },
    { id: 'vengeur',      label: 'Vengeur',       hasBlank: true,  blankHint: 'Nuire à ___' },
    { id: 'violent',      label: 'Violent',       hasBlank: false },
];

// ── Export config principal ───────────────────────────────────────────────────

const cyberpunkConfig = {
    slug:  'cyberpunk',
    label: 'Cyberpunk',
    dice,
    diceDefaults: {
        mode:   'custom',
        custom: {
            foreground: '#00e5ff',
            background: '#050508',
            outline:    '#ff2d78',
            edge:       '#001a20',
            texture:    '',
            material:   'metal',
        },
        lightColor:       '#00e5ff',
        strength:         6,
        gravity:          400,
        sounds:           false,
        animationEnabled: true,
    },
};

export default cyberpunkConfig;