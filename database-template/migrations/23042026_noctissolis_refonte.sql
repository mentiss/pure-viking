-- Migration Noctis Solis — Refonte Phase 1
-- npm run migrate 23042026_noctissolis_refonte.sql

-- ── 1. Identité personnage ─────────────────────────────────────────────────────
ALTER TABLE characters ADD COLUMN description_physique TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN faction              TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN annee_campagne       INTEGER DEFAULT 1881;

-- ── 2. Spécialités — état dormant (Fracture) ──────────────────────────────────
ALTER TABLE character_specialties ADD COLUMN is_dormant INTEGER DEFAULT 0;

-- ── 3. Ombres — effet mécanique ───────────────────────────────────────────────
ALTER TABLE character_ombres ADD COLUMN effect TEXT DEFAULT '';

-- ── 4. Fiche de groupe liée à une session ─────────────────────────────────────
-- Remplace le singleton group_reserve (id = 1) par une table sessionnée.
-- L'ancienne table est conservée pour compatibilité descendante mais n'est plus utilisée.
CREATE TABLE IF NOT EXISTS session_group_reserve (
                                                     id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     session_id  INTEGER NOT NULL UNIQUE
                                                         REFERENCES game_sessions(id) ON DELETE CASCADE,
                                                     current     INTEGER DEFAULT 0,
                                                     principes   TEXT    DEFAULT '[]',  -- JSON array de strings
                                                     interdits   TEXT    DEFAULT '[]',  -- JSON array de strings
                                                     regle_acces TEXT    DEFAULT 'libre'
                                                         CHECK(regle_acces IN ('libre', 'majorite', 'unanimite')),
                                                     notes       TEXT    DEFAULT '',
                                                     updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sgr_session_id ON session_group_reserve(session_id);