DROP TABLE character_journal;

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

CREATE INDEX IF NOT EXISTS idx_journal_character_id ON character_journal(character_id);
CREATE INDEX IF NOT EXISTS idx_journal_session_id ON character_journal(session_id);
CREATE INDEX IF NOT EXISTS idx_journal_updated_at   ON character_journal(updated_at DESC);
