// src/server/middleware/systemResolver.js
// Intercepte les requêtes /api/:system/* :
//   - Vérifie que le système est déclaré → 404 sinon
//   - Ouvre (ou récupère) la connexion BDD lazy → injecte req.db
//   - Injecte req.system (la config complète)

const { getSystem } = require('../systems/loader');
const { getDbForSystem } = require('../db/index');

function systemResolver(req, res, next) {
    const { system } = req.params;

    const systemConfig = getSystem(system);
    if (!systemConfig) {
        return res.status(404).json({ error: `Unknown system: "${system}"` });
    }

    // Connexion lazy — ouvre ou récupère + reset TTL
    try {
        req.db = getDbForSystem(systemConfig);
    } catch (err) {
        console.error(`[systemResolver] Failed to get DB for "${system}":`, err.message);
        return res.status(503).json({ error: `Database unavailable for system "${system}"` });
    }

    req.system = systemConfig;
    next();
}

module.exports = systemResolver;