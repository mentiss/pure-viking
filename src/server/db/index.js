// src/server/db/index.js
// Gestionnaire de connexions SQLite lazy avec TTL de 5 minutes.
// Une connexion est ouverte à la première demande pour un système donné,
// puis fermée automatiquement après 5 min d'inactivité.
// Chaque accès reset le timer.

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Map slug → { db, timer }
const pool = new Map();

/**
 * Retourne la connexion active pour un système, en l'ouvrant si nécessaire.
 * Reset le TTL à chaque appel.
 * @param {object} systemConfig - Config issue du système (slug, dbPath, schemaPath)
 * @returns {Database}
 */
function getDbForSystem(systemConfig) {
    const { slug, dbPath, schemaPath } = systemConfig;

    if (pool.has(slug)) {
        const entry = pool.get(slug);
        clearTimeout(entry.timer);
        entry.timer = _scheduleClose(slug);
        return entry.db;
    }

    const db = _openDatabase(slug, dbPath, schemaPath);
    pool.set(slug, {
        db,
        timer: _scheduleClose(slug)
    });

    console.log(`🔓 [${slug}] Database connection opened`);
    return db;
}

/**
 * Ferme immédiatement une connexion.
 * @param {string} slug
 */
function closeDbForSystem(slug) {
    if (!pool.has(slug)) return;
    const entry = pool.get(slug);
    clearTimeout(entry.timer);
    try {
        entry.db.close();
        console.log(`🔒 [${slug}] Database connection closed`);
    } catch (err) {
        console.warn(`⚠️  [${slug}] Error closing database:`, err.message);
    }
    pool.delete(slug);
}

/**
 * Ferme toutes les connexions ouvertes (appelé au shutdown du serveur).
 */
function closeAllDatabases() {
    for (const slug of [...pool.keys()]) {
        closeDbForSystem(slug);
    }
}

// ─── Privé ──────────────────────────────────────────────────────────────────

function _openDatabase(slug, dbPath, schemaPath) {
    const dbExists = fs.existsSync(dbPath);

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath);

    if (!dbExists) {
        console.log(`🆕 [${slug}] New database detected, applying schema...`);
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema not found for system "${slug}": ${schemaPath}`);
        }
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log(`✅ [${slug}] Schema applied`);
    }

    db.pragma('journal_mode = WAL');
    return db;
}

function _scheduleClose(slug) {
    return setTimeout(() => {
        console.log(`⏱️  [${slug}] TTL expired, closing database connection`);
        closeDbForSystem(slug);
    }, TTL_MS);
}

module.exports = { getDbForSystem, closeDbForSystem, closeAllDatabases };