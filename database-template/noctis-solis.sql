-- ============================================================
-- NOCTIS SOLIS — Schéma de base de données
-- ============================================================

-- ── Personnages ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS characters (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Auth
    access_code     TEXT UNIQUE NOT NULL,
    access_url      TEXT UNIQUE NOT NULL,
    player_name     TEXT NOT NULL,
    login_attempts  INTEGER  DEFAULT 0,
    last_attempt_at DATETIME,
    last_accessed   DATETIME,

    -- Identité
    nom             TEXT NOT NULL DEFAULT '',
    prenom          TEXT NOT NULL DEFAULT '',
    avatar          TEXT DEFAULT NULL,
    sexe            TEXT CHECK(sexe IN ('homme', 'femme', 'autre')) DEFAULT NULL,
    age             INTEGER DEFAULT NULL,
    taille          INTEGER DEFAULT NULL,
    poids           INTEGER DEFAULT NULL,
    activite        TEXT DEFAULT '',

    -- Caractéristiques — Physique (1-5)
    force           INTEGER DEFAULT 1,
    sante           INTEGER DEFAULT 1,
    athletisme      INTEGER DEFAULT 1,

    -- Caractéristiques — Technique (1-5)
    agilite         INTEGER DEFAULT 1,
    precision       INTEGER DEFAULT 1,
    technique       INTEGER DEFAULT 1,

    -- Caractéristiques — Mental (1-5)
    connaissance    INTEGER DEFAULT 1,
    perception      INTEGER DEFAULT 1,
    volonte         INTEGER DEFAULT 1,

    -- Caractéristiques — Social (1-5)
    persuasion      INTEGER DEFAULT 1,
    psychologie     INTEGER DEFAULT 1,
    entregent       INTEGER DEFAULT 1,

    -- Réserves (max stocké pour gérer les sacrifices groupe)
    reserve_effort_max        INTEGER DEFAULT 0,
    reserve_effort_current    INTEGER DEFAULT 0,
    reserve_sangfroid_max     INTEGER DEFAULT 0,
    reserve_sangfroid_current INTEGER DEFAULT 0,

    -- Santé (max éditable par MJ pour Fracturés / créatures)
    sante_touche_max      INTEGER DEFAULT 4,
    sante_touche_current  INTEGER DEFAULT 0,
    sante_blesse_max      INTEGER DEFAULT 2,
    sante_blesse_current  INTEGER DEFAULT 0,
    sante_tue_max         INTEGER DEFAULT 1,
    sante_tue_current     INTEGER DEFAULT 0,

    -- Éclats
    eclats_max      INTEGER DEFAULT 1,
    eclats_current  INTEGER DEFAULT 1,

    -- Fracturé
    is_fracture     INTEGER DEFAULT 0,

    -- XP
    xp_total        INTEGER DEFAULT 0,
    xp_spent        INTEGER DEFAULT 0,

    -- Notes libres
    notes           TEXT DEFAULT '',

    -- Pognon
    selvarins_current       INTEGER DEFAULT 0,
    selvarins_month         INTEGER DEFAULT 0,

    -- Audit
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom, prenom)
VALUES (-1, 'GMCODE', 'this-is-MJ', 'Game Master', 'GM', '');

CREATE INDEX IF NOT EXISTS idx_characters_access_code ON characters(access_code);
CREATE INDEX IF NOT EXISTS idx_characters_access_url  ON characters(access_url);
CREATE INDEX IF NOT EXISTS idx_characters_updated_at  ON characters(updated_at DESC);

