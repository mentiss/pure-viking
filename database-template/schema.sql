-- Pure Vikings Database Schema

-- ============================================
-- PERSONNAGES
-- ============================================


CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Accès
    access_code TEXT UNIQUE NOT NULL,  -- Code court (6 chars) pour accès rapide
    access_url TEXT UNIQUE NOT NULL,   -- URL unique pour partage
    
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
    
    -- Métadonnées
    login_attempts INTEGER DEFAULT 0,
    last_attempt_at DATETIME,
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
    specialization TEXT,  -- Ex: "Hache", "Latin", "Arc"
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
    
    -- Identification
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- weapon, armor, item
    quantity INTEGER DEFAULT 1,
    location TEXT DEFAULT 'bag', -- equipped, bag, stash
    notes TEXT,
    
    -- Stats armes
    weapon_type TEXT, -- "1 main", "2 mains", "Distance"
    damage INTEGER,
    range TEXT, -- "15m", "30m"
    
    -- Stats armure
    armor_value INTEGER DEFAULT 0,
    
    -- Pré-requis (JSON stringifié)
    requirements TEXT, -- {"force": 2, "agilite": 1}
    
    -- Type
    custom_item BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- ============================================
-- HISTORIQUE JETS DE DÉS
-- ============================================

CREATE TABLE IF NOT EXISTS dice_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_id INTEGER,
    roll_type TEXT NOT NULL, -- 'carac', 'skill', 'saga_heroic', 'saga_epic', 'saga_insurance'
    roll_target TEXT, -- Nom carac ou compétence
    pool INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    results TEXT NOT NULL, -- JSON array
    successes INTEGER NOT NULL,
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

-- Liaison personnages-sessions
CREATE TABLE IF NOT EXISTS session_characters (
    session_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, character_id),
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS character_journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_id INTEGER,

    -- Type d'entrée : 'note' (joueur), 'gm_message', 'gm_item', 'gm_image'
    type TEXT NOT NULL DEFAULT 'note',

    -- Contenu
    title TEXT,
    body TEXT,
    metadata TEXT,              -- JSON pour données spécifiques (item data, image url, etc.)

    -- Statut (utile pour messages GM)
    is_read BOOLEAN DEFAULT 0,

    -- Métadonnées
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL
    );

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_characters_access_code ON characters(access_code);
CREATE INDEX IF NOT EXISTS idx_characters_access_url ON characters(access_url);
CREATE INDEX IF NOT EXISTS idx_dice_character ON dice_history(character_id);
CREATE INDEX IF NOT EXISTS idx_dice_created ON dice_history(created_at);
CREATE INDEX IF NOT EXISTS idx_skills_character ON character_skills(character_id);
CREATE INDEX IF NOT EXISTS idx_traits_character ON character_traits(character_id);
CREATE INDEX IF NOT EXISTS idx_runes_character ON character_runes(character_id);
CREATE INDEX IF NOT EXISTS idx_items_character ON character_items(character_id);
CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON game_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_access_url ON game_sessions(access_url);
CREATE INDEX IF NOT EXISTS idx_journal_character ON character_journal(character_id);
CREATE INDEX IF NOT EXISTS idx_journal_session ON character_journal(session_id);
CREATE INDEX IF NOT EXISTS idx_journal_type ON character_journal(type);



