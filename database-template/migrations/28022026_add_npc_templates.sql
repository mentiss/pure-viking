-- database-template/migrations/28022026_add_npc_templates.sql
-- Ajout de la table npc_templates pour stocker les templates PNJ par système.
-- Un template PNJ est une entrée réutilisable dans les combats.
-- Les instances PNJ restent volatiles (en mémoire pendant le combat).
--
-- Usage : npm run migrate 28022026_add_npc_templates.sql
-- (s'applique à tous les systèmes qui utilisent ce schéma)

CREATE TABLE IF NOT EXISTS npc_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    -- JSON : stats de combat { blessureMax, armure, seuil, actionsMax, attaques: [...] }
    -- Structure définie par chaque système, opaque pour la route générique
    combat_stats TEXT NOT NULL DEFAULT '{}',
    -- JSON : données additionnelles spécifiques au système
    system_data  TEXT DEFAULT '{}',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour la recherche par nom
CREATE INDEX IF NOT EXISTS idx_npc_templates_name ON npc_templates(name);

-- Templates de base pour Pure Vikings
-- (ignorés si la table n'est pas vide)
