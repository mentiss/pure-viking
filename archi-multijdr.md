# Architecture Multi-JDR — Document de Référence

> Ce document consigne toutes les décisions d'architecture prises pour rendre l'application VTT multi-système.
> **À fournir en contexte au début de chaque nouvelle conversation sur ce sujet.**
> Dernière mise à jour : Phase 1 refacto préparatoire complète.

---

## 1. Objectif

Transformer l'application "Pure Vikings" en une plateforme VTT générique capable d'accueillir plusieurs systèmes de jeu de rôle (Vikings, Noctis Solis, Tecumah, etc.) sans réécrire la base existante.

**Principe directeur : on rend générique ce qui peut l'être. Ce qui est trop lié à un système reste spécifique.**

---

## 2. Stratégie BDD

- Une BDD SQLite par système : `database/pure-vikings.db`, `database/noctis.db`, etc.
- Pas de renommage des fichiers existants. La correspondance slug↔fichier est dans `config.js` du système.
- Les connexions sont **lazy** : ouvertes à la première requête, fermées après **5 minutes d'inactivité** (TTL reset à chaque accès).
- Si la BDD n'existe pas (premier lancement), elle est créée automatiquement depuis le `schemaPath`.
- L'`access_url` en BDD reste inchangé. C'est le routing qui sait que `/vikings/brave-warrior-1234` → cherche dans `vikings.db`.

### Tables transversales (présentes dans toutes les BDD)
`characters`, `game_sessions`, `session_characters`, `dice_history`, `character_journal`

### Tables spécifiques par système
Ex. Vikings : `character_skills`, `character_traits`, `character_runes`, `character_items`

---

## 3. Découverte des systèmes

**Auto-scan au démarrage** : `src/server/systems/loader.js` scanne `systems/*/config.js`.
- Un dossier sans `config.js` valide est ignoré avec un warning.
- Un système invalide ne fait pas crasher le serveur.
- Ajouter un système = créer son dossier. Aucun fichier central à modifier.

### Contrat d'un système (fichiers obligatoires)
```
src/server/systems/:slug/
  config.js              ← { slug, label, dbPath, schemaPath }
  characterController.js ← loadFullCharacter(db, id) / saveFullCharacter(db, id, data)
  routes/
    characters.js        ← router Express spécifique (toute la logique personnage)
    combat.js            ← router Express spécifique (mécanique de combat du système)
```

### Exemple config.js
```js
module.exports = {
    slug:       'vikings',
    label:      'Pure Vikings',
    dbPath:     path.join(__dirname, '../../../../database/pure-vikings.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/schema.sql'),
};
```

---

## 4. Architecture Backend

### Routes spécifiques vs partagées

| Route | Type | Raison |
|---|---|---|
| `characters` | **Spécifique** | Structure personnage différente par système |
| `combat` | **Spécifique** | Mécaniques de dommages différentes (tokens/PV/etc.) |
| `sessions` | **Partagée** | Structure identique partout |
| `journal` | **Partagée** | Structure identique partout |
| `dice` | **Partagée** | Historique générique |

### Montage dynamique dans server.js
Pour chaque système chargé, le serveur monte automatiquement :
```
/api/:slug/characters  →  systems/:slug/routes/characters.js
/api/:slug/combat      →  systems/:slug/routes/combat.js
/api/:slug/sessions    →  routes/shared/sessions.js
/api/:slug/journal     →  routes/shared/journal.js
/api/:slug/dice        →  routes/shared/dice.js
```

### Middleware systemResolver
Intercepte `/api/:system/*`, vérifie que le slug est connu, ouvre la connexion lazy, injecte dans `req` :
- `req.system` → config complète du système `{ slug, label, dbPath, schemaPath }`
- `req.db` → connexion `better-sqlite3` du système

**Toutes les routes utilisent `req.db` au lieu de `getDb()`.**

