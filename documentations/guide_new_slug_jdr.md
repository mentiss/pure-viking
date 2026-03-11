# Guide — Créer un nouveau système JDR dans Mentiss

> **À qui s'adresse ce guide ?**  
> À tout développeur souhaitant ajouter un nouveau système de jeu de rôle (slug) dans la plateforme Mentiss VTT.  
> Le guide couvre l'intégralité du cycle : base de données → backend → frontend → combat.
>
> **Version 2.1** — Mise à jour après retour d'expérience du slug Dune.  
> Les sections marquées ⚠️ signalent des pièges rencontrés en production.

---

## Sommaire

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Étape 0 — Choisir son slug](#2-étape-0--choisir-son-slug)
3. [Étape 1 — Base de données](#3-étape-1--base-de-données)
4. [Étape 2 — Backend : config & controller](#4-étape-2--backend--config--controller)
5. [Étape 3 — Backend : routes Express](#5-étape-3--backend--routes-express)
6. [Étape 4 — Backend : sockets slug-spécifiques](#6-étape-4--backend--sockets-slug-spécifiques)
7. [Étape 5 — Frontend : config système](#7-étape-5--frontend--config-système)
8. [Étape 6 — Frontend : fiche joueur (Sheet)](#8-étape-6--frontend--fiche-joueur-sheet)
9. [Étape 7 — Frontend : création de personnage (Creation)](#9-étape-7--frontend--création-de-personnage-creation)
10. [Étape 8 — Frontend : interface GM (GMApp)](#10-étape-8--frontend--interface-gm-gmapp)
11. [Étape 9 — Système de dés](#11-étape-9--système-de-dés)
12. [Étape 10 — Système de combat](#12-étape-10--système-de-combat)
13. [Étape 11 — Thème CSS](#13-étape-11--thème-css)
14. [Migrations BDD](#14-migrations-bdd)
15. [Pièges React critiques](#15-pièges-react-critiques)
16. [Composants génériques réutilisables](#16-composants-génériques-réutilisables)
17. [Checklist finale](#17-checklist-finale)
18. [Référence rapide : arborescence complète](#18-référence-rapide--arborescence-complète)

---

## 1. Vue d'ensemble de l'architecture

### Principe directeur

> **On rend générique ce qui peut l'être. Ce qui est trop lié à un système reste spécifique.**

| Couche | Générique (partagé) | Spécifique (slug) |
|---|---|---|
| **BDD** | `characters`, `game_sessions`, `session_characters`, `dice_history`, `character_journal`, `refresh_tokens`, `npc_templates` | Tables supplémentaires propres au système |
| **Backend routes** | `sessions`, `journal`, `dice`, `combat`, `npc`, `auth` | `characters` (obligatoire) + tout fichier dans `routes/` hors `characters.js` |
| **Backend sockets** | Présence, sessions actives | Tout fichier dans `socket/` |
| **Frontend pages** | `PlayerPage`, `GMPage`, `AppRouter`, hooks, contextes | `Sheet.jsx`, `GMApp.jsx`, `Creation.jsx`, `config.jsx` |

### Auto-découverte

**Backend** : `loader.js` scanne `src/server/systems/`. Tout dossier avec un `config.js` valide est chargé. Aucun fichier central à modifier.

**Frontend** : Vite utilise `import.meta.glob` pour découvrir `Sheet.jsx`, `GMApp.jsx` et `Creation.jsx` de chaque système. Même logique.

---

## 2. Étape 0 — Choisir son slug

Le **slug** est l'identifiant technique du système :

- minuscules, sans espaces ni caractères spéciaux : `noctis`, `tecumah`, `opend6`
- identique dans : nom de dossier backend, dossier frontend, fichier BDD, URLs

```
/noctis/            → page joueur
/noctis/creation    → wizard de création de personnage
/noctis/gm          → interface GM
/api/noctis/...     → toutes les routes API
database/noctis.db  → base de données
```

---

## 3. Étape 1 — Base de données

### 3.1 Créer le schéma

Créer `database-template/:slug-schema.sql` en deux parties :
1. Tables transversales (section 3.2) — **verbatim, ne pas modifier**
2. Tables spécifiques au système

> ⚠️ Ne pas partir de `database-template/schema.sql` (Vikings). Il contient des colonnes Vikings dans `characters`. Utiliser les templates ci-dessous.

---

### 3.2 Tables transversales — SQL verbatim

#### `characters`

⚠️ **Toutes ces colonnes sont requises** par la couche générique.

```sql
CREATE TABLE IF NOT EXISTS characters (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Auth (requis par auth middleware + loginRateLimiter)
    access_code     TEXT UNIQUE NOT NULL,   -- max 6 caractères
    access_url      TEXT UNIQUE NOT NULL,
    player_name     TEXT NOT NULL,

    -- Identité standard (présent dans tous les systèmes)
    nom             TEXT NOT NULL DEFAULT '',
    prenom          TEXT NOT NULL DEFAULT '',
    avatar          TEXT DEFAULT NULL,      -- URL ou base64

    -- Anti-brute-force (requis par loginRateLimiter)
    login_attempts  INTEGER  DEFAULT 0,
    last_attempt_at DATETIME,
    last_accessed   DATETIME,

    -- Audit
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP

    -- === Ajouter ici les colonnes spécifiques au système ===
);

-- Compte GM obligatoire (id = -1)
-- ⚠️ Sans cet INSERT, la connexion GM échoue silencieusement.
-- access_url DOIT être 'this-is-MJ' (convention plateforme).
-- access_code DOIT faire 6 caractères maximum — 'GMCODE' est la valeur recommandée.
INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom, prenom)
VALUES (-1, 'GMCODE', 'this-is-MJ', 'Game Master', 'Game Master', 'MJ');
```

#### `game_sessions`

```sql
CREATE TABLE IF NOT EXISTS game_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    is_active   INTEGER DEFAULT 0,
    access_code TEXT    UNIQUE,         -- code d'accès rapide à la session
    access_url  TEXT    UNIQUE,         -- URL slug de la session
    date        TEXT    DEFAULT NULL,   -- date prévue (ISO string ou texte libre)
    notes       TEXT    DEFAULT '',     -- notes libres du GM
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `session_characters`

```sql
CREATE TABLE IF NOT EXISTS session_characters (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE CASCADE,
    UNIQUE(session_id, character_id)
);
```

#### `dice_history`

⚠️ **Utiliser cette version complète** avec les colonnes génériques.

```sql
CREATE TABLE IF NOT EXISTS dice_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER,
    character_id    INTEGER,
    character_name  TEXT,

    -- Colonnes génériques (utilisées par POST /dice/roll)
    notation        TEXT,
    roll_definition TEXT,
    roll_result     TEXT,       -- JSON complet du résultat
    roll_type       TEXT,       -- identifiant slug_type ex: 'dune_2d20'
    successes       INTEGER,

    rolled_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE SET NULL
);
```

#### `character_journal`

```sql
CREATE TABLE IF NOT EXISTS character_journal (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_id   INTEGER,
    type         TEXT    NOT NULL DEFAULT 'note', -- 'note' | 'gm_message'
    title        TEXT    NOT NULL DEFAULT '',
    body         TEXT    DEFAULT '',
    is_read      INTEGER DEFAULT 0,               -- 0 = non lu, 1 = lu
    metadata     TEXT    DEFAULT NULL,            -- JSON libre (ex: {"from":"gm","atout":true})
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE CASCADE,
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE SET NULL
);
```

#### `refresh_tokens`

⚠️ **Table souvent oubliée** — sans elle, le refresh JWT échoue au runtime.

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    token        TEXT    UNIQUE NOT NULL,
    expires_at   DATETIME NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

#### `npc_templates`

```sql
CREATE TABLE IF NOT EXISTS npc_templates (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    system_data  TEXT DEFAULT '{}',  -- JSON slug-spécifique (identité, lore, métadonnées)
    combat_stats TEXT DEFAULT '{}',  -- JSON slug-spécifique (stats combat, attaques, santé)
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.3 Tables spécifiques au système

Ajouter **après** les tables transversales. Exemple compétences :

```sql
CREATE TABLE IF NOT EXISTS character_skills (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    skill_name   TEXT    NOT NULL,
    rank         INTEGER DEFAULT 1,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

**Pattern inventaire réutilisable** (supprimer les colonnes inutiles) :

```sql
CREATE TABLE IF NOT EXISTS character_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    name         TEXT    NOT NULL,
    category     TEXT,
    quantity     INTEGER DEFAULT 1,
    notes        TEXT,
    weapon_type  TEXT,
    damage       TEXT,
    armor_value  INTEGER DEFAULT 0,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

---

### 3.4 Création automatique

Au premier appel sur `/api/:slug/...`, le pool lazy crée la BDD depuis `schemaPath` si le fichier `.db` est absent. Aucune commande manuelle.

---

## 4. Étape 2 — Backend : config & controller

### 4.1 Arborescence minimale obligatoire

```
src/server/systems/:slug/
  config.js                ← obligatoire
  characterController.js   ← obligatoire
  routes/
    characters.js          ← seul fichier de route obligatoire
```

### 4.2 `config.js`

```js
// src/server/systems/noctis/config.js
const path   = require('path');
const crypto = require('crypto');

module.exports = {
    slug:       'noctis',
    label:      'Noctis Solis',
    dbPath:     path.join(__dirname, '../../../../database/noctis.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/noctis-schema.sql'),

    // ── Génération d'un access_url unique ────────────────────────────────────
    // Optionnel — si absent, le loader utilise un UUID par défaut.
    // Personnaliser pour coller à l'identité du système.
    // Retourne une string URL-safe unique. Le code est généré séparément (6 chars max).
    generateAccessUrl: (playerName) => {
        const slug = playerName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 20);
        const suffix = crypto.randomBytes(3).toString('hex'); // 6 chars hex
        return `${slug}-${suffix}`;
    },
};
```

> `generateAccessUrl` est accessible dans les routes via `req.system.generateAccessUrl`.

### 4.3 `characterController.js`

```js
function loadFullCharacter(db, id) {
    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!char) return null;

    const skills = db.prepare(
        'SELECT * FROM character_skills WHERE character_id = ? ORDER BY skill_name'
    ).all(id);

    return { ...char, skills };
}

function saveFullCharacter(db, id, data) {
    const save = db.transaction(() => {
        db.prepare(`
            UPDATE characters
            SET player_name = ?, nom = ?, prenom = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(data.player_name, data.nom, data.prenom, id);

        if (Array.isArray(data.skills)) {
            db.prepare('DELETE FROM character_skills WHERE character_id = ?').run(id);
            const insert = db.prepare(
                'INSERT INTO character_skills (character_id, skill_name, rank) VALUES (?, ?, ?)'
            );
            for (const s of data.skills) insert.run(id, s.skill_name, s.rank);
        }
    });
    save();
}

module.exports = { loadFullCharacter, saveFullCharacter };
```

---

## 5. Étape 3 — Backend : routes Express

### 5.1 Route obligatoire : `routes/characters.js`

C'est le **seul fichier vérifié par le loader** (`REQUIRED_ROUTES = ['characters']`).

```js
const express   = require('express');
const router    = express.Router();
const { authenticate, requireGM, requireOwnerOrGM } = require('../../../middlewares/auth');
const { loadFullCharacter, saveFullCharacter }       = require('../characterController');

// GET / — liste (GM)
router.get('/', authenticate, requireGM, (req, res) => {
    try {
        const chars = req.db.prepare(
            'SELECT id, player_name, nom, prenom, avatar, access_url FROM characters WHERE id != -1'
        ).all();
        res.json(chars);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /by-url/:url — pas d'auth (utilisé au login)
router.get('/by-url/:url', (req, res) => {
    try {
        const row  = req.db.prepare('SELECT id FROM characters WHERE access_url = ?').get(req.params.url);
        const char = row ? loadFullCharacter(req.db, row.id) : null;
        if (!char) return res.status(404).json({ error: 'Character not found' });
        res.json(char);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /:id
router.get('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        const char = loadFullCharacter(req.db, Number(req.params.id));
        if (!char) return res.status(404).json({ error: 'Character not found' });
        res.json(char);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST / — création publique (wizard, pas d'auth)
router.post('/', (req, res) => {
    try {
        const { playerName, nom, prenom } = req.body;
        if (!playerName?.trim()) return res.status(400).json({ error: 'playerName requis' });

        const generateUrl = req.system?.generateAccessUrl;
        const accessUrl   = generateUrl ? generateUrl(playerName) : require('crypto').randomUUID();
        const accessCode  = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 chars

        const result = req.db.prepare(`
            INSERT INTO characters (access_code, access_url, player_name, nom, prenom)
            VALUES (?, ?, ?, ?, ?)
        `).run(accessCode, accessUrl, playerName.trim(), nom ?? '', prenom ?? '');

        res.status(201).json(loadFullCharacter(req.db, result.lastInsertRowid));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /:id
router.put('/:id', authenticate, requireOwnerOrGM, (req, res) => {
    try {
        saveFullCharacter(req.db, Number(req.params.id), req.body);
        res.json(loadFullCharacter(req.db, Number(req.params.id)));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /:id (GM)
router.delete('/:id', authenticate, requireGM, (req, res) => {
    try {
        req.db.prepare('DELETE FROM characters WHERE id = ?').run(Number(req.params.id));
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
```

### 5.2 Routes extra — auto-découverte

**Tout fichier `.js` dans `routes/` autre que `characters.js` est monté automatiquement** :

```
routes/session-resources.js  →  /api/noctis/session-resources
routes/session-maison.js     →  /api/noctis/session-maison
routes/lore.js               →  /api/noctis/lore
```

Aucune déclaration dans `server.js`. Il suffit de créer le fichier et d'exporter un router :

```js
// src/server/systems/noctis/routes/session-resources.js
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../../../middlewares/auth');

router.get('/:id', authenticate, (req, res) => {
    const row = req.db.prepare(
        'SELECT * FROM session_resources WHERE session_id = ?'
    ).get(Number(req.params.id));
    res.json(row ?? { sessionId: Number(req.params.id) });
});

module.exports = router;
```

### 5.3 Routes partagées (montées automatiquement pour tous les slugs)

| Route | Description |
|---|---|
| `/api/:slug/auth` | Login / refresh / logout |
| `/api/:slug/characters` | Depuis `routes/characters.js` du slug |
| `/api/:slug/sessions` | CRUD sessions |
| `/api/:slug/journal` | Journal personnages |
| `/api/:slug/dice` | Historique jets |
| `/api/:slug/combat` | Combat générique |
| `/api/:slug/npc` | Bibliothèque NPCs |

---

## 6. Étape 4 — Backend : sockets slug-spécifiques

### 6.1 Auto-découverte

**Tout fichier `.js` dans `socket/` est enregistré automatiquement** à chaque nouvelle connexion. Aucune déclaration dans `server.js`.

```
socket/session-resources.js  →  enregistre 'update-session-resources'
socket/lore.js               →  enregistre 'update-lore'
```

### 6.2 Contrat d'un handler socket

Chaque fichier exporte **une seule fonction** `register(io, socket)` :

```js
// src/server/systems/noctis/socket/session-resources.js
const { getDbForSystem }     = require('../../../db');
const { getConfigForSystem } = require('../../Loader');

const SLUG = 'noctis';

module.exports = function register(io, socket) {

    socket.on('update-session-resources', ({ sessionId, field, delta } = {}) => {
        if (!sessionId || typeof delta !== 'number') return;

        try {
            // ⚠️ Récupérer la DB ICI, à l'intérieur du handler — voir section 6.3
            const db = getDbForSystem(getConfigForSystem(SLUG));

            db.prepare('INSERT OR IGNORE INTO session_resources (session_id) VALUES (?)')
              .run(sessionId);

            const row    = db.prepare('SELECT * FROM session_resources WHERE session_id = ?').get(sessionId);
            const newVal = Math.max(0, row[field] + delta);

            db.prepare(`UPDATE session_resources SET ${field} = ? WHERE session_id = ?`)
              .run(newVal, sessionId);

            const updated = db.prepare('SELECT * FROM session_resources WHERE session_id = ?').get(sessionId);
            io.to(`${SLUG}_session_${sessionId}`).emit('session-resources-update', {
                sessionId: updated.session_id,
                impulsions: updated.impulsions,
                menace:     updated.menace,
            });
        } catch (err) {
            console.error(`[${SLUG}/socket] update-session-resources:`, err);
        }
    });

};
```

### 6.3 ⚠️ Accès à la BDD dans les sockets

Dans un handler socket il n'existe **pas** de `req.db`. La connexion BDD a un **TTL de 5 minutes** — elle peut être fermée entre deux événements.

```js
// ❌ MAUVAIS — db récupérée une fois au niveau module, peut être périmée
const db = getDbForSystem(getConfigForSystem(SLUG));
module.exports = function register(io, socket) {
    socket.on('mon-event', () => {
        db.prepare('...').run(); // db peut être fermée → crash
    });
};

// ✅ BON — db récupérée à chaque appel dans le handler
module.exports = function register(io, socket) {
    socket.on('mon-event', () => {
        const db = getDbForSystem(getConfigForSystem(SLUG)); // toujours fraîche
        db.prepare('...').run();
    });
};
```

### 6.4 Convention rooms socket

```
${slug}_session_${sessionId}   →   ex: noctis_session_42
```

```js
// Client : rejoindre
socket.emit('join-session', { sessionId, system: 'noctis' });

// Serveur : émettre vers la room
io.to(`noctis_session_${sessionId}`).emit('mon-event', payload);
```

---

## 7. Étape 5 — Frontend : config système

### 7.1 `config.jsx`

```jsx
// src/client/src/systems/noctis/config.jsx
const noctisConfig = {
    slug:  'noctis',
    label: 'Noctis Solis',

    // ─── Hooks dés ────────────────────────────────────────────────────────
    dice: {
        buildRollParams: (ctx) => ({
            pool:                ctx.systemData.pool ?? 3,
            threshold:           ctx.systemData.threshold ?? 4,
            explosionThresholds: ctx.systemData.explosionThresholds ?? [6],
            diceType:            'd6',
        }),
        buildNotation:  (ctx) => `${ctx.systemData.pool}d6!>=6>=${ctx.systemData.threshold}`,
        beforeRoll:     (ctx) => ctx,
        afterRoll:      (raw, ctx) => ({
            allDice:   raw.allDice,
            successes: raw.successes,
            total:     null,
            outcome:   null,
            flags:     raw.flags,
            detail:    { pool: ctx.systemData.pool, threshold: ctx.systemData.threshold },
            meta:      { autoSuccesses: 0, resourceSpent: 0, resourceGained: 0,
                         secondRoll: null, keptRoll: null },
        }),
        buildAnimationSequence: (raw, ctx) => ({
            mode: 'single',
            groups: [{
                id: 'main', diceType: 'd6', color: 'default',
                label: ctx.label ?? 'Jet', waves: raw.waves,
            }],
            insuranceData: null,
        }),
    },

    // ─── Bloc combat ──────────────────────────────────────────────────────
    combat: {
        renderHealthDisplay: () => null,
        actions: [],
        attack:  null,
    },
};

export default noctisConfig;
```

### 7.2 Hooks `useSystem` et `useFetch`

```js
const { slug, label, apiBase } = useSystem();
const fetchWithAuth = useFetch();

// Tous les fetch utilisent apiBase — jamais /api en dur
const response = await fetchWithAuth(`${apiBase}/characters/${id}`);
```

---

## 8. Étape 6 — Frontend : fiche joueur (Sheet)

### 8.1 Contrat de `Sheet.jsx`

```jsx
const Sheet = ({
    character,             // objet complet depuis loadFullCharacter
    onCharacterUpdate,     // (char) => void — avec persistance PUT ⚠️ voir 15.2
    onCharacterHasUpdated, // (char) => void — sans persistance (réception socket)
    onLogout,
    onChangeCharacter,
    darkMode,
    onToggleDarkMode,
}) => { /* ... */ };

export default Sheet;
```

### 8.2 Sauvegarder

```jsx
const response = await fetchWithAuth(`${apiBase}/characters/${character.id}`, {
    method: 'PUT',
    body:   JSON.stringify(updatedData),
});
if (response.ok) onCharacterUpdate(await response.json());
```

---

## 9. Étape 7 — Frontend : création de personnage (Creation)

### 9.1 Obligation

⚠️ **`Creation.jsx` est obligatoire**. Le frontend le découvre via `import.meta.glob`. Sans ce fichier, la route `/:slug/creation` renvoie une erreur.

### 9.2 Contrat

```jsx
const Creation = ({ darkMode, onToggleDarkMode }) => { /* wizard */ };
export default Creation;
```

### 9.3 Pattern minimal

```jsx
import React, { useState } from 'react';
import { useSystem }   from '../../hooks/useSystem.js';
import { useNavigate } from 'react-router-dom';

const Creation = () => {
    const { apiBase, slug } = useSystem();
    const navigate = useNavigate();
    const [form, setForm] = useState({ playerName: '', nom: '', prenom: '' });

    const handleSubmit = async () => {
        // Pas d'auth — création publique
        const res = await fetch(`${apiBase}/characters`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(form),
        });
        if (res.ok) {
            const char = await res.json();
            // Afficher le code d'accès généré (char.access_code) avant de rediriger
            navigate(`/${slug}/${char.access_url}`);
        }
    };

    // ... wizard multi-étapes
};

export default Creation;
```

---

## 10. Étape 8 — Frontend : interface GM (GMApp)

### 10.1 Contrat de `GMApp.jsx`

```jsx
const GMApp = ({
    activeSession,
    onSessionChange,
    onlineCharacters,
    darkMode,
    onToggleDarkMode,
}) => { /* ... */ };

export default GMApp;
```

### 10.2 Structure recommandée

```
src/client/src/systems/:slug/
  GMApp.jsx
  gm/
    GMView.jsx
    tabs/
      TabSession.jsx
      TabJournal.jsx   ← peut réutiliser le générique avec characterId={-1}
      TabCombat.jsx
    modals/
      GMDiceModal.jsx
```

### 10.3 Onglets génériques réutilisables

```jsx
import TabSession from '../../../components/gm/tabs/TabSession.jsx';
import TabJournal from '../../../components/gm/tabs/TabJournal.jsx';

<TabJournal characterId={-1} />
```

---

## 11. Étape 9 — Système de dés

### 11.1 diceEngine — moteur générique

`src/client/src/tools/diceEngine.js` expose :

```js
import { roll, rollWithInsurance } from '../../tools/diceEngine.js';

// Jet simple
const { result, animationSequence, notation } = roll(ctx, myConfig.dice);

// Double jet, meilleur gardé
const { result, animationSequence, notation } = rollWithInsurance(ctx, myConfig.dice);
```

Les hooks dans `config.dice` sont les points d'extension :

| Hook | Signature | Rôle |
|---|---|---|
| `buildRollParams` | `(ctx) → params` | Pool, seuils, type de dé |
| `buildNotation` | `(ctx) → string` | Notation rpg-dice-roller |
| `beforeRoll` | `(ctx) → ctx` | Validation, enrichissement |
| `afterRoll` | `(raw, ctx) → result` | Calcul succès, effets, méta |
| `buildAnimationSequence` | `(raw, ctx) → AnimationSequence` | Structure overlay 3D |

> ⚠️ **Toujours passer par `diceEngine.roll()`** plutôt que d'appeler `DiceRoll` directement. Cela garantit la cohérence de la structure de résultat, de l'animation et de l'historique.

### 11.2 Composants à importer

```jsx
import DiceAnimationOverlay from '../../../components/shared/DiceAnimationOverlay.jsx';
import { readDiceConfig }   from '../../../components/modals/DiceConfigModal.jsx';
```

### 11.3 Pattern obligatoire dans toute modale de dés

```jsx
const MyDiceModal = ({ character, onClose }) => {
    const { apiBase }        = useSystem();
    const fetchWithAuth      = useFetch();
    const socket             = useSocket();
    const { activeGMSession } = useSession();

    const [animSequence,  setAnimSequence]  = useState(null);
    const [pendingResult, setPendingResult] = useState(null);
    const [result,        setResult]        = useState(null);

    const handleRoll = useCallback(() => {
        const ctx = {
            label:      'Mon jet',
            characterId: character.id,
            systemData: {
                pool:                3,
                threshold:           4,
                explosionThresholds: [6],
            },
        };

        // 1. Lancer via diceEngine — résultat + animation en un appel
        const engineResult = roll(ctx, myConfig.dice);

        // 2. Persister dans dice_history (non bloquant)
        fetchWithAuth(`${apiBase}/dice/roll`, {
            method: 'POST',
            body: JSON.stringify({
                session_id:     activeGMSession ?? null,
                character_id:   character.id,
                character_name: character.nom,
                notation:       engineResult.notation,
                roll_result:    JSON.stringify(engineResult.result),
                roll_type:      'noctis_base',
                successes:      engineResult.result.successes,
            }),
        }).catch(() => {});

        // 3. Diffuser via socket si en session
        if (socket && activeGMSession) {
            socket.emit('dice-rolled', {
                sessionId:     activeGMSession,
                characterName: character.nom,
                result:        engineResult.result,
            });
        }

        // 4. Animation ou affichage direct
        const { animationEnabled } = readDiceConfig();
        if (animationEnabled) {
            setPendingResult(engineResult.result);
            setAnimSequence(engineResult.animationSequence);
        } else {
            setResult(engineResult.result);
        }
    }, [character, apiBase, fetchWithAuth, socket, activeGMSession]);

    const handleAnimComplete = useCallback(() => {
        setAnimSequence(null);
        setResult(pendingResult);
        setPendingResult(null);
    }, [pendingResult]);

    return (
        <>
            {animSequence && (
                <DiceAnimationOverlay
                    animationSequence={animSequence}
                    onComplete={handleAnimComplete}
                    onSkip={handleAnimComplete}
                />
            )}
            <div className="fixed inset-0 z-50 ...">
                {!result
                    ? <button onClick={handleRoll}>Lancer</button>
                    : <ResultDisplay result={result} />
                }
            </div>
        </>
    );
};
```

### 11.4 Structure `AnimationSequence`

```js
// Mode simple
{
    mode: 'single',
    groups: [{
        id:       'main',          // identifiant unique
        diceType: 'd6',            // 'd4','d6','d8','d10','d12','d20'
        color:    'default',       // 'default','wild','fortune','saga','danger'
        label:    'Pool principal',
        waves: [
            { dice: [5, 2, 6, 1] },   // vague initiale
            { dice: [3] },             // explosion du 6 → 1 dé supplémentaire
        ],
    }],
    insuranceData: null,
}

// Mode assurance (double jet, meilleur gardé)
{
    mode: 'insurance',
    groups: null,
    insuranceData: {
        groups1: [ /* même structure */ ],
        groups2: [ /* même structure */ ],
        keptRoll: 1,  // 1 ou 2
    },
}
```

---

## 12. Étape 10 — Système de combat

### 12.1 Combat facultatif

Le loader **ne vérifie pas** la présence d'un `routes/combat.js` slug-spécifique. Le combat générique est monté automatiquement depuis les routes partagées.

Si le système n'a pas de combat, déclarer un bloc minimal dans `config.jsx` :

```jsx
combat: { renderHealthDisplay: () => null, actions: [], attack: null },
```

### 12.2 Structure du combattant

```js
{
    id:               'player-42',
    type:             'player',   // 'player' | 'npc'
    name:             'Zaphod',
    initiative:       7,
    actionsRemaining: 2,
    actionsMax:       2,          // 0 = boutons d'actions désactivés (OpenD6)
    isAlive:          true,
    healthData:       { /* opaque — libre par slug */ },
    turnData:         { /* opaque — état du tour */ },
    attaques:         [],         // NPC uniquement
}
```

### 12.3 Bloc `combat` — référence complète

```jsx
combat: {
    renderHealthDisplay: (combatant) => <HealthDisplay combatant={combatant} />,

    actions: [{
        id:        'posture-defensive',
        label:     'Posture défensive',
        condition: (character, combatant) =>
            !combatant.activeStates?.some(s => s.id === 'posture-defensive'),
        onAction:  async (ctx) => {
            // ctx = { character, combatant, combatState, fetchWithAuth, apiBase, socket }
            await ctx.fetchWithAuth(`${ctx.apiBase}/combat/combatant/${ctx.combatant.id}`, {
                method: 'PUT',
                body: JSON.stringify({ updates: {
                    activeStates: [...(ctx.combatant.activeStates ?? []),
                        { id: 'posture-defensive', label: 'Posture défensive' }],
                }}),
            });
        },
    }],

    onDamage: async (target, damage, ctx) => {
        const newPv = Math.max(0, target.healthData.pv - damage);
        await ctx.fetchWithAuth(`${ctx.apiBase}/combat/combatant/${target.id}`, {
            method: 'PUT',
            body: JSON.stringify({ updates: {
                healthData: { ...target.healthData, pv: newPv }
            }}),
        });
    },

    onBeforeDamage:  (target, rawDamage) => rawDamage,
    onTurnStart:     (combatant) => combatant,
    onStateNewRound: (combatants) => combatants,

    attack: {
        getWeapons:       (character) => character.items?.filter(i => i.weapon_type) ?? [],
        renderRollStep:   (props) => <MyDiceModal {...props} />,
        calculateDamage:  (target, weapon, rollResult) =>
            Math.max(0, (weapon?.damage ?? 1) + (rollResult?.successes ?? 0)
                     - (target.healthData?.armor ?? 0)),
        renderTargetInfo: (combatant) =>
            `PV: ${combatant.healthData?.pv ?? '?'} | Armure: ${combatant.healthData?.armor ?? 0}`,
        defenseOpportunity: null,
        getNPCRollContext:   (npc, attack) => ({
            systemData:    { pool: npc.healthData?.pool ?? 2, threshold: attack.threshold ?? 4 },
            characterName: npc.name,
        }),
    },

    renderNPCForm:       (formData, onChange) => <NPCForm formData={formData} onChange={onChange} />,
    buildNPCCombatStats: (genericForm, slugForm) => JSON.stringify(slugForm),
    parseNPCCombatStats: (json) => { try { return JSON.parse(json); } catch { return {}; } },
    buildNPCHealthData:  (template) => ({ pv: template.pv_max ?? 10, pvMax: template.pv_max ?? 10 }),
},
```

---

## 13. Étape 11 — Thème CSS

```css
/* src/client/src/systems/noctis/theme.css */
:root {
    --color-primary:   #7c3aed;
    --color-secondary: #4c1d95;
    --color-accent:    #c4b5fd;
    --color-text:      #f5f3ff;
    --color-danger:    #ef4444;
    --color-success:   #22c55e;
    --color-bg:        #1e1b4b;
    --color-surface:   #2e1b5b;
    --color-border:    #4c1d95;
}
[data-theme="dark"] { --color-bg: #0f0a1a; }
```

Importer dans `Sheet.jsx`, `Creation.jsx` **et** `GMApp.jsx` :

```jsx
import './theme.css';
```

---

## 14. Migrations BDD

### 14.1 Créer une migration

```
database-template/migrations/DDMMYYYY_description.sql
```

### 14.2 Appliquer

Par défaut : **tous les systèmes** sont ciblés.

```bash
npm run migrate 08032026_add_avatar.sql
```

Pour cibler un ou plusieurs slugs spécifiques :

```bash
npm run migrate -- 08032026_add_avatar.sql --system=dune
npm run migrate -- 08032026_add_avatar.sql --system=dune,vikings
```

### 14.3 Exemple de fichier

```sql
-- 08032026_add_avatar.sql
ALTER TABLE characters ADD COLUMN avatar TEXT DEFAULT NULL;
```

---

## 15. Pièges React critiques

### 15.1 ⚠️ `React.lazy()` hors du body des composants

```jsx
// ❌ Recrée le composant à chaque render → flash de chargement
const MyTab = () => {
    const DiceModal = React.lazy(() => import('./DiceModal'));
    return <Suspense fallback={null}><DiceModal /></Suspense>;
};

// ✅ Au niveau module
const DiceModal = React.lazy(() => import('./DiceModal'));
const MyTab = () => <Suspense fallback={null}><DiceModal /></Suspense>;

// ✅ Pattern lazyCache pour imports conditionnels
const lazyCache = {};
const getLazy = (path) => {
    if (!lazyCache[path]) lazyCache[path] = React.lazy(() => import(path));
    return lazyCache[path];
};
```

### 15.2 ⚠️ `onCharacterUpdate` vs `onCharacterHasUpdated`

| Callback | Déclenche PUT | Quand l'utiliser |
|---|---|---|
| `onCharacterUpdate(char)` | ✅ OUI | Après une action utilisateur |
| `onCharacterHasUpdated(char)` | ❌ NON | Réception socket (mise à jour serveur) |

Appeler `onCharacterUpdate` en réponse à un socket crée une boucle infinie :

```
socket push → onCharacterUpdate → PUT → socket push → ...
```

```jsx
// ✅ Correct
socket.on('character-light-update', (data) => {
    if (data.characterId === character.id) {
        onCharacterHasUpdated({ ...character, ...data.updates }); // pas de PUT
    }
});
```

---

## 16. Composants génériques réutilisables

### Dés et animations

| Composant / Fonction | Import | Usage |
|---|---|---|
| `roll()`, `rollWithInsurance()` | `tools/diceEngine.js` | Moteur de dés — à utiliser en priorité |
| `DiceAnimationOverlay` | `components/shared/DiceAnimationOverlay.jsx` | Overlay 3D obligatoire |
| `readDiceConfig()` | `components/modals/DiceConfigModal.jsx` | Préférence animation |

### Interface GM

| Composant | Import | Usage |
|---|---|---|
| `TabSession` | `components/gm/tabs/TabSession.jsx` | Onglet session |
| `TabJournal` | `components/gm/tabs/TabJournal.jsx` | Journal — `characterId={-1}` pour GM |
| `NPCModal` | `components/gm/npc/NPCModal.jsx` | Bibliothèque + création NPCs |

### Joueur

| Composant | Import | Usage |
|---|---|---|
| `JournalTab` | `components/tabs/JournalTab.jsx` | Journal joueur |
| `DiceHistoryPage` | `components/tabs/DiceHistoryPage.jsx` | Historique jets |
| `SessionPlayersBar` | `components/shared/SessionPlayersBar.jsx` | Barre présence |
| `RichTextEditor` | `components/shared/RichTextEditor.jsx` | Éditeur TipTap |

### Modales utilitaires

| Composant | Import |
|---|---|
| `ConfirmModal` | `components/modals/ConfirmModal.jsx` |
| `AlertModal` | `components/modals/AlertModal.jsx` |
| `CodeModal` | `components/modals/CodeModal.jsx` |

---

## 17. Checklist finale

### Backend

- [ ] `config.js` — `slug`, `label`, `dbPath`, `schemaPath`, `generateAccessUrl`
- [ ] `characterController.js` — `loadFullCharacter`, `saveFullCharacter`
- [ ] `routes/characters.js` — seul fichier obligatoire
- [ ] `database-template/:slug-schema.sql` — tables transversales verbatim + tables spécifiques
- [ ] `characters` : `login_attempts`, `last_attempt_at`, `created_at`, `updated_at`, `nom`, `prenom`, `avatar`
- [ ] `characters` : INSERT GM `id=-1`, `access_url='this-is-MJ'`, `access_code='GMCODE'`
- [ ] `game_sessions` : `access_code`, `access_url`, `date`, `notes`
- [ ] `character_journal` : `is_read`, `metadata`
- [ ] `npc_templates` : `system_data` et `combat_stats` présents
- [ ] `dice_history` : `notation`, `roll_result`, `roll_type`, `successes`
- [ ] `refresh_tokens` présente
- [ ] Routes extra dans `routes/` (auto-montées)
- [ ] Handlers socket dans `socket/` (auto-enregistrés)
- [ ] Sockets : `getDbForSystem` appelé **dans** le handler à chaque event

### Frontend

- [ ] `config.jsx` — `slug`, `label`, blocs `dice` et `combat`
- [ ] `theme.css` — importé dans Sheet, Creation, GMApp
- [ ] `Sheet.jsx` — props contractuelles, `onCharacterHasUpdated` inclus
- [ ] `Creation.jsx` — obligatoire, exporté par défaut
- [ ] `GMApp.jsx` — exporté par défaut
- [ ] Tous les `fetch` utilisent `apiBase`
- [ ] Appels authentifiés via `fetchWithAuth`
- [ ] `React.lazy()` jamais dans le body d'un composant
- [ ] `onCharacterUpdate` / `onCharacterHasUpdated` distincts

### Dés

- [ ] `diceEngine.roll()` utilisé dans les modales
- [ ] `DiceAnimationOverlay` présent
- [ ] `readDiceConfig()` consulté avant animation
- [ ] Pattern `pendingResult / animSequence / handleAnimComplete` respecté
- [ ] Historique persisté via `POST /dice/roll`

### Combat (si implémenté)

- [ ] Bloc `combat:{}` dans `config.jsx` (même minimal)
- [ ] `onDamage` persiste via `fetchWithAuth`
- [ ] `healthData` / `turnData` opaques
- [ ] `defenseOpportunity` défini ou `null`

### Validation finale

- [ ] Serveur : `✅ System loaded: [slug] Label`
- [ ] `/:slug/` → fiche joueur
- [ ] `/:slug/creation` → wizard
- [ ] `/:slug/gm` → interface GM
- [ ] Login joueur → JWT valide, cookie `refreshToken_[slug]`
- [ ] Login GM → JWT distinct, cookie `refreshToken_[slug]_gm`
- [ ] Jet de dés → animation si activée, historique persisté
- [ ] Socket events → room `[slug]_session_[id]`, DB récupérée proprement

---

## 18. Référence rapide : arborescence complète

```
src/
├── server/
│   └── systems/
│       └── :slug/
│           ├── config.js                    ← slug, label, dbPath, schemaPath, generateAccessUrl
│           ├── characterController.js
│           ├── routes/
│           │   ├── characters.js            ← seul fichier obligatoire
│           │   ├── [extra-route].js         ← auto-monté sur /api/:slug/[extra-route]
│           │   └── ...
│           └── socket/
│               ├── [handler].js             ← export function register(io, socket)
│               └── ...
│
├── client/src/
│   └── systems/
│       └── :slug/
│           ├── config.jsx                   ← obligatoire
│           ├── Sheet.jsx                    ← obligatoire
│           ├── Creation.jsx                 ← obligatoire
│           ├── GMApp.jsx                    ← obligatoire
│           ├── theme.css
│           ├── components/
│           ├── dice/
│           └── gm/
│               ├── GMView.jsx
│               ├── tabs/
│               └── modals/
│
database-template/
├── :slug-schema.sql
└── migrations/
    └── DDMMYYYY_description.sql
```