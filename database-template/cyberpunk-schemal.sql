-- ─────────────────────────────────────────────────────────────────────────────
-- database-template/cyberpunk-schema.sql
-- Schéma complet du slug Cyberpunk (The Sprawl — adaptation 2d10)
-- Créé automatiquement au premier lancement si cyberpunk.db est absent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── PERSONNAGE ───────────────────────────────────────────────────────────────
-- Table unique : identité + stats + ressources + progression.
-- Pas de table character_stats séparée (relation 1-pour-1 inutile).

CREATE TABLE IF NOT EXISTS characters (
                                          id           INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Accès
                                          access_url   TEXT UNIQUE NOT NULL,
                                          access_code  TEXT UNIQUE NOT NULL,
                                          player_name  TEXT DEFAULT '',
                                          session_id   INTEGER REFERENCES game_sessions(id) ON DELETE SET NULL,

    -- Identité
                                          nom          TEXT NOT NULL DEFAULT '',
                                          prenom       TEXT NOT NULL DEFAULT '',
                                          sexe         TEXT DEFAULT '',
                                          apparence    TEXT DEFAULT '',  -- texte libre
                                          avatar       TEXT DEFAULT NULL,

    -- Playbook choisi à la création
                                          playbook     TEXT NOT NULL DEFAULT '',

    -- Stats (-2 à +2, +3 possible après 5 avancements de base)
                                          cran         INTEGER DEFAULT 0,
                                          pro          INTEGER DEFAULT 0,
                                          chair        INTEGER DEFAULT 0,
                                          esprit       INTEGER DEFAULT 0,
                                          style        INTEGER DEFAULT 0,
                                          synth        INTEGER DEFAULT 0,

    -- Ressources (compteurs simples +/-)
                                          cred         INTEGER DEFAULT 0,
                                          info_tokens  INTEGER DEFAULT 0,   -- [info] disponible
                                          matos_tokens INTEGER DEFAULT 0,   -- [matos] disponible
                                          retenue      INTEGER DEFAULT 0,   -- points de retenue (Move Évaluer etc.)

    -- Progression XP
                                          xp                INTEGER DEFAULT 0,
                                          base_advancements INTEGER DEFAULT 0,  -- débloque avancement majeur à 5

    -- Narratif libre
                                          dark_secret  TEXT DEFAULT '',
                                          notes        TEXT DEFAULT '',

                                          last_accessed DATETIME DEFAULT NULL,
                                          login_attempts INTERGER DEFAULT 0,
                                          last_attempt_at DATETIME DEFAULT NULL,

                                          created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom)
VALUES (-1, 'GMCODE', 'iamthegm', 'Maître du Jeu', 'Maître du Jeu');

CREATE INDEX IF NOT EXISTS idx_characters_access_code ON characters(access_code);
CREATE INDEX IF NOT EXISTS idx_characters_access_url  ON characters(access_url);
CREATE INDEX IF NOT EXISTS idx_characters_updated_at  ON characters(updated_at DESC);

-- ─── TABLES GÉNÉRIQUES ───────────────────────────────────────────────────────
-- Présentes dans tous les slugs — structure identique obligatoire.

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

CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON game_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_access_url  ON game_sessions(access_url);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at  ON game_sessions(updated_at DESC);

