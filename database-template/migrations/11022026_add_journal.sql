-- Migration: Ajouter table character_journal (notes joueur + messages GM)

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

CREATE INDEX IF NOT EXISTS idx_journal_character ON character_journal(character_id);
CREATE INDEX IF NOT EXISTS idx_journal_session ON character_journal(session_id);
CREATE INDEX IF NOT EXISTS idx_journal_type ON character_journal(type);