// src/client/src/systems/dune/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration CLIENT du système Dune: Adventures in the Imperium.
// Point d'entrée unique : métadonnées + hooks dés 2D20.
// ⚠️  Module ES — uniquement importé par le frontend React.
// ─────────────────────────────────────────────────────────────────────────────

// ── Barème Impulsions → dés supplémentaires ───────────────────────────────
// Index = nb de dés achetés (0, 1, 2, 3)
const IMPULSION_COST = [0, 1, 3, 6];

/**
 * Calcule les succès d'un jet 2D20 Dune.
 * - dé ≤ rang                              → 1 succès
 * - dé ≤ rang ET hasSpecialisation = true  → 2 succès
 * - dé = 20                                → Complication (0 succès)
 *
 * @param {number[]} results  - Valeurs brutes des dés
 * @param {number}   rang     - Rang total (compétence + principe)
 * @param {boolean}  hasSpec  - Spécialisation active sur la compétence
 * @param {number}   specSeuil - Rang de la compétence si spécialisée, 0 sinon
 * @returns {{ succes: number, complications: number }}
 */
function countSuccesses(results, rang, hasSpec, specSeuil) {
    let succes = 0;
    let complications = 0;
    for (const val of results) {
        if (val === 20) {
            complications++;
        } else if (hasSpec && val <= specSeuil) {
            succes += 2;
        } else if (val <= rang) {
            succes += 1;
        }
    }
    return { succes, complications };
}

// ── Config système ─────────────────────────────────────────────────────────

const duneConfig = {
    slug:  'dune',
    label: 'Dune: Adventures in the Imperium',

    // ─── Hooks dés 2D20 ───────────────────────────────────────────────────
    dice: {

        /**
         * Construit la notation rpg-dice-roller.
         * Dune : NdD20, pas d'explosion, pas de seuil intégré.
         * Le comptage des succès est manuel (countSuccesses ci-dessus).
         * @param {object} ctx
         * @param {object} ctx.systemData - { nbDes }
         * @returns {string}  ex : "4d20"
         */
        buildNotation: (ctx) => {
            const { nbDes } = ctx.systemData;
            return `${nbDes}d20`;
        },

        /**
         * Validation et enrichissement du contexte AVANT le roll.
         * Vérifie que la dépense d'Impulsions est cohérente.
         * @param {object} ctx
         * @throws {Error} si les paramètres sont invalides
         * @returns {object} ctx enrichi (inchangé ici)
         */
        beforeRoll: (ctx) => {
            const { nbDes, impulsionsDepensees = 0, menaceGeneree = 0 } = ctx.systemData;
            const totalExtra = impulsionsDepensees + menaceGeneree;

            if (nbDes < 2 || nbDes > 5) {
                throw new Error(`Nombre de dés invalide : ${nbDes} (min 2, max 5)`);
            }
            if (totalExtra !== nbDes - 2) {
                throw new Error('Incohérence entre dés achetés et ressources dépensées');
            }
            return ctx;
        },

        /**
         * Traitement des résultats APRÈS le roll.
         * Calcule succès, complications, résultat global.
         * @param {object} ctx
         * @param {object} rollResult - Résultat brut rpg-dice-roller
         * @returns {object} payload enrichi pour l'affichage et l'historique
         */
        afterRoll: (ctx, rollResult) => {
            const { rang, competenceRang, hasSpecialisation, difficulte, useDetermination } = ctx.systemData;
            const results = rollResult.rolls.map(r => r.value);
            const specSeuil = hasSpecialisation ? (competenceRang ?? 0) : 0;
            const { succes, complications } = countSuccesses(results, rang, hasSpecialisation, specSeuil);

            // La Détermination ajoute 1 succès automatique si utilisée
            const succesTotal = succes + (useDetermination ? 1 : 0);
            const reussite    = succesTotal >= difficulte;
            const succesBonus = Math.max(0, succesTotal - difficulte); // succès en excédent

            return {
                results,
                rang,
                succes: succesTotal,
                complications,
                difficulte,
                reussite,
                succesBonus,
                useDetermination: !!useDetermination,
                impulsionsDepensees: ctx.systemData.impulsionsDepensees ?? 0,
                impulsionsCout:      IMPULSION_COST[ctx.systemData.impulsionsDepensees ?? 0],
                menaceGeneree:       ctx.systemData.menaceGeneree ?? 0,
            };
        },

        /**
         * Construit les données d'animation pour dice-box-threejs.
         * @param {object} ctx
         * @returns {Array}  tableau de descripteurs de dés
         */
        buildAnimationSequence: (ctx) => {
            const { nbDes } = ctx.systemData;
            return Array.from({ length: nbDes }, () => ({ type: 'd20' }));
        },
    },

    // ─── Constantes utiles côté client ────────────────────────────────────
    IMPULSION_COST,
    countSuccesses,
};

export default duneConfig;