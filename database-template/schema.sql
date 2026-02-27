-- Pure Vikings Database Schema
-- (Utilisé aussi comme base pour tous les systèmes multi-JDR)

-- ============================================
-- PERSONNAGES
-- ============================================

CREATE TABLE IF NOT EXISTS characters (
                                          id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Accès
                                          access_code TEXT UNIQUE NOT NULL,
                                          access_url TEXT UNIQUE NOT NULL,

    -- Info de base
                                          player_name TEXT NOT NULL,
                                          prenom TEXT NOT NULL,
                                          surnom TEXT,
                                          nom_parent TEXT,
                                          sexe TEXT CHECK(sexe IN ('homme', 'femme')),
                                          age INTEGER,
                                          taille INTEGER,
                                          poids INTEGER,
                                          activite TEXT,
                                          avatar TEXT,

    -- Caractéristiques (1-5)
                                          force INTEGER DEFAULT 2,
                                          agilite INTEGER DEFAULT 2,
                                          perception INTEGER DEFAULT 2,
                                          intelligence INTEGER DEFAULT 2,
                                          charisme INTEGER DEFAULT 2,
                                          chance INTEGER DEFAULT 2,

    -- Combat
                                          armure INTEGER DEFAULT 0,
                                          actions_disponibles INTEGER DEFAULT 1,
                                          seuil_combat INTEGER DEFAULT 1,

    -- SAGA
                                          saga_actuelle INTEGER DEFAULT 3,
                                          saga_totale INTEGER DEFAULT 3,

    -- État
                                          tokens_blessure INTEGER DEFAULT 0,
                                          tokens_fatigue INTEGER DEFAULT 0,

    -- Authentification
                                          login_attempts INTEGER DEFAULT 0,
                                          last_attempt_at DATETIME,

    -- Métadonnées
                                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMPÉTENCES
-- ============================================

CREATE TABLE IF NOT EXISTS character_skills (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                character_id INTEGER NOT NULL,
                                                skill_name TEXT NOT NULL,
                                                specialization TEXT,
                                                level INTEGER DEFAULT 0,
                                                current_points INTEGER DEFAULT 0,
                                                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                                                UNIQUE(character_id, skill_name, specialization)
);

-- ============================================
-- TRAITS & BACKGROUNDS
-- ============================================

CREATE TABLE IF NOT EXISTS character_traits (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                character_id INTEGER NOT NULL,
                                                trait_name TEXT NOT NULL,
                                                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                                                UNIQUE(character_id, trait_name)
);

-- ============================================
-- RUNES
-- ============================================

CREATE TABLE IF NOT EXISTS character_runes (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER NOT NULL,
                                               rune_name TEXT NOT NULL,
                                               level INTEGER DEFAULT 1,
                                               FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                                               UNIQUE(character_id, rune_name)
);

-- ============================================
-- INVENTAIRE / ÉQUIPEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS character_items (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER NOT NULL,

                                               name TEXT NOT NULL,
                                               category TEXT NOT NULL,         -- weapon, armor, item
                                               quantity INTEGER DEFAULT 1,
                                               location TEXT DEFAULT 'bag',    -- equipped, bag, stash
                                               notes TEXT,

                                               weapon_type TEXT,               -- "1 main", "2 mains", "Distance"
                                               damage INTEGER,
                                               range TEXT,

                                               armor_value INTEGER DEFAULT 0,
                                               requirements TEXT,              -- JSON : {"force": 2, "agilite": 1}
                                               custom_item BOOLEAN DEFAULT 0,

                                               FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- ============================================
-- HISTORIQUE JETS DE DÉS
-- Colonnes Vikings (pool, threshold, successes...) conservées.
-- Colonnes génériques (notation, roll_definition, roll_result)
-- utilisées par tous les systèmes présents et futurs.
-- ============================================

CREATE TABLE IF NOT EXISTS dice_history (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            character_id INTEGER,
                                            session_id INTEGER,

    -- ── Colonnes génériques (tous systèmes) ─────────────────────────────
    -- Notation rpg-dice-roller jouée ex: "3d10!>=9>=7", "2d6+2", "1d%<=65"
                                            notation TEXT,
    -- Contexte complet du jet (JSON RollContext) — ce qui était demandé
                                            roll_definition TEXT,
    -- Résultat enrichi (JSON RollResult) — ce qui s'est passé
                                            roll_result TEXT,

    -- ── Colonnes legacy Vikings (conservées pour rétrocompatibilité) ────
                                            roll_type TEXT,                 -- 'carac', 'skill', 'saga_heroic', etc.
                                            roll_target TEXT,               -- Nom carac ou compétence
                                            pool INTEGER,
                                            threshold INTEGER,
                                            results TEXT,                   -- JSON array des résultats bruts
                                            successes INTEGER,
                                            saga_spent INTEGER DEFAULT 0,
                                            saga_recovered INTEGER DEFAULT 0,

                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                                            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                                            FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL
);

-- ============================================
-- SESSIONS DE JEU
-- ============================================

CREATE TABLE IF NOT EXISTS game_sessions (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             name TEXT NOT NULL,
                                             access_code TEXT UNIQUE NOT NULL,
                                             access_url TEXT UNIQUE NOT NULL,
                                             date DATETIME DEFAULT CURRENT_TIMESTAMP,
                                             notes TEXT,
                                             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_characters (
                                                  session_id INTEGER NOT NULL,
                                                  character_id INTEGER NOT NULL,
                                                  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                  PRIMARY KEY (session_id, character_id),
                                                  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
                                                  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- ============================================
-- JOURNAL PERSONNAGE
-- ============================================

CREATE TABLE IF NOT EXISTS character_journal (
                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 character_id INTEGER NOT NULL,
                                                 session_id INTEGER,
                                                 type TEXT NOT NULL DEFAULT 'note',  -- 'note', 'gm_message', 'gm_item', 'gm_image'
                                                 title TEXT,
                                                 body TEXT,
                                                 metadata TEXT,
                                                 is_read BOOLEAN DEFAULT 0,
                                                 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                                                 FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL
);

-- ============================================
-- TOKENS REFRESH AUTH
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                                              character_id INTEGER NOT NULL,
                                              token TEXT UNIQUE NOT NULL,
                                              expires_at DATETIME NOT NULL,
                                              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_characters_access_code ON characters(access_code);
CREATE INDEX IF NOT EXISTS idx_characters_access_url  ON characters(access_url);
CREATE INDEX IF NOT EXISTS idx_dice_character         ON dice_history(character_id);
CREATE INDEX IF NOT EXISTS idx_dice_created           ON dice_history(created_at);
CREATE INDEX IF NOT EXISTS idx_dice_history_session   ON dice_history(session_id);
CREATE INDEX IF NOT EXISTS idx_skills_character       ON character_skills(character_id);
CREATE INDEX IF NOT EXISTS idx_traits_character       ON character_traits(character_id);
CREATE INDEX IF NOT EXISTS idx_runes_character        ON character_runes(character_id);
CREATE INDEX IF NOT EXISTS idx_items_character        ON character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_sessions_access_code   ON game_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_access_url    ON game_sessions(access_url);
CREATE INDEX IF NOT EXISTS idx_journal_character      ON character_journal(character_id);
CREATE INDEX IF NOT EXISTS idx_journal_session        ON character_journal(session_id);
CREATE INDEX IF NOT EXISTS idx_journal_type           ON character_journal(type);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_character ON refresh_tokens(character_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);