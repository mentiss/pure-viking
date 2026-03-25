-- database-template/migrations/17032026_add_npc_sets.sql
-- Ajout des tables npc_sets et npc_set_entries.
-- Un set est une collection nommée de templates NPC, liée optionnellement à une session.
-- Utilisé par l'onglet TabNPC (interface GM générique).
--
-- Usage : npm run migrate 17032026_add_npc_sets.sql

-- ── Sets de PNJ ───────────────────────────────────────────────────────────────
-- session_id nullable : NULL = set libre (sans session, réutilisable comme base de copie)
CREATE TABLE IF NOT EXISTS npc_sets (
                                        id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                        session_id  INTEGER  REFERENCES game_sessions(id) ON DELETE SET NULL,
                                        name        TEXT     NOT NULL,
                                        description TEXT,
                                        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                                        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_npc_sets_session ON npc_sets(session_id);

-- ── Entrées d'un set ──────────────────────────────────────────────────────────
-- Chaque entrée référence un template existant avec une quantité.
-- ON DELETE CASCADE : si le set est supprimé, ses entrées le sont aussi.
-- ON DELETE CASCADE côté template : si le template est supprimé, l'entrée est retirée du set.
CREATE TABLE IF NOT EXISTS npc_set_entries (
                                               id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                               set_id      INTEGER  NOT NULL REFERENCES npc_sets(id)      ON DELETE CASCADE,
                                               template_id INTEGER  NOT NULL REFERENCES npc_templates(id) ON DELETE CASCADE,
                                               quantity    INTEGER  NOT NULL DEFAULT 1 CHECK (quantity >= 1)
);

CREATE INDEX IF NOT EXISTS idx_npc_set_entries_set      ON npc_set_entries(set_id);
CREATE INDEX IF NOT EXISTS idx_npc_set_entries_template ON npc_set_entries(template_id);