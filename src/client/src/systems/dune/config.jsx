// src/client/src/systems/dune/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration CLIENT du système Dune: Adventures in the Imperium.
// Point d'entrée unique : métadonnées + hooks dés 2D20.
// ⚠️  Module ES — uniquement importé par le frontend React.
// ─────────────────────────────────────────────────────────────────────────────

// ── Barème Impulsions → dés supplémentaires ───────────────────────────────
// Index = nb de dés achetés (0, 1, 2, 3)
import DuneHistoryEntry from "./components/DuneHistoryEntry.jsx";

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
    // ─────────────────────────────────────────────────────────────────────────────
// MODIFICATIONS À APPORTER DANS : src/client/src/systems/dune/config.jsx
//
// Remplacer le bloc `dice: { ... }` existant par celui ci-dessous.
// Le reste du fichier (IMPULSION_COST, countSuccesses, combat, exports) est inchangé.
//
// Changements clés :
//   - buildNotation(ctx) : nouvelle fonction déléguée au composant
//   - afterRoll(raw, ctx) : utilise raw.groups[0].values (nouveau format)
//   - buildAnimationSequence(raw, ctx, result) : 3e param ajouté
//   - renderHistoryEntry(entry) : délègue à DuneHistoryEntry
// ─────────────────────────────────────────────────────────────────────────────

// AJOUTER cet import en haut du fichier (si pas déjà présent) :
// import DuneHistoryEntry from './components/DuneHistoryEntry.jsx';
// ou ajuster le chemin selon l'emplacement actuel.

    dice: {

        // ── buildNotation ─────────────────────────────────────────────────────────
        // Appelé par DuneDiceModal AVANT roll().
        // Dune : NdD20 — pas d'explosion, pas de seuil intégré.
        buildNotation: (ctx) => {
            const { nbDes } = ctx.systemData;
            if (!nbDes || nbDes < 1) throw new RollError('NO_DICE', 'Aucun dé à lancer');
            return `${nbDes}d20`;
        },

        // ── beforeRoll ────────────────────────────────────────────────────────────
        // Validation cohérence dépenses.
        beforeRoll: (ctx) => {
            const { nbDes, impulsionsDepensees = 0, menaceGeneree = 0 } = ctx.systemData;
            const totalExtra = impulsionsDepensees + menaceGeneree;

            if (nbDes < 2 || nbDes > 5)
                throw new RollError('INVALID_DICE', `Nombre de dés invalide : ${nbDes} (min 2, max 5)`);
            if (totalExtra !== nbDes - 2)
                throw new RollError('RESOURCE_MISMATCH', 'Incohérence entre dés achetés et ressources dépensées');

            return ctx;
        },

        // ── afterRoll ─────────────────────────────────────────────────────────────
        // Nouveau format : utilise raw.groups[0].values (faces de dés uniquement).
        afterRoll: (raw, ctx) => {
            const {
                rang, hasSpec, competenceRang,
                difficulte, useDetermination,
                impulsionsDepensees = 0, menaceGeneree = 0, selectedSpecialization = false
            } = ctx.systemData;

            const results = raw.groups[0].values;  // ← nouveau format v2
            let succesTotal = 0, complications = 0;

            for (const value of results) {
                if (value === 20) { complications++; continue; }
                if (value <= rang) {
                    succesTotal += ((hasSpec && value <= competenceRang && selectedSpecialization) || value === 1) ? 2 : 1;
                }
            }

            // La Détermination ajoute 1 succès automatique
            if (useDetermination) succesTotal += 1;

            const reussite = succesTotal >= difficulte;
            const excedent = Math.max(0, succesTotal - difficulte);
            console.log(ctx);
            return {
                results,
                rang,
                hasSpec:             !!hasSpec,
                selectedSpecialization,
                succes:              succesTotal,
                complications,
                difficulte,
                reussite,
                excedent,
                useDetermination:    !!useDetermination,
                impulsionsDepensees,
                menaceGeneree,
                label: ctx.label,
                // successes pour le moteur générique (persist)
                successes:           succesTotal,
            };
        },

        // ── buildAnimationSequence ────────────────────────────────────────────────
        // Reçoit (raw, ctx, result) — 3e param ajouté.
        buildAnimationSequence: (raw, ctx) => ({
            mode: 'single',
            groups: raw.groups.map((g, i) => ({
                id:       `group-${i}`,
                diceType: 'd20',
                color:    'default',
                label:    ctx.label || `${g.values.length}d20`,
                waves:    [{ dice: g.values }], // toujours une seule vague, pas d'explosion en 2d20
            })),
        }),

        // ── renderHistoryEntry ────────────────────────────────────────────────────
        // Délègue au composant Dune-spécifique.
        renderHistoryEntry: (entry) => <DuneHistoryEntry roll={entry} />,
    },

    // ─── Constantes utiles côté client ────────────────────────────────────
    IMPULSION_COST,
    countSuccesses,
};

export default duneConfig;