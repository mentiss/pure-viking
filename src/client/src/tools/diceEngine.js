// src/client/src/tools/diceEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Orchestrateur générique du moteur de dés.
// Agnostique à tout système de jeu — la logique métier est dans les hooks
// déclarés par chaque système dans src/client/src/systems/:slug/config.jsx
//
// Flux d'un roll :
//   1. hooks.beforeRoll(ctx)                          → validation + enrichissement
//   2. _executeGroups(notation)                       → raw (groupes + allDice + flags)
//   3. hooks.afterRoll(raw, ctx)                      → result (interprétation slug)
//   4. hooks.buildAnimationSequence(raw, ctx, result) → AnimationSequence | null
//   5. diceAnimBridge.play(seq)                       → [await] animation
//   6. POST apiBase/dice/roll                         → persist (si persistHistory !== false)
//   7. return result
//
// Principes :
//   - Pas de defaults métier (pas de d10, threshold 7, explosion 10).
//   - buildNotation N'EST PAS un hook moteur — c'est une fonction du slug,
//     appelée par le composant AVANT de passer la notation à roll().
//   - rollWithInsurance et rollSagaBonus sont supprimés — remplacés par
//     la notation tableau (N groupes).
// ─────────────────────────────────────────────────────────────────────────────

import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { diceAnimBridge } from './diceAnimBridge.js';
import useDiceConfig, {DICE_FALLBACK_CONFIG, diceStorageKey} from "../hooks/useDiceConfig.js";
import {getSystemFromPath} from "../hooks/useSystem.js";

// ─── Erreur métier ────────────────────────────────────────────────────────────

export class RollError extends Error {
    constructor(code, message) {
        super(message);
        this.name  = 'RollError';
        this.code  = code;
    }
}

// ─── Hooks par défaut (no-op) ─────────────────────────────────────────────────

const DEFAULT_HOOKS = {
    /** Passe ctx tel quel — validation optionnelle par le slug */
    beforeRoll: (ctx) => ctx,

    /**
     * Retourne raw sans interprétation.
     * Un slug à succès devra surcharger pour compter ses succès.
     * Un slug D&D utilisera raw.groups[0].total.
     */
    afterRoll: (raw, _ctx) => ({
        allDice: raw.allDice,
        groups:  raw.groups,
        flags:   raw.flags,
    }),

    /**
     * Séquence d'animation par défaut : un groupe par entrée dans raw.groups.
     * diceType inféré depuis la notation du groupe.
     */
    buildAnimationSequence: (raw, ctx, _result) => ({
        mode: 'single',
        groups: raw.groups.map((g, i) => ({
            id:       `group-${i}`,
            diceType: _inferDiceType(g.notation),
            color:    'default',
            label:    ctx.label || g.notation,
            waves:    [{ dice: g.values }],
        })),
    }),

    /** null → rendu générique dans HistoryPanel */
    renderHistoryEntry: (_entry) => null,
};

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Lance un ou plusieurs groupes de dés, anime et persiste.
 *
 * @param {string | string[]} notation  - Notation(s) rpg-dice-roller.
 *                                        string = 1 groupe, string[] = N groupes.
 * @param {object}            ctx       - Contexte complet du jet (voir spec).
 * @param {object}            [hooks]   - Hooks slug (beforeRoll, afterRoll, ...).
 * @returns {Promise<object>}             result produit par afterRoll.
 */
export async function roll(notation, ctx, hooks = {}) {
    const h = { ...DEFAULT_HOOKS, ...hooks };
    const slug = getSystemFromPath();
    let animationEnabled = DICE_FALLBACK_CONFIG.animationEnabled;
    try {
        const raw_config = localStorage.getItem(diceStorageKey(slug));
        if (raw_config) animationEnabled = JSON.parse(raw_config)?.animationEnabled ?? true;
    } catch (_) {}

    // 1. Validation + enrichissement
    const enrichedCtx = h.beforeRoll(ctx);

    // 2. Exécution des dés (synchrone)
    const raw = _executeGroups(notation);

    // 3. Interprétation slug
    const result = h.afterRoll(raw, enrichedCtx);

    // 4. Animation
    const animSeq = h.buildAnimationSequence(raw, enrichedCtx, result);

    if (animSeq && animationEnabled !== false) {
        await diceAnimBridge.play(animSeq);
    }

    // 5. Persist historique (défaut : true)
    if (enrichedCtx.persistHistory !== false) {
        await _persistRoll(notation, enrichedCtx, result);
    }

    return result;
}

// ─── Exécution interne ────────────────────────────────────────────────────────

/**
 * Exécute la (les) notation(s) et retourne le raw.
 * @param {string | string[]} notation
 * @returns {object} raw
 */
