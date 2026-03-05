# 🎲 VTT Multi-JDR

> Virtual Tabletop léger et modulaire. Conçu pour accueillir plusieurs systèmes de jeu de rôle (JDR) sans réécrire la base existante.

---

## ✨ Philosophie

- **Pas de bibliothèques superflues** — chaque dépendance doit se justifier.
- **Clarté avant tout** — hooks personnalisés côté React, contrôleurs clairs côté Express.
- **Multi-système par isolation** — une base de données SQLite par système, des routes montées dynamiquement.
- **Rétro-compatibilité** — le système Vikings existant reste intact pendant l'évolution de la plateforme.
- **Temps réel robuste** — rooms Socket.io isolées par système et par session.

---

## 🧱 Stack Technique

| Couche       | Technologie                                      |
|--------------|--------------------------------------------------|
| Backend      | Node.js + Express                                |
| Base données | SQLite via `better-sqlite3` (connexions lazy, TTL 5 min) |
| Temps réel   | Socket.io (rooms préfixées par système)          |
| Frontend     | React 19 + Vite                                  |
| Routing      | React Router v7                                   |
| Auth         | JWT + cookie httpOnly (refresh token)            |
| Éditeur      | TipTap v3 (rich text, menus flottants, images)   |
| Dés 3D       | `@3d-dice/dice-box-threejs`                       |
| Dés logique  | `@dice-roller/rpg-dice-roller`                    |
| Styles       | Tailwind CSS v4                                  |

---

## 📁 Structure du Projet

```
/
├── src/
│   ├── server/                        # Backend Express
│   │   ├── server.js                  # Point d'entrée, montage dynamique des routes
│   │   ├── db/
│   │   │   └── index.js               # Pool lazy de connexions SQLite (TTL 5 min)
│   │   ├── systems/                   # Un dossier par système de jeu
│   │   │   ├── Loader.js              # Auto-scan + registre des systèmes
│   │   │   └── vikings/               # Système Pure Vikings
│   │   │       ├── config.jsx          # { slug, label, dbPath, schemaPath }
│   │   │       ├── characterController.js
│   │   │       └── routes/
│   │   │           ├── characters.js  # Routes spécifiques personnages
│   │   │           └── combat.js      # Routes spécifiques combat
│   │   ├── routes/                    # Routes partagées (tous systèmes)
│   │   │   ├── sessions.js
│   │   │   ├── journal.js
│   │   │   └── dice.js
│   │   ├── middleware/
│   │   │   ├── systemResolver.js      # Injecte req.system + req.db
│   │   │   ├── auth.js
│   │   │   └── rateLimits.js
│   │   └── utils/
│   │       ├── characters.js          # generateAccessCode, generateAccessUrl
│   │       ├── db.js                  # Compat descendante getDb() → vikings
│   │       ├── jwt.js
│   │       └── combatState.js         # État combat en mémoire (Vikings)
│   │
│   └── client/                        # Frontend React
│       ├── index.html
│       └── src/
│           ├── main.jsx
│           ├── AppRouter.jsx          # Routes React Router
│           ├── context/
│           │   ├── SystemsContext.jsx # Liste des systèmes chargés depuis /api/systems
│           │   ├── SocketContext.jsx
│           │   └── SessionContext.jsx
│           ├── hooks/
│           │   ├── useSystem.js       # { slug, label, apiBase }
│           │   ├── usePlayerSession.js
│           │   └── useFetch.js        # fetch authentifié avec refresh token
│           ├── tools/
│           │   └── diceEngine.js      # Orchestrateur générique de dés
│           ├── systems/
│           │   └── vikings/
│           │       └── config.jsx      # Hooks système : beforeRoll, buildRollParams, afterRoll…
│           └── components/
│               ├── shared/            # Composants agnostiques au système
│               │   ├── RichTextEditor.jsx
│               │   ├── ToastNotifications.jsx
│               │   ├── ThemeToggle.jsx
│               │   ├── SessionPlayersBar.jsx
│               │   └── …
│               ├── tabs/
│               │   └── JournalTab.jsx
│               ├── modals/
│               └── GMView/            # Interface Maître du Jeu
│
├── database/                          # Bases SQLite (gitignored)
│   └── pure-vikings.db
├── database-template/
│   ├── schema.sql                     # Schéma de référence Vikings
│   └── migrations/                    # Scripts de migration
│       └── DDMMYYYY_add_quoi.sql
├── package.json                       # Scripts racine
└── README.md
```

