-- ============================================================
-- Migration : 02042026_insert_loose_ends_session.sql
-- Cible     : cyberpunk.db uniquement
-- Objectif  : Créer la session "Loose Ends" avec ses threats et clocks.
-- Usage     : npm run migrate 02042026_insert_loose_ends_session.sql
-- ============================================================

-- ── Session ───────────────────────────────────────────────────────────────────

INSERT INTO game_sessions (name, access_code, access_url)
VALUES ('Loose Ends', 'SES666', 'loose-ends-4782');

-- ── Threats ───────────────────────────────────────────────────────────────────

INSERT INTO threats (session_id, name, type, impulse, moves_json, icon, status)
VALUES (
           (SELECT id FROM game_sessions WHERE access_code = 'SES666'),
           'Petrochem Security',
           'Corporation',
           'Identifier et neutraliser la fuite interne avant qu''elle disparaisse',
           '["Surveiller l''appartement et les accès réseau de Vera","Interroger et retenir les contacts de Reeve","Identifier l''équipe d''exfil et remonter la chaîne","Envoyer une équipe armée au point de transfert"]',
           'data:image/png;base64,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',
           'active'
       );

INSERT INTO threats (session_id, name, type, impulse, moves_json, icon, status)
VALUES (
           (SELECT id FROM game_sessions WHERE access_code = 'SES666'),
           'Biotechnica',
           'Corporation',
           'Récupérer Vera et effacer toutes les traces de l''opération',
           '["Dépêcher Jin Sorel au point de transfert","Tenter d''éliminer les PJs et Vera simultanément","Effacer les données compromettantes dans les systèmes Petrochem","Nier toute implication si l''affaire devient publique"]',
           'data:image/png;base64,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',
           'active'
       );

INSERT INTO threats (session_id, name, type, impulse, moves_json, icon, status)
VALUES (
           (SELECT id FROM game_sessions WHERE access_code = 'SES666'),
           'Jin Sorel',
           'Individu',
           'Rester dans l''ombre et protéger son opération à tout prix',
           '["Surveiller les mouvements de Vera depuis l''intérieur de Petrochem","Accélérer le calendrier si sa couverture est menacée","Éliminer personnellement les témoins trop proches de la vérité","Fuir et effacer son identité si découvert"]',
           '🕵',
           'active'
       );

INSERT INTO threats (session_id, name, type, impulse, moves_json, icon, status)
VALUES (
           (SELECT id FROM game_sessions WHERE access_code = 'SES666'),
           'Reeve',
           'Individu',
           'Survivre et protéger ce qu''il sait encore',
           '["Parler sous la pression de Petrochem","Contacter les PJs depuis une planque si encore en vie","Disparaître définitivement si la situation devient incontrôlable"]',
           '🤝',
           'active'
       );

-- ── Clocks ────────────────────────────────────────────────────────────────────

INSERT INTO clocks (session_id, name, segments, current, consequence, icon)
VALUES (
           (SELECT id FROM game_sessions WHERE access_code = 'SES666'),
           'Investigation Petrochem',
           6, 0,
           'Petrochem identifie Vera comme la fuite et lance une équipe d''extraction immédiate',
           '⏱'
       );

INSERT INTO clocks (session_id, name, segments, current, consequence, icon)
VALUES (
           (SELECT id FROM game_sessions WHERE access_code = 'SES666'),
           'Fenêtre d''extraction',
           8, 0,
           'Biotechnica envoie sa propre équipe récupérer Vera — les PJs deviennent obsolètes',
           '⏱'
       );

INSERT INTO clocks (session_id, name, segments, current, consequence, icon)
VALUES (
           (SELECT id FROM game_sessions WHERE access_code = 'SES666'),
           'Découverte de Jin',
           10, 0,
           'Petrochem remonte jusqu''à Jin Sorel — tout s''emballe, Biotechnica passe en mode urgence',
           '⏱'
       );

-- ── Liens Clock ↔ Threats ─────────────────────────────────────────────────────

-- Investigation Petrochem → Petrochem Security
INSERT INTO clock_threats (clock_id, threat_id)
VALUES (
           (SELECT id FROM clocks WHERE name = 'Investigation Petrochem'),
           (SELECT id FROM threats WHERE name = 'Petrochem Security')
       );

-- Fenêtre d'extraction → Biotechnica
INSERT INTO clock_threats (clock_id, threat_id)
VALUES (
           (SELECT id FROM clocks WHERE name = 'Fenêtre d''extraction'),
           (SELECT id FROM threats WHERE name = 'Biotechnica')
       );

-- Découverte de Jin → Jin Sorel
INSERT INTO clock_threats (clock_id, threat_id)
VALUES (
           (SELECT id FROM clocks WHERE name = 'Découverte de Jin'),
           (SELECT id FROM threats WHERE name = 'Jin Sorel')
       );

-- Découverte de Jin → Petrochem Security (double lien)
INSERT INTO clock_threats (clock_id, threat_id)
VALUES (
           (SELECT id FROM clocks WHERE name = 'Découverte de Jin'),
           (SELECT id FROM threats WHERE name = 'Petrochem Security')
       );