// src/server/systems/vikings/config.js
// Configuration du système Pure Vikings.
// Ce fichier est la seule chose à créer pour déclarer un nouveau système.

const path = require('path');

module.exports = {
    slug:       'vikings',
    label:      'Pure Vikings',
    dbPath:     path.join(__dirname, '../../../../database/pure-vikings.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/schema.sql'),
};