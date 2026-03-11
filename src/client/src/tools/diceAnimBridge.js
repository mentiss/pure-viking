// src/client/src/tools/diceAnimBridge.js
// ─────────────────────────────────────────────────────────────────────────────
// Bridge singleton entre diceEngine (logique pure) et DiceAnimationOverlay (JSX).
//
// Problème résolu : roll() est une fonction utilitaire — elle ne peut pas
// useState ni rendre du JSX. Pourtant elle doit déclencher l'animation et
// ATTENDRE sa fin avant de persister et rendre la main.
//
// Solution : singleton léger, zéro dépendance externe.
//   - DiceAnimationOverlay s'enregistre via onPlay() à son mount.
//   - diceEngine appelle play(seq) et attend la promesse.
//   - DiceAnimationOverlay résout la promesse via complete() (fin naturelle)
//     ou skip() (interruption volontaire bouton "Passer").
//
// Un seul overlay dans le DOM (monté dans PlayerPage et GMPage).
// ─────────────────────────────────────────────────────────────────────────────

let _resolve  = null;  // résout la promesse en cours
let _listener = null;  // callback d'affichage enregistré par l'overlay

export const diceAnimBridge = {

    /**
     * Appelé par <DiceAnimationOverlay> au mount pour s'enregistrer.
     * @param {function} fn - (AnimationSequence) => void
     */
    onPlay: (fn) => { _listener = fn; },

    /**
     * Appelé par diceEngine — déclenche l'animation et attend sa fin.
     * Retourne une promesse qui se résout quand l'animation est terminée
     * (naturellement ou par skip).
     * @param {object} seq - AnimationSequence
     * @returns {Promise<void>}
     */
    play: (seq) => new Promise((res) => {
        _resolve = res;
        _listener?.(seq);
    }),

    /**
     * Appelé par <DiceAnimationOverlay> dans son handler onComplete
     * (fin naturelle de l'animation après END_DISPLAY_DELAY).
     */
    complete: () => {
        _resolve?.();
        _resolve = null;
    },

    /**
     * Appelé par <DiceAnimationOverlay> quand l'utilisateur clique "Passer →".
     * Sémantiquement distinct de complete() — même comportement aujourd'hui,
     * point d'extension si on veut logguer les skips ou différencier plus tard.
     */
    skip: () => {
        _resolve?.();
        _resolve = null;
    },
};