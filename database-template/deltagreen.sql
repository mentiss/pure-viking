-- ═════════════════════════════════════════════════════════════════════════════
-- database-template/deltagreen-schema.sql
-- Schéma Delta Green — Mentiss VTT
--
-- IMPORTANT : ce fichier étend base.sql.
-- Les tables partagées (game_sessions, session_characters, dice_history,
-- character_journal, refresh_tokens) sont définies dans base.sql et ne sont
-- PAS redéfinies ici.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Table principale ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS characters (

    -- Colonnes plateforme (issues de base.sql — à ne pas modifier)
                                          id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
                                          access_code          TEXT     NOT NULL UNIQUE,
                                          access_url           TEXT     NOT NULL UNIQUE,
                                          player_name          TEXT     NOT NULL,
                                          avatar               TEXT,
                                          nom                  TEXT     NOT NULL DEFAULT '',
                                          prenom               TEXT,
                                          sexe                 TEXT,
                                          age                  INTEGER,
                                          login_attempts       INTEGER  DEFAULT 0,
                                          last_attempt_at      DATETIME,
                                          last_accessed        DATETIME,
                                          created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Identité Delta Green
                                          alias                TEXT     NOT NULL DEFAULT '',
                                          profession           TEXT     NOT NULL DEFAULT '',
                                          employer             TEXT     NOT NULL DEFAULT '',
                                          nationality          TEXT     NOT NULL DEFAULT '',
                                          birth_date           TEXT     NOT NULL DEFAULT '',
                                          education            TEXT     NOT NULL DEFAULT '',
                                          physical_description TEXT     NOT NULL DEFAULT '',

    -- Caractéristiques brutes (×5 calculé côté client)
                                          str                  INTEGER  NOT NULL DEFAULT 10,
                                          con                  INTEGER  NOT NULL DEFAULT 10,
                                          dex                  INTEGER  NOT NULL DEFAULT 10,
                                          int                  INTEGER  NOT NULL DEFAULT 10,
                                          pow                  INTEGER  NOT NULL DEFAULT 10,
                                          cha                  INTEGER  NOT NULL DEFAULT 10,

    -- Attributs dérivés (stockés — évoluent en jeu)
    -- hp_max  = ceil((str + con) / 2) au départ, peut diverger ensuite
    -- wp_max  = pow au départ, peut diverger ensuite
    -- san_max = piloté manuellement par le GM / joueur (99 - inconcevable au départ)
    -- sr      = san_current - pow, recalculé à chaque changement de SAN
                                          hp_max               INTEGER  NOT NULL DEFAULT 10,
                                          hp_current           INTEGER  NOT NULL DEFAULT 10,
                                          wp_max               INTEGER  NOT NULL DEFAULT 10,
                                          wp_current           INTEGER  NOT NULL DEFAULT 10,
                                          san_max              INTEGER  NOT NULL DEFAULT 50,
                                          san_current          INTEGER  NOT NULL DEFAULT 50,
                                          sr                   INTEGER  NOT NULL DEFAULT 40,

    -- Accoutumance
                                          adapted_violence     INTEGER  NOT NULL DEFAULT 0,
                                          adapted_helplessness INTEGER  NOT NULL DEFAULT 0,

    -- Contrôles GM (opaques aux joueurs côté API)
                                          degradation_palier   INTEGER  NOT NULL DEFAULT 0,  -- 0 = Stable … 4 = Perdu
                                          tags                 TEXT     NOT NULL DEFAULT '[]', -- JSON : Tag[]

    -- Santé physique
                                          first_aid_applied    INTEGER  NOT NULL DEFAULT 0,
                                          injuries             TEXT     NOT NULL DEFAULT '',  -- TipTap HTML

    -- Remarques (TipTap HTML)
                                          personal_notes       TEXT     NOT NULL DEFAULT '',
                                          family_developments  TEXT     NOT NULL DEFAULT '',

    -- Données structurées JSON
    -- special_training : [{intitule: string, carac_ou_competence: string}]
                                          special_training     TEXT     NOT NULL DEFAULT '[]',
    -- distinctive_traits : {str: string, con: string, dex: string, int: string, pow: string, cha: string}
                                          distinctive_traits   TEXT     NOT NULL DEFAULT '{}',

    -- Administration de la fiche
                                          officer_responsible  TEXT     NOT NULL DEFAULT '',
                                          agent_signature      TEXT     NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_dg_characters_access_code
    ON characters (access_code);
CREATE INDEX IF NOT EXISTS idx_dg_characters_access_url
    ON characters (access_url);
CREATE INDEX IF NOT EXISTS idx_dg_characters_updated_at
    ON characters (updated_at DESC);

-- ── Attaches (Bonds) ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_bonds (
                                               id           INTEGER  PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER  NOT NULL,
                                               name         TEXT     NOT NULL DEFAULT '',
                                               score        INTEGER  NOT NULL DEFAULT 0,
                                               is_damaged   INTEGER  NOT NULL DEFAULT 0,
                                               position     INTEGER  NOT NULL DEFAULT 0,
                                               created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                               FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dg_bonds_character_id
    ON character_bonds (character_id);

-- ── Motivations & Troubles psychiques ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_motivations (
                                                     id           INTEGER  PRIMARY KEY AUTOINCREMENT,
                                                     character_id INTEGER  NOT NULL,
                                                     text         TEXT     NOT NULL DEFAULT '',
                                                     type         TEXT     NOT NULL DEFAULT 'motivation', -- 'motivation' | 'trouble'
                                                     position     INTEGER  NOT NULL DEFAULT 0,
                                                     created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                     FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dg_motivations_character_id
    ON character_motivations (character_id);

-- ── Compétences ──────────────────────────────────────────────────────────────
--
-- Une ligne par entrée de compétence.
-- specialty = NULL  → compétence de base (ex: Art à 0%)
-- specialty = 'Photographie' → spécialité (ex: Art : Photographie à 40%)
-- Les deux peuvent coexister pour la même skill_key.
--
-- Contrainte d'unicité : (character_id, skill_key, specialty)
-- COALESCE(specialty, '') permet d'inclure le cas NULL dans l'index unique.

CREATE TABLE IF NOT EXISTS character_skills (
                                                id           INTEGER  PRIMARY KEY AUTOINCREMENT,
                                                character_id INTEGER  NOT NULL,
                                                skill_key    TEXT     NOT NULL, -- clé EN : 'artisanat', 'science', 'pilotage'…
                                                specialty    TEXT,              -- NULL = base ; 'Microélectronique' = spécialité nommée
                                                score        INTEGER  NOT NULL DEFAULT 0,
                                                failed_check INTEGER  NOT NULL DEFAULT 0,
                                                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dg_skills_unique
    ON character_skills (character_id, skill_key, COALESCE(specialty, ''));

CREATE INDEX IF NOT EXISTS idx_dg_skills_character_id
    ON character_skills (character_id);

-- ── Langues étrangères ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_languages (
                                                   id           INTEGER  PRIMARY KEY AUTOINCREMENT,
                                                   character_id INTEGER  NOT NULL,
                                                   name         TEXT     NOT NULL DEFAULT '',
                                                   score        INTEGER  NOT NULL DEFAULT 0,
                                                   failed_check INTEGER  NOT NULL DEFAULT 0,
                                                   created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dg_languages_character_id
    ON character_languages (character_id);

-- ── Log de perte de SAN (Section 13) ─────────────────────────────────────────
--
-- loss_success / loss_failure : notations texte ('0', '1', '1D4', '1D6'…)
-- loss_applied : valeur entière réellement déduite de san_current
-- san_before / san_after : snapshot pour l'historique

CREATE TABLE IF NOT EXISTS character_san_log (
                                                 id              INTEGER  PRIMARY KEY AUTOINCREMENT,
                                                 character_id    INTEGER  NOT NULL,
                                                 session_id      INTEGER,
                                                 situation_label TEXT     NOT NULL DEFAULT '',
                                                 loss_success    TEXT     NOT NULL DEFAULT '0',
                                                 loss_failure    TEXT     NOT NULL DEFAULT '1',
                                                 loss_applied    INTEGER  NOT NULL DEFAULT 0,
                                                 san_before      INTEGER  NOT NULL DEFAULT 0,
                                                 san_after       INTEGER  NOT NULL DEFAULT 0,
                                                 notes           TEXT     NOT NULL DEFAULT '',
                                                 created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                                                 FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dg_san_log_character_id
    ON character_san_log (character_id);

-- ── Équipement du personnage ──────────────────────────────────────────────────
--
-- Colonnes fixes : socle commun à tout item.
-- json_details   : propriétés variables selon la catégorie.
--
-- Exemples de json_details par catégorie :
--   arme à feu   : { skill_key, skill_score, base_range, damage, armor_piercing, lethality, kill_radius, ammo }
--   mêlée        : { skill_key, skill_score, damage, armor_piercing }
--   armure       : { armor_rating }
--   matériel     : { uses }
--
-- slot 'a'→'g' = arme active (Section 16) ; NULL = inventaire libre (Section 15)

CREATE TABLE IF NOT EXISTS character_equipment (
                                                   id               INTEGER  PRIMARY KEY AUTOINCREMENT,
                                                   character_id     INTEGER  NOT NULL,
                                                   name             TEXT     NOT NULL DEFAULT '',
                                                   category         TEXT     NOT NULL DEFAULT '',
                                                   expense          TEXT     NOT NULL DEFAULT 'Standard',
    -- 'Incidental' | 'Standard' | 'Unusual' | 'Major' | 'Extreme'
                                                   is_restricted    INTEGER  NOT NULL DEFAULT 0,
                                                   restriction_note TEXT     NOT NULL DEFAULT '',
                                                   slot             TEXT,    -- 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | NULL
                                                   quantity         INTEGER  NOT NULL DEFAULT 1,
                                                   notes            TEXT     NOT NULL DEFAULT '',
                                                   json_details     TEXT     NOT NULL DEFAULT '{}',
                                                   created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dg_equipment_character_id
    ON character_equipment (character_id);



create table game_sessions
(
    id          INTEGER
        primary key autoincrement,
    name        TEXT not null,
    access_code TEXT not null
        unique,
    access_url  TEXT not null
        unique,
    date        DATETIME default CURRENT_TIMESTAMP,
    notes       TEXT,
    created_at  DATETIME default CURRENT_TIMESTAMP,
    updated_at  DATETIME default CURRENT_TIMESTAMP
);

create index idx_game_sessions_id
    on game_sessions (id);

create index idx_game_sessions_updated_at
    on game_sessions (updated_at desc);

create table refresh_tokens
(
    id           INTEGER
        primary key autoincrement,
    character_id INTEGER  not null
        references characters
            on delete cascade,
    token        TEXT     not null
        unique,
    expires_at   DATETIME not null,
    created_at   DATETIME default CURRENT_TIMESTAMP
);

create index idx_refresh_tokens_character_id
    on refresh_tokens (character_id);

create index idx_refresh_tokens_expires_at
    on refresh_tokens (expires_at);

create index idx_refresh_tokens_token
    on refresh_tokens (token);

create table dice_history
(
    id              INTEGER
        primary key autoincrement,
    character_id    INTEGER
        references characters
            on delete cascade,
    session_id      INTEGER
        references game_sessions
            on delete set null,
    notation        TEXT,
    roll_definition TEXT,
    roll_result     TEXT,
    roll_type       TEXT,
    roll_target     TEXT,
    pool            INTEGER,
    threshold       INTEGER,
    results         TEXT,
    successes       INTEGER,
    saga_spent      INTEGER  default 0,
    saga_recovered  INTEGER  default 0,
    created_at      DATETIME default CURRENT_TIMESTAMP
);

create index idx_dice_history_character_id
    on dice_history (character_id);

create index idx_dice_history_created_at
    on dice_history (created_at desc);

create index idx_dice_history_session_id
    on dice_history (session_id);

create table character_journal
(
    id           INTEGER
        primary key autoincrement,
    character_id INTEGER                 not null
        references characters
            on delete cascade,
    session_id   INTEGER
                                         references game_sessions
                                             on delete set null,
    type         TEXT     default 'note' not null,
    title        TEXT,
    body         TEXT,
    metadata     TEXT,
    is_read      BOOLEAN  default 0,
    created_at   DATETIME default CURRENT_TIMESTAMP,
    updated_at   DATETIME default CURRENT_TIMESTAMP
);

create index idx_journal_character_id
    on character_journal (character_id);

create index idx_journal_session_id
    on character_journal (session_id);

create index idx_journal_updated_at
    on character_journal (updated_at desc);

create table session_characters
(
    session_id   INTEGER not null
        references game_sessions
            on delete cascade,
    character_id INTEGER not null
        references characters
            on delete cascade,
    joined_at    DATETIME default CURRENT_TIMESTAMP,
    primary key (session_id, character_id)
);

create index idx_session_characters_character_id
    on session_characters (character_id);

create index idx_session_characters_session_id
    on session_characters (session_id);