-- ── Spécialités ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_specialties (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    name         TEXT NOT NULL DEFAULT '',
    type         TEXT NOT NULL DEFAULT 'normale'
        CHECK(type IN ('normale', 'complexe', 'rare', 'fracture')),
    niveau       TEXT NOT NULL DEFAULT 'debutant'
        CHECK(niveau IN ('debutant', 'confirme', 'expert')),
    notes        TEXT DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_specialties_character_id ON character_specialties(character_id);

-- ── Ombres ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_ombres (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    type         TEXT NOT NULL DEFAULT 'dette'
        CHECK(type IN ('dette', 'recherche', 'addiction', 'sequelle', 'traumatisme')),
    description  TEXT DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_ombres_character_id ON character_ombres(character_id);

-- ── Inventaire ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    name         TEXT NOT NULL DEFAULT '',
    description  TEXT DEFAULT '',
    category     TEXT DEFAULT 'misc'
        CHECK(category IN (
        'arme_cac', 'arme_feu', 'arme_etherum',
        'armure', 'equipement', 'medical', 'etherum', 'misc'
        )),
    quantity     INTEGER DEFAULT 1,
    location     TEXT DEFAULT 'inventory'
        CHECK(location IN ('inventory', 'equipped')),
    damage_value INTEGER DEFAULT 0,
    armor_value  TEXT    DEFAULT '',
    price        INTEGER DEFAULT 0,
    notes        TEXT    DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_items_character_id ON character_items(character_id);

-- ── Réserve de groupe (singleton) ────────────────────────────

CREATE TABLE IF NOT EXISTS group_reserve (
                                             id         INTEGER PRIMARY KEY CHECK(id = 1),
    current    INTEGER DEFAULT 0,
    cap        INTEGER DEFAULT 12,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO group_reserve (id, current, cap) VALUES (1, 0, 12);

-- ── Sessions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_sessions (
                                             id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                             name        TEXT NOT NULL,
                                             access_code TEXT NOT NULL UNIQUE,
                                             access_url  TEXT NOT NULL UNIQUE,
                                             date        DATETIME DEFAULT CURRENT_TIMESTAMP,
                                             notes       TEXT,
                                             created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                                             updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON game_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_access_url  ON game_sessions(access_url);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at  ON game_sessions(updated_at DESC);

CREATE TABLE IF NOT EXISTS session_characters (
                                                  session_id   INTEGER NOT NULL,
                                                  character_id INTEGER NOT NULL,
                                                  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                  PRIMARY KEY (session_id, character_id),
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE CASCADE
    );

-- ── Historique des dés ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dice_history (
                                            id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                            session_id      INTEGER REFERENCES game_sessions(id) ON DELETE SET NULL,
    character_id    INTEGER REFERENCES characters(id)    ON DELETE SET NULL,
    roll_type       TEXT     DEFAULT NULL,
    notation        TEXT NOT NULL,
    roll_result     TEXT     DEFAULT NULL,
    roll_definition TEXT     DEFAULT NULL,
    roll_target     TEXT     DEFAULT NULL,
    pool            INTEGER  DEFAULT NULL,
    threshold       INTEGER  DEFAULT NULL,
    results         TEXT     DEFAULT NULL,
    successes       INTEGER  DEFAULT NULL,
    saga_spent      INTEGER  DEFAULT 0,
    saga_recovered  INTEGER  DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_dice_character_id ON dice_history(character_id);
CREATE INDEX IF NOT EXISTS idx_dice_session_id   ON dice_history(session_id);
CREATE INDEX IF NOT EXISTS idx_dice_created_at   ON dice_history(created_at DESC);

-- ── Journal personnage ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_journal (
                                                 id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 character_id INTEGER NOT NULL,
                                                 session_id   INTEGER,
                                                 type         TEXT NOT NULL DEFAULT 'note',
                                                 title        TEXT,
                                                 body         TEXT,
                                                 metadata     TEXT,
                                                 is_read      INTEGER  DEFAULT 0,
                                                 created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE CASCADE,
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE SET NULL
    );

CREATE INDEX IF NOT EXISTS idx_journal_character_id ON character_journal(character_id);

-- ── Refresh tokens ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                              character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    token        TEXT NOT NULL UNIQUE,
    expires_at   DATETIME NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_tokens_character_id ON refresh_tokens(character_id);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at   ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_tokens_token        ON refresh_tokens(token);