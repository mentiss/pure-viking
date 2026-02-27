# Pure Vikings - Système Pure Saga (v3.0)

Application web complète pour gérer des personnages du jeu de rôle Pure Saga (Norvège, 810 EC).

## 🎯 Fonctionnalités V3

### ✅ Backend Complet
- **Serveur Node.js + Express** sur port 3001
- **Base de données SQLite** avec structure relationnelle
- **API REST** pour personnages, jets de dés, sessions
- **Codes d'accès** : Code court (6 chars) + URL unique pour partage
- **Persistance complète** : Tous les changements sauvegardés en temps réel

### ✅ Frontend Corrigé
- **Layout optimisé** : Grid 2 colonnes sans espaces vides
- **Tokens en 2 colonnes** : Blessures | Fatigue côte à côte
- **Malus fatigue corrigé** : Seul index 0 gratuit (1=+1, 2-3=+2, etc.)
- **Jets de SAGA** : 3 types (Héroïque 4 succès, Épique 5 succès, Assurance)
- **Mode Édition** : Ajout/suppression compétences et traits
- **Mode Évolution** : Dépenser SAGA pour progresser

## 📋 Prérequis

- **Node.js** v18+ (pour le backend)
- **npm** (inclus avec Node.js)

## 🚀 Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Initialiser la base de données
npm run init-db

# 3. Lancer le serveur
npm run dev
```

Le serveur démarre sur **http://localhost:3001**

## 📁 Structure du Projet

```
pure-vikings-v3/
├── src/
│   ├── server/               # Backend Node.js
│   │   ├── server.js         # Serveur Express
│   │   ├── db.js             # Gestionnaire SQLite
│   │   ├── routes/
│   │   │   ├── characters.js # API personnages
│   │   │   └── dice.js       # API historique dés
│   │   └── init-db.js        # Script initialisation
│   ├── components/           # Composants React
│   │   ├── Sheet.jsx
│   │   ├── Creation.jsx
│   │   ├── DiceModal.jsx
│   │   ├── EditModals.jsx
│   │   ├── Experience.jsx
│   │   ├── ThemeToggle.jsx
│   │   └── RunesTab.jsx
│   ├── App.jsx                # Application principale
│   ├── data.js               # Compétences, traits, runes
│   └── utils.js              # Fonctions utilitaires
├── database/                 # Base SQLite (gitignore)
│   └── pure-vikings.db
├── database-template/        # Template schéma
│   └── schema.sql
├── index.html                # Point d'entrée
├── package.json
└── README.md
```

## 🎲 API Routes

### Personnages
- `GET /api/characters` - Liste tous
- `GET /api/characters/:id` - Détails par ID
- `GET /api/characters/by-code/:code` - Accès par code (ex: ABC123)
- `GET /api/characters/by-url/:url` - Accès par URL (ex: brave-warrior-1234)
- `POST /api/characters` - Créer
- `PUT /api/characters/:id` - Mettre à jour
- `DELETE /api/characters/:id` - Supprimer

### Historique Dés
- `POST /api/dice/roll` - Enregistrer un jet
- `GET /api/dice/history/:characterId` - Historique d'un perso

## 💾 Base de Données

### Structure Relationnelle
- **characters** : Infos personnage (caracs, SAGA, tokens, codes d'accès)
- **character_skills** : Compétences (nom, niveau, points)
- **character_traits** : Traits & backgrounds
- **character_runes** : Runes magiques
- **dice_history** : Historique jets de dés
- **game_sessions** : Sessions de jeu
- **session_characters** : Liaison persos-sessions

### Codes d'Accès
Chaque personnage reçoit :
- **access_code** : 6 caractères (ex: `ABC123`)
- **access_url** : Slug unique (ex: `brave-warrior-1234`)

Permet de partager facilement entre joueurs.

## 🎮 Système de Jeu

### Jets de Dés
- **Pool fixe** : 3d10
- **Explosion** : Selon niveau caractéristique (8-10, 9-10, ou 10)
- **Seuil** : Selon niveau compétence (4+, 5+, 6+, 7+)
- **Malus Blessures** : -1d10 par token (max -3d10)
- **Malus Fatigue** : +1 à +5 succès requis

### Jets SAGA
1. **Héroïque (4 succès)** : 3d10 → si ≥3 succès → dépense 1 SAGA → 3d10 bonus. Si total ≥4: SAGA revient
2. **Épique (5 succès)** : Idem mais seuil 5
3. **Assurance** : 1 SAGA perdu → 2 lancers, garde meilleur

### Évolution
- **+1 Caractéristique** : 2 SAGA
- **+1 Compétence** : 1 SAGA
- **Nouvelle Compétence** : 1 SAGA
- **Nouveau Trait** : 4 SAGA

## 🛠️ Développement

### Commandes
```bash
npm start          # Production
npm run dev        # Dev avec nodemon
npm run init-db    # Réinitialiser DB
```

### Fichiers Importants
- **schema.sql** : Schéma complet de la DB
- **db.js** : Logique initialisation (ne charge schéma que si DB n'existe pas)
- **characters.js** : API avec helpers loadFullCharacter/saveFullCharacter
- **App.jsx** : Gestion connexion backend, sauvegarde auto

## ⚠️ Notes Importantes

### Malus Fatigue (CORRIGÉ)
```javascript
0 = gratuit
1 = +1 succès
2-3 = +2 succès
4-5 = +3 succès
6-7 = +4 succès
8 = +5 succès (Épuisé)
```

### Layout
- Grid 2 colonnes avec `gridAutoRows: 'min-content'`
- Pas de masonry (évite espaces vides)
- Tokens Blessures/Fatigue côte à côte (2 colonnes)

### Sauvegarde
- Auto-save à chaque modification
- Pas de localStorage (remplacé par backend)
- ID personnage sauvegardé pour rechargement

## 🐛 Dépannage

### Le serveur ne démarre pas
```bash
# Vérifier Node.js
node --version  # Doit être v18+

# Réinstaller dépendances
rm -rf node_modules package-lock.json
npm install
```

### Erreur base de données
```bash
# Supprimer et recréer
rm -rf database/
npm run init-db
```

### Port 3001 déjà utilisé
Modifier dans `src/server/server.js` :
```javascript
const PORT = process.env.PORT || 3002; // Changer ici
```

## 📜 Licence

MIT

## 🎯 Roadmap

- [ ] Système de runes fonctionnel
- [ ] Inventaire avec équipement
- [ ] Historique jets avec graphiques
- [ ] Sessions multi-joueurs en temps réel
- [ ] Export PDF fiche personnage
- [ ] Mode MJ (gestion plusieurs persos)
