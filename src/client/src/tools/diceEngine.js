// src/client/src/tools/diceEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Orchestrateur générique du moteur de dés.
// Agnostique à tout système de jeu — la logique métier est dans les hooks
// déclarés par chaque système dans src/client/src/systems/:slug/config.js
//
// Flux d'un roll standard :
//   1. hooks.beforeRoll(ctx)                    → validation + enrichissement contexte
//   2. hooks.buildRollParams(ctx)               → { pool, explosionThresholds, threshold, diceType }
//   3. _executeRoll(params)                     → DiceRoll lib (vagues + résultats bruts)
//   4. hooks.afterRoll(raw, ctx)                → interprétation résultat (succès, total, flags)
//   5. hooks.buildAnimationSequence(raw, ctx)   → structure pour DiceAnimationOverlay
//
// ─────────────────────────────────────────────────────────────────────────────

import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { countSuccesses } from './utils.js';

// ─── Erreur métier ────────────────────────────────────────────────────────────

export class RollError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'RollError';
        this.code = code;
    }
}

// ─── Hooks par défaut (no-op) ─────────────────────────────────────────────────

const DEFAULT_HOOKS = {
    beforeRoll: (ctx) => ctx,

    buildRollParams: (ctx) => {
        const sd = ctx.systemData || {};
        return {
            pool:                sd.pool ?? 3,
            explosionThresholds: sd.explosionThresholds ?? [10],
            threshold:           sd.threshold ?? 7,
            diceType:            sd.diceType ?? 'd10',
        };
    },

    afterRoll: (raw, _ctx) => ({
        allDice:   raw.allDice,
        successes: raw.successes,
        total:     raw.total,
        outcome:   null,
        flags:     raw.flags,
        detail:    null,
        meta: {
            autoSuccesses:  0,
            resourceSpent:  0,
            resourceGained: 0,
            secondRoll:     null,
            keptRoll:       null,
        },
    }),

    buildAnimationSequence: (raw, ctx) => ({
        mode: 'single',
        groups: [{
            id:       'main',
            diceType: raw.diceType,
            color:    'default',
            label:    ctx.label || 'Jet',
            waves:    raw.waves,
        }],
        insuranceData: null,
    }),
};

// ─── API publique ─────────────────────────────────────────────────────────────

export function roll(ctx, hooks) {
    const h = { ...DEFAULT_HOOKS, ...hooks };
    const enrichedCtx = h.beforeRoll(ctx);
    const params      = h.buildRollParams(enrichedCtx);
    const raw         = _executeRoll(params);
    const result      = h.afterRoll(raw, enrichedCtx);
    const animationSequence = h.buildAnimationSequence(raw, enrichedCtx);
    const notation    = _buildNotationString(params);
    return { result, animationSequence, notation };
}

export function rollWithInsurance(ctx, hooks) {
    const h = { ...DEFAULT_HOOKS, ...hooks };
    const enrichedCtx = h.beforeRoll(ctx);
    const params      = h.buildRollParams(enrichedCtx);

    const raw1 = _executeRoll(params);
    const raw2 = _executeRoll(params);

    const result1 = h.afterRoll(raw1, enrichedCtx);
    const result2 = h.afterRoll(raw2, enrichedCtx);

    const score1   = result1.successes ?? result1.total ?? 0;
    const score2   = result2.successes ?? result2.total ?? 0;
    const keptRoll = score1 >= score2 ? 1 : 2;
    const kept     = keptRoll === 1 ? result1 : result2;
    const discarded = keptRoll === 1 ? result2 : result1;

    const result = {
        ...kept,
        meta: { ...kept.meta, secondRoll: discarded, keptRoll },
    };

    const animationSequence = {
        mode: 'insurance',
        groups: null,
        insuranceData: {
            groups1: h.buildAnimationSequence(raw1, enrichedCtx).groups,
            groups2: h.buildAnimationSequence(raw2, enrichedCtx).groups,
            keptRoll,
        },
    };

    return { result, animationSequence, notation: _buildNotationString(params) };
}

