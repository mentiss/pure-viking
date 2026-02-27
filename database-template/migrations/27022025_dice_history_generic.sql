-- ============================================================
-- Migration : 27022025_dice_history_generic.sql
-- Objectif  : Rendre dice_history agnostique au système de jeu.
-- Ajout de 3 colonnes génériques en complément des colonnes
-- Vikings existantes (conservées pour rétrocompatibilité).
-- ============================================================

-- Notation brute jouée (ex: "3d10!>=9>=7", "2d6+2", "1d%<=65")
ALTER TABLE dice_history ADD COLUMN notation TEXT;

-- Contexte complet du jet (JSON RollContext) — ce qui était demandé
ALTER TABLE dice_history ADD COLUMN roll_definition TEXT;

-- Résultat enrichi (JSON RollResult) — ce qui s'est passé
ALTER TABLE dice_history ADD COLUMN roll_result TEXT;