---

## 🚀 Installation & Lancement

### Prérequis

- **Node.js** v20+
- **npm**

### Variables d'environnement

Créer un fichier **`.env`** à la racine du projet (jamais commité) :

```dotenv
# Serveur
PORT=3001
NODE_ENV=development        # ou "production"

# JWT — changer les secrets avant tout déploiement
JWT_SECRET=change_me_with_a_long_random_string
JWT_ACCESS_EXPIRATION=15m   # durée du token d'accès (ex: 15m, 1h)
JWT_REFRESH_EXPIRATION=30   # durée du refresh token en jours

# SSL — requis uniquement en production (NODE_ENV=production)
# En dev, le serveur tourne en HTTP simple, ces variables sont ignorées
SSL_KEY_PATH=/etc/ssl/private/your-domain.key
SSL_CERT_PATH=/etc/ssl/certs/your-domain.crt
```

> En production, le serveur bascule automatiquement sur HTTPS via `https.createServer()`. Les chemins SSL doivent pointer vers des fichiers lisibles par le process Node.js.  
> Avec Let's Encrypt (Certbot), les chemins sont typiquement :
> ```
> SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
> SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
> ```

> ⚠️ `JWT_SECRET` doit être une chaîne longue et aléatoire en production.  
> Générer avec : `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Setup

```bash
# 1. Dépendances backend (racine)
npm install

# 2. Dépendances frontend + assets dés 3D
cd src/client
npm install
node scripts/copy-dice-assets.js   # copie les assets de dice-box-threejs dans public/dice-assets/
cd ../..

# 3. Initialiser la base de données
npm run init-db

# 4. Lancer en développement
npm run dev
```

> L'étape `copy-dice-assets.js` est **obligatoire** après chaque `npm install` côté client.  
> Elle copie les fichiers statiques (workers, textures, modèles 3D) de `@3d-dice/dice-box-threejs` vers `src/client/public/dice-assets/`. Sans ça, les animations de dés ne se chargent pas.

Le backend démarre sur **http://localhost:3001**.  
Le frontend Vite démarre sur **http://localhost:5173** (proxy vers le backend).

### Build & déploiement production

```bash
# 1. Build du frontend (depuis la racine)
npm run build

# 2. Lancer avec pm2 (recommandé)
npm install -g pm2

pm2 start src/server/server.js --name "vtt-jdr" --env production

# Démarrage automatique au reboot
pm2 save
pm2 startup
```

Quelques commandes pm2 utiles :

```bash
pm2 status              # état du process
pm2 logs vtt-jdr        # logs en temps réel
pm2 restart vtt-jdr     # redémarrer après un déploiement
pm2 stop vtt-jdr        # arrêter
```

En production, Express sert le build statique Vite depuis `src/client/dist/`.

---

## 🗄️ Base de Données & Migrations

Chaque système de jeu possède sa propre base SQLite. La connexion est ouverte à la première requête et fermée automatiquement après **5 minutes d'inactivité**.

### Ajouter une migration

```bash
# Créer le fichier dans database-template/migrations/
# Format : DDMMYYYY_add_quoi.sql

