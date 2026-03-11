// ─── Helper : loadFullCharacter dynamique selon le système ───────────────────

function getController(req) {
    const { loadFullCharacter } = require(`../systems/${req.system.slug}/CharacterController`);
    return { loadFullCharacter };
}

// ─── Helper : nom du cookie scopé par slug + rôle ────────────────────────────
// Chaque combinaison (slug, rôle) produit un cookie distinct.
// Exemples :
//   refreshToken_vikings        ← joueur vikings
//   refreshToken_vikings_gm     ← GM vikings
//   refreshToken_dune           ← joueur dune
//   refreshToken_dune_gm        ← GM dune

function cookieName(slug, isGM) {
    return isGM ? `refreshToken_${slug}_gm` : `refreshToken_${slug}`;
}

// ─── Helper : options cookie partagées ───────────────────────────────────────

function cookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
    };
}

// ─── Helper : résolution du cookie présent (refresh / logout) ────────────────
// On ne sait pas encore le rôle du demandeur → on teste les deux noms.

function resolveRefreshToken(req) {
    const slug = req.system.slug;
    const isGM = req.body?.isGM === true;

    const cookieNameToTry = cookieName(slug, isGM);
    const token = req.cookies?.[cookieNameToTry];

    if (token) return { token, isGM };
    return null;
}

module.exports = {resolveRefreshToken, getController, cookieName, cookieOptions};