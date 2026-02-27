// src/server/systems/loader.js
// Découverte automatique des systèmes de jeu.
// Scanne src/server/systems/ et charge tout dossier contenant un config.js valide.
// Un système invalide logue un warning et est ignoré — le serveur continue.
//
// Contrat d'un système : son dossier DOIT contenir :
//   config.js          → { slug, label, dbPath, schemaPath }
//   routes/characters.js → router Express spécifique
//   routes/combat.js     → router Express spécifique
//
// Routes génériques montées automatiquement (pas besoin de les déclarer) :
//   sessions, journal, dice

const fs = require('fs');
const path = require('path');

const SYSTEMS_DIR = path.join(__dirname);
// Routes génériques partagées par tous les systèmes
// Convention : systems/ = spécifique, routes/ = générique
const SHARED_ROUTES = {
    sessions: path.join(__dirname, '../routes/sessions.js'),
    journal:  path.join(__dirname, '../routes/journal.js'),
    dice:     path.join(__dirname, '../routes/dice.js'),
};
// Routes obligatoires que chaque système doit fournir
const REQUIRED_ROUTES = ['characters', 'combat'];

// Cache des systèmes chargés : slug → systemConfig
const _registry = new Map();

/**
 * Charge tous les systèmes disponibles au démarrage.
 * Appelé une seule fois dans server.js.
 */
function loadAllSystems() {
    const entries = fs.readdirSync(SYSTEMS_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const systemDir = path.join(SYSTEMS_DIR, entry.name);
        const configPath = path.join(systemDir, 'config.js');

        if (!fs.existsSync(configPath)) continue;

        try {
            const config = require(configPath);
            _validateConfig(config, systemDir);
            _registry.set(config.slug, config);
            console.log(`✅ System loaded: [${config.slug}] ${config.label}`);
        } catch (err) {
            console.warn(`⚠️  System "${entry.name}" skipped: ${err.message}`);
        }
    }

    if (_registry.size === 0) {
        console.error('❌ No valid system found. Check src/server/systems/*/config.js');
        process.exit(1);
    }

    console.log(`🎲 ${_registry.size} system(s) ready: ${[..._registry.keys()].join(', ')}`);
}

/**
 * Retourne la config d'un système par son slug.
 * @param {string} slug
 * @returns {object|null}
 */
function getSystem(slug) {
    return _registry.get(slug) || null;
}

/**
 * Retourne tous les systèmes chargés.
 * @returns {Map<string, object>}
 */
function getAllSystems() {
    return _registry;
}

/**
 * Retourne le router Express d'une route spécifique au système.
 * @param {string} slug
 * @param {'characters'|'combat'} routeName
 * @returns {Router}
 */
function getSystemRoute(slug, routeName) {
    const system = getSystem(slug);
    if (!system) throw new Error(`Unknown system: ${slug}`);
    return require(path.join(SYSTEMS_DIR, slug, 'routes', `${routeName}.js`));
}

/**
 * Retourne le router Express d'une route générique partagée.
 * @param {'sessions'|'journal'|'dice'} routeName
 * @returns {Router}
 */
function getSharedRoute(routeName) {
    const routePath = SHARED_ROUTES[routeName];
    if (!routePath) throw new Error(`Unknown shared route: ${routeName}`);
    return require(routePath);
}

// ─── Privé ──────────────────────────────────────────────────────────────────

function _validateConfig(config, systemDir) {
    if (!config.slug)       throw new Error('Missing "slug" in config.js');
    if (!config.label)      throw new Error('Missing "label" in config.js');
    if (!config.dbPath)     throw new Error('Missing "dbPath" in config.js');
    if (!config.schemaPath) throw new Error('Missing "schemaPath" in config.js');

    // Vérifier que les routes obligatoires existent
    for (const routeName of REQUIRED_ROUTES) {
        const routePath = path.join(systemDir, 'routes', `${routeName}.js`);
        if (!fs.existsSync(routePath)) {
            throw new Error(`Missing required route: routes/${routeName}.js`);
        }
    }
}

module.exports = { loadAllSystems, getSystem, getAllSystems, getSystemRoute, getSharedRoute };