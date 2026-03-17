-- ─────────────────────────────────────────────────────────────────────────────
-- database-template/tecumah-schema.sql
-- Schéma SQLite pour le système Tecumah Gulch (D6 System + Wild Die)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table principale des personnages ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS characters (
                                          id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                          access_code     TEXT UNIQUE NOT NULL,
                                          access_url      TEXT UNIQUE NOT NULL,
                                          player_name     TEXT NOT NULL,
                                          nom             TEXT NOT NULL DEFAULT '',
                                          prenom          TEXT NOT NULL DEFAULT '',
                                          avatar          TEXT DEFAULT NULL,
                                          login_attempts  INTEGER DEFAULT 0,
                                          last_attempt_at DATETIME,
                                          last_accessed   DATETIME,
                                          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

                                          age             INTEGER DEFAULT NULL,
                                          taille          TEXT DEFAULT '',
                                          sexe            TEXT DEFAULT '',
                                          description     TEXT DEFAULT '',

    -- Attributs (pips : 1D=3 … 12D=36)
                                          agilite         INTEGER DEFAULT 6,
                                          vigueur         INTEGER DEFAULT 6,
                                          coordination    INTEGER DEFAULT 6,
                                          perception      INTEGER DEFAULT 6,
                                          charisme        INTEGER DEFAULT 6,
                                          savoir          INTEGER DEFAULT 6,

    -- Compétences Agilité
                                          comp_acrobatie      INTEGER DEFAULT 0,
                                          comp_armes_blanches INTEGER DEFAULT 0,
                                          comp_discretion     INTEGER DEFAULT 0,
                                          comp_esquive        INTEGER DEFAULT 0,
                                          comp_contorsion     INTEGER DEFAULT 0,
                                          comp_lutte          INTEGER DEFAULT 0,
                                          comp_equitation     INTEGER DEFAULT 0,
                                          comp_escalade       INTEGER DEFAULT 0,
                                          comp_saut           INTEGER DEFAULT 0,
                                          comp_lasso          INTEGER DEFAULT 0,
                                          comp_rodeo          INTEGER DEFAULT 0,

    -- Compétences Vigueur
                                          comp_course         INTEGER DEFAULT 0,
                                          comp_nage           INTEGER DEFAULT 0,
                                          comp_puissance      INTEGER DEFAULT 0,
                                          comp_endurance      INTEGER DEFAULT 0,

    -- Compétences Coordination
                                          comp_pistolet         INTEGER DEFAULT 0,
                                          comp_fusil            INTEGER DEFAULT 0,
                                          comp_arc              INTEGER DEFAULT 0,
                                          comp_artillerie       INTEGER DEFAULT 0,
                                          comp_prestidigitation INTEGER DEFAULT 0,
                                          comp_crochetage       INTEGER DEFAULT 0,
                                          comp_arme_de_jet      INTEGER DEFAULT 0,
                                          comp_lancer           INTEGER DEFAULT 0,
                                          comp_bricolage        INTEGER DEFAULT 0,

    -- Compétences Perception
                                          comp_recherche      INTEGER DEFAULT 0,
                                          comp_enquete        INTEGER DEFAULT 0,
                                          comp_intuition      INTEGER DEFAULT 0,
                                          comp_observation    INTEGER DEFAULT 0,
                                          comp_camouflage     INTEGER DEFAULT 0,
                                          comp_jeux           INTEGER DEFAULT 0,
                                          comp_survie         INTEGER DEFAULT 0,
                                          comp_chariots       INTEGER DEFAULT 0,
                                          comp_pister         INTEGER DEFAULT 0,

    -- Compétences Charisme
                                          comp_charme         INTEGER DEFAULT 0,
                                          comp_negocier       INTEGER DEFAULT 0,
                                          comp_commander      INTEGER DEFAULT 0,
                                          comp_escroquerie    INTEGER DEFAULT 0,
                                          comp_persuasion     INTEGER DEFAULT 0,
                                          comp_volonte        INTEGER DEFAULT 0,
                                          comp_dressage       INTEGER DEFAULT 0,
                                          comp_deguisement    INTEGER DEFAULT 0,
                                          comp_intimider      INTEGER DEFAULT 0,
                                          comp_comedie        INTEGER DEFAULT 0,

    -- Compétences Savoir
                                          comp_langues            INTEGER DEFAULT 0,
                                          comp_geographie         INTEGER DEFAULT 0,
                                          comp_evaluer            INTEGER DEFAULT 0,
                                          comp_medecine           INTEGER DEFAULT 0,
                                          comp_academique         INTEGER DEFAULT 0,
                                          comp_lois               INTEGER DEFAULT 0,
                                          comp_falsification      INTEGER DEFAULT 0,
                                          comp_ingenierie         INTEGER DEFAULT 0,
                                          comp_business           INTEGER DEFAULT 0,
                                          comp_botanique          INTEGER DEFAULT 0,
                                          comp_cultures_indiennes INTEGER DEFAULT 0,
                                          comp_demolition         INTEGER DEFAULT 0,

    -- Santé (0=Sain 1=Stunned 2=Wounded 3=Severely Wounded 4=Incapacitated 5=Mortal)
                                          blessure_niveau     INTEGER DEFAULT 0,

    -- Ressources
                                          points_destin       INTEGER DEFAULT 3,
                                          points_personnage   INTEGER DEFAULT 0
);

INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom, prenom)
VALUES (-1, 'GMCODE', 'this-is-MJ', 'Game Master', 'GM', '');

CREATE INDEX IF NOT EXISTS idx_characters_access_code ON characters(access_code);
CREATE INDEX IF NOT EXISTS idx_characters_access_url  ON characters(access_url);
CREATE INDEX IF NOT EXISTS idx_characters_updated_at  ON characters(updated_at DESC);

-- ── Backgrounds ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_backgrounds (
                                                     id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     character_id INTEGER NOT NULL,
                                                     type         TEXT NOT NULL,
                                                     niveau       INTEGER DEFAULT 1,
                                                     notes        TEXT DEFAULT '',
                                                     created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                     FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backgrounds_character_id ON character_backgrounds(character_id);

-- ── Items / Inventaire ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_items (
                                               id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER NOT NULL,
                                               name         TEXT NOT NULL DEFAULT '',
                                               description  TEXT DEFAULT '',
                                               category     TEXT DEFAULT 'misc',      -- 'weapon_ranged' | 'weapon_melee' | 'misc'
                                               quantity     INTEGER DEFAULT 1,
                                               location     TEXT DEFAULT 'inventory', -- 'inventory' | 'equipped'
                                               damage       INTEGER DEFAULT 0,
                                               range_short  INTEGER DEFAULT 0,
                                               range_medium INTEGER DEFAULT 0,
                                               range_long   INTEGER DEFAULT 0,
                                               skill_key    TEXT DEFAULT '',
                                               created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                               FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_character_id ON character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_items_location      ON character_items(location);

-- ── Ressources de session ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_resources (
                                                 id            INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 session_id    INTEGER NOT NULL UNIQUE,
                                                 complications INTEGER DEFAULT 0,
                                                 updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_resources_session_id ON session_resources(session_id);

-- ── Tables transversales ──────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_game_sessions_updated_at ON game_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_id ON game_sessions(id);

CREATE TABLE IF NOT EXISTS session_characters (
                                                  session_id   INTEGER NOT NULL,
                                                  character_id INTEGER NOT NULL,
                                                  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                  PRIMARY KEY (session_id, character_id),
                                                  FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE CASCADE,
                                                  FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_characters_session_id   ON session_characters(session_id);
CREATE INDEX IF NOT EXISTS idx_session_characters_character_id ON session_characters(character_id);

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

CREATE INDEX IF NOT EXISTS idx_dice_history_character_id ON dice_history(character_id);
CREATE INDEX IF NOT EXISTS idx_dice_history_session_id   ON dice_history(session_id);
CREATE INDEX IF NOT EXISTS idx_dice_history_created_at   ON dice_history(created_at DESC);

CREATE TABLE IF NOT EXISTS character_journal (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_id   INTEGER,
    title        TEXT DEFAULT '',
    content      TEXT DEFAULT '',
    is_public    INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_character_id ON character_journal(character_id);
CREATE INDEX IF NOT EXISTS idx_journal_session_id ON character_journal(session_id);
CREATE INDEX IF NOT EXISTS idx_journal_updated_at   ON character_journal(updated_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                              character_id INTEGER NOT NULL,
                                              token        TEXT UNIQUE NOT NULL,
                                              expires_at   DATETIME NOT NULL,
                                              created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token        ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_character_id ON refresh_tokens(character_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at   ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS npc_templates (
                                             id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                             name         TEXT NOT NULL,
                                             combat_stats TEXT DEFAULT '{}',
                                             created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);