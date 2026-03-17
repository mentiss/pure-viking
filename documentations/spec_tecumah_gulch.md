# Spec — Slug `tecumah` : Tecumah Gulch

> Version 1.0 — Spécification complète  
> Statut : **Prêt pour Phase 3 (implémentation)**  
> Dernière mise à jour : mars 2026

---

## Sommaire

1. [Identité du système](#1-identité-du-système)
2. [Modèle de données — BDD SQLite](#2-modèle-de-données--bdd-sqlite)
3. [Architecture Backend](#3-architecture-backend)
4. [Mécanique de dés — D6 System + Wild Die](#4-mécanique-de-dés--d6-system--wild-die)
5. [Architecture Frontend](#5-architecture-frontend)
6. [Fiche joueur — Contrat de données](#6-fiche-joueur--contrat-de-données)
7. [Thème CSS](#7-thème-css)
8. [Création de personnage — Wizard](#8-création-de-personnage--wizard)
9. [Système de combat](#9-système-de-combat)
10. [Phasage d'implémentation](#10-phasage-dimplémentation)
11. [Checklist finale](#11-checklist-finale)

---

## 1. Identité du système

| Propriété | Valeur |
|---|---|
| **Slug** | `tecumah` |
| **Label** | `Tecumah Gulch` |
| **BDD** | `database/tecumah.db` |
| **Schéma** | `database-template/tecumah-schema.sql` |
| **URL joueur** | `/tecumah/` |
| **URL GM** | `/tecumah/gm` |
| **Univers** | Far West — Western pur |
| **Thème** | Cuir / sable / ocre / bordeaux — mode jour & nuit |

---

## 2. Modèle de données — BDD SQLite

### 2.1 Principe de stockage des valeurs `XD+Y`

Toutes les valeurs de dés (attributs, compétences, dégâts d'armes) sont stockées en **pips entiers**.

```
1D     = 3 pips
1D+1   = 4 pips
1D+2   = 5 pips
2D     = 6 pips
...
12D    = 36 pips
```

Conversion à l'affichage :
```js
const dice = Math.floor(pips / 3);
const rest = pips % 3;
// rest === 0 ? `${dice}D` : `${dice}D+${rest}`
```

Valeur minimum : `0` (compétence non investie — jet sur attribut seul).  
Valeur maximum : `36` (12D).

### 2.2 Table `characters`

```sql
CREATE TABLE IF NOT EXISTS characters (
    -- ── Colonnes génériques obligatoires ─────────────────────────────────
                                          id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                          access_code     TEXT UNIQUE NOT NULL,   -- max 6 caractères
                                          access_url      TEXT UNIQUE NOT NULL,
                                          player_name     TEXT NOT NULL,
                                          nom             TEXT NOT NULL DEFAULT '',
                                          prenom          TEXT NOT NULL DEFAULT '',
                                          avatar          TEXT DEFAULT NULL,
                                          login_attempts  INTEGER DEFAULT 0,
                                          last_attempt_at DATETIME,
                                          last_accessed   DATETIME,
                                          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- ── Identité étendue ──────────────────────────────────────────────────
                                          age             INTEGER DEFAULT NULL,
                                          taille          TEXT DEFAULT '',        -- texte libre (ex: "1m78")
                                          sexe            TEXT DEFAULT '',        -- texte libre
                                          description     TEXT DEFAULT '',        -- texte narratif libre

    -- ── Attributs (pips, min 3 = 1D, max 36 = 12D) ───────────────────────
                                          agilite         INTEGER DEFAULT 6,      -- 2D par défaut
                                          vigueur         INTEGER DEFAULT 6,
                                          coordination    INTEGER DEFAULT 6,
                                          perception      INTEGER DEFAULT 6,
                                          charisme        INTEGER DEFAULT 6,
                                          savoir          INTEGER DEFAULT 6,

    -- ── Compétences Agilité (0 = non investie) ───────────────────────────
                                          comp_acrobatie      INTEGER DEFAULT 0,
                                          comp_armes_blanches INTEGER DEFAULT 0,
                                          comp_discretion     INTEGER DEFAULT 0,
                                          comp_esquive        INTEGER DEFAULT 0,
                                          comp_contorsion     INTEGER DEFAULT 0,
                                          comp_lutte          INTEGER DEFAULT 0,
                                          comp_equitation     INTEGER DEFAULT 0,
                                          comp_escalade       INTEGER DEFAULT 0,
                                          comp_saut           INTEGER DEFAULT 0,
                                          comp_lasso          INTEGER DEFAULT 0,
                                          comp_rodeo          INTEGER DEFAULT 0,

    -- ── Compétences Vigueur ───────────────────────────────────────────────
                                          comp_course         INTEGER DEFAULT 0,
                                          comp_nage           INTEGER DEFAULT 0,
                                          comp_puissance      INTEGER DEFAULT 0,
                                          comp_endurance      INTEGER DEFAULT 0,

    -- ── Compétences Coordination ─────────────────────────────────────────
                                          comp_pistolet         INTEGER DEFAULT 0,
                                          comp_fusil            INTEGER DEFAULT 0,
                                          comp_arc              INTEGER DEFAULT 0,
                                          comp_artillerie       INTEGER DEFAULT 0,
                                          comp_prestidigitation INTEGER DEFAULT 0,
                                          comp_crochetage       INTEGER DEFAULT 0,
                                          comp_arme_de_jet      INTEGER DEFAULT 0,
                                          comp_lancer           INTEGER DEFAULT 0,
                                          comp_bricolage        INTEGER DEFAULT 0,

    -- ── Compétences Perception ───────────────────────────────────────────
                                          comp_recherche      INTEGER DEFAULT 0,
                                          comp_enquete        INTEGER DEFAULT 0,
                                          comp_intuition      INTEGER DEFAULT 0,
                                          comp_observation    INTEGER DEFAULT 0,
                                          comp_camouflage     INTEGER DEFAULT 0,
                                          comp_jeux           INTEGER DEFAULT 0,
                                          comp_survie         INTEGER DEFAULT 0,
                                          comp_chariots       INTEGER DEFAULT 0,
                                          comp_pister         INTEGER DEFAULT 0,
                                          comp_reflexes       INTEGER DEFAULT 0,  -- initiative

    -- ── Compétences Charisme ─────────────────────────────────────────────
                                          comp_charme         INTEGER DEFAULT 0,
                                          comp_negocier       INTEGER DEFAULT 0,
                                          comp_commander      INTEGER DEFAULT 0,
                                          comp_escroquerie    INTEGER DEFAULT 0,
                                          comp_persuasion     INTEGER DEFAULT 0,
                                          comp_volonte        INTEGER DEFAULT 0,
                                          comp_dressage       INTEGER DEFAULT 0,
                                          comp_deguisement    INTEGER DEFAULT 0,
                                          comp_intimider      INTEGER DEFAULT 0,
                                          comp_comedie        INTEGER DEFAULT 0,

    -- ── Compétences Savoir ───────────────────────────────────────────────
                                          comp_langues            INTEGER DEFAULT 0,
                                          comp_geographie         INTEGER DEFAULT 0,
                                          comp_evaluer            INTEGER DEFAULT 0,
                                          comp_medecine           INTEGER DEFAULT 0,
                                          comp_academique         INTEGER DEFAULT 0,
                                          comp_lois               INTEGER DEFAULT 0,
                                          comp_falsification      INTEGER DEFAULT 0,
                                          comp_ingenierie         INTEGER DEFAULT 0,
                                          comp_business           INTEGER DEFAULT 0,
                                          comp_botanique          INTEGER DEFAULT 0,
                                          comp_cultures_indiennes INTEGER DEFAULT 0,
                                          comp_demolition         INTEGER DEFAULT 0,

    -- ── Santé ─────────────────────────────────────────────────────────────
    -- 0=Sain 1=Stunned 2=Wounded 3=Severely Wounded 4=Incapacitated 5=Mortal
                                          blessure_niveau     INTEGER DEFAULT 0,

    -- ── Ressources individuelles ──────────────────────────────────────────
                                          points_destin       INTEGER DEFAULT 3,
                                          points_personnage   INTEGER DEFAULT 0
);

-- Compte GM obligatoire (id = -1)
INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom, prenom)
VALUES (-1, 'GMCODE', 'this-is-MJ', 'Game Master', 'GM', '');
```

### 2.3 Table `character_backgrounds`

Les backgrounds sont en nombre variable avec des niveaux évolutifs — table séparée.

```sql
CREATE TABLE IF NOT EXISTS character_backgrounds (
                                                     id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     character_id INTEGER NOT NULL,
                                                     type         TEXT NOT NULL,     -- 'rentier' | 'contacts' | 'ressources' | 'allies' |
    -- 'recherche' | 'duelliste' | 'ancien_prisonnier' |
    -- 'ancien_militaire' | 'reputation' | 'destinee' |
    -- 'cible' | 'ressources'
                                                     niveau       INTEGER DEFAULT 1,
                                                     notes        TEXT DEFAULT '',   -- détails narratifs libres
                                                     created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                     FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

### 2.4 Table `character_items`

Pattern identique à Vikings. Les dégâts sont stockés en pips (conversion depuis `XD+Y` à la saisie).

```sql
CREATE TABLE IF NOT EXISTS character_items (
                                               id           INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id INTEGER NOT NULL,
                                               name         TEXT NOT NULL DEFAULT '',
                                               description  TEXT DEFAULT '',
                                               category     TEXT DEFAULT 'misc',  -- 'weapon_ranged' | 'weapon_melee' | 'misc'
                                               quantity     INTEGER DEFAULT 1,
                                               location     TEXT DEFAULT 'inventory',  -- 'inventory' | 'equipped'

    -- Armes uniquement
                                               damage_pips  INTEGER DEFAULT 0,    -- dégâts fixes en pips (0 = pas une arme)
                                               range_short  INTEGER DEFAULT 0,    -- portée courte en mètres (0 = CàC)
                                               range_medium INTEGER DEFAULT 0,    -- portée moyenne
                                               range_long   INTEGER DEFAULT 0,    -- portée longue (0 = CàC)

    -- Compétence associée (ex: 'comp_pistolet', 'comp_armes_blanches')
                                               skill_key    TEXT DEFAULT '',

                                               created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                                               FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

### 2.5 Tables transversales (verbatim standard)

Identiques aux autres slugs — `game_sessions`, `session_characters`, `dice_history`,
`character_journal`, `refresh_tokens`, `npc_templates`.

La table `game_sessions` reçoit une colonne supplémentaire pour la jauge de complications :

```sql
CREATE TABLE IF NOT EXISTS game_sessions (
                                             id            INTEGER PRIMARY KEY AUTOINCREMENT,
                                             name          TEXT NOT NULL,
                                             description   TEXT,
                                             is_active     INTEGER DEFAULT 0,
                                             complications INTEGER DEFAULT 0,   -- jauge GM, repart à 0 chaque session
                                             created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Architecture Backend

### 3.1 Structure des fichiers

```
src/server/systems/tecumah/
  config.js
  characterController.js
  routes/
    characters.js          ← CRUD personnage + backgrounds + items
  socket/
    complications.js       ← jauge complications + PD/PP/blessures temps réel
```

### 3.2 `config.js`

```js
const path = require('path');
module.exports = {
    slug:       'tecumah',
    label:      'Tecumah Gulch',
    dbPath:     path.join(__dirname, '../../../database/tecumah.db'),
    schemaPath: path.join(__dirname, '../../../database-template/tecumah-schema.sql'),
};
```

### 3.3 `characterController.js`

`loadFullCharacter` retourne :

```js
{
    // toutes les colonnes characters
    backgrounds: [ { id, type, niveau, notes } ],
        items:       [ { id, name, description, category, quantity,
        location, damage_pips, range_short, range_medium,
        range_long, skill_key } ],
}
```

`saveFullCharacter` :
- Met à jour toutes les colonnes `characters` (attributs, compétences, santé, ressources, identité)
- CRUD `character_backgrounds` : delete all + re-insert
- CRUD `character_items` : delete all + re-insert

### 3.4 Socket `complications.js`

| Événement entrant | Payload | Action |
|---|---|---|
| `tecumah-add-complication` | `{ sessionId }` | `complications += 1` → broadcast |
| `tecumah-spend-complication` | `{ sessionId, amount }` | `complications = max(0, complications - amount)` → broadcast |
| `tecumah-update-pd` | `{ characterId, delta }` | `points_destin += delta` (clamp ≥ 0) → light-update |
| `tecumah-update-pp` | `{ characterId, delta }` | `points_personnage += delta` (clamp ≥ 0) → light-update |
| `tecumah-update-health` | `{ characterId, niveau }` | `blessure_niveau = niveau` (0–5) → light-update |

| Événement sortant | Payload |
|---|---|
| `tecumah-complications-update` | `{ sessionId, complications }` |
| `character-light-update` | `{ characterId, updates: { points_destin? , points_personnage?, blessure_niveau? } }` |

---

## 4. Mécanique de dés — D6 System + Wild Die

### 4.1 Principe

Chaque jet utilise un **pool de dés d6**. Le pool total = attribut + compétence (en pips, convertis en dés).

Le **Wild Die** est un dé d6 spécial qui remplace l'un des dés du pool :
- Il **explose** sur un résultat de 6 (relance cumulée, valeurs additionnées)
- Un résultat initial de **1** génère une **complication** pour le GM (la complication est transmise via socket — le jet reste valide si le total bat la difficulté)

### 4.2 Bonus/Malus

Deux sources de modificateurs s'appliquent au pool **en dés entiers** :

| Source | Effet | Déclaration |
|---|---|---|
| **Malus blessure** | Stunned -1D / Wounded -2D / Severely Wounded -3D / Incapacitated = impossible | Automatique |
| **Dépense PP** | +1D par PP dépensé | Avant le jet, déclaré par le joueur |
| **Dépense PD** | Pool effectif × 2 | Avant le jet, déclaré par le joueur (exclusif PP) |
| **Bonus/Malus libre** | ±X entier (en dés) | Saisi librement dans la modale |

> ⚠️ PP et PD sont **mutuellement exclusifs** sur un même jet. On ne peut pas cumuler les deux.

### 4.3 Malus actions multiples

Chaque action supplémentaire au-delà de la première subit `-1D` :

| Action | Malus |
|---|---|
| 1ère action | 0D |
| 2ème action | -1D |
| 3ème action | -2D |
| Nème action | -(N-1)D |

Ce malus s'applique sur le pool effectif (après bonus/malus blessure). Il est saisi manuellement dans la modale via le champ bonus/malus libre.

### 4.4 Structure `buildNotation(ctx)`

Le Wild Die étant mécaniquement distinct, il est isolé dans un groupe séparé :

```
Groupe 0 : (pool - 1)d6         → dés normaux
Groupe 1 : 1d6!                 → Wild Die (explosion sur 6)
```

Si `pool = 1D` : uniquement le Wild Die (`["1d6!"]`, un seul groupe).

```js
buildNotation: (ctx) => {
    const { attrPips, compPips, bonusDice = 0, malus = 0 } = ctx.systemData;

    // Calcul du pool effectif
    const totalPips  = attrPips + compPips;
    const baseDice   = Math.floor(totalPips / 3);
    const pool       = Math.max(1, baseDice + bonusDice - malus);

    // Stocker le reste (pips résiduels) dans ctx pour afterRoll
    ctx.systemData._restePips = totalPips % 3;
    ctx.systemData._pool      = pool;

    const normalDice = pool - 1;
    return normalDice > 0
        ? [`${normalDice}d6`, `1d6!`]
        : [`1d6!`];
},
```

### 4.5 `afterRoll(raw, ctx)`

```js
afterRoll: (raw, ctx) => {
    const { difficulte, _restePips = 0, _pool } = ctx.systemData;

    const hasNormalGroup = raw.groups.length === 2;
    const normalValues   = hasNormalGroup ? raw.groups[0].values : [];
    const wildValues     = raw.groups[hasNormalGroup ? 1 : 0].values;

    // Le premier résultat du Wild Die (avant explosions éventuelles)
    const wildDieInitial = wildValues[0];
    const isComplication = wildDieInitial === 1;

    // Total = somme de tous les dés + pips résiduels de la notation
    const total = [...normalValues, ...wildValues]
        .reduce((sum, v) => sum + v, 0) + _restePips;

    // Résolution vs difficulté fixe (null = jet libre, pas de comparaison)
    const succes = difficulte !== null ? total >= difficulte : null;

    return {
        normalValues,
        wildValues,
        wildDieInitial,
        isComplication,
        total,
        restePips:  _restePips,
        pool:       _pool,
        difficulte,
        succes,
        successes:  succes ? 1 : 0,  // pour la persistance générique
    };
},
```

### 4.6 `buildAnimationSequence(raw, ctx, result)`

Le Wild Die est visuellement distinct des dés normaux (couleur or).

```js
buildAnimationSequence: (raw, ctx, result) => {
    const hasNormalGroup = raw.groups.length === 2;
    const groups = [];

    if (hasNormalGroup) {
        groups.push({
            id:       'normal',
            diceType: 'd6',
            color:    'default',
            label:    ctx.label ?? 'Jet',
            waves:    [{ dice: raw.groups[0].values }],
        });
    }
    groups.push({
        id:       'wild',
        diceType: 'd6',
        color:    'gold',
        label:    'Wild Die',
        waves:    [{ dice: raw.groups[hasNormalGroup ? 1 : 0].values }],
    });

    return { mode: 'single', groups };
},
```

### 4.7 Gestion de la complication après `roll()`

La complication est émise par le **composant** après que `roll()` a rendu la main :

```js
const result = await roll(notation, ctx, tecumahConfig.dice);

if (result.isComplication && socket && activeGMSession) {
    socket.emit('tecumah-add-complication', { sessionId: activeGMSession });
}
setResult(result);
```

### 4.8 Dépense PD — doublement du pool

La dépense de PD double le pool **avant** la construction de la notation. Elle est gérée dans `buildNotation` :

```js
// Si pdDepense = true dans ctx.systemData :
const pool = pdDepense
    ? Math.max(1, baseDice + bonusDice - malus) * 2
    : Math.max(1, baseDice + bonusDice - malus);
```

> ⚠️ `pdDepense` et `bonusDice` (PP) sont mutuellement exclusifs — la modale ne permet pas de cocher les deux.

---

## 5. Architecture Frontend

### 5.1 Structure des fichiers

```
src/client/src/systems/tecumah/
  config.jsx
  theme.css
  Sheet.jsx
  Creation.jsx
  GMApp.jsx
  utils/
    diceUtils.js           ← pipsToNotation, getEffectivePips, calculs défense
    xpCosts.js             ← tableau des coûts XP
    backgrounds.js         ← liste officielle des backgrounds avec descriptions
    skills.js              ← mapping compétences → attribut parent, liste complète
  components/
    AttributeRow.jsx       ← label + XD+Y + bouton jet
    SkillRow.jsx           ← label + XD+Y calculé + bouton jet
    HealthTrack.jsx        ← 5 niveaux de blessure cliquables
    BackgroundList.jsx     ← liste éditable, type + niveau + notes
    ResourcesBar.jsx       ← PD + PP avec boutons +/−
    DefensePanel.jsx       ← naturelle / active / totale / résistance fixe (calc.)
    ItemRow.jsx            ← nom + dégâts XD+Y + portée + équipé
    InventoryTab.jsx       ← liste items + armes équipées
    XPPanel.jsx            ← coûts, dépense PP, historique
  dice/
    TecumahDiceModal.jsx   ← jet complet (attr + comp + bonus + PD/PP)
  gm/
    GMView.jsx
    tabs/
      TabSession.jsx
      TabJournal.jsx
      TabCombat.jsx
    modals/
      GMDiceModal.jsx
      ComplicationsPanel.jsx   ← jauge + dépense complications
```

### 5.2 `utils/diceUtils.js`

```js
// Conversion pips ↔ affichage
export const pipsToNotation = (pips) => {
    if (pips === 0) return '—';
    const d = Math.floor(pips / 3);
    const r = pips % 3;
    return r === 0 ? `${d}D` : `${d}D+${r}`;
};

export const notationToPips = (dice, pips = 0) => dice * 3 + pips;

// Pool effectif pour un jet (attribut + compétence)
// Si comp = 0, jet sur l'attribut seul
export const getEffectivePips = (attrPips, compPips) => attrPips + compPips;

// Défense naturelle (base 10, bonus selon Esquive ou Agilité)
export const getDefenseNaturelle = (esquivePips) => {
    const base = 10;
    if (esquivePips < 6)  return base - 1;   // < 2D
    if (esquivePips <= 17) return base;       // 2D → 5D+2
    if (esquivePips <= 20) return base + 1;   // 4D+1 → 6D
    if (esquivePips <= 26) return base + 2;   // 6D+1 → 8D+2
    return base + 3;                          // ≥ 8D+1
};

// Défense active = pips d'esquive tels quels (= Codes-Dés × 3 + pips résiduels)
export const getDefenseActive = (esquivePips) => esquivePips;

// Défense totale = naturelle + active
export const getDefenseTotale = (esquivePips) =>
    getDefenseNaturelle(esquivePips) + getDefenseActive(esquivePips);

// Résistance fixe = pips de vigueur (même logique que défense active)
export const getResistanceFixe = (vigueurPips) => vigueurPips;

// Dégâts naturels (armes blanches) = ceil(max(vigueur, puissance) en dés / 2)
export const getDegatsNaturels = (vigueurPips, puissancePips) => {
    const best = Math.max(vigueurPips, puissancePips);
    const dice = Math.floor(best / 3);
    return Math.ceil(dice / 2);
};

// Malus blessure en dés
export const getBlessureMalus = (niveau) => {
    // 0=Sain 1=Stunned 2=Wounded 3=Severely Wounded 4=Incapacitated 5=Mortal
    return [0, 1, 2, 3, Infinity, Infinity][niveau] ?? 0;
};
```

### 5.3 `utils/skills.js`

```js
// Mapping complet compétences → attribut parent
// Utilisé pour construire les jets et la fiche
export const SKILLS = {
    // Agilité
    comp_acrobatie:       { label: 'Acrobatie',        attr: 'agilite' },
    comp_armes_blanches:  { label: 'Armes blanches',   attr: 'agilite' },
    comp_discretion:      { label: 'Discrétion',       attr: 'agilite' },
    comp_esquive:         { label: 'Esquive',          attr: 'agilite' },
    comp_contorsion:      { label: 'Contorsion',       attr: 'agilite' },
    comp_lutte:           { label: 'Lutte',            attr: 'agilite' },
    comp_equitation:      { label: 'Équitation',       attr: 'agilite' },
    comp_escalade:        { label: 'Escalade',         attr: 'agilite' },
    comp_saut:            { label: 'Saut',             attr: 'agilite' },
    comp_lasso:           { label: 'Lasso',            attr: 'agilite' },
    comp_rodeo:           { label: 'Rodéo',            attr: 'agilite' },
    // Vigueur
    comp_course:          { label: 'Course',           attr: 'vigueur' },
    comp_nage:            { label: 'Nage',             attr: 'vigueur' },
    comp_puissance:       { label: 'Puissance',        attr: 'vigueur' },
    comp_endurance:       { label: 'Endurance',        attr: 'vigueur' },
    // Coordination
    comp_pistolet:        { label: 'Pistolet',         attr: 'coordination' },
    comp_fusil:           { label: 'Fusil',            attr: 'coordination' },
    comp_arc:             { label: 'Arc',              attr: 'coordination' },
    comp_artillerie:      { label: 'Artillerie',       attr: 'coordination' },
    comp_prestidigitation:{ label: 'Prestidigitation', attr: 'coordination' },
    comp_crochetage:      { label: 'Crochetage',       attr: 'coordination' },
    comp_arme_de_jet:     { label: 'Arme de jet',      attr: 'coordination' },
    comp_lancer:          { label: 'Lancer',           attr: 'coordination' },
    comp_bricolage:       { label: 'Bricolage',        attr: 'coordination' },
    // Perception
    comp_recherche:       { label: 'Recherche',        attr: 'perception' },
    comp_enquete:         { label: 'Enquête',          attr: 'perception' },
    comp_intuition:       { label: 'Intuition',        attr: 'perception' },
    comp_observation:     { label: 'Observation',      attr: 'perception' },
    comp_camouflage:      { label: 'Camouflage',       attr: 'perception' },
    comp_jeux:            { label: 'Jeux',             attr: 'perception' },
    comp_survie:          { label: 'Survie',           attr: 'perception' },
    comp_chariots:        { label: 'Chariots',         attr: 'perception' },
    comp_pister:          { label: 'Pister',           attr: 'perception' },
    comp_reflexes:        { label: 'Réflexes',         attr: 'perception' },
    // Charisme
    comp_charme:          { label: 'Charme',           attr: 'charisme' },
    comp_negocier:        { label: 'Négocier',         attr: 'charisme' },
    comp_commander:       { label: 'Commander',        attr: 'charisme' },
    comp_escroquerie:     { label: 'Escroquerie',      attr: 'charisme' },
    comp_persuasion:      { label: 'Persuasion',       attr: 'charisme' },
    comp_volonte:         { label: 'Volonté',          attr: 'charisme' },
    comp_dressage:        { label: 'Dressage',         attr: 'charisme' },
    comp_deguisement:     { label: 'Déguisement',      attr: 'charisme' },
    comp_intimider:       { label: 'Intimider',        attr: 'charisme' },
    comp_comedie:         { label: 'Comédie',          attr: 'charisme' },
    // Savoir
    comp_langues:             { label: 'Langues',             attr: 'savoir' },
    comp_geographie:          { label: 'Géographie',          attr: 'savoir' },
    comp_evaluer:             { label: 'Évaluer',             attr: 'savoir' },
    comp_medecine:            { label: 'Médecine',            attr: 'savoir' },
    comp_academique:          { label: 'Académique',          attr: 'savoir' },
    comp_lois:                { label: 'Lois',                attr: 'savoir' },
    comp_falsification:       { label: 'Falsification',       attr: 'savoir' },
    comp_ingenierie:          { label: 'Ingénierie',          attr: 'savoir' },
    comp_business:            { label: 'Business',            attr: 'savoir' },
    comp_botanique:           { label: 'Botanique',           attr: 'savoir' },
    comp_cultures_indiennes:  { label: 'Cultures indiennes',  attr: 'savoir' },
    comp_demolition:          { label: 'Démolition',          attr: 'savoir' },
};

export const ATTRIBUTES = {
    agilite:     'Agilité',
    vigueur:     'Vigueur',
    coordination: 'Coordination',
    perception:  'Perception',
    charisme:    'Charisme',
    savoir:      'Savoir',
};
```

### 5.4 `utils/xpCosts.js`

```js
export const XP_COSTS = {
    newSkill:         8,                              // apprendre une nouvelle compétence
    pipSkill:         (currentDice) => currentDice * 2,  // +1 pip compétence
    diceSkill:        (currentDice) => currentDice * 6,  // +1D compétence
    pipAttribut:      (currentDice) => currentDice * 3,  // +1 pip attribut
    levelBackground:  (currentLevel) => currentLevel * 2, // +1 niveau background
};
```

### 5.5 `TecumahDiceModal.jsx` — flux

```
Étape 1 — Sélection
  ├── Choisir un attribut (bouton) OU une compétence (liste filtrée par attribut)
  ├── Difficulté : Very Easy / Easy / Moderate / Difficult / Very Difficult / Heroic / Libre
  └── Pool calculé affiché en XD+Y

Étape 2 — Modificateurs
  ├── Malus blessure : affiché automatiquement (non modifiable)
  ├── Dépense ressource : radio PD | PP | Aucun
  │     PP → saisir nb de PP (1 PP = +1D), déduit définitivement
  │     PD → doublement du pool, décrémente PD de 1
  ├── Bonus/Malus libre : champ ±X (en dés entiers, ex: -1 pour 2ème action)
  └── Pool final affiché

Étape 3 — Résultat (après await roll())
  ├── Dés normaux affichés
  ├── Wild Die affiché (couleur or, mention "Complication!" si 1 initial)
  ├── Total + pips résiduels
  └── ✅ Succès / ❌ Échec vs difficulté
```

---

## 6. Fiche joueur — Contrat de données

L'objet `character` retourné par `loadFullCharacter` et circulant dans les props :

```js
{
    // Identité
    id, access_code, access_url, player_name,
        nom, prenom, age, taille, sexe, description, avatar,

        // Attributs (pips)
        agilite, vigueur, coordination, perception, charisme, savoir,

        // Compétences (pips, 0 = non investie)
        comp_acrobatie, comp_armes_blanches, ... (toutes les compétences),

    // Santé
    blessure_niveau,  // 0–5

        // Ressources
        points_destin, points_personnage,

        // Tables liées
        backgrounds: [{ id, type, niveau, notes }],
        items:       [{ id, name, description, category, quantity,
        location, damage_pips, range_short, range_medium,
        range_long, skill_key }],
}
```

### Valeurs dérivées (calculées frontend, jamais stockées)

```js
// Dans la fiche, calculées à partir du character :
const esquivePips = character.agilite + character.comp_esquive;
const defense = {
    naturelle:   getDefenseNaturelle(esquivePips),
    active:      getDefenseActive(esquivePips),
    totale:      getDefenseTotale(esquivePips),
};
const resistanceFixe = getResistanceFixe(character.vigueur);
const degatsNaturels = getDegatsNaturels(character.vigueur, character.comp_puissance);
const blessureMalus  = getBlessureMalus(character.blessure_niveau);
```

---

## 7. Thème CSS

```css
/* src/client/src/systems/tecumah/theme.css */
:root {
    --color-primary:     #8B4513;   /* selle brune */
    --color-secondary:   #D2691E;   /* chocolat */
    --color-accent:      #DAA520;   /* or vieilli */
    --color-text:        #2C1810;   /* brun foncé */
    --color-text-muted:  #8B7355;   /* sable foncé */
    --color-danger:      #8B0000;   /* rouge bordeaux */
    --color-success:     #556B2F;   /* vert olive */
    --color-bg:          #F5E6C8;   /* parchemin */
    --color-surface:     #EDD9A3;   /* sable clair */
    --color-surface-alt: #E8C98A;   /* sable doré */
    --color-border:      #8B7355;
}
[data-theme="dark"] {
    --color-bg:          #1C1009;
    --color-surface:     #2C1810;
    --color-surface-alt: #3D2314;
    --color-text:        #F5E6C8;
    --color-text-muted:  #C4A882;
    --color-border:      #6B4C2A;
}
```

---

## 8. Création de personnage — Wizard

### 8.1 Accès

**Public — aucune authentification requise.**

### 8.2 Budget de création

| Budget | Points | Cible |
|---|---|---|
| Attributs | 14 pts (1 pt = 1D = 3 pips) | Min 1D par attribut |
| Backgrounds | 3 pts (1 pt = 1 niveau) | Liste officielle |
| Compétences | 7 pts (1 pt = 1D = 3 pips) | Libres |
| Freebies | 10 pts | Attributs, compétences ou backgrounds |

### 8.3 Étapes du wizard

| Étape | Contenu |
|---|---|
| **1 — Identité** | Nom, prénom joueur, âge, taille, sexe, description |
| **2 — Attributs** | 14 pts à répartir (affichage en XD+Y, min 1D par attribut) |
| **3 — Compétences** | 7 pts à répartir (affichage en XD+Y, 0 autorisé) |
| **4 — Backgrounds** | 3 pts, sélection type dans la liste officielle + niveau + notes |
| **5 — Freebies** | 10 pts libres sur attributs, compétences ou backgrounds |
| **6 — Récapitulatif** | Aperçu complet + affichage `access_code` + redirection |

### 8.4 Règles de validation

- Chaque attribut ≥ 1D (3 pips) obligatoire
- Pas de maximum par compétence au-delà du max global (12D = 36 pips)
- Freebies : **état local uniquement, non persistés** — appliqués au moment de la soumission
- `access_code` généré côté serveur (6 caractères alphanumériques) à afficher après création

---

## 9. Système de combat

### 9.1 Jet d'attaque

Le jet d'attaque utilise la **compétence de l'arme équipée** + son **attribut parent** (mappé via `skills.js`). La compétence détermine automatiquement l'attribut.

```
Pistolet / Fusil / Arc / Arme de jet / Lancer  → Coordination
Armes blanches / Lutte / Lasso                 → Agilité
Artillerie                                     → Coordination
```

### 9.2 Défense

| Mode | Valeur ND | Condition |
|---|---|---|
| **Naturelle** | 10 ± bonus Esquive + modificateur portée | Par défaut |
| **Active** | `esquive_pips` (= Codes-Dés × 3 + pips) | Déclarée en début de tour |
| **Totale** | Naturelle + Active | Aucune autre action ce tour |

Le défenseur déclare son mode de défense à son tour d'initiative — cet état est stocké dans `activeStates` du combattant.

### 9.3 Modificateurs de portée

| Portée | Modificateur ND |
|---|---|
| Courte | 0 |
| Moyenne | +5 |
| Longue | +10 |
| Hors portée | Impossible |

Pour les armes de CàC (`range_short = 0`) : pas de modificateur, portée engagée uniquement.

### 9.4 Dégâts et blessures

Si le jet d'attaque dépasse le ND de défense :

```
dégâts_arme (pips) + dégâts_naturels (si CàC)
    vs
résistance_fixe (pips de vigueur)

Si dégâts > résistance_fixe → blessure_niveau + 1
```

Pas de seuil multi-cran — un seul niveau à la fois quelle que soit la marge.

Pour les **armes blanches**, les dégâts naturels s'ajoutent automatiquement :
```
dégâts_totaux = damage_pips + getDegatsNaturels(vigueur, comp_puissance)
```

### 9.5 Niveaux de blessure

| Niveau | Label | Malus jet |
|---|---|---|
| 0 | Sain | 0 |
| 1 | Stunned | -1D |
| 2 | Wounded | -2D |
| 3 | Severely Wounded | -3D |
| 4 | Incapacitated | Ne peut plus agir |
| 5 | Mortal | Mourant |

### 9.6 NPCs — stats simplifiées

Les NPCs n'ont pas de fiche complète. Trois valeurs fixes stockées dans `combat_stats` :

```js
{
    defense_naturelle: 10,
        defense_active:    12,
        defense_totale:    22,
        resistance_fixe:   9,
        blessure_niveau:   0,
        actionsMax:        1,
        attaques: [
        {
            name:       'Pistolet',
            skill_key:  'comp_pistolet',
            damage_pips: 9,   // 3D = 9 pips
        }
    ]
}
```

### 9.7 `combatConfig` dans `config.jsx`

```jsx
combat: {
    renderHealthDisplay: (combatant) => <TecumahHealthDisplay combatant={combatant} />,

        actions: [
        {
            id:    'defense-active',
            label: '🛡️ Défense Active',
            condition: (character, combatant) =>
                combatant.actionsRemaining > 0 &&
                !combatant.activeStates?.some(s => s.id === 'defense-active'),
            onAction: async (ctx) => {
                await ctx.fetchWithAuth(
                    `${ctx.apiBase}/combat/combatant/${ctx.combatant.id}`,
                    {
                        method: 'PUT',
                        body: JSON.stringify({
                            updates: {
                                activeStates: [
                                    ...ctx.combatant.activeStates,
                                    { id: 'defense-active', name: 'Défense Active' }
                                ],
                            },
                        }),
                    }
                );
            },
        },
        {
            id:    'defense-totale',
            label: '🛡️🛡️ Défense Totale',
            condition: (character, combatant) =>
                combatant.actionsRemaining > 0 &&
                !combatant.activeStates?.some(s => s.id === 'defense-totale'),
            onAction: async (ctx) => {
                await ctx.fetchWithAuth(
                    `${ctx.apiBase}/combat/combatant/${ctx.combatant.id}`,
                    {
                        method: 'PUT',
                        body: JSON.stringify({
                            updates: {
                                activeStates: [
                                    ...ctx.combatant.activeStates,
                                    { id: 'defense-totale', name: 'Défense Totale' }
                                ],
                                actionsRemaining: 0,  // consomme toutes les actions
                            },
                        }),
                    }
                );
            },
        },
    ],

        attack: {
        condition: () => true,

            // Les armes équipées avec un skill_key mappé
            getWeapons: (character) => (character?.items || [])
            .filter(i => i.location === 'equipped' && i.skill_key)
            .map(i => ({
                id:          i.id,
                nom:         i.name,
                damage_pips: i.damage_pips,
                range_short: i.range_short,
                range_medium: i.range_medium,
                range_long:  i.range_long,
                skill_key:   i.skill_key,
                isMelee:     i.range_short === 0,
            })),

            renderRollStep: (props) => <TecumahDiceModal {...props} />,

            calculateDamage: (target, weapon, rollResult) => {
            // dégâts arme bruts (en pips — pour comparaison directe avec résistance)
            return weapon?.damage_pips ?? 0;
        },

            renderTargetInfo: (combatant) => {
            const healthData = combatant.healthData ?? {};
            const defLabel = combatant.activeStates?.some(s => s.id === 'defense-totale')
                ? `Totale: ${healthData.defense_totale ?? '?'}`
                : combatant.activeStates?.some(s => s.id === 'defense-active')
                    ? `Active: ${healthData.defense_active ?? '?'}`
                    : `Naturelle: ${healthData.defense_naturelle ?? '?'}`;
            return `Défense ${defLabel} | RF: ${healthData.resistance_fixe ?? '?'}`;
        },

            defenseOpportunity: null,

            getNPCRollContext: (npc, attack, { apiBase, fetchFn, sessionId }) => ({
            apiBase,
            fetchFn,
            characterId:   null,
            characterName: npc.name,
            sessionId,
            rollType:      'tecumah_npc_attack',
            label:         `${npc.name} — ${attack.name}`,
            systemData: {
                attrPips:  0,
                compPips:  attack.damage_pips ?? 9,  // pool NPC simplifié
                difficulte: null,
            },
        }),
    },

    onDamage: async (ctx) => {
        if (ctx.target.type !== 'player' || !ctx.target.characterId) return;
        try {
            const res      = await ctx.fetchWithAuth(
                `${ctx.apiBase}/characters/${ctx.target.characterId}`
            );
            const fullChar = await res.json();

            const rf = fullChar.vigueur; // pips vigueur = résistance fixe
            if (ctx.damage <= rf) return; // pas de blessure

            const newNiveau = Math.min(5, (fullChar.blessure_niveau ?? 0) + 1);
            await ctx.fetchWithAuth(
                `${ctx.apiBase}/characters/${ctx.target.characterId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ ...fullChar, blessure_niveau: newNiveau }),
                }
            );
        } catch (err) {
            console.error('[tecumah onDamage]', err);
        }
    },

        onBeforeDamage: (ctx) => ctx.damage,
        onDeath:        null,
        onStateChange:  null,

        // Nettoyage à chaque nouveau tour : retire les états de défense
        onTurnStart: (currentCombatant, allCombatants) => {
        const c = currentCombatant;
        const filteredStates = (c.activeStates ?? [])
            .filter(s => s.id !== 'defense-active' && s.id !== 'defense-totale');

        if (filteredStates.length === (c.activeStates?.length ?? 0)) return allCombatants;

        return allCombatants.map(cc =>
            cc.id === c.id
                ? { ...cc, activeStates: filteredStates }
                : cc
        );
    },

        canBurnAction: ({ combatant }) =>
        combatant.actionsRemaining > 0 &&
        !combatant.activeStates?.some(s => s.id === 'defense-totale'),
        onBurnAction: null,

        // ── NPC ────────────────────────────────────────────────────────────────
        renderNPCForm: (formData, onChange) => (
        // Champs : defense_naturelle, defense_active, resistance_fixe, actionsMax, attaques[]
        // Composant TecumahNPCForm à créer
        <TecumahNPCForm formData={formData} onChange={onChange} />
    ),

        buildNPCCombatStats: (formData) => ({
        defense_naturelle: formData.defense_naturelle ?? 10,
        defense_active:    formData.defense_active ?? 12,
        defense_totale:    (formData.defense_naturelle ?? 10) + (formData.defense_active ?? 12),
        resistance_fixe:   formData.resistance_fixe ?? 9,
        actionsMax:        formData.actionsMax ?? 1,
        attaques:          formData.attaques ?? [],
    }),

        parseNPCCombatStats: (json) => {
        try { return typeof json === 'string' ? JSON.parse(json) : json; }
        catch { return {}; }
    },

        buildNPCHealthData: (combat_stats) => ({
        defense_naturelle: combat_stats?.defense_naturelle ?? 10,
        defense_active:    combat_stats?.defense_active    ?? 12,
        defense_totale:    combat_stats?.defense_totale    ?? 22,
        resistance_fixe:   combat_stats?.resistance_fixe  ?? 9,
        blessure_niveau:   0,
    }),
},
```

---

## 10. Interface GM — Sessions & Complications

### 10.1 Onglets GM

```
GMView.jsx
  ├── TabSession        ← personnages + contrôles GM temps réel
  ├── TabComplications  ← jauge complications de session
  ├── TabJournal        ← journal GM (générique, characterId=-1)
  └── TabCombat         ← combat générique
```

### 10.2 TabSession

Affiche la liste de tous les personnages enregistrés (connectés ou non). Pour chaque personnage :

```
┌─────────────────────────────────────────────────────────┐
│  🟢 Jean Dupont (player_name)    — Billy the Kid (nom)  │
│                                                          │
│  Blessure : [ Sain ▾ ]   (sélecteur 0–5, cliquable)    │
│  PD : [−] 3 [+]          PP : [−] 7 [+]                │
└─────────────────────────────────────────────────────────┘
```

**Interactions GM :**

| Contrôle | Action | Socket émis |
|---|---|---|
| Sélecteur blessure | Change `blessure_niveau` (0–5) | `tecumah-update-health` |
| PD +/− | Incrémente / décrémente `points_destin` (min 0) | `tecumah-update-pd` |
| PP +/− | Incrémente / décrémente `points_personnage` (min 0) | `tecumah-update-pp` |

Les modifications sont **immédiatement répercutées** sur la fiche du joueur via `character-light-update`. Le joueur voit sa fiche se mettre à jour sans rechargement.

Le GM peut également cliquer sur un personnage pour ouvrir sa fiche complète en lecture (modal `EditCharacterModal` — pattern identique à Vikings/Dune).

### 10.3 TabComplications

```
┌─────────────────────────────────────────────────────────┐
│  ⚡ Complications de session                             │
│                                                          │
│          [−]   5   [+]                                  │
│                                                          │
│  Dépenser : [1] [2] [3] [Toutes]                        │
│                                                          │
│  Historique                                             │
│  • +1 — Billy (Wild Die 1) — 14:32                      │
│  • +1 — Doc Holliday (Wild Die 1) — 14:28              │
│  • −2 — GM (dépensé) — 14:25                            │
└─────────────────────────────────────────────────────────┘
```

**Sources d'incrémentation :**
- Wild Die = 1 sur un jet joueur → `tecumah-add-complication` émis automatiquement par `TecumahDiceModal` après `roll()`
- Bouton `[+]` manuel côté GM (complication narrative)

**Dépense :**
- Boutons de dépense rapide : `[1]` `[2]` `[3]` `[Toutes]`
- Socket `tecumah-spend-complication` avec `amount`
- Clampé à 0 minimum côté serveur

**Historique :**
- Stocké en mémoire côté client pour la session en cours (pas persisté en BDD)
- Format : `{ type: '+' | '−', amount, source, time }`
- Remis à zéro à la déconnexion du GM

### 10.4 Connexion à la session — flux complet

Le pattern est identique à Vikings/Dune :

1. Le GM crée ou rejoint une session via `TabSession` (générique `TabSession.jsx`)
2. `activeSession` est propagé dans `GMApp` → `GMView` → tous les onglets
3. Les personnages rejoignent via leur fiche (`join-session` socket)
4. La jauge de complications est chargée au `join-session` du GM via `GET /api/sessions/:id` (colonne `complications` de `game_sessions`)
5. À la fin de session, `complications` est remis à 0 dans `game_sessions` via `tecumah-spend-complication` avec `amount = complications` courant

---

## 11. Phasage d'implémentation

| Phase | Contenu | Priorité | Dépendances |
|---|---|---|---|
| **A** | `tecumah-schema.sql` · `config.js` · `characterController.js` · `routes/characters.js` | 🔴 Bloquant | — |
| **B** | `socket/complications.js` — 5 événements temps réel (complications + PD/PP/blessure) | 🔴 Bloquant | A |
| **C** | `utils/` (diceUtils, skills, xpCosts, backgrounds) · `config.jsx` · `theme.css` | 🔴 Core | A |
| **D** | `Sheet.jsx` + composants (AttributeRow, SkillRow, HealthTrack, BackgroundList, ResourcesBar, DefensePanel, InventoryTab) | 🔴 Core | A + C |
| **E** | `TecumahDiceModal.jsx` — flux complet (attr + comp + PD/PP + complication socket) | 🟡 Important | A + B + C |
| **F** | `GMApp.jsx` · `GMView.jsx` · `TabSession` (liste perso + contrôles blessure/PD/PP GM) · `TabComplications` · `TabJournal` | 🟡 Important | A + B |
| **G** | `Creation.jsx` — wizard 6 étapes | 🟡 Important | A |
| **H** | Combat — `TabCombat`, `TecumahDiceModal` en mode attaque, `TecumahNPCForm` | 🟢 Confort | D + E + F |

---

## 11. Checklist finale

### Backend

- [ ] `src/server/systems/tecumah/config.js` — `slug`, `label`, `dbPath`, `schemaPath`
- [ ] `database-template/tecumah-schema.sql` — tables transversales + spécifiques + GM id=-1
- [ ] `game_sessions` — colonne `complications INTEGER DEFAULT 0`
- [ ] `character_backgrounds` — table créée
- [ ] `character_items` — colonnes `damage_pips`, `range_short/medium/long`, `skill_key`
- [ ] `characterController.js` — `loadFullCharacter` (backgrounds + items) / `saveFullCharacter`
- [ ] `routes/characters.js` — POST public · GET/PUT authentifiés
- [ ] `socket/complications.js` — 5 événements + broadcasts

### Frontend

- [ ] `utils/diceUtils.js` — toutes les fonctions de calcul
- [ ] `utils/skills.js` — mapping complet 50+ compétences
- [ ] `utils/xpCosts.js` — tableau des coûts
- [ ] `config.jsx` — bloc `dice` (5 hooks) + bloc `combat` complet
- [ ] `theme.css` — variables CSS jour + nuit
- [ ] `Sheet.jsx` — contrat props, sections attributs/compétences/santé/ressources/inventaire
- [ ] `AttributeRow.jsx` — XD+Y + bouton jet
- [ ] `SkillRow.jsx` — XD+Y calculé (attr + comp) + bouton jet
- [ ] `HealthTrack.jsx` — 5 niveaux cliquables
- [ ] `BackgroundList.jsx` — CRUD + niveaux
- [ ] `ResourcesBar.jsx` — PD + PP
- [ ] `DefensePanel.jsx` — valeurs calculées (lecture seule)
- [ ] `InventoryTab.jsx` — items + armes + portées
- [ ] `TecumahDiceModal.jsx` — 3 étapes, Wild Die, complications, PD/PP exclusifs
- [ ] `Creation.jsx` — wizard 6 étapes, budget points, freebies locaux
- [ ] `GMApp.jsx` · `GMView.jsx` — shell onglets
- [ ] `TabSession.jsx` — liste perso, indicateur connecté/déconnecté, sélecteur blessure, PD/PP +/− GM
- [ ] `TabComplications.jsx` — jauge + boutons dépense rapide + historique mémoire session
- [ ] `TabJournal.jsx` — générique `characterId={-1}`
- [ ] `TecumahNPCForm` — 3 défenses + RF + attaques
- [ ] Tous les `fetch` utilisent `apiBase`

### Validation système

- [ ] Démarrer serveur → `✅ System loaded: tecumah`
- [ ] `/tecumah/` → fiche joueur s'affiche
- [ ] `/tecumah/gm` → interface GM s'affiche
- [ ] Création personnage → `access_code` + `access_url` générés
- [ ] Connexion → JWT valide, fiche chargée
- [ ] Jet normal → Wild Die séparé visuellement, total correct
- [ ] Wild Die = 1 → complication incrémentée côté GM
- [ ] Wild Die explose (6) → relance cumulée dans l'animation
- [ ] Dépense PD → pool × 2, PD décrémenté
- [ ] Dépense PP → +1D par PP, PP décrémentés définitivement
- [ ] PP + PD sur le même jet → impossible (UI bloquée)
- [ ] Jet d'attaque → comparaison vs bonne défense (naturelle/active/totale)
- [ ] Dégâts > RF → blessure_niveau + 1 persisté