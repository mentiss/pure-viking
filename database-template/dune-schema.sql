-- ============================================
-- Dune: Adventures in the Imperium — Schéma BDD
-- ============================================
-- Généré par : VTT Multi-JDR
-- Usage : créé automatiquement au premier lancement si dune.db absent.
-- Migrations ultérieures : database-template/migrations/DDMMYYYY_add_quoi.sql

-- ============================================
-- PERSONNAGES
-- ============================================

CREATE TABLE IF NOT EXISTS characters (
                                          id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Accès (champs génériques obligatoires)
                                          access_code     TEXT UNIQUE NOT NULL,
                                          access_url      TEXT UNIQUE NOT NULL,
                                          player_name     TEXT NOT NULL,

    -- Identité du personnage
                                          nom             TEXT NOT NULL DEFAULT '',
                                          statut_social   TEXT DEFAULT '',
                                          description     TEXT DEFAULT '',

    -- Détermination (ressource personnelle)
                                          determination       INTEGER DEFAULT 1,
                                          determination_max   INTEGER DEFAULT 1,

    -- ── Compétences (5 fixes) ────────────────────────────────────────────────
    -- specialisation != '' → rang sert de seuil de double succès au jet
                                          analyse_rang                INTEGER DEFAULT 4,
                                          analyse_specialisation      TEXT    DEFAULT '',
                                          combat_rang                 INTEGER DEFAULT 4,
                                          combat_specialisation       TEXT    DEFAULT '',
                                          discipline_rang             INTEGER DEFAULT 4,
                                          discipline_specialisation   TEXT    DEFAULT '',
                                          mobilite_rang               INTEGER DEFAULT 4,
                                          mobilite_specialisation     TEXT    DEFAULT '',
                                          rhetorique_rang             INTEGER DEFAULT 4,
                                          rhetorique_specialisation   TEXT    DEFAULT '',

    -- ── Principes (5 fixes, rang plafonné à 8) ───────────────────────────────
    -- Pas de spécialisation. Maxime = texte libre.
                                          devoir_rang         INTEGER DEFAULT 4,
                                          devoir_maxime       TEXT    DEFAULT '',
                                          domination_rang     INTEGER DEFAULT 4,
                                          domination_maxime   TEXT    DEFAULT '',
                                          foi_rang            INTEGER DEFAULT 4,
                                          foi_maxime          TEXT    DEFAULT '',
                                          justice_rang        INTEGER DEFAULT 4,
                                          justice_maxime      TEXT    DEFAULT '',
                                          verite_rang         INTEGER DEFAULT 4,
                                          verite_maxime       TEXT    DEFAULT '',

    -- Authentification
                                          login_attempts  INTEGER DEFAULT 0,
                                          last_attempt_at DATETIME,

    -- Métadonnées
                                          last_accessed   DATETIME,
                                          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compte GM (requis pour les mécanismes JWT partagés)
INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom)
VALUES (-1, 'GMCODE', 'iamthegm', 'Maître du Jeu', 'Maître du Jeu');

CREATE INDEX IF NOT EXISTS idx_characters_access_code ON characters(access_code);
CREATE INDEX IF NOT EXISTS idx_characters_access_url  ON characters(access_url);
CREATE INDEX IF NOT EXISTS idx_characters_updated_at  ON characters(updated_at DESC);

-- ============================================
-- TALENTS
-- ============================================

CREATE TABLE IF NOT EXISTS character_talents (
                                                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 character_id    INTEGER NOT NULL,
                                                 talent_name     TEXT    NOT NULL,
                                                 description     TEXT    DEFAULT '',
                                                 FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talents_character_id ON character_talents(character_id);

-- ============================================
-- ATOUTS (inventaire libre)
-- ============================================
-- Nommée character_items pour cohérence plateforme.
-- L'interface l'appelle "Atouts".

CREATE TABLE IF NOT EXISTS character_items (
                                               id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id    INTEGER NOT NULL,
                                               nom             TEXT    NOT NULL,
                                               description     TEXT    DEFAULT '',
                                               quantite        INTEGER DEFAULT 1,
                                               FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_character_id ON character_items(character_id);

-- ============================================
-- SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS game_sessions (
                                             id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                             access_code TEXT UNIQUE NOT NULL,
                                             access_url  TEXT UNIQUE NOT NULL,
                                             name        TEXT NOT NULL,
                                             description TEXT DEFAULT '',
                                             is_active   INTEGER DEFAULT 0,
                                             created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                                             updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON game_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_access_url  ON game_sessions(access_url);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active   ON game_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at  ON game_sessions(updated_at DESC);

-- ============================================
-- SESSION_CHARACTERS
-- ============================================

CREATE TABLE IF NOT EXISTS session_characters (
                                                  id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                  session_id      INTEGER NOT NULL,
                                                  character_id    INTEGER NOT NULL,
                                                  joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                  UNIQUE(session_id, character_id),
                                                  FOREIGN KEY (session_id)   REFERENCES game_sessions(id)  ON DELETE CASCADE,
                                                  FOREIGN KEY (character_id) REFERENCES characters(id)     ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sc_session_id   ON session_characters(session_id);
CREATE INDEX IF NOT EXISTS idx_sc_character_id ON session_characters(character_id);

-- ============================================
-- MAISON DE SESSION
-- ============================================
-- Rattachée à la session. Partagée entre tous les joueurs de la session.
-- Éditable par le GM et les joueurs (narratif).

CREATE TABLE IF NOT EXISTS session_maison (
                                              id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                              session_id  INTEGER NOT NULL UNIQUE,
                                              nom         TEXT    DEFAULT '',
                                              description TEXT    DEFAULT '',
                                              updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_maison_session_id ON session_maison(session_id);

-- ============================================
-- RESSOURCES DE SESSION
-- ============================================
-- Impulsions (0–6) et Menace (≥0) : visibles par tous.
-- Complications (≥0) : GM uniquement.

CREATE TABLE IF NOT EXISTS session_resources (
                                                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 session_id      INTEGER NOT NULL UNIQUE,
                                                 impulsions      INTEGER DEFAULT 0,
                                                 menace          INTEGER DEFAULT 0,
                                                 complications   INTEGER DEFAULT 0,
                                                 updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resources_session_id ON session_resources(session_id);

-- ============================================
-- HISTORIQUE DES DÉS
-- ============================================

CREATE TABLE IF NOT EXISTS dice_history (
                                            id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                            session_id      INTEGER,
                                            character_id    INTEGER,
                                            roll_type       TEXT,
                                            dice_notation   TEXT,
                                            result          TEXT,
                                            details         TEXT,
                                            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                            FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE SET NULL,
                                            FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dice_session_id   ON dice_history(session_id);
CREATE INDEX IF NOT EXISTS idx_dice_character_id ON dice_history(character_id);
CREATE INDEX IF NOT EXISTS idx_dice_created_at   ON dice_history(created_at DESC);

-- ============================================
-- JOURNAL DE PERSONNAGE
-- ============================================

CREATE TABLE IF NOT EXISTS character_journal (
                                                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 character_id    INTEGER NOT NULL,
                                                 content         TEXT    DEFAULT '',
                                                 updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_character_id ON character_journal(character_id);

-- ============================================
-- REFRESH TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                              character_id    INTEGER NOT NULL,
                                              token           TEXT UNIQUE NOT NULL,
                                              expires_at      DATETIME NOT NULL,
                                              created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tokens_character_id ON refresh_tokens(character_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token        ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at   ON refresh_tokens(expires_at);