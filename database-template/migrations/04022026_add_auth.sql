-- Migration 001: Ajout système d'authentification

-- 1. Retirer contrainte UNIQUE sur access_code (recréer la table)
-- SQLite ne permet pas ALTER TABLE DROP CONSTRAINT, donc on recrée

-- Créer table temporaire sans UNIQUE sur access_code
CREATE TABLE IF NOT EXISTS characters_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_code TEXT NOT NULL,
    access_url TEXT UNIQUE NOT NULL,
    player_name TEXT NOT NULL,
    prenom TEXT NOT NULL,
    surnom TEXT,
    nom_parent TEXT,
    sexe TEXT CHECK(sexe IN ('homme', 'femme')),
    age INTEGER,
    taille INTEGER,
    poids INTEGER,
    activite TEXT,
    force INTEGER DEFAULT 2,
    agilite INTEGER DEFAULT 2,
    perception INTEGER DEFAULT 2,
    intelligence INTEGER DEFAULT 2,
    charisme INTEGER DEFAULT 2,
    chance INTEGER DEFAULT 2,
    armure INTEGER DEFAULT 0,
    actions_disponibles INTEGER DEFAULT 1,
    seuil_combat INTEGER DEFAULT 1,
    saga_actuelle INTEGER DEFAULT 3,
    saga_totale INTEGER DEFAULT 3,
    tokens_blessure INTEGER DEFAULT 0,
    tokens_fatigue INTEGER DEFAULT 0,
    login_attempts INTEGER DEFAULT 0,
    last_attempt_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copier données existantes
INSERT INTO characters_new
SELECT
    id, access_code, access_url, player_name, prenom, surnom, nom_parent,
    sexe, age, taille, poids, activite,
    force, agilite, perception, intelligence, charisme, chance,
    armure, actions_disponibles, seuil_combat,
    saga_actuelle, saga_totale, tokens_blessure, tokens_fatigue,
    0 as login_attempts,  -- Nouvelle colonne
    NULL as last_attempt_at,  -- Nouvelle colonne
    created_at, updated_at, last_accessed
FROM characters;

-- Supprimer ancienne table
DROP TABLE characters;

-- Renommer nouvelle table
ALTER TABLE characters_new RENAME TO characters;

-- 2. Recréer les index (sauf access_code)
CREATE INDEX IF NOT EXISTS idx_characters_access_url ON characters(access_url);

-- 3. Créer table refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_character ON refresh_tokens(character_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);