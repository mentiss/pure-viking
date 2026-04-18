# Guide — Créer un nouveau système JDR dans Mentiss

> **À qui s'adresse ce guide ?**
> À tout développeur souhaitant ajouter un nouveau système de jeu de rôle (slug) dans la plateforme Mentiss VTT.
> Le guide couvre l'intégralité du cycle : base de données → backend → frontend → combat.
>
> **Version 3.0** — Mise à jour après refactoring diceEngine v2 (mars 2026).
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

> ⚠️ Ne pas partir de `database-template/schema.sql` (Vikings). Il contient des colonnes Vikings dans `characters`. Utiliser les templates du fichier base.sql. 

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
VALUES (-1, 'GMCODE', 'this-is-MJ', 'Game Master', 'GM', '');
```

#### Tables transversales — verbatim complet

```sql
CREATE TABLE IF NOT EXISTS game_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_characters (
    session_id   INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, character_id),
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dice_history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id     INTEGER,
    character_id   INTEGER,
    character_name TEXT,
    roll_type      TEXT,
    notation       TEXT,
    roll_result    TEXT,
    successes      INTEGER,
    pool           INTEGER,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id)    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS character_journal (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_id   INTEGER,
    title        TEXT NOT NULL DEFAULT 'Sans titre',
    content      TEXT DEFAULT '',
    entry_type   TEXT DEFAULT 'note',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    token        TEXT UNIQUE NOT NULL,
    expires_at   DATETIME NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS npc_templates (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    combat_stats TEXT DEFAULT '{}',
    actions_max  INTEGER DEFAULT 1,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Tables spécifiques au système

Ajouter après les tables transversales. Pattern recommandé pour les listes (items, compétences, talents...) :

```sql
-- Pattern réutilisable : table de listes liées à un personnage
CREATE TABLE IF NOT EXISTS character_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    category     TEXT DEFAULT 'misc',
    quantity     INTEGER DEFAULT 1,
    location     TEXT DEFAULT 'inventory',  -- 'inventory' | 'equipped'
    damage       TEXT,                      -- optionnel, pour les armes
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

---

## 4. Étape 2 — Backend : config & controller

### 4.1 `config.js`

```js
// src/server/systems/:slug/config.js
const path = require('path');

module.exports = {
    slug:       ':slug',
    label:      'Mon Système',
    dbPath:     path.join(__dirname, '../../../database/:slug.db'),
    schemaPath: path.join(__dirname, '../../../database-template/:slug-schema.sql'),

    // Optionnel — par défaut : 6 chars alphanumériques aléatoires
    generateAccessUrl: () => Math.random().toString(36).substring(2, 8),
};
```

### 4.2 `CharacterController.js`

```js
// src/server/systems/:slug/CharacterController.js
const loadFullCharacter = async (db, id) => {
    const char = await db.get('SELECT * FROM characters WHERE id = ?', [id]);
    if (!char) return null;

    // Charger les tables liées
    const items = await db.all(
        'SELECT * FROM character_items WHERE character_id = ? ORDER BY created_at',
        [id]
    );

    // Reshaper si nécessaire (colonnes → tableaux, etc.)
    return { ...char, items };
};

const saveFullCharacter = async (db, id, data) => {
    const { items, ...charData } = data;

    // Mettre à jour les colonnes simples
    await db.run(`
        UPDATE characters SET
            nom        = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [charData.nom, id]);

    // Synchroniser les tables liées si nécessaire
    // ...

    return loadFullCharacter(db, id);
};

module.exports = { loadFullCharacter, saveFullCharacter };
```

---

## 5. Étape 3 — Backend : routes Express

### 5.1 `routes/characters.js` (obligatoire)

Seul fichier de routes **obligatoire**. Les autres fichiers dans `routes/` sont auto-montés sur `/api/:slug/[nom-fichier]`.

```js
// src/server/systems/:slug/routes/characters.js
const express    = require('express');
const router     = express.Router();
const { authMiddleware } = require('../../../middleware/auth');
const { loadFullCharacter, saveFullCharacter } = require('../characterController');

// POST / — Création publique (pas d'auth)
router.post('/', async (req, res) => {
    try {
        const db = req.db;
        const { playerName, nom } = req.body;

        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const accessUrl  = Math.random().toString(36).substring(2, 14);

        const result = await db.run(`
            INSERT INTO characters (player_name, nom, access_code, access_url)
            VALUES (?, ?, ?, ?)
        `, [playerName, nom || '', accessCode, accessUrl]);

        const char = await loadFullCharacter(db, result.lastID);
        res.json(char);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur création personnage' });
    }
});

// GET /:id — Charger un personnage
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const char = await loadFullCharacter(req.db, req.params.id);
        if (!char) return res.status(404).json({ error: 'Personnage introuvable' });
        res.json(char);
    } catch (err) {
        res.status(500).json({ error: 'Erreur chargement' });
    }
});

// PUT /:id — Sauvegarder
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const isOwner = req.user.characterId === parseInt(req.params.id);
        const isGM    = req.user.characterId === -1;
        if (!isOwner && !isGM) return res.status(403).json({ error: 'Accès refusé' });

        const updated = await saveFullCharacter(req.db, req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Erreur sauvegarde' });
    }
});

module.exports = router;
```

### 5.2 Routes supplémentaires (auto-montage)

Tout fichier `src/server/systems/:slug/routes/[nom].js` est automatiquement monté sur `/api/:slug/[nom]` par `loader.js`. Pas de déclaration centrale nécessaire.

---

## 6. Étape 4 — Backend : sockets slug-spécifiques

```js
// src/server/systems/:slug/socket/myHandler.js
module.exports = {
    register(io, socket) {
        socket.on('my-slug-event', async (data) => {
            // Accès à la DB via socket.db (injecté par loader)
            const db = socket.db;
            // ...
            io.emit('my-slug-broadcast', { ... });
        });
    },
};
```

Tout fichier dans `socket/` est auto-découvert. La fonction `register(io, socket)` est appelée à chaque connexion.

---

## 7. Étape 5 — Frontend : config système

### 7.1 `config.jsx`

```jsx
// src/client/src/systems/noctis/config.jsx
import { RollError } from '../../tools/diceEngine.js';
import NoctisHistoryEntry from './components/NoctisHistoryEntry.jsx'; // optionnel

const noctisConfig = {
    slug:  'noctis',
    label: 'Noctis Solis',

    // ─── Bloc dés ─────────────────────────────────────────────────────────────
    dice: {
        // 1. buildNotation(ctx) → string | string[]
        //    Appelé par le COMPOSANT (DiceModal) AVANT roll().
        //    Retourne une notation rpg-dice-roller ou un tableau (groupes multiples).
        buildNotation: (ctx) => {
            const { pool, threshold, explosionMin } = ctx.systemData;
            if (!pool || pool < 1) throw new RollError('NO_DICE', 'Aucun dé à lancer');
            return `${pool}d6!>=${explosionMin}>=${threshold}`;
            // Multi-groupes (ex: insurance) : return [notation1, notation2]
        },

        // 2. beforeRoll(ctx) → ctx
        //    Validation + enrichissement avant exécution. Lancer RollError pour bloquer.
        beforeRoll: (ctx) => {
            const { pool } = ctx.systemData;
            if (pool < 1 || pool > 10)
                throw new RollError('INVALID_POOL', `Pool invalide : ${pool}`);
            return ctx;
        },

        // 3. afterRoll(raw, ctx) → result
        //    Interprétation du résultat brut. raw.groups[].values = faces de dés.
        //    TOUJOURS inclure `successes` pour la persistance générique.
        afterRoll: (raw, ctx) => {
            const { threshold } = ctx.systemData;
            const values    = raw.groups[0].values;  // faces de dés uniquement
            const successes = values.filter(v => v >= threshold).length;

            return {
                values,
                successes,
                pool:      ctx.systemData.pool,
                threshold,
                exploded:  raw.flags.exploded,
                // successes est lu par le moteur pour la persistance
            };
        },

        // 4. buildAnimationSequence(raw, ctx, result) → AnimationSequence | null
        //    Structure envoyée au DiceAnimationOverlay via le bridge.
        //    3e paramètre `result` disponible si l'animation dépend du résultat.
        //    Retourner null pour désactiver l'animation 3D.
        buildAnimationSequence: (raw, ctx, result) => ({
            mode: 'single',
            groups: [{
                id:       'main',
                diceType: 'd6',
                color:    'default',
                label:    ctx.label ?? 'Jet',
                waves:    [{ dice: raw.groups[0].values }],
            }],
        }),

        // 5. renderHistoryEntry(entry) → JSX | null
        //    null → rendu générique dans HistoryPanel / DiceHistoryPage.
        //    Retourner un composant JSX pour un affichage riche système-spécifique.
        renderHistoryEntry: (entry) => null,
        // Exemple riche : renderHistoryEntry: (entry) => <NoctisHistoryEntry roll={entry} />,
    },

    // ─── Bloc combat ──────────────────────────────────────────────────────────
    // Voir section 12 pour le contrat complet.
    combat: {
        renderHealthDisplay: () => null,
        actions:             [],
        attack:              null,
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

### 11.1 Architecture générale (diceEngine v2)

Le moteur suit le principe : **le moteur exécute, le slug décide**.

```
Composant (DiceModal)
  │
  ├─ 1. buildNotation(ctx)              → notation string | string[]
  │                                        (appelé par le composant, PAS par le moteur)
  │
  └─ 2. await roll(notation, ctx, hooks)  → result
           │
           ├─ hooks.beforeRoll(ctx)        → validation + enrichissement
           ├─ rpg-dice-roller              → raw (groupes + faces + flags)
           ├─ hooks.afterRoll(raw, ctx)    → result (interprétation slug)
           ├─ hooks.buildAnimationSequence → AnimationSequence
           ├─ diceAnimBridge.play(seq)     → [await] animation 3D (singleton)
           └─ POST apiBase/dice/roll       → persist (si ctx.apiBase + ctx.fetchFn)
```

**Points clés v2 :**
- `roll()` est **async** — elle attend la fin de l'animation avant de rendre la main
- **`buildNotation` est appelé par le composant** — pas un hook moteur
- **Persist inclus dans le moteur** — ne pas appeler `POST /dice/roll` manuellement
- **Overlay singleton** dans `PlayerPage`/`GMPage` via `diceAnimBridge` — pas d'overlay local dans les modales
- **`rollWithInsurance` supprimé** — remplacé par un tableau de notations `[n1, n2]`
- **`buildRollParams` supprimé** — les params sont construits directement dans `buildNotation`

### 11.2 Import

```js
import { roll, RollError } from '../../../tools/diceEngine.js';
```

### 11.3 Signature de `roll()`

```js
const result = await roll(notation, ctx, hooks);
```

| Paramètre | Type | Description |
|---|---|---|
| `notation` | `string \| string[]` | Notation(s) rpg-dice-roller construites par le composant |
| `ctx` | `object` | Contexte du jet (voir ci-dessous) |
| `hooks` | `object` | Hooks du slug — typiquement `monConfig.dice` |

**Structure de `ctx` :**

```js
const ctx = {
    // ── Persist (obligatoire pour l'historique) ──
    apiBase:       apiBase,        // ex: '/api/noctis'
    fetchFn:       fetchWithAuth,  // fonction fetch authentifiée

    // ── Identité ──
    characterId:   character.id,
    characterName: character.prenom ?? character.nom,
    sessionId:     activeGMSession ?? null,
    rollType:      'noctis_skill', // label libre pour l'historique

    // ── Affichage ──
    label:         'Mon Jet',      // affiché dans l'overlay animation

    // ── Données système (opaques pour le moteur) ──
    systemData: {
        pool:      3,
        threshold: 4,
        // ... tout ce dont afterRoll a besoin
    },

    // ── Options moteur ──
    // persistHistory: false,  // désactiver la persistance pour ce jet
};
```

### 11.4 Structure de `raw` (entrée de `afterRoll`)

```js
raw = {
    groups: [
        {
            notation: '3d6!>=6>=4',
            values:   [2, 5, 6, 6],  // faces de dés uniquement (explosions incluses)
            total:    null,           // toujours null — utiliser values
        },
        // ... un groupe par notation si tableau passé
    ],
    allDice: [2, 5, 6, 6],          // concat de tous les groups[].values
    flags: {
        exploded: [6, 6],           // faces qui ont explosé
    },
};
```

> ⚠️ **Toujours utiliser `raw.groups[i].values`** pour les faces de dés. Ne jamais utiliser `raw.groups[i].total` (toujours `null`).

### 11.5 Pattern obligatoire dans une modale de dés

```jsx
const MyDiceModal = ({ character, onClose }) => {
    const { apiBase }        = useSystem();
    const fetchWithAuth      = useFetch();
    const socket             = useSocket();
    const { activeGMSession } = useSession();

    const [result,   setResult]   = useState(null);
    const [rolling,  setRolling]  = useState(false);
    const [error,    setError]    = useState(null);

    const handleRoll = useCallback(async () => {
        if (rolling) return;
        setRolling(true);
        setError(null);

        try {
            const ctx = {
                apiBase,
                fetchFn:       fetchWithAuth,
                characterId:   character.id,
                characterName: character.prenom ?? character.nom,
                sessionId:     activeGMSession ?? null,
                rollType:      'noctis_skill',
                label:         'Mon Jet',
                systemData: {
                    pool:         3,
                    threshold:    4,
                    explosionMin: 6,
                },
            };

            // 1. Construire la notation (appelé par le composant)
            const notation = myConfig.dice.buildNotation(ctx);

            // 2. roll() gère : animation, persist, retour résultat
            const res = await roll(notation, ctx, myConfig.dice);
            setResult(res);

            // 3. Optionnel : diffuser via socket
            if (socket && activeGMSession) {
                socket.emit('dice-rolled', {
                    sessionId:     activeGMSession,
                    characterName: character.prenom,
                    result:        res,
                });
            }
        } catch (err) {
            if (err instanceof RollError) {
                setError(err.message);
            } else {
                console.error('[MyDiceModal]', err);
                setError('Erreur inattendue');
            }
        } finally {
            setRolling(false);
        }
    }, [rolling, character, apiBase, fetchWithAuth, activeGMSession, socket]);

    // ⚠️ Pas de <DiceAnimationOverlay /> ici — c'est un singleton dans PlayerPage/GMPage
    return (
        <div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button onClick={handleRoll} disabled={rolling}>
                {rolling ? 'Lancer...' : 'Lancer les dés'}
            </button>
            {result && <MyResultDisplay result={result} />}
        </div>
    );
};
```

### 11.6 Multi-groupes : remplaçant de `rollWithInsurance`

```js
// Avant (supprimé) :
const res = rollWithInsurance(ctx, config.dice);

// Après — notation tableau, afterRoll reçoit raw.groups[0] et raw.groups[1]
const notation = ['3d6!>=6>=4', '3d6!>=6>=4']; // deux jets identiques
const res = await roll(notation, ctx, config.dice);

// Dans afterRoll, garder le meilleur des deux groupes :
afterRoll: (raw, ctx) => {
    const successes0 = raw.groups[0].values.filter(v => v >= ctx.systemData.threshold).length;
    const successes1 = raw.groups[1].values.filter(v => v >= ctx.systemData.threshold).length;
    const kept = successes0 >= successes1 ? 0 : 1;
    return {
        values:    raw.groups[kept].values,
        successes: Math.max(successes0, successes1),
        keptGroup: kept,
    };
},
```

### 11.7 Désactiver la persistance

```js
const ctx = {
    // Pas de apiBase/fetchFn → pas de persist
    systemData: { pool: 2 },
    label: 'Jet rapide',
};
// Ou explicitement :
const ctx = { persistHistory: false, apiBase, fetchFn: fetchWithAuth, ... };
```

### 11.8 `getNPCRollContext` dans `combatConfig.attack`

Pour les jets de NPC, le contexte doit inclure `apiBase`, `fetchFn` et `sessionId` en tant que troisième argument :

```js
// Dans config.jsx — combatConfig.attack
getNPCRollContext: (npc, attack, { apiBase, fetchFn, sessionId }) => ({
    apiBase,
    fetchFn,
    characterId:   null,             // NPC — pas d'id BDD
    characterName: npc.name,
    sessionId,
    rollType:      'noctis_npc_attack',
    label:         `${npc.name} — ${attack.name}`,
    systemData: {
        pool:      npc.healthData?.pool ?? 2,
        threshold: attack.succes,
        // ... champs spécifiques au système
    },
}),
```

`NPCAttackModal` appelle `getNPCRollContext(npc, attack, { apiBase, fetchFn, sessionId })` et passe le ctx à `roll()`.

---

## 12. Étape 10 — Système de combat

### 12.1 `combatConfig` dans `config.jsx`

Le bloc `combat` de `config.jsx` est injecté dans tous les composants génériques de combat via la prop `combatConfig`. C'est le seul endroit où la logique métier combat du slug est déclarée.

```jsx
// Dans config.jsx
combat: {

    // ── Affichage santé (CombatantCard) ────────────────────────────────────
    // Reçoit un combattant, retourne du JSX pour afficher sa santé.
    renderHealthDisplay: (combatant) => <MyHealthDisplay combatant={combatant} />,

    // ── Actions slug (boutons dans CombatPanel joueur) ──────────────────────
    // Tableau d'actions slug-spécifiques affichées en plus du bouton Attaquer générique.
    actions: [
        {
            id:    'my-action',
            label: '⚔️ Mon Action',
            // condition(character, combatant) → boolean
            condition: (character, combatant) =>
                combatant.actionsRemaining > 0 &&
                !combatant.activeStates?.some(s => s.id === 'my-action'),
            // onAction(ctx) → void | Promise
            // ctx : { combatant, character, apiBase, fetchWithAuth, openModal }
            onAction: (ctx) => ctx.openModal('my-action'),
            // Modal : composant monté par CombatPanel si openModal('my-action') appelé
            Modal: MyActionModal,
        },
    ],

    // ── Flow d'attaque ────────────────────────────────────────────────────────
    attack: {
        // condition(character, combatant) → boolean (afficher le bouton Attaquer ?)
        condition: () => true,

        // getWeapons(character) → [{ id, nom, degats, ... }]
        getWeapons: (character) => (character?.items || [])
            .filter(i => i.location === 'equipped' && i.category === 'weapon')
            .map(i => ({ id: i.id, nom: i.name, degats: parseInt(i.damage || 2) })),

        // renderRollStep : composant modale de jet joueur
        renderRollStep: (props) => <MyDiceModal {...props} />,

        // calculateDamage(target, weapon, rollResult) → number
        calculateDamage: (target, weapon, rollResult) =>
            Math.max(0, (weapon?.degats ?? 1) + (rollResult?.successes ?? 0)
                     - (target.healthData?.armure ?? 0)),

        // renderTargetInfo(combatant) → string — ligne d'info dans TargetSelectionModal
        renderTargetInfo: (combatant) =>
            `PV: ${combatant.healthData?.pv ?? '?'} | Armure: ${combatant.healthData?.armure ?? 0}`,

        defenseOpportunity: null, // hook future — laisser null si non utilisé

        // getNPCRollContext(npc, attack, { apiBase, fetchFn, sessionId }) → ctx
        // ⚠️ Le 3e argument est obligatoire depuis diceEngine v2
        getNPCRollContext: (npc, attack, { apiBase, fetchFn, sessionId }) => ({
            apiBase,
            fetchFn,
            characterId:   null,
            characterName: npc.name,
            sessionId,
            rollType:      'my_slug_npc_attack',
            label:         `${npc.name} — ${attack.name}`,
            systemData: {
                pool:      npc.healthData?.pool ?? 2,
                threshold: attack.succes,
            },
        }),
    },

    // ── Callbacks lifecycle ─────────────────────────────────────────────────
    // Appelé côté client GM — persistance BDD après validation d'une attaque
    onDamage: async (ctx) => {
        // ctx : { attacker, target, damage, weapon, rollResult,
        //         newHealthData, fetchWithAuth, apiBase }
        if (ctx.target.type !== 'player' || !ctx.target.characterId) return;
        await ctx.fetchWithAuth(`${ctx.apiBase}/characters/${ctx.target.characterId}`, {
            method: 'PUT',
            body:   JSON.stringify({ /* champs à mettre à jour */ }),
        });
    },
    onBeforeDamage: (ctx) => ctx.damage, // peut modifier le damage avant application
    onDeath:        null,
    onStateChange:  null,

    // Appelé côté GM à chaque début de tour d'un combattant
    onTurnStart: (currentCombatant, allCombatants) => {
        // Retourner allCombatants (potentiellement modifié) ou null si aucun changement
        return allCombatants;
    },
    canBurnAction: ({ combatant }) => combatant.actionsRemaining > 0,
    onBurnAction:  null,

    // ── Callbacks NPC ────────────────────────────────────────────────────────
    // renderNPCForm(formData, onChange) → JSX — champs slug-spécifiques dans NPCModal
    renderNPCForm: (formData, onChange) => (
        <div>
            <label>PV Max</label>
            <input type="number" value={formData.pvMax ?? 5}
                   onChange={e => onChange('pvMax', parseInt(e.target.value))} />
        </div>
    ),

    // buildNPCCombatStats(formData) → object JSON stocké dans npc_templates.combat_stats
    buildNPCCombatStats: (formData) => ({
        pvMax:      formData.pvMax ?? 5,
        armure:     formData.armure ?? 0,
        actionsMax: formData.actionsMax ?? 1,
        attaques:   formData.attaques ?? [],
    }),

    // parseNPCCombatStats(json) → formData — inverse de buildNPCCombatStats
    parseNPCCombatStats: (json) => {
        try { return typeof json === 'string' ? JSON.parse(json) : json; }
        catch { return {}; }
    },

    // buildNPCHealthData(combat_stats) → healthData runtime initial du combattant
    buildNPCHealthData: (combat_stats) => ({
        pv:    0,
        pvMax: combat_stats?.pvMax ?? 5,
        armure: combat_stats?.armure ?? 0,
    }),
},
```

### 12.2 `actionsMax: 0` — désactiver le flow générique

Pour les systèmes où la gestion des actions est intégralement slug-spécifique (ex: OpenD6, Shadowrun) :

```js
// Dans buildNPCHealthData ou lors de l'instanciation du combattant
actionsMax: 0  // masque les boutons Attaquer et Autre Action génériques
// La logique d'action est alors gérée via turnData et une UI slug dédiée
```

---

## 13. Étape 11 — Thème CSS

```css
/* src/client/src/systems/noctis/theme.css */
:root {
    --color-primary:     #7c3aed;
    --color-secondary:   #4c1d95;
    --color-accent:      #c4b5fd;
    --color-text:        #f5f3ff;
    --color-text-muted:  #a78bfa;
    --color-danger:      #ef4444;
    --color-success:     #22c55e;
    --color-bg:          #1e1b4b;
    --color-surface:     #2e1b5b;
    --color-surface-alt: #3b1f6b;
    --color-border:      #4c1d95;
}
[data-theme="dark"] {
    --color-bg:      #0f0a1a;
    --color-surface: #1a1030;
}
```

Importer dans `Sheet.jsx`, `Creation.jsx` **et** `GMApp.jsx` :

```jsx
import './theme.css';
```

> ⚠️ Les composants génériques utilisent **uniquement** des variables `var(--color-*)`. Ne pas utiliser de classes `tailwind` système-spécifiques (`noctis-*`, `dune-*`) dans les composants partagés.

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

### 15.3 ⚠️ Pas d'overlay local dans les modales de dés

Depuis diceEngine v2, `<DiceAnimationOverlay />` est un **singleton monté dans `PlayerPage` et `GMPage`**. Il s'enregistre automatiquement via `diceAnimBridge`.

```jsx
// ❌ Ne plus faire — overlay local dans la modale
const MyModal = () => {
    const [animSeq, setAnimSeq] = useState(null);
    return (
        <>
            <DiceAnimationOverlay sequence={animSeq} />
            ...
        </>
    );
};

// ✅ roll() déclenche le singleton automatiquement — rien à faire dans la modale
const MyModal = () => {
    const handleRoll = async () => {
        const notation = myConfig.dice.buildNotation(ctx);
        const result   = await roll(notation, ctx, myConfig.dice);
        // L'animation a déjà eu lieu quand roll() rend la main
        setResult(result);
    };
    // Pas de DiceAnimationOverlay ici
};
```

---

## 16. Composants génériques réutilisables

### Dés et animations

| Composant / Fonction | Import | Usage |
|---|---|---|
| `roll()` | `tools/diceEngine.js` | **Seule API à utiliser** — async, anime et persiste |
| `RollError` | `tools/diceEngine.js` | Classe d'erreur métier (code + message) |
| `diceAnimBridge` | `tools/diceAnimBridge.js` | Bridge singleton animation — ne pas appeler directement |
| `readDiceConfig()` | `components/modals/DiceConfigModal.jsx` | Préférence animation utilisateur |

> ⚠️ `rollWithInsurance` a été supprimé. Utiliser un tableau de notations `[n1, n2]` à la place.

### Interface GM

| Composant | Import | Usage |
|---|---|---|
| `TabSession` | `components/gm/tabs/TabSession.jsx` | Onglet session |
| `TabJournal` | `components/gm/tabs/TabJournal.jsx` | Journal — `characterId={-1}` pour GM |
| `NPCModal` | `components/gm/npc/NPCModal.jsx` | Bibliothèque + création NPCs (4 modes) |

### Joueur

| Composant | Import | Usage |
|---|---|---|
| `JournalTab` | `components/tabs/JournalTab.jsx` | Journal joueur |
| `DiceHistoryPage` | `components/tabs/DiceHistoryPage.jsx` | Historique jets — prop `renderHistoryEntry` optionnelle |
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

- [ ] `src/server/systems/:slug/config.js` — `slug`, `label`, `dbPath`, `schemaPath`
- [ ] `database-template/:slug-schema.sql` — toutes les tables + INSERT GM id=-1
- [ ] `CharacterController.js` — `loadFullCharacter` / `saveFullCharacter`
- [ ] `routes/characters.js` — POST public, GET et PUT authentifiés
- [ ] Routes supplémentaires si nécessaire (auto-montées)
- [ ] Sockets slug-spécifiques si nécessaire (auto-découverts)
- [ ] Toutes les routes utilisent `req.db`

### Frontend

- [ ] `config.jsx` — `slug`, `label`, bloc `dice` complet (5 hooks), bloc `combat`
- [ ] `theme.css` — variables CSS `--color-*` jour + nuit
- [ ] `Sheet.jsx` — contrat props respecté, appels via `apiBase`
- [ ] `Creation.jsx` — wizard, création publique, affichage `access_code`
- [ ] `GMApp.jsx` — contrat props respecté
- [ ] Modale(s) de dés — `buildNotation` + `await roll()`, pas d'overlay local
- [ ] `renderHistoryEntry` dans `config.dice` (null si rendu générique)
- [ ] `getNPCRollContext` accepte le 3e argument `{ apiBase, fetchFn, sessionId }`
- [ ] Tous les `fetch` utilisent `apiBase` (jamais `/api` en dur)
- [ ] Appels authentifiés utilisent `fetchWithAuth`

### Validation système

- [ ] Démarrer serveur → `✅ System loaded: :slug`
- [ ] `/:slug/` → fiche joueur s'affiche
- [ ] `/:slug/gm` → interface GM s'affiche
- [ ] Création personnage sans auth → `access_code` + `access_url` générés
- [ ] Connexion `access_code` → JWT valide, fiche chargée
- [ ] Jet de dés → animation, résultat correct, entrée dans `dice_history`
- [ ] `roll()` rend la main après l'animation (pas de résultat avant la fin)

---

## 18. Référence rapide : arborescence complète

```
src/
├── server/
│   └── systems/
│       └── :slug/
│           ├── config.js                    ← slug, label, dbPath, schemaPath
│           ├── CharacterController.js
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
│           ├── config.jsx                   ← obligatoire (dice + combat)
│           ├── Sheet.jsx                    ← obligatoire
│           ├── Creation.jsx                 ← obligatoire
│           ├── GMApp.jsx                    ← obligatoire
│           ├── theme.css
│           ├── components/
│           │   ├── modals/
│           │   │   └── DiceModal.jsx        ← buildNotation + await roll()
│           │   └── ...
│           └── gm/
│               ├── GMView.jsx
│               ├── tabs/
│               │   ├── TabSession.jsx
│               │   ├── TabJournal.jsx
│               │   └── TabCombat.jsx
│               └── modals/
│                   └── GMDiceModal.jsx
│
database-template/
├── :slug-schema.sql
└── migrations/
    └── DDMMYYYY_description.sql
```