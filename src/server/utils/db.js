// db.js - Gestionnaire base de données SQLite
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const {generateAccessCode, generateAccessUrl} = require("./characters");

const DB_PATH = path.join(__dirname, '../../../database/pure-vikings.db');
const DB_DIR = path.join(__dirname, '../../../database');
const SCHEMA_PATH = path.join(__dirname, '../../../database-template/schema.sql');

// Initialiser la base de données
function initDatabase() {
    // Créer le dossier database s'il n'existe pas
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log('📁 Created database directory');
    }

    // Vérifier si la DB existe déjà
    const dbExists = fs.existsSync(DB_PATH);
    
    // Créer ou ouvrir la base
    const db = new Database(DB_PATH);
    console.log('📊 Database opened:', DB_PATH);
    
    // Charger le schéma UNIQUEMENT si DB vient d'être créée
    if (!dbExists) {
        console.log('🆕 New database detected, loading schema...');
        if (fs.existsSync(SCHEMA_PATH)) {
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
            db.exec(schema);
            console.log('✅ Database schema initialized');
        } else {
            console.warn('⚠️  Schema file not found at:', SCHEMA_PATH);
            console.log('Creating basic structure...');
            // Fallback minimal (ne devrait pas arriver)
            db.exec(`
                CREATE TABLE IF NOT EXISTS characters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    access_code TEXT UNIQUE NOT NULL,
                    access_url TEXT UNIQUE NOT NULL,
                    player_name TEXT NOT NULL,
                    prenom TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        }
    } else {
        console.log('✅ Existing database loaded');
    }
    
    // WAL mode pour meilleures performances
    db.pragma('journal_mode = WAL');
    
    return db;
}

// Singleton
let db = null;

function getDb() {
    if (!db) {
        db = initDatabase();
    }
    return db;
}

function closeDb() {
    if (db) {
        db.close();
        db = null;
        console.log('🔒 Database closed');
    }
}

// Vérifier unicité et regénérer si nécessaire
function ensureUniqueCode(type = 'character') {
    const db = getDb();
    const table = type === 'session' ? 'game_sessions' : 'characters';
    let code, url;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        code = generateAccessCode();
        url = generateAccessUrl();
        const existing = db.prepare(`SELECT id FROM ${table} WHERE access_code = ? OR access_url = ?`).get(code, url);
        if (!existing) break;
        attempts++;
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique access codes');
    }
    
    return { code, url };
}

module.exports = { getDb, initDatabase, closeDb, ensureUniqueCode };