CREATE TABLE IF NOT EXISTS session_characters (
                                                  session_id   INTEGER NOT NULL,
                                                  character_id INTEGER NOT NULL,
                                                  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                  PRIMARY KEY (session_id, character_id),
                                                  FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE CASCADE,
                                                  FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_characters_session_id   ON session_characters(session_id);
CREATE INDEX IF NOT EXISTS idx_session_characters_character_id ON session_characters(character_id);

CREATE TABLE IF NOT EXISTS dice_history (
                                            id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                            session_id      INTEGER REFERENCES game_sessions(id) ON DELETE SET NULL,
                                            character_id    INTEGER REFERENCES characters(id)    ON DELETE SET NULL,
                                            roll_type       TEXT    DEFAULT NULL,
                                            notation        TEXT    NOT NULL,
                                            roll_result     TEXT    DEFAULT NULL,   -- JSON
                                            roll_definition TEXT    DEFAULT NULL,
                                            roll_target     TEXT    DEFAULT NULL,   -- JSON
                                            pool            INTEGER DEFAULT NULL,
                                            threshold       INTEGER DEFAULT NULL,
                                            results         TEXT    DEFAULT NULL,   -- JSON des faces individuelles
                                            successes       INTEGER DEFAULT NULL,
                                            saga_spent      INTEGER DEFAULT 0,
                                            saga_recovered  INTEGER DEFAULT 0,
                                            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dice_session_id   ON dice_history(session_id);
CREATE INDEX IF NOT EXISTS idx_dice_character_id ON dice_history(character_id);
CREATE INDEX IF NOT EXISTS idx_dice_created_at   ON dice_history(created_at DESC);

CREATE TABLE IF NOT EXISTS character_journal (
                                                 id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 character_id INTEGER NOT NULL REFERENCES characters(id)    ON DELETE CASCADE,
                                                 session_id   INTEGER          REFERENCES game_sessions(id) ON DELETE SET NULL,
                                                 type         TEXT    DEFAULT 'note',
                                                 title        TEXT    DEFAULT '',
                                                 body         TEXT    NOT NULL DEFAULT '',
                                                 metadata     TEXT    DEFAULT '{}',
                                                 is_read      INTEGER DEFAULT 0,
                                                 created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

create index idx_journal_character
    on character_journal (character_id);

create index idx_journal_session
    on character_journal (session_id);

create index idx_journal_type
    on character_journal (type);

-- ─── DIRECTIVES ──────────────────────────────────────────────────────────────
-- type 'personal' : stables, choisies à la création (2 par perso)
-- type 'mission'  : évolutives, redéfinissables en fin de session (1 à 2)

CREATE TABLE IF NOT EXISTS character_directives (
                                                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                                                    type         TEXT    NOT NULL CHECK(type IN ('personal', 'mission')),
                                                    text         TEXT    NOT NULL DEFAULT '',
                                                    blank_value  TEXT    DEFAULT '',   -- contenu du champ "___" contextuel
                                                    completed    INTEGER DEFAULT 0,
                                                    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── RELATIONS ───────────────────────────────────────────────────────────────
-- link_score de -3 à +3 : positif = allié/confident, négatif = nemesis/rival

CREATE TABLE IF NOT EXISTS character_relations (
                                                   id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                                                   name         TEXT    NOT NULL DEFAULT '',
                                                   description  TEXT    DEFAULT '',
                                                   link_score   INTEGER DEFAULT 1 CHECK(link_score BETWEEN -3 AND 3),
                                                   created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── CYBERWARE ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_cyberware (
                                                   id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                                                   name         TEXT    NOT NULL DEFAULT '',
                                                   option_text  TEXT    DEFAULT '',   -- option choisie (ex: "Force augmentée")
                                                   notes        TEXT    DEFAULT '',
                                                   created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── INVENTAIRE ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS character_items (
                                               id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                                               name         TEXT    NOT NULL DEFAULT '',
                                               description  TEXT    DEFAULT '',
                                               quantity     INTEGER DEFAULT 1,
                                               created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                               updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_character_id ON character_items(character_id);

-- ─── TAGS (système polymorphe) ───────────────────────────────────────────────
-- Applicable à : character, cyberware, relation, item
-- entity_type + entity_id pointent vers la table concernée.
-- Ajout/suppression libre par joueur ET GM.

CREATE TABLE IF NOT EXISTS tags (
                                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                    entity_type  TEXT NOT NULL CHECK(entity_type IN ('character', 'cyberware', 'relation', 'item')),
                                    entity_id    INTEGER NOT NULL,
                                    tag_text     TEXT    NOT NULL DEFAULT '',   -- ex: "+défaillant", "Blessé", "+aliénant"
                                    tag_variant  TEXT    DEFAULT 'neutral' CHECK(tag_variant IN ('positive', 'negative', 'neutral')),
                                    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_entity ON tags(entity_type, entity_id);

-- ─── MOVES — bibliothèque partagée ───────────────────────────────────────────
-- type 'official' : moves des règles (de base ou de playbook), toujours approuvés
-- type 'custom'   : créés à la table, validation GM requise (is_approved = 0 → 1)
-- playbook NULL   : move accessible à tous (moves de base + customs globaux)
-- stat NULL       : move sans jet (purement narratif)

CREATE TABLE IF NOT EXISTS moves (
                                     id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                     type        TEXT    NOT NULL CHECK(type IN ('official', 'custom')),
                                     playbook    TEXT    DEFAULT NULL,    -- NULL = accessible à tous les playbooks
                                     name        TEXT    NOT NULL DEFAULT '',
                                     stat        TEXT    DEFAULT NULL    -- cran/pro/chair/esprit/style/synth/cred/null
                                         CHECK(stat IN ('cran','pro','chair','esprit','style','synth','cred', NULL)),
                                     description TEXT    NOT NULL DEFAULT '',
                                     is_approved INTEGER DEFAULT 1,       -- 0 = en attente validation GM (custom uniquement)
                                     created_by  INTEGER REFERENCES characters(id) ON DELETE SET NULL,
                                     created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Moves débloqués par personnage (official débloqués via XP ou création, custom validés)
CREATE TABLE IF NOT EXISTS character_moves (
                                               id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                                               move_id      INTEGER NOT NULL REFERENCES moves(id)      ON DELETE CASCADE,
                                               acquired_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                                               UNIQUE(character_id, move_id)
);

-- ─── CLOCKS ──────────────────────────────────────────────────────────────────
-- session_id NULL = scope slug (persistant toutes sessions, niveau campagne)
-- segments : libre (4, 6, 8, 10, 12...) — le GM décide de la granularité

CREATE TABLE IF NOT EXISTS clocks (
                                      id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                      session_id  INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
                                      name        TEXT    NOT NULL DEFAULT '',
                                      segments    INTEGER NOT NULL DEFAULT 6,
                                      current     INTEGER DEFAULT 0,
                                      consequence TEXT    DEFAULT '',   -- ce qui se passe quand le clock est plein
                                      icon        TEXT    DEFAULT '⏱',
                                      pinned      INTEGER DEFAULT 0,
                                      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                                      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── THREATS ─────────────────────────────────────────────────────────────────
-- session_id NULL = scope slug (persistant toutes sessions)
-- moves_json : tableau de strings JSON (les actions de la menace)

CREATE TABLE IF NOT EXISTS threats (
                                       id         INTEGER PRIMARY KEY AUTOINCREMENT,
                                       session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
                                       name       TEXT    NOT NULL DEFAULT '',
                                       type       TEXT    DEFAULT '',      -- Corporation / Gang / Individu / IA / Lieu / Autre
                                       impulse    TEXT    DEFAULT '',      -- ce qu'elle veut fondamentalement
                                       moves_json TEXT    DEFAULT '[]',    -- JSON : tableau de strings
                                       notes      TEXT    DEFAULT '',
                                       icon        TEXT    DEFAULT '⚠',
                                       status      TEXT    DEFAULT 'active'
                                           CHECK(status IN ('active', 'dormante', 'neutralisée')),
                                       pinned      INTEGER DEFAULT 0,
                                       sort_order  INTEGER DEFAULT 0,
                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many : une clock peut être liée à plusieurs threats et vice versa
CREATE TABLE IF NOT EXISTS clock_threats (
                                             clock_id  INTEGER NOT NULL REFERENCES clocks(id)  ON DELETE CASCADE,
                                             threat_id INTEGER NOT NULL REFERENCES threats(id) ON DELETE CASCADE,
                                             PRIMARY KEY (clock_id, threat_id)
);

-- Clocks
CREATE INDEX IF NOT EXISTS idx_clocks_session_id  ON clocks (session_id);
CREATE INDEX IF NOT EXISTS idx_clocks_pinned       ON clocks (pinned);

-- Threats
CREATE INDEX IF NOT EXISTS idx_threats_session_id  ON threats (session_id);
CREATE INDEX IF NOT EXISTS idx_threats_pinned       ON threats (pinned);
CREATE INDEX IF NOT EXISTS idx_threats_status       ON threats (status);
CREATE INDEX IF NOT EXISTS idx_threats_sort_order   ON threats (sort_order);

-- Join table
CREATE INDEX IF NOT EXISTS idx_clock_threats_clock_id   ON clock_threats (clock_id);
CREATE INDEX IF NOT EXISTS idx_clock_threats_threat_id  ON clock_threats (threat_id);

-- ============================================
-- REFRESH TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                              character_id    INTEGER NOT NULL,
                                              token           TEXT UNIQUE NOT NULL,
                                              expires_at      DATETIME NOT NULL,
                                              created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tokens_character_id ON refresh_tokens(character_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token        ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at   ON refresh_tokens(expires_at);

-- ─── SEED : MOVES OFFICIELS ───────────────────────────────────────────────────
-- Moves de base (playbook NULL = accessibles à tous)
-- Moves de playbook (playbook = nom du playbook)

-- MOVES DE BASE
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', NULL, 'Agir sous pression',        'cran',   'Agir dans une situation dangereuse, urgente ou stressante. 15+ : tu fais ce que tu voulais. 10-14 : complication ou coût. 9- : le MC agit librement.'),
                                                                ('official', NULL, 'Employer la manière forte',  'chair',  'S''engager dans un affrontement physique violent. 10-14 : les deux parties s''infligent mutuellement des conséquences.'),
                                                                ('official', NULL, 'Baratiner',                   'style',  'Manipuler, persuader, mentir ou séduire pour obtenir quelque chose d''un PNJ.'),
                                                                ('official', NULL, 'Battre le pavé',              'style',  'Chercher une information ou activer son réseau dans la rue. 10-14 : l''info est obtenue mais crée une obligation ou une dette.'),
                                                                ('official', NULL, 'Évaluer',                     'pro',    'Observer et analyser une situation pour en extraire des informations exploitables. 15+ : 3 Retenues. 10-14 : 1 Retenue. 9- : le MC agit pendant l''évaluation. Chaque Retenue permet de poser une question au MC.'),
                                                                ('official', NULL, 'Montrer les dents',           'pro',    'Intimider, menacer ou faire valoir son autorité professionnelle face à un PNJ.'),
                                                                ('official', NULL, 'Obtenir le taf',              'pro',    'Négocier un contrat avec un fixeur ou un commanditaire. 10-14 : contrat avec contrainte.'),
                                                                ('official', NULL, 'Effectuer une recherche',     'esprit', 'Chercher une information par des moyens analytiques ou mentaux. 15+ : 3 questions. 10-14 : 1 question. 9- : tu trouves quelque chose mais le MC décide ce que tu déclenches.'),
                                                                ('official', NULL, 'Aider ou Interférer',         NULL,     'Apporter son soutien actif à un autre joueur ou lui mettre des bâtons dans les roues. Stat selon la nature de l''action. Succès aide : +1 au jet. Succès interférence : -2 au jet.'),
                                                                ('official', NULL, 'Administrer les premiers soins', 'cran', 'Stabiliser ou soigner un personnage blessé en conditions de terrain. 10-14 : ça fonctionne mais au prix d''un coût.'),
                                                                ('official', NULL, 'Plan B',                      NULL,     'Introduire rétroactivement un élément préparé (matos, info, contact, accord). Coûte [matos], [info] ou Cred selon disponibilité. Stat variable selon le contexte.'),
                                                                ('official', NULL, 'Acquérir une concession funéraire', 'chair', 'Move de mort. Déclenché face à une conséquence potentiellement fatale. 15+ : survie. 10-14 : survie au prix d''un coût majeur. 9- : le MC décide.'),
                                                                ('official', NULL, 'Passer sur le billard',       NULL,     'Accéder à des soins sérieux ou à l''installation de cyberware. Coût en Cred. 10-14 : complication.');

-- MOVES FIXER
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Fixer', 'Magouilles',                   'pro',    'Des gens accomplissent des boulots pour toi. Tu démarres avec 2-équipe et deux jobs. Entre les Missions, choisis un nombre de jobs ≤ ton score d''équipe et lance 2d10+Pro.'),
                                                                ('official', 'Fixer', 'Baron des rues',                NULL,     'Gagne +1 équipe et un job supplémentaire.'),
                                                                ('official', 'Fixer', 'Face-à-face',                   NULL,     'Quand tu engages une conversation de visu sans technologie, gagne +1 sur le prochain jet de Baratiner avec cet interlocuteur.'),
                                                                ('official', 'Fixer', 'Ingénieur technico-commercial', NULL,     'Quand tu produis du matériel, prends +1 sur le prochain jet avec cette pièce si tu l''utilises immédiatement.'),
                                                                ('official', 'Fixer', 'Injoignable',                   NULL,     'Quand tu bats le pavé et obtiens un 10-14, choisis une option en moins.'),
                                                                ('official', 'Fixer', 'Jongler avec plusieurs balles', NULL,     'Gagne +1 équipe et un job supplémentaire.'),
                                                                ('official', 'Fixer', 'Le bruit qui court',            NULL,     'Quand tu effectues une recherche en écoutant des ragots de rue, gagne une info supplémentaire, même sur un raté.'),
                                                                ('official', 'Fixer', 'Mielleux',                      'style',  'Quand tu aides ou interfères avec quelqu''un, lance 2d10+Style au lieu du score de Lien.'),
                                                                ('official', 'Fixer', 'Renforts',                      NULL,     'Tu as un groupe d''associés de 5 à 10 gros bras. Choisis deux options parmi : bien armés, bien protégés, anciens militaires, loyal, mobiles, nombreux.'),
                                                                ('official', 'Fixer', 'Réputation',                    'pro',    'Quand tu rencontres quelqu''un d''important, lance 2d10+Pro. Sur un succès, raconte ce qu''il sait. 15+ : +1 sur le prochain jet.'),
                                                                ('official', 'Fixer', 'Chromé',                        NULL,     'Choisis un cyberware supplémentaire dans ta liste d''archétype à la création, ou acquiers-en un nouveau durant un temps mort.');

-- MOVES NETRUNNER
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Netrunner', 'Pénétrer un système',         'synth',  'Tentative d''accès à un système sécurisé. 15+ : 3 Retenues. 10-14 : 1 Retenue. 9- : l''ICE s''active. Dépense une Retenue pour : ouvrir/verrouiller, couper caméras, localiser, briser ICE, bloquer routine.'),
                                                                ('official', 'Netrunner', 'Extraire des données',         'esprit', 'Fouiller un système pour récupérer des informations. 15+ : 3 questions. 10-14 : 1 question. 9- : tu trouves quelque chose mais le MC décide ce que tu déclenches.'),
                                                                ('official', 'Netrunner', 'Contre-mesures',               'cran',   'Résister à une ICE qui s''exécute contre toi. 15+ : aucune conséquence. 10-14 : coût (Sonné, instabilité). 9- : le MC décide des dégâts.'),
                                                                ('official', 'Netrunner', 'Anonyme',                      NULL,     'Ton Cyberdeck a +2 Furtivité. La connexion est plus difficile à tracer.'),
                                                                ('official', 'Netrunner', 'Ceinture noire',               NULL,     'Quand une Black ICE s''exécute via Contre-mesures, le MC choisit deux options au lieu de trois.'),
                                                                ('official', 'Netrunner', 'Optimisation de recherche',    NULL,     'Quand tu Extrais des données, tu peux toujours poser une question supplémentaire. 15+ : info additionnelle.'),
                                                                ('official', 'Netrunner', 'Programmation à la volée',     NULL,     'Quand tu Pénètres un système avec succès, gagne 1 Retenue supplémentaire.'),
                                                                ('official', 'Netrunner', 'Renom',                        'synth',  'Quand tu apparais dans le Net avec un avatar reconnaissable, lance 2d10+Synth pour Baratiner et Montrer les dents dans l''espace numérique.'),
                                                                ('official', 'Netrunner', 'Support technique',            'esprit', 'Quand tu aides un membre de l''équipe depuis le Net, lance 2d10+Esprit au lieu du score de Lien.'),
                                                                ('official', 'Netrunner', 'Tueur d''ICE',                 NULL,     'Une fois par connexion, tu peux annuler automatiquement une routine d''ICE sans jet ni dépense de Retenue.'),
                                                                ('official', 'Netrunner', 'Chromé',                       NULL,     'Choisis un cyberware supplémentaire à la création ou durant un temps mort. Si Cyberdeck externe, permet de prendre ton premier cyberware sans coût de slot supplémentaire.');

-- MOVES SOLO
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Solo', 'Entrée subreptice',    'cran',  '15+ : 3 Retenues. 10-14 : 1 Retenue. Dépense : esquiver garde/système, désactiver, neutraliser, éviter d''être repéré.'),
                                                                ('official', 'Solo', 'Haute voltige',         NULL,    'Après avoir dépensé toutes tes Retenues d''Entrée subreptice par furtivité et dextérité, gagne [matos].'),
                                                                ('official', 'Solo', 'Imposteur',             NULL,    'Après avoir dépensé toutes tes Retenues d''Entrée subreptice par charisme et étiquette, gagne [info].'),
                                                                ('official', 'Solo', 'Agent furtif',          NULL,    'Quand tu évalues sans avoir été repéré et obtiens un 15+ avec marge importante, tu peux diminuer le Clock d''Action d''un segment.'),
                                                                ('official', 'Solo', 'Assassin',              NULL,    'Quand tu attaques par surprise, pose gratuitement une question de la liste d''Évaluer.'),
                                                                ('official', 'Solo', 'Branché',               NULL,    'Accès limité au Net via interface neurale. Permet d''effectuer des actions basiques via Pénétrer un système.'),
                                                                ('official', 'Solo', 'Guerre psychologique',  'pro',   '10-14 : adversaires impressionnés et prudents, effrayés, ou en colère et négligents (choix MC). 15+ : tu choisis.'),
                                                                ('official', 'Solo', 'Maître des artifices',  NULL,    'Tant que déguisé et couverture intacte, sur résultat exceptionnel au Baratiner : diminue le Clock d''Action d''un segment.'),
                                                                ('official', 'Solo', 'Mère Gigogne',          NULL,    'Quand tu t''infiltres, tu peux emmener ton équipe avec toi.'),
                                                                ('official', 'Solo', 'Extraction',            'cran',  '15+ : t''es parti, nickel. 10-14 : rester ou partir avec un prix. 9- : surpris en position désavantageuse.'),
                                                                ('official', 'Solo', 'Repérage',              'pro',   '15+ : 3 infos sur les failles de sécurité. 10-14 : 1 info.'),
                                                                ('official', 'Solo', 'Chromé',                NULL,    'Choisis un cyberware supplémentaire à la création ou durant un temps mort.');

-- MOVES INVESTIGATOR
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Investigator', 'Mais c''est bien sûr !',      'pro',    'Au début d''une Mission. 15+ : 3 Retenues. 10-14 : 1 Retenue. Dépense : une question de la liste d''Effectuer une recherche.'),
                                                                ('official', 'Investigator', 'Toujours à l''écoute',         NULL,    'Quand tu circules dans un quartier ou parmi un groupe, tu peux effectuer une recherche pour collecter des informations.'),
                                                                ('official', 'Investigator', 'Agrandissement, stop',         'pro',    'Quand tu examines des preuves recueillies, gagne [info] et lance Effectuer une recherche avec Pro au lieu d''Esprit.'),
                                                                ('official', 'Investigator', 'Chasseur de gros gibier',      'pro',    'Quand tu tends un piège à une cible enquêtée. 10-14 : prise au piège. 15+ : à ta merci.'),
                                                                ('official', 'Investigator', 'Le sens de l''observation',    NULL,    'Quand tu surveilles un individu ou un lieu, gagne [info] et effectue un Évaluer.'),
                                                                ('official', 'Investigator', 'Remonter la trace',            NULL,    'Désigne une cible. Quand tu dépenses trois infos la concernant, le MC te décrit où elle se trouve et en quoi elle est désavantagée.'),
                                                                ('official', 'Investigator', 'Sale rat',                     NULL,    'Quand tu bats le pavé, tu ne subis jamais de malus quand tu évites les problèmes de tes Contacts.'),
                                                                ('official', 'Investigator', 'Sous tous les angles',         NULL,    'Au début de la Phase d''Action, gagne [info] et [matos].'),
                                                                ('official', 'Investigator', 'Théâtre d''opération humain', NULL,    'Quand tu enquêtes sur un groupe et dépenses [info], désigne ce groupe comme cible. +1 continu en agissant contre lui.'),
                                                                ('official', 'Investigator', 'Tireur embusqué',              'cran',  '15+ : 3 options parmi bien caché/bon couvert/excellent champ/site de rechange/bien sécurisé. 10-14 : 2.'),
                                                                ('official', 'Investigator', 'Chromé',                       NULL,    'Choisis un cyberware supplémentaire à la création ou durant un temps mort.');

-- MOVES NOMAD
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Nomad', 'Rig',                         NULL,    'Tu démarres avec un véhicule rigué connecté à ton interface neurale. Profil Puissance/Aspect/Défaut.'),
                                                                ('official', 'Nomad', 'Seconde peau',                NULL,    'Connecté via port neural à ton rig : substitutions de stats sur plusieurs moves (Agir, Employer, Montrer, Aider).'),
                                                                ('official', 'Nomad', 'Clan',                        NULL,    'Tu appartiens à un clan nomad. Ressource et obligation. Score de Lien +2 collectif par défaut.'),
                                                                ('official', 'Nomad', 'Belle bagnole',               'style', 'Quand tu bats le pavé dans ton rig, lance 2d10+Style+Aspect.'),
                                                                ('official', 'Nomad', 'Casse-cou',                   NULL,    'Quand tu conduis au-devant du danger sans assurer tes arrières, gagne +1 armure. Si tu subis ≥1 dégât, gagne XP.'),
                                                                ('official', 'Nomad', 'De glace',                    'cran',  'Quand tu baratines quelqu''un, lance 2d10+Cran.'),
                                                                ('official', 'Nomad', 'L''outil adapté à la tâche',  NULL,    'Tu as deux rigs supplémentaires.'),
                                                                ('official', 'Nomad', 'Opérateur de drones',         NULL,    'Tu démarres avec deux drones construits avec le MC. Mode de locomotion + gabarit.'),
                                                                ('official', 'Nomad', 'Un œil dans le ciel',         'pro',   'Quand tu aides ou interfères en pilotant un drone, lance 2d10+Pro au lieu du score de Lien.'),
                                                                ('official', 'Nomad', 'Un putain d''as du volant',   'pro',   '15+ : 3 Retenues. 10-14 : 1 Retenue. Dépense : éviter danger / échapper / maintenir contrôle / impressionner.'),
                                                                ('official', 'Nomad', 'Réseau nomad',                NULL,    'Ton clan a des contacts sur les routes. Effectuer une recherche sur mouvements corpo/checkpoints : question supplémentaire.'),
                                                                ('official', 'Nomad', 'Terre brûlée',                'pro',   'Faire disparaître quelqu''un hors de la ville sans trace. 15+ : en sécurité ou disparu. 10-14 : coût ou complication.'),
                                                                ('official', 'Nomad', 'Chromé',                      NULL,    'Choisis un cyberware supplémentaire à la création ou durant un temps mort.');

-- MOVES ROCKERBOY
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Rockerboy', 'Déterminé',                     'pro',    'Quand tu débutes une Mission qui promeut ta vision. 15+ : 3 Retenues. 10-14 : 1 Retenue. Dépense : +1 ou -2 avant un jet.'),
                                                                ('official', 'Rockerboy', 'Visionnaire',                   'style',  'Quand tu crées une connexion émotionnelle et prônes ta vision. 15+ : 2 Retenues. 10-14 : 1 Retenue. Dépense sur PNJ ciblé.'),
                                                                ('official', 'Rockerboy', 'Adeptes',                       NULL,     'Tu fais partie d''un groupe de ~20 membres. Aide, ressources ou planque — mais ils formuleront des demandes.'),
                                                                ('official', 'Rockerboy', 'Agitateur',                     NULL,     'Tu peux utiliser Visionnaire pour influencer une foule potentiellement favorable.'),
                                                                ('official', 'Rockerboy', 'Beau parleur',                  NULL,     'Quand tu baratines quelqu''un et obtiens 10+, gagne [info] en bonus.'),
                                                                ('official', 'Rockerboy', 'Célèbre',                       NULL,     'Tu es reconnu par de nombreuses personnes. Quand quelqu''un te reconnaît, +1 sur le prochain jet contre lui.'),
                                                                ('official', 'Rockerboy', 'Cercle intérieur',              NULL,     'Tu as un groupe de fidèles de 5 à 10 adeptes au sein de ton groupe plus large.'),
                                                                ('official', 'Rockerboy', 'Opportuniste',                  'pro',    'Quand tu aides ou interfères, lance 2d10+Pro au lieu du score de Lien.'),
                                                                ('official', 'Rockerboy', 'Sociable',                      NULL,     'Quand tu bats le pavé parmi des gens qui partagent ta vision et obtiens 10-14, choisis une option en moins.'),
                                                                ('official', 'Rockerboy', 'Un million de points lumineux', NULL,     'Quand tu réussis Visionnaire, tu peux dépenser une Retenue pour poser une question parmi 5.'),
                                                                ('official', 'Rockerboy', 'Chromé',                        NULL,     'Choisis un cyberware supplémentaire à la création ou durant un temps mort.');

-- MOVES MEDIA
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Media', 'En direct live',           'pro',    'Quand tu diffuses en direct pour t''éviter des ennuis. 10+ : tu obtiens le cliché et es raccompagné. 10-14 : complication.'),
                                                                ('official', 'Media', 'Rassembler les preuves',   'esprit', 'Quand tu réunis des preuves pour publier un scoop. 15+ : preuves + avancement Clock. 10-14 : révélé tes atouts.'),
                                                                ('official', 'Media', '24h/24 7j/7',              NULL,     'Quand tu effectues une recherche dans les flux, tu peux toujours poser une question supplémentaire. 15+ : info additionnelle.'),
                                                                ('official', 'Media', 'Carte de presse',           NULL,     'Si tu révèles ton identité publique pour baratiner un accès, considère automatiquement un 15+. Gagne [info].'),
                                                                ('official', 'Media', 'Correspondant de guerre',   'pro',    'Quand tu agis sous pression en danger physique, lance 2d10+Pro au lieu de Cran.'),
                                                                ('official', 'Media', 'Fouille-merde',             NULL,     'Quand tu dépenses [info] pour conseiller l''équipe sur la Mission, l''équipe gagne +1 sur le prochain jet et tu gagnes XP.'),
                                                                ('official', 'Media', 'Pitbull',                   'pro',    'Quand tu accules quelqu''un et le harcèles. 15+ : il dit la vérité. 10-14 : il en dit assez puis choisit sa réaction.'),
                                                                ('official', 'Media', 'Sources sûres',             'style',  'Quand tu fais appel à tes informateurs pour Effectuer une recherche, lance 2d10+Style au lieu d''Esprit.'),
                                                                ('official', 'Media', 'Chromé',                    NULL,     'Choisis un cyberware supplémentaire à la création ou durant un temps mort.');

-- MOVES EDGERUNNER
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Edgerunner', 'Voici le plan',                'esprit', 'Quand tu planifies une Mission, toute personne à qui tu assignes une tâche gagne +1 continu tant qu''elle suit le plan.'),
                                                                ('official', 'Edgerunner', 'Gestion directe',              'esprit', 'Quand tu emploies la manière forte en commandant en première ligne, lance 2d10+Esprit au lieu de Chair.'),
                                                                ('official', 'Edgerunner', 'Glissant comme une anguille',  'pro',    'Fin de Mission avec fausses preuves : désigne la victime. 15+ : recule Clock Corporation. 10-14 : le MC n''avance pas.'),
                                                                ('official', 'Edgerunner', 'Membre des Forces Spéciales',  NULL,     'Quand tu emploies la manière forte, tu comptes comme un petit Gang.'),
                                                                ('official', 'Edgerunner', 'Opérations tactiques',         NULL,     'Quand tu évalues en commandant en première ligne, gagne 1 Retenue supplémentaire, même sur un raté.'),
                                                                ('official', 'Edgerunner', 'Présence rassurante',          NULL,     'Quand tu motives quelqu''un avec un discours en situation stressante, tu l''aides comme sur un 15+.'),
                                                                ('official', 'Edgerunner', 'Recruteur',                    'pro',    '15+ : 2 options (pro sûr/petite équipe/niveau requis). 10-14 : 1 option.'),
                                                                ('official', 'Edgerunner', 'Savoirs corporatifs',          NULL,     'Quand tu effectues une recherche sur une corporation, question supplémentaire toujours. 15+ : info additionnelle.'),
                                                                ('official', 'Edgerunner', 'Solution de repli',            'esprit', '15+ : tu t''échappes, tu choisis l''abandon. 10-14 : tu t''échappes mais abandonnes 2 éléments parmi 4. 9- : le MC agit.'),
                                                                ('official', 'Edgerunner', 'Trop augmenté pour reculer',   NULL,     'Une fois par session, ignore les effets d''un tag narratif de blessure pour une scène. Après : tag aggravé.'),
                                                                ('official', 'Edgerunner', 'Réputation de terrain',        'pro',    'Ton nom circule. Quand tu rencontres un freelance/fixeur : +1 sur le prochain jet de négo/recrutement. 15+ : dette envers toi.'),
                                                                ('official', 'Edgerunner', 'Chromé',                       NULL,     'Choisis un cyberware supplémentaire à la création ou durant un temps mort.');

-- MOVES TECHIE
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Techie', 'Bidouilleur',                 NULL,    'Tu peux identifier et modifier toute technologie avec laquelle tu es familier. Le MC définit les conditions.'),
                                                                ('official', 'Techie', 'Bric-à-brac',                 'esprit','Après réception d''une Mission. 15+ : 3 [matos] dans ta sphère. 10-14 : 1 [matos].'),
                                                                ('official', 'Techie', 'Expert',                       NULL,    'Choisis une sphère : Armurier / Artificier / Cybernéticien / Électronicien / Mécano / Médecin.'),
                                                                ('official', 'Techie', 'Analytique',                   'esprit','Quand tu évalues, lance 2d10+Esprit au lieu de Pro.'),
                                                                ('official', 'Techie', 'Court-circuitage',             'cran',  '10+ : neutralise sans trace. 15+ : renseignements sur la sécurité, gagne [info].'),
                                                                ('official', 'Techie', 'Intérêts diversifiés',         NULL,    'Choisis une sphère d''expertise supplémentaire.'),
                                                                ('official', 'Techie', 'Je suis sur le coup',          'cran',  'Quand ta sphère d''expertise aide un coéquipier, lance 2d10+Cran au lieu du score de Lien.'),
                                                                ('official', 'Techie', 'Obsessionnel',                 NULL,    'Quand tu t''isoles pour étudier un problème technologique, effectue une recherche. Peut poser n''importe quelle question sur l''objet d''étude.'),
                                                                ('official', 'Techie', 'Se fondre dans la masse',      'cran',  '15+ : plus personne ne s''inquiète jusqu''à ce que tu attires l''attention. 10-14 : ça ira si tu t''esquives.'),
                                                                ('official', 'Techie', 'Chromé',                       NULL,    'Accès privilégié ripperdocs. Peut s''installer du cyberware soi-même durant un temps mort si les pièces sont disponibles.');

-- MOVES ASSASSIN
INSERT INTO moves (type, playbook, name, stat, description) VALUES
                                                                ('official', 'Assassin', 'Arme personnalisée',         NULL,    'Tu démarres avec une arme sur mesure. Base + deux options. Donne-lui un nom.'),
                                                                ('official', 'Assassin', 'Contrat',                    NULL,    'Quand tu acceptes un contrat d''élimination, définis cible et commanditaire. 1 Cred d''avance. Raté → Threat avec Clock.'),
                                                                ('official', 'Assassin', 'Fantôme',                    NULL,    'Tu maintiens une ou plusieurs identités de couverture. Clock d''Identification requis pour te relier à tes actions.'),
                                                                ('official', 'Assassin', 'Armé jusqu''aux dents',      NULL,    'Choisis une autre arme personnalisée.'),
                                                                ('official', 'Assassin', 'Dépourvu de sentiments',     NULL,    'Agir de sang-froid sans malus + +1 forward. En contrepartie, le MC peut activer le tag +aliénant en scènes relationnelles.'),
                                                                ('official', 'Assassin', 'Dur à cuire',                NULL,    'Quand tu fais face à une conséquence potentiellement fatale, soustrais ta Chair au jet.'),
                                                                ('official', 'Assassin', 'Œil exercé',                 'cran',  '15+ : +1 continu contre la cible + question vulnérabilité. 10-14 : question vulnérabilité + +1 forward si exploité.'),
                                                                ('official', 'Assassin', 'Secrets corporatifs',        NULL,    'Effectuer une recherche sur une corporation : question supplémentaire toujours. 15+ : info additionnelle.'),
                                                                ('official', 'Assassin', 'Vétéran de la 4ème Corpo War', NULL, 'Contacts dans milices/anciens/marchands d''armes. Battre le pavé pour matos militaire ou recruter ancien combattant : question supplémentaire.'),
                                                                ('official', 'Assassin', 'Plus machine qu''homme',     NULL,    'Choisis un cyberware supplémentaire à la création ou durant un temps mort.'),
                                                                ('official', 'Assassin', 'Regard de dur',              'style', '15+ : 2 Retenues. 10-14 : 1 Retenue. Dépense : fixer un PNJ — il se fige. 9- : identifié comme plus grande menace.'),
                                                                ('official', 'Assassin', 'Préparation silencieuse',    'pro',   '15+ : [info] routine/vulnérabilités/environnement + +1 forward. 10-14 : 1 aspect au choix. 9- : repéré ou cible a changé.');