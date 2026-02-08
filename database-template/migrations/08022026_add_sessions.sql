-- Migration 002: Ajouter session_id à dice_history + avatar aux personnages

-- 1. Ajouter colonne session_id à dice_history
ALTER TABLE dice_history ADD COLUMN session_id INTEGER REFERENCES game_sessions(id) ON DELETE SET NULL;

-- 2. Ajouter colonne avatar aux personnages (base64)
ALTER TABLE characters ADD COLUMN avatar TEXT;

-- 3. Créer index pour performance
CREATE INDEX IF NOT EXISTS idx_dice_history_session ON dice_history(session_id);