# Jouer la migration
npm run migrate 27022025_add_quoi.sql
```

### Tables partagées (présentes dans toutes les BDD)

`characters`, `game_sessions`, `session_characters`, `dice_history`, `character_journal`

### Tables spécifiques (exemple Vikings)

`character_skills`, `character_traits`, `character_runes`, `character_items`

---

## 🌐 API Routes

Toutes les routes sont préfixées par le slug du système : `/api/:system/…`

| Méthode | Route                                    | Description                        |
|---------|------------------------------------------|------------------------------------|
| GET     | `/api/systems`                           | Liste des systèmes disponibles     |
| GET     | `/api/health`                            | Health check                       |
| POST    | `/api/:system/auth/login`                | Authentification GM                |
| GET     | `/api/:system/characters`                | Liste des personnages              |
| GET     | `/api/:system/characters/:id`            | Fiche complète                     |
| POST    | `/api/:system/characters`                | Créer un personnage                |
| PUT     | `/api/:system/characters/:id`            | Mettre à jour                      |
| DELETE  | `/api/:system/characters/:id`            | Supprimer                          |
| GET     | `/api/:system/sessions`                  | Liste des sessions                 |
| POST    | `/api/:system/sessions`                  | Créer une session                  |
| GET     | `/api/:system/journal/:characterId`      | Entrées journal                    |
| POST    | `/api/:system/journal/:characterId`      | Nouvelle entrée                    |
| PUT     | `/api/:system/journal/:characterId/:id`  | Modifier une entrée                |
| POST    | `/api/:system/dice/roll`                 | Enregistrer un jet                 |
| GET     | `/api/:system/dice/history/:characterId` | Historique dés                     |

---

## 🔌 Événements Socket.io

Les rooms sont isolées par système et session : `${system}_session_${sessionId}`

| Événement (émis)        | Direction       | Description                              |
|-------------------------|-----------------|------------------------------------------|
| `character-loaded`      | Client → Serveur | Joueur en ligne avec son personnage      |
| `character-left`        | Client → Serveur | Joueur déconnecté                        |
| `join-session`          | Client → Serveur | Rejoindre une room de session            |
| `gm-set-active-session` | GM → Serveur     | Activer une session côté GM              |
| `character-update`      | Serveur → Client | Mise à jour temps réel d'un personnage   |
| `gm-item-received`      | Serveur → Client | Item reçu du GM (rechargement perso)     |
| `gm-message-received`   | Serveur → Client | Message/note envoyé par le GM            |

---

## 🎮 Systèmes de Jeu

### Ajouter un nouveau système

1. Créer `src/server/systems/:slug/config.jsx`
2. Créer `src/server/systems/:slug/characterController.js`
3. Créer `src/server/systems/:slug/routes/characters.js`
4. Créer `src/server/systems/:slug/routes/combat.js`
5. Créer `database-template/:slug-schema.sql`
6. Créer les composants frontend dans `src/client/src/components/systems/:slug/`
7. Ajouter la config dés dans `src/client/src/systems/:slug/config.jsx`

> Le système est découvert automatiquement au démarrage. Aucun fichier central à modifier.

### Systèmes actuels

| Slug      | Nom           | BDD                        | Statut      |
|-----------|---------------|----------------------------|-------------|
| `vikings` | Pure Vikings  | `database/pure-vikings.db` | ✅ Actif    |
| `noctis`  | Noctis Solis  | `database/noctis.db`       | 🔜 À venir  |
| `tecumah` | Tecumah       | `database/tecumah.db`      | 🔜 À venir  |

---

## 🎲 Moteur de Dés (Vikings)

- **Pool** : 3d10 (modifié par blessures/fatigue)
- **Explosion** : selon niveau de caractéristique (seuil 8, 9 ou 10)
- **Succès** : selon niveau de compétence (seuil 4+, 5+, 6+, 7+)
- **Jets SAGA** : Héroïque (4 succès), Épique (5 succès), Assurance
- **Animation 3D** : `@3d-dice/dice-box-threejs` (désactivable)

Le moteur (`diceEngine.js`) est générique. Chaque système déclare ses propres hooks `beforeRoll`, `buildRollParams`, `afterRoll`, `buildAnimationSequence` dans son fichier de config frontend.

---

## 🔐 Sécurité

- **GM/Joueurs** : routes et vues strictement séparées. L'interface GM requiert un JWT valide.
- **Auth** : JWT access token (courte durée) + refresh token en cookie httpOnly.
- **Sockets** : les événements GM sont vérifiés côté serveur avant diffusion.
- **Rate limiting** : middleware `rateLimits.js` sur les routes sensibles.

---

## 🛠️ Scripts npm

| Commande                       | Description                              |
|--------------------------------|------------------------------------------|
| `npm run dev`                  | Lance backend + frontend en développement |
| `npm start`                    | Lance le serveur en production           |
| `npm run init-db`              | Initialise la base de données            |
| `npm run migrate <fichier.sql>`| Joue une migration sur la BDD            |