function _executeGroups(notation) {
    const notations = Array.isArray(notation) ? notation : [notation];

    const groups = notations.map((n) => {
        const diceRoll  = new DiceRoll(n);
        const rollGroup = diceRoll.rolls[0];
        const rollItems = rollGroup?.rolls ?? [];

        // Extraire uniquement les faces de dés (pas les modificateurs arithmétiques)
        const diceItems = rollItems.filter(_isDiceResult);
        const values    = diceItems.map(r => r.value);
        const total     = diceRoll.total;            // total lib (dés + modificateurs arith.)
        //const waves     = _buildWaves(diceItems);

        return { notation: n, values, total, rollItems: diceItems };
    });

    // allDice = concat de toutes les faces de dés de tous les groupes
    const allDice = groups.flatMap(g => g.values);

    // Reconstruction correcte des explodés : on cherche dans les items rpg-dice-roller
    const allRollItems = groups.flatMap(g => {
        const dr = new DiceRoll(g.notation);
        return dr.rolls[0]?.rolls ?? [];
    });

    // Flags globaux
    const flags = {
        exploded: allRollItems
            .filter(r => _isDiceResult(r) && _isExploded(r))
            .map(r => r.value),
    };

    flags.exploded = allRollItems
        .filter(r => _isDiceResult(r) && _isExploded(r))
        .map(r => r.value);

    return { groups, allDice, flags };
}

// ─── Persist ──────────────────────────────────────────────────────────────────

async function _persistRoll(notation, ctx, result) {
    if (!ctx.apiBase || !ctx.fetchFn) return;

    const notationStr = Array.isArray(notation)
        ? JSON.stringify(notation)
        : notation;

    try {
        await ctx.fetchFn(`${ctx.apiBase}/dice/roll`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id:     ctx.sessionId   ?? null,
                character_id:   ctx.characterId ?? null,
                character_name: ctx.characterName ?? null,
                roll_type:      ctx.rollType    ?? 'generic',
                notation:       notationStr,
                roll_result:    JSON.stringify(result),
                successes:      result.successes ?? null,
                pool:           result.detail?.pool          ?? ctx.systemData?.pool ?? null,
            }),
        });
    } catch (err) {
        // Persist non-bloquant — on log mais on ne fait pas planter le flow
        console.warn('[diceEngine] persist failed:', err);
    }
}

// ─── Helpers privés ───────────────────────────────────────────────────────────

/**
 * Construit les vagues à partir des RollResult rpg-dice-roller.
 * Vague 0 = dés initiaux (sans modificateur 'explode').
 * Vague N = explosions successives.
 *
 * rpg-dice-roller regroupe les explosions dans la même liste avec un modificateur.
 * On reconstitue les vagues en groupant par séquences continues d'explosions.
 */
function _buildWaves(diceItems) {
    if (!diceItems.length) return [];

    const waves   = [];
    let   current = [];

    for (const item of diceItems) {
        if (_isExploded(item) && current.length > 0) {
            // Ce dé est une explosion d'un dé précédent → nouvelle vague
            waves.push({ dice: current.map(r => r.value) });
            current = [item];
        } else {
            current.push(item);
        }
    }

    if (current.length) waves.push({ dice: current.map(r => r.value) });

    return waves;
}

/**
 * Un RollResult est un "dé réel" si ce n'est pas un modificateur arithmétique.
 * rpg-dice-roller représente les modificateurs arithmétiques comme des objets
 * sans propriété `value` définie comme face de dé.
 * On filtre en vérifiant que value est un entier et qu'il n'est pas issu d'un
 * terme arithmétique pur (NumberGenerator).
 */
function _isDiceResult(item) {
    if (!item) return false;
    // Les modificateurs arithmétiques n'ont pas de tableau modifiers
    // et leur constructor.name est souvent 'NumberGenerator' ou similaire.
    // La façon la plus fiable : un vrai dé a toujours une propriété modifiers (Set ou Array).
    return item.modifiers !== undefined && typeof item.value === 'number';
}

/**
 * Détermine si un RollResult est une explosion (dé généré par explosion).
 */
function _isExploded(item) {
    if (!item?.modifiers) return false;
    if (item.modifiers instanceof Set) return item.modifiers.has('explode');
    if (Array.isArray(item.modifiers)) return item.modifiers.includes('explode');
    return false;
}

/**
 * Infère le type de dé depuis une notation rpg-dice-roller.
 * Cherche le premier dN ou dF dans la chaîne.
 *
 * "3d10!>=9>=7"  → "d10"
 * "2d20"         → "d20"
 * "1d20+5"       → "d20"
 * "4dF"          → "dF"
 */
function _inferDiceType(notation) {
    const match = notation?.match(/d(\d+|F)/i);
    return match ? `d${match[1]}` : 'd6';
}