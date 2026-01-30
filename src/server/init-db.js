// init-db.js - Script d'initialisation de la base de données
const { initDatabase, closeDb } = require('./db');

console.log('');
console.log('═══════════════════════════════════════');
console.log('🎲 PURE VIKINGS - Database Initialization');
console.log('═══════════════════════════════════════');
console.log('');

try {
    initDatabase();
    console.log('');
    console.log('✅ Database successfully initialized!');
    console.log('📊 Location: database/pure-vikings.db');
    console.log('');
    console.log('You can now run:');
    console.log('  npm start     (production)');
    console.log('  npm run dev   (development with nodemon)');
    console.log('');
} catch (error) {
    console.error('');
    console.error('❌ Error initializing database:');
    console.error(error);
    console.error('');
    process.exit(1);
} finally {
    closeDb();
}
