// migrate.js - Script de migration générique
const fs = require('fs');
const path = require('path');
const {getDb} = require("./utils/db");

/**
 * Applique un fichier de migration SQL
 * @param {string} filename - Nom du fichier (ex: "001_add_auth.sql")
 */
function runMigration(filename) {
    if (!filename) {
        console.error('❌ Usage: npm run migrate <filename.sql>');
        console.log('Example: npm run migrate 001_add_auth.sql');
        return;
    }

    const db = getDb();
    const migrationPath = path.join(__dirname, '../../database-template/migrations', filename);

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        return;
    }

    console.log(`🔄 Running migration: ${filename}`);

    try {
        const migration = fs.readFileSync(migrationPath, 'utf8');

        // Exécuter dans une transaction
        db.exec('PRAGMA foreign_keys = OFF;');
        db.exec('BEGIN TRANSACTION;');
        db.exec(migration);
        db.exec('COMMIT;');
        db.exec('PRAGMA foreign_keys = ON;');

        console.log(`✅ Migration ${filename} applied successfully`);

    } catch (error) {
        db.exec('ROLLBACK;');
        db.exec('PRAGMA foreign_keys = ON;');
        console.error(`❌ Migration failed:`, error.message);
        console.error(error);
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    const filename = process.argv[2];
    runMigration(filename);
    process.exit(0);
}

module.exports = { runMigration };