export function rollSagaBonus(baseResult, ctx, hooks, finalTarget) {
    const h = { ...DEFAULT_HOOKS, ...hooks };

    const bonusParams = { pool: 3, explosionThresholds: [10], threshold: 7, diceType: 'd10' };
    const raw         = _executeRoll(bonusParams);
    const bonusResult = h.afterRoll(raw, { ...ctx, _isSagaBonus: true });

    const bonusSuccesses = bonusResult.successes ?? 0;
    const totalSuccesses = (baseResult.successes ?? 0) + bonusSuccesses;
    const meetsTarget        = totalSuccesses >= finalTarget;
    const hasMinBonusSuccess = bonusSuccesses >= 1;
    const sagaSuccess        = meetsTarget && hasMinBonusSuccess;

    const result = {
        ...baseResult,
        successes: totalSuccesses,
        meta: {
            ...baseResult.meta,
            bonusRoll:      { ...bonusResult, allDice: raw.allDice, waves: raw.waves },
            bonusSuccesses,
            sagaSuccess,
            resourceSpent:  1,
            resourceGained: sagaSuccess ? 1 : 0,
            failReason: !hasMinBonusSuccess
                ? 'Aucun succès sur le jet SAGA'
                : !meetsTarget
                    ? `Total insuffisant (${totalSuccesses}/${finalTarget})`
                    : null,
        },
    };

    const animationSequence = {
        mode: 'single',
        groups: [{
            id:       'saga_bonus',
            diceType: 'd10',
            color:    'saga',
            label:    `Jet ${ctx.systemData?.declaredMode === 'epic' ? 'Épique' : 'Héroïque'} — SAGA`,
            waves:    raw.waves,
        }],
        insuranceData: null,
    };

    return { result, animationSequence, notation: '3d10!>=10>=7' };
}

// ─── Engine : DiceRoll ───────────────────────────────────────────────────────
// On utilise DiceRoll (pas DiceRoller) — on veut juste roller, pas sauvegarder
// l'historique. DiceRoll.rolls[0] = premier groupe de dés, dont .rolls contient
// les RollResult individuels avec .value et .modifiers.

function _executeRoll({ pool, explosionThresholds, threshold, diceType = 'd10' }) {
    const notation = _buildNotationString({ pool, explosionThresholds, threshold, diceType });
    const diceRoll = new DiceRoll(notation);

    // diceRoll.rolls[0] = premier groupe (le "3d10" de la notation)
    // diceRoll.rolls[0].rolls = tableau des RollResult individuels
    const rollGroup = diceRoll.rolls[0];
    const results   = rollGroup?.rolls ?? [];

    // Tableau plat de toutes les valeurs (explosions incluses)
    const allDice = results.map(r => r.value);

    // Reconstruction des vagues pour l'animation
    const waves = _buildWaves(results, pool, explosionThresholds);

    // Succès = dés >= threshold (déjà calculé par la lib via le compare point de la notation,
    // mais on le recalcule nous-mêmes pour être indépendants du format de retour)
    const successes = countSuccesses(allDice, threshold);

    const exploded = results
        .filter(r => r.modifiers?.has('explode') || r.modifiers?.includes?.('explode'))
        .map(r => r.value);

    return {
        allDice,
        waves,
        diceType,
        successes,
        total: null,
        flags: {
            exploded,
            botched:  results.some(r => r.modifiers?.has?.('failure') || r.modifiers?.includes?.('failure')),
            critical: false,
        },
    };
}

/**
 * Reconstruit les vagues à partir des RollResult rpg-dice-roller.
 *
 * rpg-dice-roller liste les résultats à plat dans l'ordre :
 *   [dé1, dé2, dé3, explosion_de_dé2, explosion_de_explosion_de_dé2, ...]
 *
 * On reconstitue les vagues en suivant qui a explosé à chaque vague :
 *   - Vague 0 : les `pool` premiers dés
 *   - Vague N : les dés générés par les explosions de la vague N-1
 *
 * @param {RollResult[]} results           - diceRoll.rolls[0].rolls
 * @param {number}       pool              - nombre de dés initiaux
 * @param {number[]}     explosionThresholds - valeurs qui explosent
 */
function _buildWaves(results, pool, explosionThresholds) {
    if (!results.length) return [{ wave: 0, dice: [] }];

    const waves = [];
    let idx = 0;

    // Vague 0 : les `pool` premiers résultats
    const wave0 = results.slice(0, pool);
    waves.push({ wave: 0, dice: wave0.map(r => r.value) });
    idx = pool;

    // Vagues suivantes : autant de dés que d'explosions dans la vague précédente
    let prevWave = wave0;
    let waveIndex = 1;

    while (idx < results.length) {
        // Nombre d'explosions dans la vague précédente = nombre de dés de la vague suivante
        const explosionCount = prevWave.filter(r =>
            explosionThresholds.includes(r.value)
        ).length;

        if (explosionCount === 0) break; // Sécurité

        const waveResults = results.slice(idx, idx + explosionCount);
        waves.push({ wave: waveIndex, dice: waveResults.map(r => r.value) });

        prevWave = waveResults;
        idx += explosionCount;
        waveIndex++;
    }

    return waves;
}

function _buildNotationString({ pool, explosionThresholds, threshold, diceType = 'd10' }) {
    const explodeMin = explosionThresholds.length > 0 ? Math.min(...explosionThresholds) : null;
    const parts = [`${pool}${diceType}`];
    if (explodeMin !== null) parts.push(`!>=${explodeMin}`);
    if (threshold  !== null) parts.push(`>=${threshold}`);
    return parts.join('');
}