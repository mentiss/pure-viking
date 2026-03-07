# Spec — Slug `dune` : Dune: Adventures in the Imperium

> Version 1.1 — Spécification complète  
> Statut : **Prêt pour Phase 3 (implémentation)**  
> Dernière mise à jour : 2026-03

---

## Sommaire

1. [Identité du système](#1-identité-du-système)
2. [Modèle de données — BDD SQLite](#2-modèle-de-données--bdd-sqlite)
3. [Architecture Backend](#3-architecture-backend)
4. [Mécanique de dés — 2D20](#4-mécanique-de-dés--2d20)
5. [Architecture Frontend](#5-architecture-frontend)
6. [Fiche joueur — Contrat de données](#6-fiche-joueur--contrat-de-données)
7. [Thème CSS](#7-thème-css)
8. [Création de personnage — Wizard](#8-création-de-personnage--wizard)
9. [Journal](#9-journal)
10. [Phasage d'implémentation](#10-phasage-dimplémentation)
11. [Checklist finale](#11-checklist-finale)

---

## 1. Identité du système

| Propriété | Valeur |
|---|---|
| **Slug** | `dune` |
| **Label** | `Dune: Adventures in the Imperium` |
| **BDD** | `database/dune.db` |
| **Schéma** | `database-template/dune-schema.sql` |
| **URL joueur** | `/dune/` |
| **URL GM** | `/dune/gm` |
| **Thème** | Désert — ocre / sable / or / rouge brique — mode jour & nuit |

---

## 2. Modèle de données — BDD SQLite

### 2.1 Table `characters`

Les compétences et principes étant **fixes et en nombre constant** (5 de chaque), ils sont intégrés directement dans la table `characters` comme colonnes — évite les JOINs inutiles et simplifie le controller.

**Spécialisation :** label texte libre uniquement. Si non vide, le rang de la compétence sert automatiquement de seuil de double succès au jet. Pas de valeur numérique séparée.

**Principes :** rang plafonné à 8. Chaque principe porte une maxime (texte libre, disponible à tout rang).  Pas de spécialisation sur les principes.

**Freebies :** non stockés en BDD. Ressource uniquement locale, utilisée pendant le wizard de création.

**Compte GM :** un enregistrement `id = -1` est inséré à l'initialisation pour que les mécanismes JWT partagés fonctionnent.

```sql
CREATE TABLE IF NOT EXISTS characters (
    -- Champs génériques obligatoires (couche générique Mentiss)
                                          id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                          access_code     TEXT UNIQUE NOT NULL,
                                          access_url      TEXT UNIQUE NOT NULL,
                                          player_name     TEXT NOT NULL,

    -- Identité du personnage
                                          nom             TEXT NOT NULL DEFAULT '',
                                          statut_social   TEXT DEFAULT '',   -- champ libre
                                          description     TEXT DEFAULT '',   -- texte libre narratif

    -- Détermination (ressource personnelle)
    -- Démarre à 1. Modifiable par le joueur et par le GM.
                                          determination       INTEGER DEFAULT 1,
                                          determination_max   INTEGER DEFAULT 1,

    -- ── Compétences (5 fixes) ────────────────────────────────────────────
    -- Si specialisation != '' → rang = seuil double succès au jet
                                          analyse_rang                INTEGER DEFAULT 4,
                                          analyse_specialisation      TEXT DEFAULT '',
                                          combat_rang                 INTEGER DEFAULT 4,
                                          combat_specialisation       TEXT DEFAULT '',
                                          discipline_rang             INTEGER DEFAULT 4,
                                          discipline_specialisation   TEXT DEFAULT '',
                                          mobilite_rang               INTEGER DEFAULT 4,
                                          mobilite_specialisation     TEXT DEFAULT '',
                                          rhetorique_rang             INTEGER DEFAULT 4,
                                          rhetorique_specialisation   TEXT DEFAULT '',

    -- ── Principes (5 fixes, rang max 8) ─────────────────────────────────
    -- Pas de spécialisation. Maxime = texte libre, particulièrement
    -- significatif quand rang = 8.
                                          devoir_rang         INTEGER DEFAULT 4,
                                          devoir_maxime       TEXT DEFAULT '',
                                          domination_rang     INTEGER DEFAULT 4,
                                          domination_maxime   TEXT DEFAULT '',
                                          foi_rang            INTEGER DEFAULT 4,
                                          foi_maxime          TEXT DEFAULT '',
                                          justice_rang        INTEGER DEFAULT 4,
                                          justice_maxime      TEXT DEFAULT '',
                                          verite_rang         INTEGER DEFAULT 4,
                                          verite_maxime       TEXT DEFAULT '',

    -- Métadonnées
                                          login_attempts  INTEGER DEFAULT 0,
                                          last_attempt_at DATETIME,
                                          last_accessed   DATETIME,
                                          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compte GM (inséré à l'init, ne pas modifier)
INSERT OR IGNORE INTO characters (id, access_code, access_url, player_name, nom)
VALUES (-1, 'GM_MASTER_CODE', 'gm', 'Maître du Jeu', 'Maître du Jeu');
```

---

### 2.2 Table `character_talents` — Talents

Liste officielle injectée plus tard dans `data.js`. Pas de distinction officiel/custom en BDD.

```sql
CREATE TABLE IF NOT EXISTS character_talents (
                                                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 character_id    INTEGER NOT NULL,
                                                 talent_name     TEXT NOT NULL,
                                                 description     TEXT DEFAULT '',
                                                 FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

---

### 2.3 Table `character_items` — Atouts (inventaire)

Même structure que le système Vikings, sans les colonnes spécifiques armes/armures (type, dégâts, équipé). L'interface nomme cette section **"Atouts"** mais la table conserve le nom `character_items` pour cohérence plateforme.

```sql
CREATE TABLE IF NOT EXISTS character_items (
                                               id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                               character_id    INTEGER NOT NULL,
                                               nom             TEXT NOT NULL,
                                               description     TEXT DEFAULT '',
                                               quantite        INTEGER DEFAULT 1,
                                               FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
```

---

### 2.4 Table `session_maison` — Maison (liée à la session)

La Maison est une ressource **partagée entre tous les joueurs d'une même session**. Table dédiée, extensible plus tard (bonus mécaniques, ressources propres, etc.).

```sql
CREATE TABLE IF NOT EXISTS session_maison (
                                              id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                              session_id  INTEGER NOT NULL UNIQUE,
                                              nom         TEXT DEFAULT '',      -- ex : "Maison Atréides"
                                              description TEXT DEFAULT '',     -- texte libre narratif
    -- Colonnes extensibles ici pour mécaniques futures
                                              updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                                              FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);
```

---

### 2.5 Table `session_resources` — Ressources de session

Ressources partagées en temps réel. Impulsions et Menace sont visibles par tous. Complications est visible uniquement par le GM.

```sql
CREATE TABLE IF NOT EXISTS session_resources (
                                                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 session_id      INTEGER NOT NULL UNIQUE,
                                                 impulsions      INTEGER DEFAULT 0,   -- clampé 0–6
                                                 menace          INTEGER DEFAULT 0,   -- clampé ≥ 0, pas de maximum
                                                 complications   INTEGER DEFAULT 0,  -- clampé ≥ 0, GM uniquement
                                                 updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);
```

---

### 2.6 Tables transversales

Copiées à l'identique depuis `database-template/schema.sql` :
`game_sessions`, `session_characters`, `dice_history`, `character_journal`, `refresh_tokens`

---

## 3. Architecture Backend

### 3.1 Arborescence des fichiers à créer

```
src/server/systems/dune/
  config.js
  characterController.js
  routes/
    characters.js
    combat.js          ← stub vide requis par le loader
```

### 3.2 `config.js`

```js
const path = require('path');

module.exports = {
    slug:       'dune',
    label:      'Dune: Adventures in the Imperium',
    dbPath:     path.join(__dirname, '../../../../database/dune.db'),
    schemaPath: path.join(__dirname, '../../../../database-template/dune-schema.sql'),
};
```

---

### 3.3 `characterController.js` — Contrat

| Fonction | Description |
|---|---|
| `loadFullCharacter(db, id)` | Retourne l'objet complet : données `characters` reshapées + `talents[]` + `items[]` |
| `saveFullCharacter(db, id, data)` | Persiste en transaction. Reshape tableaux → colonnes. Valide rang principes ≤ 8. |

Les colonnes `*_rang` / `*_specialisation` / `*_maxime` sont **reshapées en tableaux** par `loadFullCharacter` pour simplifier les composants React. `saveFullCharacter` fait l'opération inverse.

---

### 3.4 Routes `characters.js`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | GM | Liste tous les personnages |
| GET | `/by-url/:url` | — | Chargement par `access_url` |
| GET | `/:id` | Owner\|GM | Fiche complète |
| POST | `/` | **Aucune** | Création ouverte — pas d'auth requise |
| PUT | `/:id` | Owner\|GM | Mise à jour complète |
| DELETE | `/:id` | GM | Suppression |

> La création est **publique** : n'importe qui peut créer un personnage sans être authentifié.

---

### 3.5 Route partagée — `session-resources`

Fichier : `src/server/routes/shared/session-resources.js`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/:system/sessions/:id/resources` | Session | Lecture. `complications` omis si non-GM. |
| PUT | `/api/:system/sessions/:id/resources` | Session | Mise à jour `{ field, delta }`. Clamp serveur. |

---

### 3.6 Route partagée — `session-maison`

Fichier : `src/server/routes/shared/session-maison.js`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/:system/sessions/:id/maison` | Session | Lecture |
| PUT | `/api/:system/sessions/:id/maison` | GM | Mise à jour nom + description |

---

### 3.7 Événements Socket.io — Ressources de session

| Événement | Direction | Payload | Description |
|---|---|---|---|
| `update-session-resources` | Client → Serveur | `{ sessionId, system, field, delta }` | Demande de modification |
| `session-resources-update` | Serveur → Room | `{ impulsions, menace, complications? }` | Broadcast. `complications` inclus uniquement pour le GM. |

**Room ciblée :** `dune_session_${sessionId}`

**Qui peut émettre `update-session-resources` :**

| Champ | Émetteurs autorisés |
|---|---|
| `impulsions` | GM + Joueurs |
| `menace` | GM (interface) + Serveur (lors d'un jet joueur si menaceGeneree > 0) |
| `complications` | Serveur (auto post-jet) + GM (interface) |

---

## 4. Mécanique de dés — 2D20

### 4.1 Paramètres d'un jet

```js
{
    competence:           'Analyse',  // compétence sélectionnée par le joueur
    principe:             'Devoir',   // principe sélectionné par le joueur
    rang:                 12,         // = competence.rang + principe.rang (calculé côté client)
    hasSpecialisation:    true,       // true si competence.specialisation !== ''
    // si true → d20 ≤ rang = 2 succès ; si false → d20 ≤ rang = 1 succès
    difficulte:           2,          // succès requis (saisi par le joueur)

    nbDes:                2,          // base = 2, max total = 5

    // Achat de dés par Impulsions — barème dégressif (coût total) :
    //   +1d → 1 imp  |  +2d → 3 imp  |  +3d → 6 imp
    impulsionsDepensees:  0,          // nb de dés achetés via impulsions (0, 1, 2 ou 3)
    impulsionsCout:       0,          // coût réel calculé : [0,1,3,6][impulsionsDepensees]

    // Achat de dés par Menace — barème 1:1
    menaceGeneree:        0,          // +1 dé par point de menace (1 pour 1)

    determinationUsed:    false,
    determinationMode:    null,       // 'reroll' | 'critical'
    // 'reroll'   → lancer 2x le pool, garder le meilleur
    // 'critical' → 1 dé compte automatiquement comme succès critique
}
```

**Contrainte :** `2 + impulsionsDepensees + menaceGeneree ≤ 5`

---

### 4.2 Algorithme de calcul

```
Pour chaque dé lancé :
  si hasSpecialisation ET résultat ≤ rang  → 2 succès (critique)
  sinon si résultat ≤ rang                 → 1 succès
  sinon si résultat = 20                   → complication
  sinon                                    → 0 succès

totalSuccès = somme des succès
excédent    = max(0, totalSuccès − difficulté)

Résultat :
  totalSuccès ≥ difficulté → Succès  (excédent = impulsions générables)
  totalSuccès <  difficulté → Échec

Complications (dés = 20) :
  → socket update-session-resources { field: 'complications', delta: nb }  (côté serveur)
  → mention dans l'UI joueur, sans valeur du compteur GM

Résultats toujours publics :
  → toast diffusé à toute la room (joueurs + GM)
  → entrée dans dice_history visible par tous (identique à Vikings)
```

---

### 4.3 Flux UX — DuneDiceModal

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1 — Sélection                                         │
│   Choisir compétence ou principe                            │
│   → Affiche rang + spécialisation (si existante)            │
│   Saisir la difficulté (communiquée oralement par le GM)    │
├─────────────────────────────────────────────────────────────┤
│ ÉTAPE 2 — Dépenses (optionnelles)                           │
│   Impulsions (barème dégressif) :                           │
│     [ +1d → 1 imp ] [ +2d → 3 imp ] [ +3d → 6 imp ]        │
│   Menace (1 pour 1) :                                       │
│     [ +1 Menace ] → +1 dé                                  │
│   [ Détermination ] si determination > 0 :                  │
│     ○ Relancer le pool, garder le meilleur                 │
│     ○ Succès critique automatique sur 1 dé                 │
│   Compteur "Dés : X / 5" temps réel. Boutons désactivés    │
│   si pool = 5.                                              │
├─────────────────────────────────────────────────────────────┤
│ ÉTAPE 3 — Résultats                                         │
│   Affichage dé par dé :                                     │
│     🟢 ≤ rang avec spécialisation (2 succès)                │
│     🟡 ≤ rang sans spécialisation (1 succès)                │
│     🔴 = 20 (complication)                                  │
│     ⬜ 0 succès                                             │
│   Bilan : X / Y → ✅ Succès ou ❌ Échec                     │
│   Si complications : "X complication(s) envoyée(s) au MJ"  │
├─────────────────────────────────────────────────────────────┤
│ ÉTAPE 4 — Post-jet (si excédent > 0)                        │
│   [ Ajouter Z impulsion(s) au pool partagé ]               │
│   → socket update-session-resources                        │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.4 Jets du MJ — GMDiceModal

Le MJ dispose d'une modale dédiée, plus simple que celle des joueurs :

```js
{
    rang:          12,    // valeur numérique saisie librement par le MJ
    difficulte:    2,     // succès requis
    nbDes:         2,     // base = 2, augmenté par dépense de Menace
    menaceDepensee: 0,    // 1 Menace = +1 dé (barème 1:1, max 5d20 total)
}
```

- Pas de sélection compétence/principe — rang libre uniquement.
- Pas de Détermination (ressource joueur uniquement).
- Pas d'impulsions (le MJ n'en dépense pas — il génère de la Menace).
- Les résultats sont **publics** : toast + historique (identique aux jets joueurs).

---

### 4.5 Interface GM — TabResources

| Élément | Visibilité | Contrôle |
|---|---|---|
| **Impulsions** (0–6) | GM + Joueurs | Boutons +/− (GM et joueurs) |
| **Menace** (0–∞) | GM + Joueurs | Boutons +/− **GM uniquement** (joueurs : read-only sauf lors d'un jet) |
| **Complications** | **GM uniquement** | Boutons +/− (GM uniquement) |
| **Maison** (nom + description) | GM + Joueurs | Édition directe GM et joueurs |
| **Historique des jets** | GM + Joueurs | Lecture seule — identique à Vikings |

---

## 5. Architecture Frontend

### 5.1 Arborescence

```
src/client/src/systems/dune/
  config.jsx
  Sheet.jsx                         ← fiche joueur, éditable librement
  GMApp.jsx
  theme.css
  components/
    SkillRow.jsx                    ← rang + spécialisation + bouton jet
    PrincipleRow.jsx                ← rang + maxime + bouton jet
    TalentsList.jsx                 ← CRUD talents
    AtoutsList.jsx                  ← CRUD atouts (pattern Vikings items)
    DeterminationTracker.jsx        ← jauge détermination personnelle
    SessionResourcesBar.jsx         ← impulsions + menace (temps réel)
  gm/
    GMView.jsx
    tabs/
      TabSession.jsx                ← liste perso session + fiche sélectionnée + actions GM
      TabJournal.jsx                ← journal GM + envoi notes/atouts joueurs
      TabResources.jsx              ← jauges + complications + maison
    modals/
      Creation.jsx         ← wizard création (accès public)
      EditCharacterModal.jsx        ← édition détermination + rangs depuis vue GM
      SendItemModal.jsx             ← envoi atout à un joueur
  dice/
    DuneDiceModal.jsx
```

### 5.2 Notes d'interface (à affiner à la réalisation)

- **Layout fiche joueur :** jauge Impulsions à gauche · fiche centrale · jauge Menace à droite (3 colonnes).
- **Fiche joueur :** éditable librement par le joueur, sans mode lecture seule par défaut.
- **TabSession GM :** liste des personnages de la session active. Sélection → fiche en lecture + actions (modifier détermination, envoyer atout, envoyer note).
- **TabResources GM :** jauges temps réel + compteur complications + bloc maison de session.

---

### 5.3 Contrats composants

```jsx
// Sheet.jsx — contrat générique inchangé
const Sheet = ({ character, onUpdate, onLogout, onChangeCharacter, darkMode, onToggleDarkMode }) => {};

// GMApp.jsx — contrat générique inchangé
const GMApp = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {};
```

---

## 6. Fiche joueur — Contrat de données

Objet retourné par `loadFullCharacter(db, id)` :

```js
{
    id, access_code, access_url, player_name,
    nom, statut_social, description,
    determination, determination_max,

    // Reshapé depuis les colonnes de characters
    skills: [
        { name: 'Analyse',     rang, specialisation },  // specialisation = '' si aucune
        { name: 'Combat',      rang, specialisation },
        { name: 'Discipline',  rang, specialisation },
        { name: 'Mobilité',    rang, specialisation },
        { name: 'Rhétorique',  rang, specialisation },
    ],
    // hasSpecialisation = specialisation !== ''  (calculé côté client)

    principles: [
        { name: 'Devoir',      rang, maxime },  // rang max 8
        { name: 'Domination',  rang, maxime },
        { name: 'Foi',         rang, maxime },
        { name: 'Justice',     rang, maxime },
        { name: 'Vérité',      rang, maxime },
    ],

    talents: [ { id, talent_name, description } ],
    items:   [ { id, nom, description, quantite } ],
}
```

---

## 7. Thème CSS

Fichier : `src/client/src/systems/dune/theme.css`

```css
/* ─── Mode Jour ─────────────────────────────────────────────────────────── */
:root {
    --color-primary:    #8B4513;   /* brun sable profond */
    --color-secondary:  #C4922A;   /* or épice */
    --color-accent:     #E8C060;   /* or clair */
    --color-bg:         #F5E6C8;   /* sable clair */
    --color-surface:    #EDD9A3;   /* parchemin désert */
    --color-text:       #3D1F00;   /* brun très foncé */
    --color-danger:     #A0200A;   /* rouge sang épice */
    --color-success:    #5A7A2A;   /* vert oasis */
    --color-border:     #B8893A;   /* or sable */
    --color-muted:      #9A7040;   /* texte secondaire */
}

/* ─── Mode Nuit ─────────────────────────────────────────────────────────── */
.dark {
    --color-primary:    #C4922A;
    --color-secondary:  #E8C060;
    --color-accent:     #F0D080;
    --color-bg:         #1A0E00;   /* noir désert */
    --color-surface:    #2D1A00;   /* brun nuit profond */
    --color-text:       #F0DFB0;   /* sable clair */
    --color-danger:     #D4402A;
    --color-success:    #7AAA3A;
    --color-border:     #5A3A10;
    --color-muted:      #A08050;
}
```

---

## 8. Création de personnage — Wizard

### 8.1 Accès

**Public — aucune authentification requise.** Toute personne peut créer un personnage.

### 8.2 Étapes

| Étape | Contenu | Champs obligatoires |
|---|---|---|
| **1 — Identité** | Nom personnage, Prénom joueur, Statut social, Description | Nom + Prénom joueur |
| **2 — Compétences** | Rang sur les 5 compétences + spécialisation optionnelle | — |
| **3 — Principes** | Rang (max 8) sur les 5 principes + maxime optionnelle | — |
| **4 — Talents** | Sélection liste officielle + ajout custom (nom + description) | — |
| **5 — Atouts** | Atouts de départ (nom + description + quantité) | — |
| **6 — Freebies** | Points libres à répartir sur rangs compétences/principes. **État local uniquement, non persisté.** | — |
| **7 — Finalisation** | Récapitulatif + génération `access_code` / `access_url` | — |

### 8.3 Règles de validation

- Rang **principes** : 1–8 (bloqué UI + validé serveur).
- Rang **compétences** : 1 minimum, pas de maximum (évolution XP).
- **Spécialisation** : label texte. Si non vide → rang = seuil double succès.
- **Freebies** : valeur initiale configurable dans le wizard (état local, non stocké).
- **Édition post-création** : le joueur peut modifier sa fiche librement. Le GM peut tout modifier depuis `EditCharacterModal`.

---

## 9. Journal

Fonctionnement **identique au système Vikings** — pas de développement spécifique.

- **Joueur** : journal personnel (texte riche TipTap), notes privées libres.
- **GM** : journal personnel + envoi de notes à un ou plusieurs joueurs + envoi d'atouts (items) à un joueur → apparaît dans son inventaire.
- **Historique des jets** (`dice_history`) : **visible par tous** (GM + joueurs), cohérent avec Vikings.

---

## 10. Phasage d'implémentation

| Phase | Contenu | Priorité | Dépendances |
|---|---|---|---|
| **A** | `dune-schema.sql` · `config.js` · `characterController.js` · `routes/characters.js` (POST public) · `routes/combat.js` (stub) | 🔴 Bloquant | — |
| **B** | `session-resources.js` (REST + socket) · `session-maison.js` | 🔴 Bloquant | A |
| **C** | `Sheet.jsx` · `theme.css` · composants (`SkillRow`, `PrincipleRow`, `TalentsList`, `AtoutsList`, `DeterminationTracker`, `SessionResourcesBar`) | 🔴 Core | A |
| **D** | `DuneDiceModal.jsx` — 4 étapes, calcul, socket | 🔴 Core | A + B |
| **E** | `GMApp.jsx` · `GMView.jsx` · `TabSession` · `TabResources` · `TabJournal` | 🟡 Important | A + B |
| **F** | `Creation.jsx` — wizard 7 étapes public | 🟡 Important | A |
| **G** | `EditCharacterModal` · `SendItemModal` · `SendNoteModal` | 🟢 Confort | E |

---

## 11. Checklist finale

### Backend

- [ ] `src/server/systems/dune/config.js` — `slug`, `label`, `dbPath`, `schemaPath`
- [ ] `database-template/dune-schema.sql` — toutes les tables + INSERT GM id=-1
- [ ] `characterController.js` — `loadFullCharacter` : reshape colonnes → tableaux skills/principles
- [ ] `characterController.js` — `saveFullCharacter` : reshape inverse + validation rang principes ≤ 8
- [ ] `routes/characters.js` — POST `/` sans authentification
- [ ] `routes/characters.js` — PUT `/:id` accessible Owner ou GM
- [ ] `routes/combat.js` — stub vide
- [ ] `routes/shared/session-resources.js` — GET filtre `complications` si non-GM · PUT avec clamp
- [ ] `routes/shared/session-maison.js` — GET public · PUT GM uniquement
- [ ] Socket `update-session-resources` — clamp + broadcast `session-resources-update`
- [ ] Broadcast `session-resources-update` — `complications` omis si non-GM
- [ ] Toutes les routes utilisent `req.db`

### Frontend

- [ ] `config.jsx` — `slug`, `label`, bloc `dice`
- [ ] `theme.css` — variables CSS jour + nuit
- [ ] `Sheet.jsx` — contrat props, éditable librement
- [ ] `SkillRow.jsx` — rang + spécialisation + bouton jet
- [ ] `PrincipleRow.jsx` — rang + maxime + bouton jet
- [ ] `TalentsList.jsx` — CRUD (nom + description)
- [ ] `AtoutsList.jsx` — CRUD, pattern Vikings items
- [ ] `DeterminationTracker.jsx` — +/− clampé 0–determination_max
- [ ] `SessionResourcesBar.jsx` — impulsions + menace temps réel
- [ ] `DuneDiceModal.jsx` — 4 étapes · calcul · complications auto · post-jet impulsions
- [ ] `GMView.jsx` + `GMApp.jsx` — shell onglets
- [ ] `TabSession.jsx` — liste perso + sélection fiche + actions GM
- [ ] `TabResources.jsx` — jauges + complications (GM) + maison
- [ ] `TabJournal.jsx` — journal GM + envoi notes/atouts (générique)
- [ ] `Creation.jsx` — wizard 7 étapes, public, freebies locaux
- [ ] `EditCharacterModal.jsx` — détermination + rangs depuis vue GM
- [ ] Tous les `fetch` utilisent `apiBase`
- [ ] Appels authentifiés utilisent `fetchWithAuth`

### Validation système

- [ ] Démarrer serveur → `✅ System loaded: dune`
- [ ] `/dune/` → fiche joueur s'affiche
- [ ] `/dune/gm` → interface GM s'affiche
- [ ] Création personnage sans auth → `access_code` + `access_url` générés
- [ ] Connexion `access_code` → JWT valide, fiche chargée
- [ ] Jet 2D20 → succès corrects, complications GM-only
- [ ] Dépense impulsion → pool synchronisé sur tous les clients
- [ ] Ajout menace → pool synchronisé
- [ ] Journal GM → note reçue par le joueur cible

---

## Notes d'architecture

### Tableau de séparation GM / Joueurs

| Donnée | Joueurs | GM |
|---|---|---|
| Impulsions | Lecture + modification | Lecture + modification |
| Menace | Lecture + modification | Lecture + modification |
| Complications | **Non visible** | Lecture + modification |
| Détermination | Modification (propre fiche) | Modification (tous) |
| Fiche personnage | Édition libre (propre fiche) | Édition (toutes les fiches) |
| Journal | Propre journal + notes reçues | Propre journal + envoi |
| Atouts | Propre inventaire + reçus | Envoi aux joueurs |
| Historique jets | Visible | Visible |

### Cohérence plateforme

- Rooms Socket.io : `dune_session_${sessionId}` (préfixe standard)
- Auto-discovery backend : `config.js` détecté par le loader
- Auto-discovery frontend : `Sheet.jsx` et `GMApp.jsx` via `import.meta.glob`
- Routes partagées (`session-resources`, `session-maison`) montées automatiquement pour tous les slugs

### Points à traiter en Phase 3

- **Talents officiels** : liste à fournir, injectée dans `data.js` côté client. Aucun impact BDD.
- **Maison** : descriptif uniquement pour l'instant. `session_maison` prête pour extension mécanique.
- **Combat** : `routes/combat.js` est un stub. Le combat Dune passe entièrement par la modale de dés — pas de CombatPanel générique prévu.