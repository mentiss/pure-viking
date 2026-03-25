// src/server/systems/loader.js
// Découverte automatique des systèmes de jeu.
// Scanne src/server/systems/ et charge tout dossier contenant un config.js valide.
// Un système invalide logue un warning et est ignoré — le serveur continue.
//
// Contrat d'un système : son dossier DOIT contenir :
//   config.js              → { slug, label, dbPath, schemaPath[, generateAccessUrl] }
//   routes/characters.js   → router Express spécifique
//
// Routes génériques montées automatiquement (pas besoin de les déclarer) :
//   sessions, journal, dice, combat, npc
//
// Routes extra slug-spécifiques :
//   Tout fichier .js dans routes/ qui n'est PAS characters.js ni combat.js
//   est monté automatiquement sous /api/:slug/<nom_fichier_sans_extension>.
//   Ex : routes/session-resources.js → /api/dune/session-resources
//
// Handlers Socket.io slug-spécifiques :
//   Tout fichier .js dans socket/ exporte une fonction register(io, socket, db).
//   Chaque fichier est enregistré automatiquement à chaque nouvelle connexion socket.
//   Ex : socket/session-resources.js → écoute 'update-session-resources'

const fs   = require('fs');
const path = require('path');

const SYSTEMS_DIR = path.join(__dirname);

// Routes génériques partagées par tous les systèmes
const SHARED_ROUTES = {
    sessions:   path.join(__dirname, '../routes/sessions.js'),
    journal:    path.join(__dirname, '../routes/journal.js'),
    dice:       path.join(__dirname, '../routes/dice.js'),
    combat:     path.join(__dirname, '../routes/combat.js'),
    npc:        path.join(__dirname, '../routes/npc.js'),
    'npc-sets': path.join(__dirname, '../routes/npc-sets.js'),
};

// Routes que chaque système DOIT fournir
const REQUIRED_ROUTES = ['characters'];

// Routes slug-spécifiques exclues du scan extra (gérées explicitement)
const EXCLUDED_FROM_EXTRA_SCAN = new Set(['characters.js', 'combat.js']);

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
        const systemDir  = path.join(SYSTEMS_DIR, entry.name);
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
 * @returns {import('express').Router}
 */
function getSystemRoute(slug, routeName) {
    const system = getSystem(slug);
    if (!system) throw new Error(`Unknown system: ${slug}`);
    return require(path.join(SYSTEMS_DIR, slug, 'routes', `${routeName}.js`));
}

/**
 * Retourne le router Express d'une route générique partagée.
 * @param {'sessions'|'journal'|'dice'|'npc'|'combat'|'npc-sets'} routeName
 * @returns {import('express').Router}
 */
function getSharedRoute(routeName) {
    const routePath = SHARED_ROUTES[routeName];
    if (!routePath) throw new Error(`Unknown shared route: ${routeName}`);
    return require(routePath);
}

/**
 * Scanne le dossier routes/ du slug et retourne toutes les routes extra.
 * Sont exclues : characters.js et combat.js (gérées explicitement par server.js).
 *
 * @param {string} slug
 * @returns {Array<{ name: string, router: import('express').Router }>}
 *   name  = nom du fichier sans extension  (ex: 'session-resources')
 *   router = module Express Router chargé
 */
function getSystemExtraRoutes(slug) {
    const routesDir = path.join(SYSTEMS_DIR, slug, 'routes');
    if (!fs.existsSync(routesDir)) return [];

    return fs.readdirSync(routesDir)
        .filter(f => f.endsWith('.js') && !EXCLUDED_FROM_EXTRA_SCAN.has(f))
        .map(f => ({
            name:   f.replace('.js', ''),
            router: require(path.join(routesDir, f)),
        }));
}

/**
 * Scanne le dossier socket/ du slug et retourne toutes les fonctions register.
 * Chaque fichier doit exporter : function register(io, socket, db) { ... }
 *
 * @param {string} slug
 * @returns {Array<Function>}  tableau de fonctions register
 */
function getSystemSocketHandlers(slug) {
    const socketDir = path.join(SYSTEMS_DIR, slug, 'socket');
    if (!fs.existsSync(socketDir)) return [];

    return fs.readdirSync(socketDir)
        .filter(f => f.endsWith('.js'))
        .map(f => {
            const handler = require(path.join(socketDir, f));
            if (typeof handler !== 'function') {
                console.warn(`⚠️  [${slug}] socket/${f} n'exporte pas une fonction — ignoré`);
                return null;
            }
            return handler;
        })
        .filter(Boolean);
}

/**
 *
 * @param slug
 * @returns {any|boolean}
 */
function getConfigForSystem(slug) {
    if (_registry.size === 0) {
        loadAllSystems();
    }

    if(_registry.has(slug)) {
        return _registry.get(slug);
    }

    return false;
}

// ─── Privé ──────────────────────────────────────────────────────────────────

function _validateConfig(config, systemDir) {
    if (!config.slug)       throw new Error('Missing "slug" in config.js');
    if (!config.label)      throw new Error('Missing "label" in config.js');
    if (!config.dbPath)     throw new Error('Missing "dbPath" in config.js');
    if (!config.schemaPath) throw new Error('Missing "schemaPath" in config.js');

    for (const routeName of REQUIRED_ROUTES) {
        const routePath = path.join(systemDir, 'routes', `${routeName}.js`);
        if (!fs.existsSync(routePath)) {
            throw new Error(`Missing required route: routes/${routeName}.js`);
        }
    }
}

module.exports = {
    loadAllSystems,
    getSystem,
    getAllSystems,
    getSystemRoute,
    getSharedRoute,
    getSystemExtraRoutes,
    getSystemSocketHandlers,
    getConfigForSystem,
};