// src/client/src/systems/vikings/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Configuration CLIENT du système Pure Vikings.
// Ce fichier est le point d'entrée unique pour tout ce qui est spécifique
// au système côté client : métadonnées, hooks de dés, (futurs) hooks de combat...
//
// ⚠️  Aucun lien avec src/server/systems/vikings/config.js (Node.js/CommonJS).
//     Ce fichier est un module ES, importé uniquement par le frontend React.
// ─────────────────────────────────────────────────────────────────────────────

import {
    getExplosionThreshold,
    getBlessureMalus,
    getFatigueMalus,
    getSuccessThreshold,
    getBestCharacteristic,
    countSuccesses,
} from '../../tools/utils.js';
import getTraitBonuses from '../../tools/traitBonuses.js';
import { CARACNAMES }  from '../../tools/data.js';
import { RollError }   from '../../tools/diceEngine.js';

// ─── Métadonnées système ──────────────────────────────────────────────────────

const vikingsConfig = {
    slug:  'vikings',
    label: 'Pure Vikings',

    // ─── Hooks dés ────────────────────────────────────────────────────────────
    // Injectés dans diceEngine.roll() / rollWithInsurance() / rollSagaBonus()
    dice: {

        // ── 1. buildNotation ─────────────────────────────────────────────────
        // Construit la notation rpg-dice-roller depuis le contexte.
        // Vikings : toujours 3d10, explosion selon niveau carac, seuil selon compétence.
        buildNotation: (ctx) => {
            const { pool, caracLevel, threshold } = ctx.systemData;
            const explodeMin = getExplosionThreshold(caracLevel)[0]; // ex: niveau 3 → 9
            // Ex: "3d10!>=9>=7" → 3 dés, explosion sur 9+, succès sur 7+
            return `${pool}d10!>=${explodeMin}>=${threshold}`;
        },

        // ── 2. beforeRoll ────────────────────────────────────────────────────
        // Validation et enrichissement du contexte AVANT le roll.
        // - Bloque si KO
        // - Bloque si Saga insuffisante pour le mode déclaré
        // - Applique le malus de blessure sur le pool
        // - Calcule les paramètres de dés depuis les données personnage
        beforeRoll: (ctx) => {
            const {
                caracLevel,
                skillLevel,
                tokensBlessure,
                tokensFatigue,
                isBerserk,
                sagaActuelle,
                declaredMode,
                rollType,
                selectedCarac,
                selectedSkill,
                autoSuccesses,
                activeConditionalBonuses,
                traitAutoBonus,
            } = ctx.systemData;

            // Garde : KO/Mourant
            if (tokensBlessure === 5)
                throw new RollError('KO_DYING', 'Impossible : KO / Mourant !');

            // Garde : Saga insuffisante pour les modes qui la consomment avant
            if ((declaredMode === 'insurance' || declaredMode === 'heroic' || declaredMode === 'epic')
                && sagaActuelle < 1)
                throw new RollError('NO_SAGA', 'Pas assez de points de Saga');

            // Calcul seuil de succès
            const threshold = rollType === 'skill' && selectedSkill
                ? getSuccessThreshold(selectedSkill.level)
                : 7; // seuil de base carac = 7

            // Calcul niveau d'explosion (depuis carac utilisée)
            const caracUsedLevel = rollType === 'carac'
                ? (ctx.character?.[selectedCarac] || 2)
                : (selectedSkill ? getBestCharacteristic(ctx.character, selectedSkill).level : 2);

            // Malus blessure (ignoré en mode berserk)
            const blessureMalus = isBerserk ? 0 : getBlessureMalus(tokensBlessure);
            const pool = Math.max(1, 3 - blessureMalus); // pool Viking toujours basé sur 3

            // Bonus traits auto + conditionnels
            const caracUsedName = rollType === 'carac' ? selectedCarac
                : (selectedSkill ? getBestCharacteristic(ctx.character, selectedSkill).name : null);
            const rollTarget = rollType === 'skill' ? selectedSkill?.name : null;
            const traitBonuses = getTraitBonuses(ctx.character, caracUsedName, rollTarget);
            const activeCondBonus = (activeConditionalBonuses || []).reduce((sum, b) => sum + b.bonus, 0);
            const totalTraitBonus = isBerserk
                ? (traitAutoBonus ?? traitBonuses.auto) + activeCondBonus + 2  // Berserk ajoute +2
                : (traitAutoBonus ?? traitBonuses.auto) + activeCondBonus;

            return {
                ...ctx,
                systemData: {
                    ...ctx.systemData,
                    // Paramètres calculés, utilisés par afterRoll et buildAnimationSequence
                    pool,
                    threshold,
                    caracLevel:     caracUsedLevel,
                    blessureMalus,
                    totalTraitBonus,
                    // Seuils d'explosion sous forme de tableau pour l'afterRoll
                    explosionThresholds: getExplosionThreshold(caracUsedLevel),
                    // Infatigable = pas de malus fatigue
                    fatigueMalus: ctx.character?.traits?.some(t => t.name === 'Infatigable')
                        ? 0
                        : getFatigueMalus(tokensFatigue),
                    autoSuccesses: autoSuccesses || 0,
                },
            };
        },

        // ── 3. afterRoll ─────────────────────────────────────────────────────
        // Interprète le résultat brut de rpg-dice-roller.
        // Ajoute succès auto, soustrait malus fatigue, marque les explosions.
        afterRoll: (raw, ctx) => {
            const {
                pool,
                threshold,
                explosionThresholds,
                blessureMalus,
                totalTraitBonus,
                fatigueMalus,
                autoSuccesses,
                declaredMode,
                rollType,
                selectedSkill,
                selectedCarac,
            } = ctx.systemData;

            const baseSuccesses  = raw.successes ?? 0;
            const totalSuccesses = Math.max(
                0,
                baseSuccesses + (autoSuccesses || 0) + (totalTraitBonus || 0) - (fatigueMalus || 0)
            );

            // Libellé de la cible (pour historique)
            const rollTarget = rollType === 'skill'
                ? (selectedSkill?.specialization
                    ? `${selectedSkill.name} (${selectedSkill.specialization})`
                    : selectedSkill?.name)
                : CARACNAMES[selectedCarac] || selectedCarac;

            // Flags d'explosion (valeurs dans le seuil d'explosion)
            const exploded = raw.allDice.filter(v => (explosionThresholds || [10]).includes(v));

            return {
                // Données brutes
                notation:  ctx._notation || '',
                allDice:   raw.allDice,

                // Résultat interprété
                successes: totalSuccesses,
                total:     null, // système à succès, pas à somme

                // État ternaire — pas utilisé en Vikings mais structurellement présent
                outcome: null,

                // Flags
                flags: {
                    exploded,
                    botched:  false,
                    critical: false,
                },

                // Détail pour l'affichage UI
                detail: {
                    baseSuccesses,
                    autoSuccesses:   autoSuccesses || 0,
                    traitBonus:      totalTraitBonus || 0,
                    fatigueMalus:    fatigueMalus || 0,
                    blessureMalus,
                    pool,
                    threshold,
                    explosionThresholds: explosionThresholds || [10],
                    rollTarget,
                    rollType,
                    caracUsed:   rollType === 'carac' ? selectedCarac : null,
                    skillUsed:   rollType === 'skill' ? selectedSkill : null,
                },

                // Méta ressource (Saga)
                meta: {
                    autoSuccesses:  autoSuccesses || 0,
                    resourceSpent:  declaredMode === 'insurance' ? 1 : 0,
                    resourceGained: 0,
                    secondRoll:     null, // rempli par rollWithInsurance
                    keptRoll:       null,
                    // Champs bonus Saga (remplis par rollSagaBonus)
                    bonusRoll:      null,
                    bonusSuccesses: null,
                    sagaSuccess:    null,
                    failReason:     null,
                },
            };
        },

        // ── 4. buildAnimationSequence ─────────────────────────────────────────
        // Construit la structure AnimationSequence pour DiceAnimationOverlay.
        // Les vagues sont déjà calculées par diceEngine._buildWaves().
        buildAnimationSequence: (raw, ctx) => {
            const label = _buildLabel(ctx);
            return {
                mode: 'single',
                groups: [{
                    id:       'main',
                    diceType: 'd10',
                    color:    'default',
                    label,
                    waves:    raw.waves,
                }],
                insuranceData: null,
            };
        },
    },

    // ─── Futurs blocs (combat, health...) ─────────────────────────────────────
    // combat: { ... },
};

// ─── Helpers privés ───────────────────────────────────────────────────────────

function _buildLabel(ctx) {
    const { rollType, selectedCarac, selectedSkill } = ctx.systemData || {};
    if (rollType === 'skill' && selectedSkill) {
        const spec = selectedSkill.specialization ? ` (${selectedSkill.specialization})` : '';
        return `${selectedSkill.name}${spec}`;
    }
    if (rollType === 'carac' && selectedCarac) {
        return CARACNAMES[selectedCarac] || selectedCarac;
    }
    return 'Jet';
}

export default vikingsConfig;