### Structure dossiers backend
```
src/server/
  db/
    index.js                     ← pool lazy TTL 5min
  systems/
    loader.js                    ← auto-scan + registre
    vikings/
      config.js
      characterController.js
      routes/
        characters.js            ← spécifique Vikings
        combat.js                ← spécifique Vikings
    noctis/                      ← (futur)
      config.js
      ...
  routes/
    shared/
      sessions.js                ← générique
      journal.js                 ← générique
      dice.js                    ← générique
    auth.js                      ← sans préfixe système
  middleware/
    systemResolver.js
    auth.js
    rateLimits.js
  utils/
    characters.js                ← generateAccessCode/Url, ensureUniqueCode
    db.js                        ← compat descendante (getDb() → vikings)
    jwt.js
    combatState.js               ← état combat en mémoire (Vikings)
  server.js
```

---

## 5. Architecture Frontend

### Routing — React Router v6
`react-router-dom` doit être installé : `cd src/client && npm install react-router-dom`

Structure des routes :
```
/                    → redirect → /vikings/
/mj                  → redirect → /vikings/gm  (legacy bookmark)
/gm                  → redirect → /vikings/gm  (legacy bookmark)
/:system/            → App joueur (accueil)
/:system/gm          → GMView (authentification requise)
/:system/:accessUrl  → App joueur (chargement direct par URL)
```

### Hook useSystem
```js
const { slug, label, apiBase } = useSystem();
// apiBase = '/api/vikings'
fetch(`${apiBase}/characters/${id}`)
```

Tous les appels fetch dans l'app doivent utiliser `apiBase` au lieu de `/api` en dur.

### Organisation des composants
```
src/client/src/components/
  systems/
    vikings/           ← Sheet, Creation, DiceModal,
                          EditModals, Experience, RunesTab, InventoryTab
    noctis/            ← (futur)
  shared/              ← ToastNotifications, ThemeToggle, CodeModal,
                          ConfirmModal, AlertModal, RichTextEditor,
                          DiceConfigModal, HistoryPanel, SessionPlayersBar
  GMView/              ← interface GM (déjà isolée)
```

**Règle de décision** :
- `shared/` : pas d'import de données Vikings, pas de logique métier système
- `systems/vikings/` : utilise données Vikings ou règles propres au système

---

## 6. Socket.io

Rooms préfixées par système pour isolation totale :
- `${system}_session_${sessionId}` (ex: `vikings_session_42`)

Les événements socket (`gm-set-active-session`, `join-session`) reçoivent `{ sessionId, system }`.

---

## 7. Auth

Inchangée. JWT + refresh token cookie httpOnly.
`/api/auth` est monté sans préfixe système — il utilise `getDb()` (Vikings par défaut).
À terme, chaque système aura son propre GM fictif (id = -1) dans sa propre BDD.

---

## 8. Stack technique

| Couche | Technologie |
|---|---|
| Backend | Node.js + Express |
| BDD | SQLite via `better-sqlite3` (pool lazy TTL 5min) |
| Temps réel | Socket.io (rooms préfixées système) |
| Frontend | React 19 + Vite |
| Routing frontend | React Router v6 (`react-router-dom`) |
| Auth | JWT + cookie httpOnly |

---

## 9. Ajouter un nouveau système (checklist)

1. Créer `src/server/systems/:slug/config.js`
2. Créer `src/server/systems/:slug/characterController.js`
3. Créer `src/server/systems/:slug/routes/characters.js`
4. Créer `src/server/systems/:slug/routes/combat.js`
5. Créer `database-template/:slug-schema.sql`
6. Ajouter le slug dans `SYSTEMS` de `src/client/src/hooks/useSystem.js`
7. Ajouter le slug dans `KNOWN_SYSTEMS` de `src/client/src/AppRouter.jsx`
8. Créer les composants frontend dans `src/client/src/components/systems/:slug/`

---

## 10. Systèmes prévus

| Slug | Nom | BDD | Statut |
|---|---|---|---|
| `vikings` | Pure Vikings | `database/pure-vikings.db` | ✅ Actif |
| `noctis` | Noctis Solis | `database/noctis.db` | 🔜 Futur |
| `tecumah` | Tecumah | `database/tecumah.db` | 🔜 Futur |