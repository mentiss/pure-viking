// src/server/utils/db.js
// Compatibilité descendante uniquement.
// Les nouvelles routes doivent utiliser req.db (injecté par systemResolver).
// getDb() retourne la connexion Vikings via le pool lazy.

const { getDbForSystem } = require('../db/index');
const { getSystem }      = require('../systems/loader');
const { ensureUniqueCode } = require('./characters');

function getDb() {
    const system = getSystem('vikings');
    if (!system) throw new Error('[db.js] Vikings system not loaded');
    return getDbForSystem(system);
}

// initDatabase et closeDb délèguent au loader/pool
function initDatabase() {
    // Le chargement des systèmes est fait dans server.js via loadAllSystems()
    // Cette fonction est conservée pour compatibilité avec init-db.js
    const { loadAllSystems } = require('../systems/loader');
    loadAllSystems();
}

function closeDb() {
    const { closeAllDatabases } = require('../db/index');
    closeAllDatabases();
}

module.exports = { getDb, initDatabase, closeDb, ensureUniqueCode };