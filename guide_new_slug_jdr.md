# Guide — Créer un nouveau système JDR dans Mentiss

> **À qui s'adresse ce guide ?**  
> À tout développeur souhaitant ajouter un nouveau système de jeu de rôle (slug) dans la plateforme Mentiss VTT.  
> Le guide couvre l'intégralité du cycle : base de données → backend → frontend → combat.

---

## Sommaire

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Étape 0 — Choisir son slug](#2-étape-0--choisir-son-slug)
3. [Étape 1 — Base de données](#3-étape-1--base-de-données)
4. [Étape 2 — Backend : config & controller](#4-étape-2--backend--config--controller)
5. [Étape 3 — Backend : routes Express](#5-étape-3--backend--routes-express)
6. [Étape 4 — Frontend : config système](#6-étape-4--frontend--config-système)
7. [Étape 5 — Frontend : fiche joueur (Sheet)](#7-étape-5--frontend--fiche-joueur-sheet)
8. [Étape 6 — Frontend : interface GM (GMApp)](#8-étape-6--frontend--interface-gm-gmapp)
9. [Étape 7 — Système de combat](#9-étape-7--système-de-combat)
10. [Étape 8 — Thème CSS](#10-étape-8--thème-css)
11. [Checklist finale](#11-checklist-finale)
12. [Référence rapide : arborescence complète](#12-référence-rapide--arborescence-complète)

---

## 1. Vue d'ensemble de l'architecture

### Principe directeur

> **On rend générique ce qui peut l'être. Ce qui est trop lié à un système reste spécifique.**

La plateforme repose sur une séparation stricte :

| Couche | Générique (partagé) | Spécifique (slug) |
|---|---|---|
| **BDD** | Tables `characters`, `game_sessions`, `session_characters`, `dice_history`, `character_journal` | Tables supplémentaires propres au système |
| **Backend routes** | `sessions`, `journal`, `dice`, `npc`, `auth` | `characters`, `combat` |
| **Frontend pages** | `PlayerPage`, `GMPage`, `AppRouter`, hooks, contextes | `Sheet.jsx`, `GMApp.jsx`, `config.jsx` |
| **Sockets** | Rooms préfixées `${system}_session_${id}`, événements de présence | Événements combat slug-spécifiques |

### Auto-découverte des systèmes

Au démarrage, `src/server/systems/loader.js` scanne **automatiquement** le dossier `src/server/systems/`. Tout sous-dossier contenant un `config.js` valide est chargé comme système.

**Ajouter un système = créer son dossier. Aucun fichier central à modifier côté backend.**

Côté frontend, Vite utilise `import.meta.glob` pour découvrir les fichiers `Sheet.jsx` et `GMApp.jsx` de chaque système. Même logique : aucun enregistrement manuel.

---

## 2. Étape 0 — Choisir son slug

Le **slug** est l'identifiant technique du système. Il doit être :

- en minuscules, sans espaces ni caractères spéciaux : `noctis`, `tecumah`, `opend6`
- identique dans le nom de dossier backend, le dossier frontend, la BDD, et les URLs

```
/noctis/            → page joueur du système "noctis"
/noctis/gm          → interface GM du système "noctis"
/api/noctis/...     → toutes les routes API du système
database/noctis.db  → base de données du système
```

---

## 3. Étape 1 — Base de données

### 3.1 Créer le schéma initial

Créer le fichier `database-template/:slug-schema.sql`.

Ce fichier doit impérativement contenir les **tables transversales** (communes à tous les systèmes) puis les **tables spécifiques** au système.

#### Tables transversales obligatoires (à copier telles quelles)

```sql
-- Référence : database-template/schema.sql (tables génériques)
-- Inclure : characters, game_sessions, session_characters,
--           dice_history, character_journal, refresh_tokens
```

> **Astuce** : partir de `database-template/schema.sql` et supprimer les tables Vikings (`character_skills`, `character_traits`, `character_runes`, `character_items`) pour les remplacer par vos tables spécifiques.

#### Table `characters` — champs minimum requis

La table `characters` doit contenir au minimum ces colonnes, utilisées par la couche générique :

```sql
CREATE TABLE IF NOT EXISTS characters (
                                          id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                          access_code TEXT UNIQUE NOT NULL,
                                          access_url  TEXT UNIQUE NOT NULL,
                                          player_name TEXT NOT NULL,
    -- ↑ Ces 4 colonnes sont REQUISES par la couche générique

    -- Ajouter ensuite tous les champs propres au système...
                                          prenom TEXT NOT NULL,
    -- ...

                                          login_attempts  INTEGER DEFAULT 0,
                                          last_attempt_at DATETIME,
                                          last_accessed   DATETIME,
                                          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Exemple de tables spécifiques

```sql
-- Exemple pour un système générique avec Points de Vie
CREATE TABLE IF NOT EXISTS character_stats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id  INTEGER NOT NULL,
    stat_name     TEXT NOT NULL,
    base_value    INTEGER DEFAULT 0,
    current_value INTEGER DEFAULT 0,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

#### Note sur la table d'inventaire

La table `character_items` du système Vikings gère l'inventaire des personnages (objets, armes, armures). Cette structure est **réutilisable ou adaptable** dans tout autre système qui aurait besoin d'un inventaire :

```sql
-- Reprise directe depuis Vikings — adapter les colonnes selon les besoins du système
CREATE TABLE IF NOT EXISTS character_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    name         TEXT NOT NULL,
    category     TEXT,          -- 'weapon', 'armor', 'consumable', 'misc'...
    quantity     INTEGER DEFAULT 1,
    location     TEXT,          -- emplacement porté / rangé
    notes        TEXT,
    -- Colonnes spécifiques arme (supprimer si inutile) :
    weapon_type  TEXT,
    damage       TEXT,
    range        TEXT,
    armor_value  INTEGER DEFAULT 0,
    requirements TEXT,          -- JSON sérialisé
    custom_item  INTEGER DEFAULT 0,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

Si le système n'a pas besoin de certaines colonnes (ex: `damage`, `armor_value`), les supprimer plutôt que de les laisser vides — cela allège le schéma et évite toute confusion dans le `characterController`. À l'inverse, de nouvelles colonnes peuvent être ajoutées (`enchantment`, `weight`, `durability`...) selon les besoins du système.

### 3.2 La BDD est créée automatiquement

Quand un joueur fait sa première requête sur `/api/:slug/...`, le pool lazy vérifie si le fichier `.db` existe. S'il n'existe pas, il exécute le `schemaPath` déclaré dans `config.js`. **Aucune commande manuelle nécessaire.**

### 3.3 Migrations ultérieures

Pour toute modification de schéma sur une BDD existante, créer un fichier de migration :

```
database-template/migrations/DDMMYYYY_add_quoi.sql
```

Puis l'appliquer avec :

```bash
npm run migrate DDMMYYYY_add_quoi.sql
```

> Le script `migrate.js` applique le SQL sur la BDD du système ciblé (par convention ou par argument).

---

## 4. Étape 2 — Backend : config & controller

### 4.1 Arborescence à créer

```
src/server/systems/:slug/
  config.js
  characterController.js
  routes/
    characters.js
```

### 4.2 `config.js`

C'est la carte d'identité du système. Quatre champs sont **obligatoires** :

```js
// src/server/systems/noctis/config.js
const path = require('path');

module.exports = {
    slug:       'noctis',                          // identifiant technique (= nom du dossier)
    label:      'Noctis Solis',                    // nom affiché dans l'UI
    dbPath:     path.join(__dirname, '../../../../database/noctis.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/noctis-schema.sql'),
};
```

> Le loader valide que `slug`, `label`, `dbPath` et `schemaPath` sont présents.  
> Il vérifie aussi l'existence physique de `routes/characters.js`.  
> Un `config.js` invalide provoque un **warning** au démarrage — le serveur continue avec les autres systèmes.

### 4.3 `characterController.js`

Ce fichier expose exactement **deux fonctions** :

| Fonction | Signature | Rôle |
|---|---|---|
| `loadFullCharacter` | `(db, characterId) → object \| null` | Lire un personnage complet depuis la BDD |
| `saveFullCharacter` | `(db, characterId, data) → void` | Persister les modifications d'un personnage |

```js
// src/server/systems/noctis/characterController.js

/**
 * Charge un personnage complet avec toutes ses tables liées.
 * @param {BetterSqlite3.Database} db
 * @param {number} characterId
 * @returns {object|null}
 */
function loadFullCharacter(db, characterId) {
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    if (!char) return null;

    // Charger les tables spécifiques au système
    const stats = db.prepare(
        'SELECT * FROM character_stats WHERE character_id = ?'
    ).all(characterId);

    // Retourner un objet "aplati" (pas de snake_case côté client)
    return {
        id:          char.id,
        accessCode:  char.access_code,
        accessUrl:   char.access_url,
        playerName:  char.player_name,
        prenom:      char.prenom,
        // ... tous les champs du système ...
        stats,
        createdAt:   char.created_at,
        updatedAt:   char.updated_at,
    };
}

/**
 * Persiste les données d'un personnage.
 * @param {BetterSqlite3.Database} db
 * @param {number} id
 * @param {object} data
 */
function saveFullCharacter(db, id, data) {
    const { playerName, prenom, /* ... */ stats } = data;

    if (playerName !== undefined) {
        db.prepare(`
            UPDATE characters
            SET player_name = ?, prenom = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(playerName, prenom, id);
    }

    if (stats !== undefined) {
        // Exemple : upsert des stats
        const upsert = db.prepare(`
            INSERT INTO character_stats (character_id, stat_name, base_value, current_value)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (character_id, stat_name)
            DO UPDATE SET base_value = excluded.base_value, current_value = excluded.current_value
        `);
        for (const stat of stats) {
            upsert.run(id, stat.name, stat.baseValue, stat.currentValue);
        }
    }
}

module.exports = { loadFullCharacter, saveFullCharacter };
```

> **`db` est toujours `req.db`** — injecté par le middleware `systemResolver`. Ne jamais importer `getDb()` dans un controller de système.

---

## 5. Étape 3 — Backend : routes Express

### 5.1 `routes/characters.js` (obligatoire)

Ce router gère toute la logique personnage propre au système. Il est monté automatiquement sur `/api/:slug/characters`.

**Endpoints minimaux attendus :**

| Méthode | Chemin | Description |
|---|---|---|
| `GET` | `/` | Liste des personnages (format résumé) |
| `GET` | `/by-url/:url` | Personnage par `access_url` |
| `GET` | `/by-code/:code` | Personnage par `access_code` |
| `GET` | `/:id` | Fiche complète |
| `POST` | `/` | Créer un personnage |
| `PUT` | `/:id` | Mettre à jour |
| `DELETE` | `/:id` | Supprimer |
| `GET` | `/:id/sessions` | Sessions du personnage |

```js
// src/server/systems/noctis/routes/characters.js
const express = require('express');
const router = express.Router();
const { authenticate, requireOwnerOrGM, requireGM } = require('../../../middlewares/auth');
const { ensureUniqueCode, generateAccessUrl } = require('../../../utils/characters');
const { loadFullCharacter, saveFullCharacter } = require('../characterController');

// GET / — liste résumée
router.get('/', (req, res) => {
    try {
        const characters = req.db.prepare(
            'SELECT id, access_code, access_url, player_name, prenom FROM characters ORDER BY updated_at DESC'
        ).all();
        res.json(characters.map(c => ({
            id: c.id,
            accessCode: c.access_code,
            accessUrl:  c.access_url,
            playerName: c.player_name,
            name:       c.prenom,
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /by-url/:url
router.get('/by-url/:url', (req, res) => {
    try {
        const char = req.db.prepare(
            'SELECT id FROM characters WHERE access_url = ?'
        ).get(req.params.url);
        if (!char) return res.status(404).json({ error: 'Character not found' });
        req.db.prepare(
            'UPDATE characters SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(char.id);
        res.json(loadFullCharacter(req.db, char.id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /:id
router.get('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const char = loadFullCharacter(req.db, Number(req.params.id));
        if (!char) return res.status(404).json({ error: 'Character not found' });
        res.json(char);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST / — création
router.post('/', requireGM, (req, res) => {
    try {
        const { playerName, prenom } = req.body;
        const accessCode = ensureUniqueCode(req.db);
        const accessUrl  = generateAccessUrl(prenom);

        const result = req.db.prepare(`
            INSERT INTO characters (access_code, access_url, player_name, prenom)
            VALUES (?, ?, ?, ?)
        `).run(accessCode, accessUrl, playerName, prenom);

        res.status(201).json(loadFullCharacter(req.db, result.lastInsertRowid));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /:id — mise à jour
router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        saveFullCharacter(req.db, Number(req.params.id), req.body);
        res.json(loadFullCharacter(req.db, Number(req.params.id)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
```

### 5.2 Routes partagées (automatiques)

Ces routes sont montées **automatiquement** par le serveur pour chaque système. Aucune action requise :

| Route | Chemin monté | Fichier source |
|---|---|---|
| Sessions | `/api/:slug/sessions` | `routes/shared/sessions.js` |
| Journal | `/api/:slug/journal` | `routes/shared/journal.js` |
| Dés | `/api/:slug/dice` | `routes/shared/dice.js` |
| Combat | `/api/:slug/combat` | `routes/shared/combat.js` |
| NPC | `/api/:slug/npc` | `routes/shared/npc.js` |
| Auth | `/api/:slug/auth` | `routes/auth.js` |

### 5.3 Middleware `systemResolver`

Pour toute route sous `/api/:system/`, le middleware injecte automatiquement dans `req` :

```js
req.system  // { slug: 'noctis', label: 'Noctis Solis', dbPath: '...', schemaPath: '...' }
req.db      // connexion better-sqlite3, ouverte en lazy (TTL 5min)
```

---

## 6. Étape 4 — Frontend : config système

### 6.1 Arborescence à créer

```
src/client/src/systems/:slug/
  config.jsx        ← point d'entrée unique du système côté client
  Sheet.jsx         ← fiche joueur (chargée via import.meta.glob)
  GMApp.jsx         ← interface GM (chargée via import.meta.glob)
  theme.css         ← variables CSS du système (optionnel)
  components/       ← composants spécifiques au système
  gm/               ← composants GM du système
```

### 6.2 `config.jsx` — structure complète

```jsx
// src/client/src/systems/noctis/config.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration CLIENT du système Noctis Solis.
// Point d'entrée unique pour métadonnées, dés et combat.
// ⚠️  Module ES — uniquement importé par le frontend React.
// ─────────────────────────────────────────────────────────────────────────────

// Import des composants de rendu spécifiques au système
import HealthDisplay  from './components/HealthDisplay.jsx';
import AttackModal    from './components/modals/AttackModal.jsx';

const noctisConfig = {
    slug:  'noctis',
    label: 'Noctis Solis',

    // ─── Hooks dés ────────────────────────────────────────────────────────────
    // Injectés dans diceEngine.roll() — voir section dés ci-dessous
    dice: {
        buildNotation: (ctx) => {
            // Retourner une notation rpg-dice-roller
            // Exemple : '2d6+3', '1d20>=15', '3d6!>=6>=4'
            return `${ctx.systemData.pool}d6`;
        },
        beforeRoll: (ctx) => {
            // Validation avant le jet — lever RollError si invalide
            // Retourner ctx enrichi si besoin
            return ctx;
        },
        afterRoll: (result, ctx) => {
            // Post-traitement : calculer succès, effets, etc.
            return result;
        },
        buildRollParams: (character, formData) => {
            // Construire ctx.systemData depuis le formulaire de jet
            return {
                pool: formData.pool ?? 2,
                // ...
            };
        },
        buildAnimationSequence: (ctx) => {
            // Optionnel : séquence pour dice-box-threejs
            return null;
        },
    },

    // ─── Bloc combat ──────────────────────────────────────────────────────────
    // Voir Étape 7 pour le détail complet
    combat: {
        renderHealthDisplay: (combatant) => <HealthDisplay combatant={combatant} />,
        actions: [],
        attack: null,
    },
};

export default noctisConfig;
```

### 6.3 Hook `useSystem`

Partout dans les composants, utiliser ce hook pour obtenir le contexte système courant :

```js
import { useSystem } from '../../hooks/useSystem.js';

const { slug, label, apiBase, isValid } = useSystem();
// apiBase → '/api/noctis'
// Tous les fetch doivent utiliser apiBase, jamais '/api' en dur
```

### 6.4 Hook `useFetch`

Pour les appels authentifiés (avec gestion du refresh token) :

```js
import { useFetch } from '../../hooks/useFetch.js';

const fetchWithAuth = useFetch();

// Dans un useEffect ou un handler :
const response = await fetchWithAuth(`${apiBase}/characters/${id}`);
const data = await response.json();
```

---

## 7. Étape 5 — Frontend : fiche joueur (Sheet)

### 7.1 Contrat de `Sheet.jsx`

`PlayerPage` charge dynamiquement le fichier `src/client/src/systems/:slug/Sheet.jsx`.  
Le composant reçoit ces props :

```jsx
// Contrat des props de Sheet.jsx
const Sheet = ({
    character,        // objet personnage complet (depuis loadFullCharacter)
    onUpdate,         // (updatedCharacter) => void — à appeler après sauvegarde
    onLogout,         // () => void
    onChangeCharacter,// () => void — ouvre la sélection de personnage
    darkMode,
    onToggleDarkMode,
}) => { /* ... */ };

export default Sheet;
```

### 7.2 Sauvegarder les modifications

```jsx
const handleSave = async (updatedData) => {
    const { apiBase } = useSystem(); // à placer en haut du composant
    const response = await fetchWithAuth(`${apiBase}/characters/${character.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
    });
    if (response.ok) {
        const updated = await response.json();
        onUpdate(updated); // notifier PlayerPage
    }
};
```

### 7.3 Recevoir les mises à jour temps réel

Les mises à jour en temps réel sont déjà gérées par `usePlayerSession` dans `PlayerPage`. La fiche reçoit le personnage mis à jour via la prop `character` — **pas besoin de socket dans Sheet**.

---

## 8. Étape 6 — Frontend : interface GM (GMApp)

### 8.1 Contrat de `GMApp.jsx`

`GMPage` charge dynamiquement `src/client/src/systems/:slug/GMApp.jsx`.  
Le composant reçoit ces props :

```jsx
// Contrat des props de GMApp.jsx
const GMApp = ({
    activeSession,     // session active (null si aucune)
    onSessionChange,   // (session) => void
    onlineCharacters,  // [{ characterId, name, ... }]
    darkMode,
    onToggleDarkMode,
}) => { /* ... */ };

export default GMApp;
```

### 8.2 Structure recommandée

```
src/client/src/systems/:slug/
  GMApp.jsx           ← wrapper minimal qui passe les props à GMView
  gm/
    GMView.jsx        ← shell avec onglets (Session, Journal, Combat, ...)
    tabs/
      TabSession.jsx
      TabJournal.jsx
      TabCombat.jsx
    modals/
      GMDiceModal.jsx
```

### 8.3 Les onglets génériques disponibles

Ces composants partagés peuvent être réutilisés directement :

```jsx
import TabSession from '../../../components/gm/tabs/TabSession.jsx';
import TabJournal from '../../../components/gm/tabs/TabJournal.jsx';
```

Ils attendent `activeSession` et `onlineCharacters` en props.

---

## 9. Étape 7 — Système de combat

Le combat générique repose sur une configuration déclarée dans le bloc `combat:{}` de `config.jsx`. Cette section est la plus dense du guide car elle couvre **tous les points d'extension** disponibles : affichage, actions, flow d'attaque, gestion des états, cycles de tour, NPCs, et opportunités de défense.

### 9.1 Ce que le générique gère seul

| Fonctionnalité | Mécanisme |
|---|---|
| Chargement et écoute `combat-update` | Socket — room préfixée système |
| Affichage de la liste des combattants (ordre, tour actif, round) | `CombatantList` + `CombatantRow` |
| Boutons d'action filtrés par `condition` | Itération sur `combatConfig.actions` |
| Bouton « Autre action » (burn générique) | `actionsRemaining > 0` |
| Décrément de `actionsRemaining` | `POST /combat/action` |
| File d'attaques en attente côté GM | `AttackValidationQueue` |
| Reset `actionsRemaining` en début de round | `nextTurn` serveur |
| Passage de tour / nouveau round | `POST /combat/next-turn` |
| Synchronisation des `activeStates` après le tour | `POST /combat/sync-states` |

### 9.2 Structure d'un combattant

Tout combattant en mémoire (joueur ou NPC) respecte cette structure. Les champs génériques sont gérés par le serveur ; les champs opaques appartiennent entièrement au slug.

```js
{
    // ── Champs génériques — gérés par le serveur ──────────────────────────
    id:               'uuid-généré-côté-serveur',
    type:             'player' | 'npc',
    name:             'Ragnar',
    characterId:      12,        // null pour les NPCs
    actionsRemaining: 2,         // décrémenté par POST /combat/action
    actionsMax:       2,         // reset à chaque début de round
    initiative:       8,         // détermine l'ordre de passage

    // ── Champs opaques — propriété exclusive du slug ───────────────────────
    // Le générique les transmet sans jamais les inspecter.

    healthData: {
        // Exemple Vikings :
        tokensBlessure: 2,
        blessureMax:    5,
        tokensFatigue:  1,
        armure:         1,
        seuil:          3,
        // Exemple D&D-like :
        // hp: 24, hpMax: 30, tempHp: 5, armorClass: 14
    },

    turnData: {
        // Ressources de tour propres au système :
        // Vikings : (vide — les pools dés sont calculés à la volée)
        // OpenD6  : { dicePool: 6 }
        // D&D     : { reactions: 1, bonusActionUsed: false }
        // Shadowrun : { edge: 3 }
    },

    activeStates: [
        // Tableau libre — jamais inspecté par le générique.
        // Chaque état est un objet { id, label, data? }
        // Exemple : { id: 'posture-defensive', label: 'Posture défensive' }
        // Exemple : { id: 'berserk', label: 'Berserk', data: { duration: 2 } }
    ],

    // ── Champs NPC supplémentaires ─────────────────────────────────────────
    // Présents uniquement si type === 'npc'
    attaques: [
        // Tableau des attaques disponibles du NPC
        // Structure libre — lue par attack.getNPCRollContext(npc, attack)
        { name: 'Morsure', succes: 6, explosion: 10, degats: 3 },
    ],
}
```

### 9.3 Bloc `combat` — référence complète

Voici le schéma complet annoté de tout ce que le slug peut déclarer dans `config.jsx` :

```jsx
combat: {

    // ═══════════════════════════════════════════════════════════════════════
    // AFFICHAGE
    // ═══════════════════════════════════════════════════════════════════════

    // Reçoit le combattant complet, retourne du JSX.
    // Affiché dans CombatantRow (liste) et dans CombatPanel (panneau propre).
    // OBLIGATOIRE si le système a du combat.
    renderHealthDisplay: (combatant) => <HealthDisplay combatant={combatant} />,


    // ═══════════════════════════════════════════════════════════════════════
    // ACTIONS SPÉCIALES (boutons dans le panneau joueur)
    // ═══════════════════════════════════════════════════════════════════════

    // Le générique affiche un bouton par entrée dont condition est truthy,
    // uniquement pendant le tour du joueur.
    // L'ordre du tableau détermine l'ordre d'affichage.
    actions: [
        {
            id:    'posture-defensive',
            label: 'Posture défensive',

            // condition(character, combatant, combatState) → bool
            // Masque/affiche le bouton selon l'état courant.
            // character = fiche complète du joueur (depuis loadFullCharacter)
            // combatant = entrée dans combatState.combatants
            condition: (character, combatant) =>
                !combatant.activeStates?.some(s => s.id === 'posture-defensive'),

            // onAction(ctx) — exécuté au clic.
            // ctx = { character, combatant, combatState, fetchWithAuth, apiBase, socket }
            // Le slug a la main totale : appel API, émission socket, mise à jour locale...
            onAction: async (ctx) => {
                await ctx.fetchWithAuth(`${ctx.apiBase}/combat/combatant/${ctx.combatant.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        updates: {
                            activeStates: [
                                ...(ctx.combatant.activeStates ?? []),
                                { id: 'posture-defensive', label: 'Posture défensive' },
                            ],
                        },
                    }),
                });
            },

            // Modal à ouvrir au clic (optionnel — si l'action nécessite un formulaire).
            // Si défini, onAction est ignoré et c'est la Modal qui gère tout.
            // La Modal reçoit : { character, combatant, combatState, onClose }
            Modal: null,
        },
    ],


    // ═══════════════════════════════════════════════════════════════════════
    // BURN D'ACTION GÉNÉRIQUE (bouton « Autre action »)
    // ═══════════════════════════════════════════════════════════════════════

    // Condition d'affichage du bouton « Autre action ».
    // Si non déclaré : le générique utilise actionsRemaining > 0 seul.
    // Surcharger pour ajouter des conditions métier supplémentaires.
    // ctx = { combatant }
    canBurnAction: ({ combatant }) => combatant.actionsRemaining > 0,

    // Appelé APRÈS que le générique a décrémenté actionsRemaining
    // via POST /combat/action.
    // Permet des effets secondaires slug (mise à jour turnData, état...).
    // null = le décrément générique suffit.
    // ctx = { combatant, fetchWithAuth, apiBase }
    onBurnAction: null,


    // ═══════════════════════════════════════════════════════════════════════
    // FLOW D'ATTAQUE (côté joueur attaquant)
    // ═══════════════════════════════════════════════════════════════════════

    // null = le système n'a pas d'attaque joueur (ex: système narratif pur).
    attack: {

        // Condition d'affichage du bouton « Attaquer ».
        // Si non déclaré : le bouton est toujours visible pendant le tour.
        // condition(character, combatant, combatState) → bool
        condition: (character, combatant) => combatant.actionsRemaining > 0,

        // Liste des armes disponibles pour l'attaquant.
        // Retourne un tableau [{ id, nom, degats, ... }].
        // Affiché dans TargetSelectionModal pour que le joueur choisisse son arme.
        // ctx = character (fiche complète)
        getWeapons: (character) => character.items?.filter(i => i.weaponType) ?? [],

        // ── Étape 1 : jet de dés ─────────────────────────────────────────
        // Composant rendu par CombatPanel quand flow.step === 'rolling' ou 'rolled'.
        // Si null → le flow saute directement à l'étape targeting (rollResult = null).
        //
        // Props injectées :
        //   character     — fiche complète du joueur
        //   combatant     — entrée combatState du joueur
        //   activeStates  — states actifs du joueur (ex: isBerserk)
        //   rollResult    — null si step==='rolling', résultat si step==='rolled'
        //   onRollComplete(result) — stocke le résultat, reste sur l'étape roll
        //   onProceed()            — passe à l'étape targeting
        //   onClose()              — annule le flow
        //   sessionId     — pour POST /dice/roll (historique)
        renderRollStep: (props) => (
            <DiceModal
                character={props.character}
                isBerserk={props.activeStates?.some(s => s.id === 'berserk')}
                onClose={props.onClose}
                context={{ type: 'combat-attack', onRollComplete: props.onRollComplete }}
            />
        ),

        // ── Étape 2 : sélection cible + calcul dégâts ────────────────────
        // Rendu automatiquement par CombatPanel quand flow.step === 'targeting'.
        // Aucun callback à déclarer ici — c'est TargetSelectionModal qui gère.

        // Calcule les dégâts suggérés dans TargetSelectionModal.
        // (target, weapon, rollResult) → number
        // rollResult est l'objet opaque retourné par diceEngine.roll().
        calculateDamage: (target, weapon, rollResult) => {
            const successes = rollResult?.totalSuccesses ?? 0;
            const mr = Math.max(0, successes - (target.healthData?.seuil ?? 1));
            return Math.max(0, (weapon?.degats ?? 0) + mr - (target.healthData?.armure ?? 0));
        },

        // Affiche les stats défensives d'une cible dans TargetSelectionModal.
        // Retourne une string ou du JSX.
        // (combatant) → string | JSX
        renderTargetInfo: (combatant) =>
            `Seuil ${combatant.healthData?.seuil ?? '?'} | Armure ${combatant.healthData?.armure ?? 0}`,

        // ── Opportunité de défense (optionnel) ───────────────────────────
        // null = pas de défense hors-tour dans ce système.
        // Si défini : le GM peut déclencher une opportunité depuis la file de validation.
        // Le serveur émet combat-defense-opportunity vers le défenseur.
        // L'attaquant n'est PAS impliqué à cette étape — les flows sont indépendants.
        defenseOpportunity: null,
        // Exemple WoD :
        // defenseOpportunity: {
        //   // Condition côté GM — décide si une défense est possible
        //   condition: (attacker, target, rollResult) => target.type === 'player',
        //   // Composant rendu côté défenseur quand defense.step === 'defending'
        //   // Props : { character, combatant, attackData, onDefenseComplete, onClose }
        //   renderDefenseStep: (props) => <DodgeModal {...props} />,
        //   // Calcul des dégâts finaux après résolution de la défense
        //   // defenseResult = résultat du jet de défense
        //   onDefenseResult: (defenseResult, attackRollResult, weapon) => finalDamage,
        // },

        // ── Contexte de jet NPC ──────────────────────────────────────────
        // Construit le RollContext pour un jet d'attaque NPC.
        // Appelé par NPCAttackModal : const ctx = combatConfig.attack.getNPCRollContext(npc, attack)
        // Les hooks dice (buildNotation, beforeRoll, afterRoll, buildAnimationSequence)
        // sont les mêmes que pour les joueurs — c'est le contexte qui diffère :
        // pas de compétence ni de caractéristique, les seuils viennent directement
        // de l'objet attack (attack.succes, attack.explosion).
        // (npc, attack) → RollContext compatible avec diceEngine.roll()
        getNPCRollContext: (npc, attack) => ({
            systemData: {
                pool:      npc.healthData?.pool ?? 2,
                threshold: attack.succes,
                explosion: attack.explosion,
            },
            characterName: npc.name,
        }),
    },


    // ═══════════════════════════════════════════════════════════════════════
    // NPCs — gestion dans la bibliothèque et en combat
    // ═══════════════════════════════════════════════════════════════════════

    // Formulaire slug-spécifique dans NPCModal (modes create et edit).
    // Le générique affiche les champs communs (nom, description, actionsMax).
    // Ce slot injecte les champs propres au système (armure, seuil, attaques...).
    // (formData, onChange) → JSX
    // onChange(field, value) met à jour slugForm dans NPCModal.
    renderNPCForm: (formData, onChange) => (
        <NPCForm formData={formData} onChange={onChange} />
    ),

    // Sérialise le formulaire slug → combat_stats pour POST/PUT BDD (table npc).
    // combat_stats est un champ JSON TEXT dans la table — format libre.
    // (formData) → object (sera JSON.stringify côté NPCModal)
    buildNPCCombatStats: (formData) => ({
        blessureMax: Number(formData.blessureMax ?? 5),
        armure:      Number(formData.armure      ?? 0),
        seuil:       Number(formData.seuil       ?? 1),
        actionsMax:  Number(formData.actionsMax  ?? 1),
        attaques:    formData.attaques ?? [{ name: 'Attaque', succes: 6, explosion: 10, degats: 2 }],
    }),

    // Désérialise combat_stats → formData pour préremplir le formulaire en mode edit.
    // Inverse de buildNPCCombatStats.
    // (combat_stats) → formData object
    parseNPCCombatStats: (combat_stats) => ({
        blessureMax: combat_stats?.blessureMax ?? 5,
        armure:      combat_stats?.armure      ?? 0,
        seuil:       combat_stats?.seuil       ?? 1,
        actionsMax:  combat_stats?.actionsMax  ?? 1,
        attaques:    combat_stats?.attaques    ?? [],
    }),

    // Instancie le healthData runtime lors de l'ajout d'un NPC en combat.
    // combat_stats provient de la BDD (JSON parsé).
    // Retourne l'objet healthData initial du combattant NPC.
    // (combat_stats) → healthData object
    buildNPCHealthData: (combat_stats) => ({
        tokensBlessure: 0,
        blessureMax:    combat_stats?.blessureMax ?? 5,
        armure:         combat_stats?.armure      ?? 0,
        seuil:          combat_stats?.seuil       ?? 1,
    }),


    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE — DÉGÂTS ET ÉTATS
    // ═══════════════════════════════════════════════════════════════════════
    // Tous ces callbacks s'exécutent côté client uniquement.
    // La persistance réelle se fait via fetchWithAuth dans leur corps.

    // Appelé AVANT application des dégâts lors de la validation GM.
    // Peut modifier (réduire/augmenter) le montant final avant calcul.
    // ctx = { attacker, target, damage, weapon, rollResult }
    // DOIT retourner le damage final (number).
    onBeforeDamage: (ctx) => ctx.damage,

    // Appelé lors de la validation d'une attaque par le GM.
    // C'est le GM qui persiste les dégâts en BDD — le serveur ne touche pas la BDD personnage.
    // newHealthData contient le healthData recalculé après application des dégâts.
    // ctx = { attacker, target, damage, weapon, rollResult, newHealthData, fetchWithAuth, apiBase }
    onDamage: async (ctx) => {
        if (ctx.target.type !== 'player' || !ctx.target.characterId) return;
        // Exemple : persister les tokens de blessure Vikings
        const res      = await ctx.fetchWithAuth(`${ctx.apiBase}/characters/${ctx.target.characterId}`);
        const fullChar = await res.json();
        await ctx.fetchWithAuth(`${ctx.apiBase}/characters/${ctx.target.characterId}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...fullChar,
                tokensBlessure: ctx.newHealthData?.tokensBlessure ?? fullChar.tokensBlessure,
            }),
        });
    },

    // Appelé quand un combattant est considéré éliminé.
    // Le slug décide dans onDamage si la condition d'élimination est atteinte.
    // ctx = { combatant, cause }
    // null = pas d'effet secondaire sur l'élimination
    onDeath: null,

    // Appelé juste avant qu'un changement d'activeStates soit appliqué.
    // Permet d'effectuer des vérifications ou des effets AVANT la mise à jour.
    // ctx = { combatant, oldStates, newStates }
    onStateChange: null,

    // Appelé juste APRÈS qu'un changement d'activeStates a été appliqué.
    // Permet de déclencher des effets en réaction au nouvel état (ex: toast, son, animation).
    // ctx = { combatant, oldStates, newStates }
    onAfterStateChange: null,


    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE — CYCLES DE ROUND ET DE TOUR
    // ═══════════════════════════════════════════════════════════════════════

    // Appelé côté client GM à chaque NOUVEAU ROUND, après le nextTurn générique.
    // Reçoit la liste complète des combattants, retourne la liste modifiée.
    // Permet de nettoyer ou transformer les états en début de round
    // (ex: expirer la posture défensive, décrémenter des durées d'effet...).
    // La liste modifiée est ensuite envoyée via POST /sync-states pour broadcast.
    // null = aucun nettoyage automatique en début de round.
    onStateNewRound: null,
    // Exemple Pure Vikings :
    // onStateNewRound: (combatants) => combatants.map(c => ({
    //     ...c,
    //     activeStates: c.activeStates.filter(s => s.id !== 'posture-defensive'),
    // })),

    // Appelé côté client GM en DÉBUT DE TOUR d'un combattant (avant qu'il agisse).
    // Permet de gérer la durée des effets au tour par tour (ex: Berserk, poison...).
    // (currentCombatant, allCombatants) → { activeStates, ...updates }
    // Les updates retournées sont mergées dans le combattant via PUT /combatant/:id.
    // null = aucune logique de début de tour.
    onTurnStart: null,
    // Exemple Pure Vikings (posture expire + contrecoup Berserk) :
    // onTurnStart: (currentCombatant, allCombatants) => {
    //     let activeStates = [...(currentCombatant.activeStates ?? [])];
    //     let updates = {};
    //     // Retirer posture défensive
    //     activeStates = activeStates.filter(s => s.id !== 'posture-defensive');
    //     // Décrémenter Berserk
    //     activeStates = activeStates.map(s =>
    //         s.id === 'berserk'
    //             ? { ...s, data: { ...s.data, duration: (s.data?.duration ?? 1) - 1 } }
    //             : s
    //     );
    //     // Contrecoup si Berserk expiré
    //     const expiredBerserk = activeStates.find(s => s.id === 'berserk' && s.data?.duration <= 0);
    //     if (expiredBerserk) {
    //         activeStates = activeStates.filter(s => s.id !== 'berserk');
    //         updates = { actionsMax: Math.max(1, currentCombatant.actionsMax - 2) };
    //     }
    //     return { activeStates, ...updates };
    // },

    // Appelé côté client GM en début de chaque ROUND (avant onTurnStart du premier).
    // Permet de reroller l'initiative si le système le requiert
    // (ex: WoD reroll à chaque round, la plupart des systèmes gardent l'initiative fixe).
    // ctx = { combatants, fetchWithAuth, apiBase }
    // Retourne la liste des combattants avec initiatives modifiées, ou null si inchangé.
    // null = initiative fixe pour toute la durée du combat.
    onRoundStart: null,
    // Exemple WoD :
    // onRoundStart: async (ctx) => {
    //     return ctx.combatants.map(c => ({
    //         ...c,
    //         initiative: Math.floor(Math.random() * 10) + 1 + c.reactionScore,
    //     }));
    // },
},
```

### 9.4 Flow d'attaque — machine d'états côté joueur

Le hook `useAttackFlow` orchestre l'attaque côté joueur selon cette séquence :

```
idle → rolling → [rolled] → targeting → submitting → idle
```

| État | Condition | Ce qui s'affiche |
|---|---|---|
| `idle` | État de repos | Bouton « Attaquer » |
| `rolling` | Après clic Attaquer | `renderRollStep` (DiceModal...) |
| `rolled` | Après `onRollComplete` | Même composant, rollResult disponible |
| `targeting` | Après `onProceed` ou si pas de roll | `TargetSelectionModal` |
| `submitting` | Soumission en cours | Bouton désactivé |

À l'étape `targeting`, le flow :
1. `POST /combat/action` → décrémente `actionsRemaining` (générique)
2. `onBurnAction(ctx)` → effets secondaires slug (optionnel)
3. `POST /combat/submit-attack` → attaque en file GM
4. Retour à `idle` — l'attaquant a terminé

> L'attaquant récupère immédiatement la main. La validation et la défense éventuelle sont gérées séparément côté GM et défenseur, sans bloquer l'attaquant.

### 9.5 Flow de validation GM

Le GM voit les attaques en file dans `AttackValidationQueue`. Pour chaque attaque :

1. `combatConfig.onBeforeDamage(ctx)` — modification éventuelle des dégâts
2. `combatConfig.onDamage(ctx)` — persistance BDD (le slug écrit dans sa table)
3. `POST /combat/validate-attack` — mise à jour `healthData` du combattant cible + retrait de la file
4. Broadcast `combat-update` à tous les clients de la room

Le GM peut modifier la cible et les dégâts avant validation. `calculateDamage` est rappelé si la cible change.

### 9.6 Flow NPC — NPCModal et NPCAttackModal

#### NPCModal — 4 modes internes

| Mode | Déclencheur | Callbacks slug utilisés |
|---|---|---|
| `library` | Ouverture par défaut | — |
| `create` | Bouton « Nouveau template » | `renderNPCForm`, `buildNPCCombatStats` |
| `edit` | Bouton « Éditer » sur un template | `renderNPCForm`, `parseNPCCombatStats`, `buildNPCCombatStats` |
| `instanciate` | Bouton « Utiliser en combat » | `buildNPCHealthData` |

L'instanciation crée le combattant NPC en mémoire :

```js
{
    type:       'npc',
    name:       instanceName,
    actionsMax: combatStats.actionsMax,
    attaques:   combatStats.attaques,    // lu par getNPCRollContext
    initiative: rollInitiative(),
    healthData: combatConfig.buildNPCHealthData(combatStats),
}
```

#### NPCAttackModal — machine d'états

```
select → roll → rolled → target
```

| État | Condition | Contenu |
|---|---|---|
| `select` | `npc.attaques.length > 1` | Liste des attaques disponibles |
| `roll` | Attaque sélectionnée | Bouton « Lancer » + checkbox broadcast historique |
| `rolled` | Après animation | Résultat + succès + bouton « Choisir la cible » |
| `target` | Résultat disponible | `TargetSelectionModal` générique |

Le jet utilise `attack.getNPCRollContext(npc, selectedAttack)` puis `roll(ctx, combatConfig.dice)` — exactement les mêmes hooks dés que pour les joueurs. La différence tient uniquement au contexte fourni (pas de compétence ni de caractéristique).

### 9.7 Événements socket combat

| Événement | Direction | Description |
|---|---|---|
| `combat-update` | Serveur → tous les clients de la room | État combat complet broadcast |
| `combat-defense-opportunity` | Serveur → client défenseur ciblé | Opportunité de défense hors-tour |

---

## 10. Étape 8 — Thème CSS

Créer `src/client/src/systems/:slug/theme.css` avec les variables CSS du système :

```css
/* src/client/src/systems/noctis/theme.css */
:root {
    --color-primary:    #1a0a2e;
    --color-secondary:  #6b21a8;
    --color-accent:     #c084fc;
    --color-text:       #f3e8ff;
    --color-danger:     #ef4444;
    --color-success:    #22c55e;
}
```

Importer ce fichier dans `GMApp.jsx` et `Sheet.jsx` :

```jsx
import './theme.css';
```

---

## 11. Checklist finale

Avant de déclarer le système prêt, vérifier chaque point :

### Backend

- [ ] `src/server/systems/:slug/config.js` — `slug`, `label`, `dbPath`, `schemaPath` définis
- [ ] `src/server/systems/:slug/characterController.js` — `loadFullCharacter` et `saveFullCharacter` exportées
- [ ] `src/server/systems/:slug/routes/characters.js` — router Express avec au minimum GET `/`, `/by-url/:url`, `/:id`, POST `/`, PUT `/:id`
- [ ] `database-template/:slug-schema.sql` — tables transversales + tables spécifiques
- [ ] La table `characters` contient `id`, `access_code`, `access_url`, `player_name`
- [ ] Toutes les routes utilisent `req.db` (jamais `getDb()`)

### Frontend

- [ ] `src/client/src/systems/:slug/config.jsx` — `slug`, `label`, bloc `dice` définis
- [ ] `src/client/src/systems/:slug/Sheet.jsx` — composant exporté par défaut, accepte les props contractuelles
- [ ] `src/client/src/systems/:slug/GMApp.jsx` — composant exporté par défaut, accepte les props contractuelles
- [ ] Tous les `fetch` utilisent `apiBase` (jamais `/api` en dur)
- [ ] Les appels authentifiés utilisent `fetchWithAuth` (hook `useFetch`)

### Combat (si le système a du combat)

- [ ] Bloc `combat:{}` déclaré dans `config.jsx`
- [ ] `renderHealthDisplay` défini (JSX retourné)
- [ ] `actions[]` déclarées avec `condition` et `onAction` (ou `Modal`)
- [ ] `attack.getWeapons`, `attack.calculateDamage`, `attack.renderTargetInfo` définis
- [ ] `attack.renderRollStep` défini (ou `null` si pas de jet)
- [ ] `attack.getNPCRollContext` défini pour les jets NPC
- [ ] `renderNPCForm`, `buildNPCCombatStats`, `parseNPCCombatStats`, `buildNPCHealthData` définis
- [ ] `onDamage` défini et persiste bien en BDD via `fetchWithAuth`
- [ ] `onBeforeDamage` retourne bien un `number`
- [ ] `onTurnStart` et/ou `onStateNewRound` définis si le système a des états temporaires
- [ ] Structure des combattants respecte `healthData` / `turnData` opaques (jamais inspectés par le générique)
- [ ] `defenseOpportunity` défini si le système a des défenses hors-tour (`null` sinon)

### Validation finale

- [ ] Démarrer le serveur → vérifier `✅ System loaded: [slug] Label` dans les logs
- [ ] Accéder à `/:slug/` dans le navigateur → la fiche joueur s'affiche
- [ ] Accéder à `/:slug/gm` → l'interface GM s'affiche
- [ ] Créer un personnage via l'API GM → personnage visible dans la liste
- [ ] Se connecter avec le code d'accès → authentification JWT fonctionne

---

## 12. Référence rapide : arborescence complète

```
# BACKEND
src/server/systems/:slug/
├── config.js                  ← { slug, label, dbPath, schemaPath }
├── characterController.js     ← loadFullCharacter / saveFullCharacter
└── routes/
    └── characters.js          ← router Express spécifique

database-template/
├── :slug-schema.sql           ← schéma initial de la BDD
└── migrations/
    └── DDMMYYYY_add_quoi.sql  ← migrations futures

# FRONTEND
src/client/src/systems/:slug/
├── config.jsx                 ← métadonnées + hooks dés + config combat
├── Sheet.jsx                  ← fiche joueur (export default)
├── GMApp.jsx                  ← interface GM (export default)
├── theme.css                  ← variables CSS du système
├── components/                ← composants spécifiques joueur
│   ├── HealthDisplay.jsx
│   └── modals/
│       └── AttackModal.jsx
└── gm/                        ← composants spécifiques GM
    ├── GMView.jsx
    └── tabs/
        └── TabCombat.jsx
```

---

## Annexe — Événements Socket.io

Les rooms sont **isolées par système et par session** :

```
room = `${system}_session_${sessionId}`
// ex : "noctis_session_42"
```

| Événement | Direction | Description |
|---|---|---|
| `character-loaded` | Client → Serveur | Joueur en ligne avec son personnage |
| `character-left` | Client → Serveur | Joueur déconnecté |
| `join-session` | Client → Serveur | Rejoindre une room de session |
| `gm-set-active-session` | GM → Serveur | Activer une session côté GM |
| `character-update` | Serveur → Client | MAJ temps réel d'un personnage |
| `gm-item-received` | Serveur → Client | Item reçu du GM |
| `gm-message-received` | Serveur → Client | Message/note du GM |

> Les événements systèmes envoient toujours `{ sessionId, system }` pour que le serveur puisse router vers la bonne room.

---

*Document généré depuis la base de connaissance Mentiss — à maintenir à jour à chaque évolution de l'architecture.*