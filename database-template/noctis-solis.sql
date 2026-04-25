-- ============================================================
-- NOCTIS SOLIS — Schéma de base de données (v2 — refonte Phase 1)
-- ============================================================

-- ── Personnages ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS characters (
                                          id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Auth (plateforme)
                                          access_code     TEXT UNIQUE NOT NULL,
                                          access_url      TEXT UNIQUE NOT NULL,
                                          player_name     TEXT NOT NULL,
                                          login_attempts  INTEGER  DEFAULT 0,
                                          last_attempt_at DATETIME,
                                          last_accessed   DATETIME,

    -- Identité
                                          nom                 TEXT    NOT NULL DEFAULT '',
                                          prenom              TEXT    NOT NULL DEFAULT '',
                                          avatar              TEXT    DEFAULT NULL,
                                          sexe                TEXT    CHECK(sexe IN ('homme', 'femme', 'autre')) DEFAULT NULL,
    age                 INTEGER DEFAULT NULL,
    taille              INTEGER DEFAULT NULL,
    poids               INTEGER DEFAULT NULL,
    description_physique TEXT   DEFAULT '',
    activite            TEXT    DEFAULT '',
    faction             TEXT    DEFAULT '',
    annee_campagne      INTEGER DEFAULT 1881,

    -- Caractéristiques — Physique (1–5)
    force       INTEGER DEFAULT 1,
    sante       INTEGER DEFAULT 1,
    athletisme  INTEGER DEFAULT 1,

    -- Caractéristiques — Manuel (1–5)
    agilite     INTEGER DEFAULT 1,
    precision   INTEGER DEFAULT 1,
    technique   INTEGER DEFAULT 1,

    -- Caractéristiques — Mental (1–5)
    connaissance INTEGER DEFAULT 1,
    perception   INTEGER DEFAULT 1,
    volonte      INTEGER DEFAULT 1,

    -- Caractéristiques — Social (1–5)
    persuasion  INTEGER DEFAULT 1,
    psychologie INTEGER DEFAULT 1,
    entregent   INTEGER DEFAULT 1,

    -- Réserves (max = valeur stockée, décrémentée par sacrifice groupe)
    reserve_effort_max        INTEGER DEFAULT 0,
    reserve_effort_current    INTEGER DEFAULT 0,
    reserve_sangfroid_max     INTEGER DEFAULT 0,
    reserve_sangfroid_current INTEGER DEFAULT 0,

    -- Santé (max éditable par MJ pour Fracturés)
    sante_touche_max     INTEGER DEFAULT 4,
    sante_touche_current INTEGER DEFAULT 0,
    sante_blesse_max     INTEGER DEFAULT 2,
    sante_blesse_current INTEGER DEFAULT 0,
    sante_tue_max        INTEGER DEFAULT 1,
    sante_tue_current    INTEGER DEFAULT 0,

    -- Éclats & Ombres
    eclats_max     INTEGER DEFAULT 1,
    eclats_current INTEGER DEFAULT 1,

    -- Statut Fracturé (visible MJ uniquement tant que non activé)
    is_fracture INTEGER DEFAULT 0,

    -- XP
    xp_total INTEGER DEFAULT 0,
    xp_spent INTEGER DEFAULT 0,

    -- Selvarins
    selvarins_current INTEGER DEFAULT 0,
    selvarins_month   INTEGER DEFAULT 0,

    -- Notes libres
    notes TEXT DEFAULT '',

    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom, prenom)
VALUES (-1, 'GMCODE', 'this-is-MJ', 'Game Master', 'GM', '');

CREATE INDEX IF NOT EXISTS idx_characters_access_code ON characters(access_code);
CREATE INDEX IF NOT EXISTS idx_characters_access_url  ON characters(access_url);
CREATE INDEX IF NOT EXISTS idx_characters_updated_at  ON characters(updated_at DESC);

-- ── Spécialités ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_specialties (
                                                     id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     character_id INTEGER NOT NULL,
                                                     name         TEXT    NOT NULL DEFAULT '',
                                                     type         TEXT    NOT NULL DEFAULT 'normale'
                                                     CHECK(type IN ('normale', 'complexe', 'rare', 'fracture')),
    niveau       TEXT    NOT NULL DEFAULT 'debutant'
    CHECK(niveau IN ('debutant', 'confirme', 'expert')),
    is_dormant   INTEGER DEFAULT 0,  -- 1 = dormante (Fracture uniquement)
    notes        TEXT    DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_specialties_character_id ON character_specialties(character_id);

-- ── Ombres ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_ombres (
                                                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                character_id INTEGER NOT NULL,
                                                type         TEXT    NOT NULL DEFAULT 'dette'
                                                CHECK(type IN ('dette', 'recherche', 'addiction', 'sequelle', 'traumatisme')),
    description  TEXT    DEFAULT '',
    effect       TEXT    DEFAULT '',  -- pré-rempli selon le type, éditable par MJ
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_ombres_character_id ON character_ombres(character_id);

-- ── Inventaire ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_items (
                                               id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER NOT NULL,
                                               name         TEXT    NOT NULL DEFAULT '',
                                               description  TEXT    DEFAULT '',
                                               category     TEXT    DEFAULT 'misc'
                                               CHECK(category IN (
                                               'arme_cac', 'arme_feu', 'arme_etherum',
                                               'armure', 'equipement', 'medical', 'etherum', 'misc'
)),
    quantity     INTEGER DEFAULT 1,
    location     TEXT    DEFAULT 'inventory'
    CHECK(location IN ('inventory', 'equipped')),
    damage_value INTEGER DEFAULT 0,
    armor_value  TEXT    DEFAULT '',
    price        INTEGER DEFAULT 0,
    notes        TEXT    DEFAULT '',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_items_character_id ON character_items(character_id);

-- ── Fiche de groupe (par session) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_group_reserve (
                                                     id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     session_id  INTEGER NOT NULL UNIQUE
                                                     REFERENCES game_sessions(id) ON DELETE CASCADE,
    current     INTEGER DEFAULT 0,
    principes   TEXT    DEFAULT '[]',
    interdits   TEXT    DEFAULT '[]',
    regle_acces TEXT    DEFAULT 'libre'
    CHECK(regle_acces IN ('libre', 'majorite', 'unanimite')),
    notes       TEXT    DEFAULT '',
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_sgr_session_id ON session_group_reserve(session_id);

-- ── Tables plateforme (base.sql) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_sessions (
                                             id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                             name        TEXT    NOT NULL,
                                             access_code TEXT    NOT NULL UNIQUE,
                                             access_url  TEXT    NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                              character_id INTEGER  NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    token        TEXT     NOT NULL UNIQUE,
    expires_at   DATETIME NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS character_journal (
                                                 id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 character_id INTEGER  NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    session_id   INTEGER  REFERENCES game_sessions(id) ON DELETE SET NULL,
    type         TEXT     DEFAULT 'note' NOT NULL,
    title        TEXT,
    body         TEXT,
    metadata     TEXT,
    is_read      BOOLEAN  DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS dice_history (
                                            id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                            character_id    INTEGER REFERENCES characters(id)    ON DELETE SET NULL,
    session_id      INTEGER REFERENCES game_sessions(id) ON DELETE SET NULL,
    notation        TEXT,
    roll_definition TEXT,
    roll_result     TEXT,
    roll_type       TEXT,
    roll_target     TEXT,
    pool            INTEGER,
    threshold       INTEGER,
    results         TEXT,
    successes       INTEGER,
    saga_spent      INTEGER  DEFAULT 0,
    saga_recovered  INTEGER  DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );