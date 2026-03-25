-- ============================================================
-- Seed complet — Une Nuit au Stars Saloon
-- One-Shot Tecumah Gulch
--
-- Ordre : 1) characters  2) character_items  3) character_journal
-- Idempotent : INSERT OR IGNORE sur access_code/access_url
--
-- IMPORTANT : les valeurs de compétences sont des BONUS SEULS
--   (total affiché dans le lore MOINS l'attribut de rattachement)
--   Exemple : Pistolet 6D avec COO 3D+2 → bonus = 18-11 = 7 pips
--
-- Attributs rattachement compétences :
--   AGI : acrobatie, armes_blanches, discretion, esquive,
--          contorsion, lutte, equitation, escalade, saut, lasso, rodeo
--   VIG : course, nage, puissance, endurance
--   COO : pistolet, fusil, arc, artillerie, prestidigitation,
--          crochetage, arme_de_jet, lancer, bricolage
--   PER : recherche, enquete, intuition, observation,
--          camouflage, jeux, survie, chariots, pister
--   CHA : charme, negocier, commander, escroquerie, persuasion,
--          volonte, dressage, deguisement, intimider, comedie
--   SAV : langues, geographie, evaluer, medecine, academique,
--          lois, falsification, ingenierie, business, botanique,
--          cultures_indiennes, demolition
--
-- Répartition création (indicative, moins contraignante pour PNJs) :
--   Attributs : 42 pips (14D), min 3 pips/attribut
--   Compétences (bonus) : 21 pips (7D)
--   Freebies : 30 pips (10D) libres
--
-- Boris/Devlin/Reardon : stats inventées cohérentes avec profil
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CHARACTERS
-- ────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO characters (
    access_code, access_url, player_name,
    nom, prenom, sexe, age, description,
    agilite, coordination, vigueur, savoir, perception, charisme,
    comp_acrobatie, comp_armes_blanches, comp_discretion, comp_esquive,
    comp_contorsion, comp_lutte, comp_equitation, comp_escalade,
    comp_saut, comp_lasso, comp_rodeo,
    comp_course, comp_nage, comp_puissance, comp_endurance,
    comp_pistolet, comp_fusil, comp_arc, comp_artillerie,
    comp_prestidigitation, comp_crochetage, comp_arme_de_jet, comp_lancer, comp_bricolage,
    comp_recherche, comp_enquete, comp_intuition, comp_observation,
    comp_camouflage, comp_jeux, comp_survie, comp_chariots, comp_pister,
    comp_charme, comp_negocier, comp_commander, comp_escroquerie,
    comp_persuasion, comp_volonte, comp_dressage, comp_deguisement,
    comp_intimider, comp_comedie,
    comp_langues, comp_geographie, comp_evaluer, comp_medecine,
    comp_academique, comp_lois, comp_falsification, comp_ingenierie,
    comp_business, comp_botanique, comp_cultures_indiennes, comp_demolition,
    blessure_niveau, points_destin, points_personnage
) VALUES

-- ── Scott O'Brian ─────────────────────────────────────────────
-- AGI=2D+2=8  COO=2D+2=8  VIG=3D+1=10  SAV=2D+2=8  PER=3D=9  CHA=3D+2=11
-- Pistolet 4D=12        → bonus COO=8  → 4
-- Business 5D=15        → bonus SAV=8  → 7
-- Persuasion 5D=15      → bonus CHA=11 → 4
-- Jeux(poker) 5D=15     → bonus PER=9  → 6
-- Academique 5D=15      → bonus SAV=8  → 7
(
    'SCOT01', 'dusty-sheriff-1847', 'Scott O''Brian',
    'O''Brian', 'Scott', 'M', 52,
    'Tenancier du Stars Saloon et maire de Tecumah Gulch. Chemise blanche, bretelles, cheveux coiffés en arrière.',
    8, 8, 10, 8, 9, 11,
    0,0,0,0, 0,0,0,0, 0,0,0,
    0,0,0,0,
    4,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,6,0,0,0,
    0,0,0,0, 4,0,0,0, 0,0,
    0,0,0,0, 7,0,0,0, 7,0,0,0,
    0, 1, 5
),

-- ── Cassandra ─────────────────────────────────────────────────
-- AGI=2D+2=8  COO=3D=9  VIG=2D+2=8  SAV=2D+2=8  PER=3D=9  CHA=4D=12
-- Baratin(escroquerie) 6D=18 → bonus CHA=12 → 6
-- Deguisement 5D=15          → bonus CHA=12 → 3
-- Persuasion 5D=15           → bonus CHA=12 → 3
(
    'CASS01', 'golden-saloon-2391', 'Cassandra',
    '', 'Cassandra', 'F', 38,
    'Femme d''âge mûr, longue chevelure blonde soigneusement coiffée. Gagneuse du Stars Saloon, officiellement "nièce" de Scott.',
    8, 9, 8, 8, 9, 12,
    0,0,0,0, 0,0,0,0, 0,0,0,
    0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,6, 3,0,0,3, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    0, 1, 5
),

-- ── Dr. Mitch Sullivan ────────────────────────────────────────
-- AGI=2D+2=8  COO=2D+2=8  VIG=2D+2=8  SAV=4D=12  PER=3D+1=10  CHA=2D+2=8
-- Medecine 6D=18          → bonus SAV=12 → 6
-- Endurance(alcool) 5D=15 → bonus VIG=8  → 7
(
    'MTCH01', 'ragged-drifter-4821', 'Dr. Mitch Sullivan',
    'Sullivan', 'Mitch', 'M', 54,
    'Cinquantaine usée, moustache rousse mal taillée, veston froissé. Ancien chirurgien nordiste.',
    8, 8, 8, 12, 10, 8,
    0,0,0,0, 0,0,0,0, 0,0,0,
    0,0,0,7,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,6, 0,0,0,0, 0,0,0,0,
    0, 1, 5
),

-- ── Igor Dzerjinski ───────────────────────────────────────────
-- AGI=2D+2=8  COO=3D+2=11  VIG=3D+2=11  SAV=2D+2=8  PER=2D+2=8  CHA=2D+2=8
-- Bricolage 5D=15             → bonus COO=11 → 4
-- Endurance(résistance) 5D=15 → bonus VIG=11 → 4
-- Lutte 5D=15                 → bonus AGI=8  → 7
-- Academique(Forge) 5D+1=16   → bonus SAV=8  → 8
(
    'IGOR01', 'iron-frontier-7734', 'Igor Dzerjinski',
    'Dzerjinski', 'Igor', 'M', 44,
    'Chauve, chétif, voûté, petites lunettes rondes. Forgeron, anarchiste exalté.',
    8, 11, 11, 8, 8, 8,
    0,0,0,0, 0,7,0,0, 0,0,0,
    0,0,0,4,
    0,0,0,0, 0,0,0,0,4,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 8,0,0,0, 0,0,0,0,
    0, 1, 5
),

-- ── Boris Dzerjinski (stats inventées) ────────────────────────
-- Attributs (42) : AGI=7 COO=6 VIG=12 SAV=6 PER=6 CHA=5 = 42
-- Freebies (30)  : VIG+3=15, lutte+9, puissance+9, endurance+9
-- Base skills (21) : lutte=7, puissance=7, endurance=7
-- Bonus stockés : lutte=16, puissance=16, endurance=16
(
    'BORI01', 'copper-stallion-3321', 'Boris Dzerjinski',
    'Dzerjinski', 'Boris', 'M', 40,
    'Carrure massive, cou de taureau, mains comme des battoirs. Frère cadet d''Igor.',
    7, 6, 15, 6, 6, 5,
    0,0,0,0, 0,16,0,0, 0,0,0,
    0,0,16,16,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    0, 1, 5
),

-- ── Walt Blackman ─────────────────────────────────────────────
-- AGI=2D+2=8  COO=3D+2=11  VIG=3D+1=10  SAV=2D+2=8  PER=2D+2=8  CHA=3D=9
-- Fusil 5D=15             → bonus COO=11 → 4
-- Pistolet 6D=18          → bonus COO=11 → 7
-- Esquive 6D=18           → bonus AGI=8  → 10
-- Jeux(poker) 5D=15       → bonus PER=8  → 7
-- Endurance(alcool) 4D=12 → bonus VIG=10 → 2
-- Equitation 4D=12        → bonus AGI=8  → 4
-- Pister 5D=15            → bonus PER=8  → 7
-- blessure_niveau=1 : Stunned (renversé par Bad Bald)
(
    'WALT01', 'scarred-marshal-9912', 'Walt Blackman',
    'Blackman', 'Walt', 'M', 58,
    'Mal habillé, mal rasé, mal coiffé. Chapeau froissé. Légende vivante qui s''ennuie à mourir.',
    8, 11, 10, 8, 8, 7,
    0,0,0,7, 0,3,4,0, 0,0,0,
    0,0,0,2,
    7,4,0,0, 0,0,0,0,0,
    2,5,0,0, 0,5,0,0,7,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    1, 1, 5
),

-- ── Manuel Rodriguez ──────────────────────────────────────────
-- AGI=3D=9  COO=3D=9  VIG=2D+2=8  SAV=3D+1=10  PER=3D=9  CHA=2D+2=8
-- Equitation 4D=12          → bonus AGI=9  → 3
-- Academique(Agriculture) 5D=15 → bonus SAV=10 → 5
-- Botanique 5D=15           → bonus SAV=10 → 5
(
    'MANU01', 'wild-cowboy-5543', 'Manuel Rodriguez',
    'Rodriguez', 'Manuel', 'M', 46,
    'Ventre proéminent, belle moustache huilée. Fermier prospère du coin. Montre en argent.',
    9, 9, 8, 10, 9, 8,
    0,0,0,0, 0,0,3,0, 0,0,0,
    0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 5,0,0,0, 0,5,0,0,
    0, 1, 5
),

-- ── Mark Egerson ──────────────────────────────────────────────
-- AGI=2D+2=8  COO=2D+2=8  VIG=2D+2=8  SAV=3D+2=11  PER=2D+2=8  CHA=3D+2=11
-- Academique 6D=18  → bonus SAV=11 → 7
-- Persuasion 5D=15  → bonus CHA=11 → 4
(
    'MARK01', 'lone-ranger-2287', 'Mark Egerson',
    'Egerson', 'Mark', 'M', 45,
    'Grand, cheveux roux, barbe soignée, toujours impeccable. Juge-Journaliste au passé mystérieux.',
    8, 8, 8, 11, 8, 11,
    0,0,0,0, 0,0,0,0, 0,0,0,
    0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 4,0,0,0, 0,0,
    0,0,0,0, 7,0,0,0, 0,0,0,0,
    0, 1, 5
),

-- ── Jack Devlin (stats inventées) ─────────────────────────────
-- Attributs (42)   : AGI=6 COO=6 VIG=6 SAV=9 PER=9 CHA=6 = 42
-- Freebies (30)    : PER+3=12, CHA+3=9, jeux+8, escroquerie+5, observation+5, pistolet+6
-- Base skills (21) : jeux=7, escroquerie=7, pistolet=7
-- Bonus stockés    : jeux=15, escroquerie=12, observation=5, pistolet=13
(
    'JACK01', 'silver-bounty-6612', 'Jack Devlin',
    'Devlin', 'Jack', 'M', 38,
    'Costume trop propre pour Tecumah Gulch. Visage lisse et fermé. Joueur professionnel.',
    6, 6, 6, 9, 12, 9,
    0,0,0,0, 0,0,0,0, 0,0,0,
    0,0,0,0,
    13,0,0,0, 0,0,0,0,0,
    0,0,0,5, 0,15,0,0,0,
    0,0,0,12, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    0, 2, 5
),

-- ── Cole Reardon (stats inventées) ────────────────────────────
-- Attributs (42+6f): AGI=9 COO=9 VIG=9 SAV=6 PER=9 CHA=6 = 48
-- Freebies rest(24): pistolet+8, esquive+8, discretion+4, pister+4
-- Base skills (21) : pistolet=7, esquive=7, equitation=7
-- Bonus stockés    : pistolet=15, esquive=15, equitation=7, discretion=4, pister=4
(
    'COLE01', 'wanted-outlaw-3341', 'Cole Reardon',
    'Reardon', 'Cole', 'M', 44,
    'Taillé dans du cuir tanné. Quarante ans gravés dans chaque ride. Deux revolvers.',
    9, 9, 9, 6, 9, 6,
    0,0,4,15, 0,0,7,0, 0,0,0,
    0,0,0,0,
    15,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,4,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    0, 2, 5
),

-- ── Caleb Paddington ──────────────────────────────────────────
-- AGI=2D+2=8  COO=2D+2=8  VIG=2D+2=8  SAV=3D+2=11  PER=2D+2=8  CHA=3D+2=11
-- Pistolet 5D+2=17  → bonus COO=8  → 9
-- Esquive 5D=15     → bonus AGI=8  → 7
-- Equitation 5D=15  → bonus AGI=8  → 7
-- Academique 5D=15  → bonus SAV=11 → 4
-- Commander 4D=12   → bonus CHA=11 → 1
-- Persuasion 4D=12  → bonus CHA=11 → 1
-- Recherche 5D=15   → bonus PER=8  → 7
(
    'CALB01', 'crimson-bandit-7762', 'Caleb Paddington',
    'Paddington', 'Caleb', 'M', 48,
    'Chevelure rousse, silhouette alourdie, peau burinée, barbe mal rasée.',
    8, 8, 8, 11, 8, 11,
    0,0,0,7, 0,0,7,0, 0,0,0,
    0,0,0,0,
    9,0,0,0, 0,0,0,0,0,
    7,0,0,0, 0,0,0,0,0,
    0,0,0,0, 1,0,0,0, 0,0,
    0,0,0,0, 4,0,0,0, 0,0,0,0,
    0, 6, 20
),

-- ── Anthony de Beer ───────────────────────────────────────────
-- AGI=3D+1=10  COO=3D=9  VIG=3D+1=10  SAV=2D+2=8  PER=3D=9  CHA=2D+2=8
-- Pistolet 5D+2=17 → bonus COO=9  → 8
-- Esquive 5D=15    → bonus AGI=10 → 5
-- Equitation 5D=15 → bonus AGI=10 → 5
-- blessure_niveau=3 : Severely Wounded (balle dans le ventre)
(
    'ANTH01', 'bold-frontier-4481', 'Anthony de Beer',
    'de Beer', 'Anthony', 'M', 45,
    'Allure de bon père de famille. Chemise soigneusement repassée noire de sang séché et rouge de sang frais.',
    10, 9, 10, 8, 9, 8,
    0,0,0,5, 0,0,5,0, 0,0,0,
    0,0,0,0,
    8,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    3, 3, 10
),

-- ── The Bad Bald ──────────────────────────────────────────────
-- AGI=3D=9  COO=3D=9  VIG=4D=12  SAV=2D+2=8  PER=2D+2=8  CHA=2D+2=8
-- Esquive 4D+2=14    → bonus AGI=9 → 5
-- Equitation 4D+2=14 → bonus AGI=9 → 5
-- Pistolet 4D+2=14   → bonus COO=9 → 5
-- Pister 6D=18       → bonus PER=8 → 10
-- Recherche 5D=15    → bonus PER=8 → 7
-- Discretion 5D=15   → bonus AGI=9 → 6
(
    'TBALD1', 'dark-canyon-9923', 'The Bad Bald',
    'Bad Bald', 'The', 'M', 40,
    'Colosse chauve. Pelisse en fourrure d''ours. Mauvaise humeur permanente.',
    9, 9, 12, 8, 8, 8,
    0,0,6,5, 0,0,5,0, 0,0,0,
    0,0,0,0,
    5,0,0,0, 0,0,0,0,0,
    7,0,0,0, 0,0,0,0,10,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    0, 3, 10
),

-- ── Igor Russovski ────────────────────────────────────────────
-- AGI=2D+2=8  COO=2D+2=8  VIG=2D+2=8  SAV=4D=12  PER=3D=9  CHA=3D=9
-- Pistolet 5D=15           → bonus COO=8  → 7
-- Esquive 6D=18            → bonus AGI=8  → 10
-- Equitation 6D=18         → bonus AGI=8  → 10
-- Armes blanches 6D=18     → bonus AGI=8  → 10
-- Academique 6D=18         → bonus SAV=12 → 6
-- Endurance(alcool) 6D=18  → bonus VIG=8  → 10
(
    'RUSS01', 'rusty-gunslinger-1134', 'Igor Russovski',
    'Russovski', 'Igor', 'M', 42,
    'Grand et maigre. Monocle et pelisse en fourrure de renard blanc. Noble ruiné au jeu.',
    8, 8, 8, 12, 9, 9,
    0,10,0,10, 0,0,10,0, 0,0,0,
    0,0,0,10,
    7,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 6,0,0,0, 0,0,0,0,
    0, 3, 10
),

-- ── Ramon Defago / Psycho Orejas ──────────────────────────────
-- AGI=3D+1=10  COO=3D+1=10  VIG=3D=9  SAV=2D+2=8  PER=3D=9  CHA=2D+2=8
-- Armes blanches 6D=18 → bonus AGI=10 → 8
-- Esquive 4D+2=14      → bonus AGI=10 → 4
-- Equitation 4D+2=14   → bonus AGI=10 → 4
-- Pistolet 4D+1=13     → bonus COO=10 → 3
(
    'RAMO01', 'desert-prairie-5532', 'Psycho Orejas',
    'Defago', 'Ramon', 'M', 36,
    'Petit et râblé. Moustache lissée avec soin. Poncho et large chapeau. Expert au couteau.',
    10, 10, 9, 8, 9, 8,
    0,8,0,4, 0,0,4,0, 0,0,0,
    0,0,0,0,
    3,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    0, 3, 10
),

-- ── Mike Sullivan ─────────────────────────────────────────────
-- AGI=3D+2=11  COO=3D+2=11  VIG=3D=9  SAV=2D+1=7  PER=2D+2=8  CHA=2D+2=8
-- Pistolet 6D=18    → bonus COO=11 → 7
-- Fusil 5D=15       → bonus COO=11 → 4
-- Esquive 5D=15     → bonus AGI=11 → 4
-- Equitation 4D=12  → bonus AGI=11 → 1
-- Jeux(poker) 4D=12 → bonus PER=8  → 4
-- Discretion 5D=15  → bonus AGI=11 → 4
(
    'MIKS01', 'swift-revolver-8847', 'Mike Sullivan',
    'Sullivan', 'Mike', 'M', 22,
    'Visage juvénile, vêtements propres et repassés. Ressemble à un fils de bonne famille.',
    11, 11, 9, 7, 8, 8,
    0,0,4,4, 0,0,1,0, 0,0,0,
    0,0,0,0,
    7,4,0,0, 0,0,0,0,0,
    0,0,0,0, 0,4,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    0, 3, 10
);

-- ────────────────────────────────────────────────────────────
-- 2. CHARACTER_ITEMS
-- ────────────────────────────────────────────────────────────
-- Damages (pips fixes) :
--   Colt Army 1860 = 9 (3D)
--   Fusil de chasse = 15 (5D, premier tir)
--   Spencer Carbine = 12 (4D)
--   Sabre d'officier : bonus VIG+2D → 6 pips stockés (app ajoute VIG)
--   Couteau/couteau de chasse : bonus VIG+1D → 3 pips stockés (app ajoute VIG)
--   Couteaux de lancer : 2D fixes = 6 pips (sans VIG)

-- Scott O'Brian
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Chiffon blanc rayé de rouge', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'SCOT01';

-- Cassandra
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Vêtements de luxe', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'CASS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Maquillage', '', 'misc', 1, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'CASS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Miroir de poche', '', 'misc', 1, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'CASS01';

-- Dr. Mitch Sullivan
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Trousse de soin', '+1D aux jets de Médecine', 'misc', 1, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'MTCH01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Flasque de whisky', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'MTCH01';

-- Igor Dzerjinski
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Petit couteau', 'Mêlée : bonus VIG+1D (app ajoute VIG). Lancer : 2D fixes = 6 pips, ranges 3/10/20', 'weapon_melee', 1, 'equipped', 3, 3,10,20, 'comp_armes_blanches'
FROM characters WHERE access_code = 'IGOR01';

-- Walt Blackman — Colt confisqués par Bad Bald
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', 'Confisqué par Bad Bald lors de l''irruption', 'weapon_ranged', 2, 'inventory', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'WALT01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Flasque de whisky', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'WALT01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Jeu de cartes', '', 'misc', 1, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'WALT01';

-- Manuel Rodriguez
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 1, 'inventory', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'MANU01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Montre en argent', 'Achetée à Tucson. Orejas l''a déjà remarquée.', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'MANU01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Vêtements de luxe', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'MANU01';

-- Mark Egerson
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Carnet et crayon', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'MARK01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Appareil photographique', 'Confisqué par Mike Sullivan dès l''irruption', 'misc', 1, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'MARK01';

-- Jack Devlin
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 1, 'inventory', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'JACK01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Jeu de cartes', '', 'misc', 1, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'JACK01';

-- Cole Reardon — revolvers confisqués
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', 'Confisqué lors de l''irruption', 'weapon_ranged', 2, 'inventory', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'COLE01';

-- Caleb Paddington
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 1, 'equipped', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'CALB01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Bible d''Anthony', 'Offerte par Anthony de Beer. Caleb la porte dans sa veste.', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'CALB01';

-- Anthony de Beer
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 2, 'inventory', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'ANTH01';

-- The Bad Bald
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 1, 'equipped', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'TBALD1';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Fusil de chasse', '5D premier tir / 3D / 2D', 'weapon_ranged', 1, 'equipped', 15, 10,20,40, 'comp_fusil'
FROM characters WHERE access_code = 'TBALD1';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Couteau de chasse', 'Mêlée : bonus VIG+1D (app ajoute VIG). Lancer : 2D fixes = 6 pips, ranges 3/10/20', 'weapon_melee', 1, 'equipped', 3, 3,10,20, 'comp_armes_blanches'
FROM characters WHERE access_code = 'TBALD1';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860 (Blackman)', 'Confisqué sur Walt Blackman lors de l''irruption', 'weapon_ranged', 2, 'inventory', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'TBALD1';

-- Igor Russovski
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 1, 'equipped', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'RUSS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Sabre d''officier', 'Bonus VIG+2D : 6 pips stockés, app ajoute VIG', 'weapon_melee', 1, 'equipped', 6, 0,0,0, 'comp_armes_blanches'
FROM characters WHERE access_code = 'RUSS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Vêtements de luxe', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'RUSS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Bijoux', '', 'misc', 1, 'equipped', 0,0,0,0, ''
FROM characters WHERE access_code = 'RUSS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Vodka', '', 'misc', 3, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'RUSS01';

-- Ramon Defago (Psycho Orejas)
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 1, 'equipped', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'RAMO01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Couteaux de lancer', 'Dégâts 2D fixes = 6 pips, ranges 3/10/20', 'weapon_melee', 6, 'equipped', 6, 3,10,20, 'comp_armes_blanches'
FROM characters WHERE access_code = 'RAMO01';

-- Mike Sullivan
INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Colt Army 1860', '', 'weapon_ranged', 1, 'equipped', 9, 5,20,50, 'comp_pistolet'
FROM characters WHERE access_code = 'MIKS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Spencer Carbine', '', 'weapon_ranged', 1, 'inventory', 12, 10,30,80, 'comp_fusil'
FROM characters WHERE access_code = 'MIKS01';

INSERT INTO character_items (character_id, name, description, category, quantity, location, damage, range_short, range_medium, range_long, skill_key)
SELECT id, 'Jeu de cartes', '', 'misc', 1, 'inventory', 0,0,0,0, ''
FROM characters WHERE access_code = 'MIKS01';

-- ────────────────────────────────────────────────────────────
-- 3. CHARACTER_JOURNAL
-- ────────────────────────────────────────────────────────────

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Scott O''Brian',
       'QUI IL EST
       Irlandais de cinquante ans passés, Scott est arrivé parmi les premiers colons de Tecumah Gulch. Les O''Brian sont vite devenus la première fortune locale, mais à la mort du père la famille s''est déchirée dans une fusillade qui a tué deux frères et une sœur. Scott, l''aîné, a tout misé sur le Stars Saloon pour tourner la page. Élu maire l''an dernier à coups de tournées générales, il cherche désormais la respectabilité.

       CE QU''IL SAIT
       - Il connaît chaque recoin du saloon, chaque cachette, chaque planche qui grince.
       - Son fusil à double canon est rangé sous le comptoir — Orejas l''a mis hors de portée.
       - Dora, sa femme, pourrait rentrer à tout moment.

       SECRETS
       - La mort récente de son frère cadet Owen le hante. Tout le monde craint un regain de violence familiale O''Brian.
       - Il sait que Cassandra n''est pas vraiment sa nièce, mais il la protège comme si elle l''était.

       CE QU''IL VEUT CE SOIR
       Protéger Cassandra et ses clients. Garder la tête froide. Être le maire que la ville attend.'
FROM characters WHERE access_code = 'SCOT01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Cassandra',
       'QUI ELLE EST
       Seule prostituée à l''année à Tecumah Gulch. Officiellement présentée comme la nièce de Scott O''Brian — personne n''est vraiment dupe. Pendant la saison des travaux agricoles, une dizaine de filles la rejoignent et elle joue le rôle d''intermédiaire, touchant une prime.

       CE QU''ELLE SAIT
       - Elle lit les hommes mieux que quiconque dans cette pièce. Quand un homme ment, elle le voit.
       - Elle connaît les habitudes, les dettes et les secrets de la moitié des clients du saloon.
       - Le fusil de Scott est sous le comptoir — mais Orejas est juste derrière.

       SECRETS
       - Elle sent que les années ne lui font pas de cadeau. Ça ne la rend que plus séductrice — et plus désespérée.
       - Elle cherche, sans se l''avouer, un homme qui l''aimerait vraiment et l''emmènerait loin d''ici.

       CE QU''ELLE VEUT CE SOIR
       Survivre. Protéger Scott si elle peut. Et peut-être, pour une fois, être autre chose qu''un décor.'
FROM characters WHERE access_code = 'CASS01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Dr. Mitch Sullivan',
       'QUI IL EST
       Irlandais d''origine et fier de l''être. Ancien chirurgien de l''armée nordiste pendant la guerre de Sécession. Il a scié des jambes et des bras à longueur de temps, ce qui l''a dégoûté de son métier et des hommes. Il noie depuis dans le whiskey des images qu''il ne peut plus éteindre.

       CE QU''IL SAIT
       - Il est le seul médecin disponible ce soir. Il le sait. La bande le sait.
       - Il peut gagner du temps sur l''opération — ou accélérer les choses.
       - Des rumeurs veulent le remplacer par un médecin de Tucson. Ça empire sa déprime.

       SECRETS
       - Ses mains tremblent légèrement. Ça empire depuis six mois.
       - Quelque part sous l''alcool et le désespoir, il veut encore sauver des gens. Ce soir c''est peut-être sa dernière chance.

       CE QU''IL VEUT CE SOIR
       Sauver le blessé. Prouver — à lui-même surtout — qu''il peut encore le faire.'
FROM characters WHERE access_code = 'MTCH01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Igor Dzerjinski',
       'QUI IL EST
       Russe d''origine, anarchiste convaincu. La famille Dzerjinski a fui le tsar pour trouver la liberté en Amérique — et a déchanté. Ils ont mis leurs idéaux de côté pour survivre, ouvert une tannerie, puis mis la main sur la forge du "vieux Tom" dans des circonstances que personne n''a jamais pu prouver. Igor a travaillé à Saint-Pétersbourg : c''est le cerveau de la famille.

       CE QU''IL SAIT
       - C''est lui qui a forgé les barreaux de la fenêtre arrière. Il sait exactement comment ils sont fixés et combien de force il faut pour les desceller.
       - Son frère Boris fait ce qu''il lui dit. Toujours.

       SECRETS
       - Ses idéaux anarchistes remontent à la surface dans les situations de crise. Il peut avoir des opinions difficiles à taire sur la propriété capitaliste du magot.

       CE QU''IL VEUT CE SOIR
       Trouver la solution logique et l''appliquer. Et garder Boris hors de problèmes.'
FROM characters WHERE access_code = 'IGOR01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Boris Dzerjinski',
       'QUI IL EST
       Frère cadet d''Igor. Carrure inversement proportionnelle à ses ambitions intellectuelles. Boris n''a jamais eu besoin de penser — Igor est là pour ça. Il exécute, il soulève, il casse ce qu''Igor lui dit de casser.

       CE QU''IL SAIT
       - Ce que lui dit Igor. Pas grand chose de plus.
       - Il sait que les barreaux de la fenêtre arrière bougent — il a aidé son frère à les poser.

       SECRETS
       - Sous la brute, Boris est profondément loyal et sensible. Il ne le montrerait pour rien au monde.

       CE QU''IL VEUT CE SOIR
       Que son frère lui dise quoi faire. Et que tout le monde rentre chez soi.'
FROM characters WHERE access_code = 'BORI01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Walt Blackman',
       'QUI IL EST
       Une légende. Celui qui a pourchassé les frères Crutch, arrêté Burke et Sykse, abattu plus de douze malfrats en trente ans de carrière. C''est Mark Egerson qui l''a fait venir à Tecumah Gulch. Egerson regrette son lobbying.

       SITUATION AU DÉBUT DE SCÈNE
       Au sol, assommé, désarmé. Ses deux Colt sont à la ceinture de Bad Bald. Il dessaoule lentement — les vieux réflexes reviennent avec la lucidité.

       SECRETS
       - Sous l''ennui et l''alcool, Blackman reste une fine gâchette. Que de mauvais garçons viennent sur son territoire et il retrouve vite ses vieux réflexes.
       - Il s''ennuie tellement à Tecumah Gulch que, quelque part, ce soir lui rappelle pourquoi il a choisi ce métier.

       CE QU''IL VEUT CE SOIR
       Récupérer ses Colt. Le reste suivra.'
FROM characters WHERE access_code = 'WALT01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Manuel Rodriguez',
       'QUI IL EST
       Les Rodriguez vivent en Arizona depuis plusieurs générations. Leur ferme dans la sierra est la plus prospère de la vallée. Pas de secret : les Rodriguez travaillent nuit et jour. Ça commence à faire des jaloux — surtout que "quand même, ce sont des Mexicains."

       CE QU''IL SAIT
       - Il est venu en ville régler une affaire de fourrage. Il repart demain à l''aube.
       - Sa montre en argent attire les mauvais regards — Orejas l''a déjà reluquée.

       SECRETS
       - Manuel est jovial au premier abord, mais cassant dès qu''il sent le moindre reproche.
       - Il subit le racisme ambiant en silence — jusqu''à un certain point. Ce soir, sous pression, ce point pourrait être atteint.

       CE QU''IL VEUT CE SOIR
       Rentrer chez lui vivant. Garder sa montre.'
FROM characters WHERE access_code = 'MANU01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Mark Egerson',
       'QUI IL EST
       Arrivé à Tecumah Gulch juste après la première vague de colons. Il n''a jamais parlé de son passé. A fondé le journal local, ouvert un Telegraph Office sans télégraphe, et fait venir Walt Blackman en ville.

       CE QU''IL SAIT
       - En tant que juge, il reconnaîtra le sceau officiel sur la mallette s''il peut l''examiner.
       - Un titre de propriété sur des terres indiennes — il en comprend immédiatement les implications légales et politiques.
       - Il a l''autorité pour rédiger des documents légaux (sauf-conduits, actes officiels).

       SECRETS
       - Personne ne connaît son passé. A-t-il changé d''identité ? Fuit quelque chose ? Quelqu''un ?

       CE QU''IL VEUT CE SOIR
       Observer. Comprendre. Et sortir de là avec une histoire à raconter dans son journal.'
FROM characters WHERE access_code = 'MARK01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Jack Devlin',
       'QUI IL EST
       Originaire de La Nouvelle-Orléans. Parcourt les saloons de l''Ouest depuis dix ans. Mémoire photographique des visages et des comportements.

       CE QU''IL SAIT
       - Il arrivait de Tucson il y a trois jours. Il a croisé la route de la bande avant l''attaque de la diligence.
       - Il sait ce qu''ils ont volé et à qui appartenait le contenu de la mallette. C''est une information qu''il garde pour lui pour l''instant.

       SECRETS
       - Cette information, dans la bonne bouche, vaut bien plus que le contenu de la sacoche.
       - Il a déjà raflé trois pots ce soir et ses poches sont lourdes. Il a plus à perdre que la plupart.

       CE QU''IL VEUT CE SOIR
       Évaluer la situation comme une partie de poker. Et sortir avec ses gains et sa peau.'
FROM characters WHERE access_code = 'JACK01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Cole Reardon',
       'QUI IL EST
       Homme à tout faire pour qui paie. Ni bon ni mauvais — juste un homme qui a survécu longtemps dans un pays dangereux.

       CE QU''IL SAIT
       - Il a chevauché avec Caleb Paddington il y a douze ans. Leurs routes se sont séparées sans éclat ni réconciliation.
       - Caleb l''a reconnu en entrant dans le saloon. Reardon aussi. Aucun des deux n''a rien dit.
       - Ses revolvers ont été confisqués. Mais Cole Reardon sans arme reste Cole Reardon.

       SECRETS
       - Son lien avec la bande est ni amical ni hostile — plus compliqué que ça. Ce soir va forcer un choix qu''il repoussait depuis des années.

       CE QU''IL VEUT CE SOIR
       Survivre. Et décider, une bonne fois pour toutes, de quel côté il se trouve.'
FROM characters WHERE access_code = 'COLE01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Caleb Paddington',
       'QUI IL EST
       Soldat pendant trois ans dans le corps de cavalerie de l''US Army, renvoyé pour insubordination. Il a depuis bâti une réputation de brigand dans la région. La bande n''a jamais réussi le gros coup dont elle rêvait — mais ce soir devait changer les choses.

       CE QU''IL SAIT
       - Il connaît Tecumah Gulch — il a fait ses reconnaissances. Vallée encaissée, difficile à localiser pour des poursuivants. Un médecin en ville.
       - Il a reconnu Cole Reardon dès l''entrée. Il n''a rien dit.

       OBJECTIF CE SOIR
       Soigner Anthony. Repartir avec le magot. Pas de mort inutile.

       POINT DE RUPTURE
       Si Anthony meurt, Caleb perd sa boussole. Tout devient possible — y compris le pire.'
FROM characters WHERE access_code = 'CALB01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Anthony de Beer',
       'QUI IL EST
       Le plus vieil ami de Caleb Paddington — ils gardaient les vaches ensemble au Texas dans leur jeunesse. Quarante-cinq ans, l''allure d''un bon père de famille. Depuis quelques mois il songe à raccrocher, fonder une famille. Il se tourne vers la religion à la recherche d''absolution.

       SITUATION
       Balle dans le ventre. Il a perdu beaucoup de sang. Sans opération il est mort dans 2 à 3 heures. C''est le compte à rebours du scénario.

       SECRETS
       - Il cherche l''absolution depuis des mois. C''est peut-être ce soir qu''il va la trouver — ou pas.
       - Sa mort changerait tout pour Caleb. Et pour la soirée entière.'
FROM characters WHERE access_code = 'ANTH01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — The Bad Bald',
       'QUI IL EST
       Réputé pour une mauvaise humeur qui ne le quitte jamais. Grogne, vitupère, langage ordurier. Victime d''un scalp dans sa jeunesse, il voue depuis une haine farouche aux Indiens.

       RÔLE CE SOIR
       Surveille les otages. A renversé et désarmé Walt Blackman dès l''entrée — pour l''exemple. Porte les deux Colt du shérif à sa ceinture en plus de ses propres armes.

       COMPORTEMENT
       Affûte son couteau sur son talon ferré en permanence. Cherche une excuse pour que les choses dégénèrent.'
FROM characters WHERE access_code = 'TBALD1';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Igor Russovski',
       'QUI IL EST
       Igor Seyanov de son vrai nom. Noble ruiné au jeu, il a fui la Russie poursuivi par des créanciers. Il a trouvé dans le Grand Ouest un espace de liberté qui l''enchante malgré une nostalgie permanente de sa patrie.

       COMPORTEMENT
       Toujours d''une grande politesse, surtout avec les dames. Grand amateur de vodka et de chants. Aime discuter art ou littérature. Se bat au sabre de préférence.

       RÔLE CE SOIR
       Membre de la bande. Moins imprévisible qu''Orejas, moins brutal que Bad Bald. Peut être un interlocuteur inattendu pour des otages qui cherchent à dialoguer.'
FROM characters WHERE access_code = 'RUSS01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Psycho Orejas',
       'QUI IL EST
       Ramon Defago. A connu Caleb au cours d''une évasion d''un pénitencier texan. Expert en couteaux — peut tuer un homme à distance. Commence ses interrogatoires en coupant les oreilles ("Orejas").

       ÉTAT MENTAL
       Il n''était pas particulièrement cruel au départ. En se forçant à commettre des actes atroces pour se faire accepter, il a fortement altéré son psychisme. Accès de démence incontrôlables.

       RÔLE CE SOIR
       Derrière le comptoir, revolver sur la nuque de Scott. La bombe à retardement du scénario. Sa dégradation progressive au fil de la soirée est un déclencheur potentiel de l''acte 3.

       POINT DE RUPTURE
       Un regard de travers. Une phrase de trop. Sans Caleb pour le tenir, il peut décider de terminer la soirée à sa façon.'
FROM characters WHERE access_code = 'RAMO01';

INSERT INTO character_journal (character_id, type, title, body)
SELECT id, 'note', 'Fiche — Mike Sullivan',
       'QUI IL EST
       Le plus jeune de la bande. Tireur réputé — Caleb a traversé la moitié du continent pour le recruter. Obsédé par sa propre légende en construction.

       COMPORTEMENT
       Arrogant, sans pitié en apparence. Capable de tuer de sang-froid. Mais c''est la première fois que quelque chose tourne vraiment mal, et ça se sent sous le vernis.

       RÔLE CE SOIR
       Surveille la porte d''entrée. Son arrogance cache une anxiété réelle.

       POINT DE RUPTURE
       Si Orejas fait quelque chose d''irréparable, Sullivan peut décider que sa légende vaut mieux construite ailleurs. Il n''est loyal qu''à lui-même.'
FROM characters WHERE access_code = 'MIKS01';