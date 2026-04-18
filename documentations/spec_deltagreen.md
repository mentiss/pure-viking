# Spécification Fonctionnelle — Slug Delta Green
## Mentiss VTT — Phase 1 (Brainstorming validé)

---

## 1. Contexte général

### 1.1 Environnement technique

- **Stack** : React 19/Vite (front), Node.js/Express (back), SQLite via better-sqlite3, Socket.io, TailwindCSS v4
- **Architecture** : auto-discovery — ajouter un dossier `src/server/systems/deltagreen/` et `src/client/src/systems/deltagreen/` suffit
- **Migrations** : fichiers `DDMMYYYY_description.sql` dans `database-template/migrations/`, exécutés via `npm run migrate`
- **Authentification** : JWT, `req.user?.isGM === true` (booléen), `fetchWithAuth` côté client
- **Temps réel** : Socket.io, rooms `deltagreen_session_${sessionId}`

### 1.2 Jeu de rôle

**Delta Green** (Arc Dream Publishing) — horreur contemporaine, système BRP percentile D100.  
Les personnages sont tous des **Agents de Delta Green**, une organisation secrète luttant contre le Mythe de Cthulhu au sein même des agences gouvernementales américaines.  
Ambiance : paranoïa, sacrifice moral, corruption psychologique. Pas de héros triomphants.

---

## 2. Identité visuelle & DA

### 2.1 Thème général

Esthétique **document gouvernemental fédéral américain classifié** (années 90-2000) :
- Fond blanc cassé/crème, légèrement texturé (papier administratif)
- Typographie monospace/sérif administrative (Courier New, Special Elite ou similaire)
- En-têtes avec tampons `CLASSIFIED`, `FOR OFFICIAL USE ONLY`, codes dossier
- Champs de formulaire avec bordures fines, labels en majuscules
- Sections séparées par des lignes horizontales sobres
- Palette : noir, gris anthracite, rouge fédéral (alertes), vert administration (statuts OK)
- Logo **DELTA GREEN** reproduit fidèlement (bannière noire, typographie officielle)
- Pied de page : `DD FORMULAIRE ÉTATS-UNIS 315 — SECRET DÉFENSE//ORCON//AUTORISATION SPÉCIALE REQUISE_DELTA GREEN — FICHE DE RENSEIGNEMENT D'AGENT — 112382`

### 2.2 Support du dark mode

Comme tous les slugs de l'application — dark mode supporté via `data-theme`, variables CSS `--color-*` dans `theme.css`. L'esthétique "document papier" s'adapte (papier sombre, encre claire).

### 2.3 Système de dégradation visuelle (5 paliers)

La fiche joueur se **dégrade visuellement** en fonction d'un palier assigné par le GM. C'est une stat cachée du personnage. **Le GM voit toujours les fiches de manière normale** avec un indicateur de palier et les contrôles de modification.

| Palier | Nom | Effets visuels |
|--------|-----|----------------|
| 0 | **Stable** | Fiche nette, propre, fonctionnelle |
| 1 | **Sous pression** | Légère désaturation, micro-anomalies typographiques sur les sections SAN/Bonds |
| 2 | **En crise** | Texte qui tremble au hover, champs "corrompus" (caractères parasites), tampon `UNDER REVIEW` |
| 3 | **Fracturé** | Sections dégradées, taches d'encre, texte partiellement illisible sur Bonds perdus, filigrane d'alerte |
| 4 | **Perdu** | Fiche en **lecture seule totale**, tout barré, statut `AGENT COMPROMISED — FILE CLOSED` — GM prend le contrôle |

**Règles de dégradation :**
- Déclenchée par le GM via socket, en temps réel (transition visuelle progressive ~2-3 secondes)
- Paliers extensibles dans le code (structure flexible)
- La dégradation ne bloque jamais les stats de combat / compétences utiles en session
- Ce qui se dégrade en priorité : section SAN, Bonds, en-tête identitaire
- En mode **édition** : aucune dégradation visuelle quelle que soit le palier
- En **folie permanente** (palier 4) : fiche en lecture seule totale, le joueur ne peut plus rien modifier

### 2.4 Tags GM

Le GM peut assigner/retirer des tags sur chaque personnage. Tags prédéfinis, extensibles dans le code.

Structure : `{ label: string, color: string, bgColor: string }`

Exemples : Épuisé, VOL bas, Insomnie, Stimulants, Blessé, Adapté Violence, Adapté Impuissance...

---

## 3. Structure de la fiche personnage

La fiche est une **page unique scrollable**, inspirée de la fiche officielle DD 315.  
Deux modes : **lecture seule** (avec dégradation) et **édition** (sans dégradation, contrôles complets).  
Avatar présent comme sur les autres slugs.

### 3.1 Page 1 — Données personnelles & statistiques

#### Section Identité (Données personnelles)
- Nom, prénom, alias / nom de code
- Profession et rang
- Employeur
- Nationalité
- Genre (F/M)
- Âge et date de naissance
- Études et carrière

#### Section Caractéristiques (Données statistiques)

6 caractéristiques, valeur brute stockée en BDD, `×5` calculé côté client :

| Caractéristique | Code | Affichage lecture seule | Affichage édition |
|-----------------|------|------------------------|-------------------|
| Force | STR | Score ×5 (%) | Score brut |
| Constitution | CON | Score ×5 (%) | Score brut |
| Dextérité | DEX | Score ×5 (%) | Score brut |
| Intelligence | INT | Score ×5 (%) | Score brut |
| Pouvoir | POU | Score ×5 (%) | Score brut |
| Charisme | CHA | Score ×5 (%) | Score brut |

Chaque caractéristique dispose d'un **champ Traits Distinctifs** (texte libre).  
Un bouton de jet est disponible sur chaque caractéristique (lance un D100 vs score ×5).

#### Attributs dérivés

| Attribut | Calcul | Notes |
|----------|--------|-------|
| Points de vie (PV) | `ceil((STR + CON) / 2)` | Maximum + Actuel |
| Points de Volonté (VOL) | `POU` | Maximum + Actuel |
| Points de Santé Mentale (SAN) | `POU × 5` au départ, évolue | Maximum (99 − Inconcevable%) + Actuel |
| Seuil de Rupture (SR) | `SAN − POU` (recalculé à chaque changement de SAN) | Affiché |

#### Section Accoutumance

Deux axes indépendants, chacun avec une case à cocher (modifiable joueur + GM) :
- Violence — `[ ] accoutumé`
- Impuissance — `[ ] accoutumé`

Rappel visuel uniquement, géré oralement à la table.

#### Description physique
Champ texte libre.

### 3.2 Page 1 (suite) — Données psychologiques

#### Section Attaches (Bonds)

- Nombre d'Attaches défini par la profession (2 à 4)
- Valeur initiale = CHA de l'agent
- Chaque Attache : `{ nom: string, score: number, endommagee: boolean }`
- Case "endommagée" cochable par le joueur ET le GM (reset manuel)
- Dégradation visuelle progressive sur les Attaches perdues/endommagées (paliers 2-3)

#### Section Motivations & Troubles psychiques

Liste structurée, jusqu'à 5 entrées :
```
{ texte: string, type: 'motivation' | 'trouble' }
```
- Les Motivations sont les raisons de continuer à se battre
- Les Troubles **remplacent** une Motivation quand ils apparaissent (assigné par le GM)
- Gestion par le GM (ajout/suppression/modification), également modifiable par le joueur en édition

#### Section 13 — Perte de SAN sans folie

Log semi-automatique :
- Chaque jet de SAN en session avec perte > 0 génère automatiquement une entrée horodatée `{ date, situation, perte, notes? }`
- Possibilité d'ajouter des notes manuellement en édition (v1 simple, enrichissement futur)
- Affiché en lecture seule sous forme de liste chronologique

### 3.3 Compétences

#### Liste fixe

Toutes les compétences avec leur valeur de base entre parenthèses :

```
Anthropologie (0%), Archéologie (0%), Armes à feu (20%), Armes de mêlée (30%),
Armes lourdes (0%), Art (0%), Artillerie (0%), Artisanat (0%), Athlétisme (30%),
Bureaucratie (10%), Chirurgie (0%), Combat à mains nues (40%), Comptabilité (10%),
Conduite (20%), Criminalistique (0%), Criminologie (10%), Déguisement (10%),
Discrétion (10%), Droit (0%), Engins lourds (10%), Équitation (10%),
Esquive (30%), Explosifs (0%), Histoire (10%), Inconcevable (0%),
Informatique (0%), Médecine (0%), Natation (20%), Occultisme (10%),
Orientation (10%), Persuasion (20%), Pharmacologie (0%), Pilotage (0%),
Premiers secours (10%), Psychothérapie (10%), Recherche (20%), ROHUM (10%),
ROEM (0%), Science (0%), Sciences militaires (0%), Survie (10%),
Vigilance (20%)
```

**Noms en BDD : anglais** (alertness, firearms, etc.), **labels affichés : français**.

#### 5 compétences avec spécialité (1 max par compétence)
- Art *(ex: Écriture créative, Photographie...)*
- Artisanat *(ex: Électricien, Mécanicien...)*
- Science *(ex: Biologie, Mathématiques...)*
- Sciences militaires *(ex: Terrestre, Maritime...)*
- Pilotage *(ex: Avion, Hélicoptère...)*

#### Langues étrangères
- Nombre libre, ajout dynamique
- Chaque langue : `{ nom: string, score: number }`

#### Compétence Inconcevable
- Démarre à 0%
- Impact mécanique : `SAN max = 99 − score_inconcevable`
- Évolue comme toute autre compétence

#### Mécanique d'évolution (XP)

- **Checkbox d'échec** : cochée automatiquement quand un jet de compétence lancé depuis la fiche échoue
- En lecture seule : compétences à 0% **masquées** (affichage épuré)
- **Bouton "Évolution post-session"** (GM + joueur) : ajoute 1D4 à chaque compétence dont la case est cochée, puis décoche toutes les cases
- Un bouton de jet est disponible sur chaque compétence (D100 vs score%)

### 3.4 Page 2 — Santé physique

#### Section 14 — Blessures et maladies
- Éditeur TipTap (texte riche)
- Checkbox : "Jet de Premiers secours appliqué depuis la dernière blessure ?" (booléen)
- Vue lecture seule + vue édition

### 3.5 Page 2 — Équipement

#### Section 15 — Armure et matériel
Catalogue avec autocomplétion (même principe que Cyberpunk).

Table `equipment` unique :
```
id, slug, name, category, skill, expense, is_restricted, restriction_note, stats (JSON), notes
```

**`expense`** : enum — `Incidental | Standard | Unusual | Major | Extreme`  
**`is_restricted`** : booléen  
**`stats` JSON** : contient les colonnes variables selon catégorie

Exemples de contenu `stats` par catégorie :
- *Mêlée* : `{ damage, armor_piercing }`
- *Armes à feu* : `{ base_range, damage, lethality, ammo_capacity, armor_piercing }`
- *Armes lourdes/Artillerie* : `{ base_range, lethality, kill_radius, ammo_capacity, armor_piercing }`
- *Gaz/Grenades/Électrochoc* : `{ range, uses, radius, victim_penalty }`
- *Armures* : `{ armor_rating }`
- *Véhicules terrestres* : `{ hp, armor, surface_speed }`
- *Véhicules aériens* : `{ hp, armor, air_speed }`
- *Véhicules maritimes* : `{ hp, armor, surface_speed }`

**V1 : structure prévue, catalogue vide** — contenu alimenté ultérieurement.

#### Section 16 — Tableau d'armes (slots a→g)
7 slots d'armes actives sur la fiche, liés au catalogue ou saisis manuellement :
`{ nom, competence_%, portee_base, degats, perforant, letalite, rayon_mortalite, munitions }`

Jet de létalité : jet % séparé du jet d'attaque.
- Succès = cible tombe à 0 PV
- Échec = somme des deux dés D10 appliquée en dégâts PV
- Critique sur jet d'attaque = létalité doublée, dégâts doublés si létalité ratée

### 3.6 Page 2 — Remarques

#### Section 17 — Détails personnels et notes
Éditeur TipTap — vue lecture seule + vue édition.

#### Section 18 — Développements affectant le foyer et la famille
Éditeur TipTap — vue lecture seule + vue édition.

#### Section 19 — Entraînement spécial
Tableau libre : `{ intitule: string, carac_ou_competence: string }`  
Chaque entrée dispose d'un **bouton de jet** sur la carac/compétence associée.  
Purement informatif, pas d'impact mécanique automatique.

#### Section 20-21 — Officier responsable / Signature
Champs texte libres.

---

## 4. Jets de dés

### 4.1 Principe général

Tous les jets passent par le **diceEngine v2**. La gestion des animations (activation, timing, affichage du résultat) est entièrement déléguée au diceEngine selon la configuration utilisateur.

### 4.2 Jets depuis la fiche

| Type de jet | Déclencheur | Dés | Comportement |
|-------------|-------------|-----|--------------|
| Compétence | Bouton sur la compétence | D100 | Succès si résultat ≤ score%. Échec → coche auto la case |
| Caractéristique | Bouton sur la carac | D100 | Succès si résultat ≤ score × 5 |
| Entraînement spécial | Bouton sur la ligne | D100 | Vs carac/compétence associée |
| Dommages | Bouton contextuel | D4/D6/D8/D10/D12 | Résultat appliqué manuellement |
| Létalité | Bouton contextuel | D100 vs % létalité | Succès = 0 PV, Échec = somme des deux dés |

### 4.3 Jets de SAN

**Déclenché par le joueur** (le GM annonce oralement la situation).

Flux :
1. Joueur ouvre la modale de jet SAN
2. Sélectionne la situation dans la **liste fixe** (hardcodée dans `config.jsx`)
3. Voit le format `succès/échec` (ex: `0 / 1D6`)
4. Lance → animation D100
5. Résultat affiché : succès ou échec
6. Joueur clique "Accepter" → jet de perte animé (le dé correspondant)
7. Perte appliquée automatiquement à la SAN actuelle
8. Entrée générée automatiquement dans le log Section 13

Format liste des situations : `{ label: string, success: string, failure: string }`  
Exemples :
```js
{ label: "Être pris dans une fusillade", success: "0", failure: "1" },
{ label: "Tuer un innocent de sang-froid", success: "1", failure: "1D10" },
{ label: "Voir un cadavre se déplacer", success: "0", failure: "1D6" },
// ... liste complète issue du manuel FR
```

---

## 5. Wizard de création (5 étapes)

### Étape 1 — Statistiques
Deux modes au choix :
- **Tirage** : pour chaque stat, lancer 4D6, retirer le plus bas, additionner les 3 restants — placer les 6 résultats librement
- **Répartition** : distribuer 72 points entre les 6 stats (3 min, 18 max par stat)

### Étape 2 — Attributs dérivés (calculés automatiquement)
```
PV  = ceil((STR + CON) / 2)
VOL = POW
SAN = POW × 5
SR  = SAN − POW
```
Affichage des valeurs calculées, non modifiables à cette étape.

### Étape 3 — Profession & Compétences

**Professions disponibles** (liste complète du manuel) :

> Notation : les compétences listées sont préremplies au score indiqué. Les blocs `Choisir N parmi` sont des choix libres dans le wizard. `Stat recommandée` est indicative.

---

**Anthropologue / Historien** — 4 Bonds — *Stat recommandée : INT*
- Anthropologie 50% OU Archéologie 50%
- Bureaucratie 40%, Langue étrangère (choix) 50%, Langue étrangère (autre) 40%, Histoire 60%, Occultisme 40%, Persuasion 40%
- Choisir 2 parmi : Anthropologie 40%, Archéologie 40%, ROHUM 50%, Orientation 50%, Équitation 50%, Recherche 60%, Survie 50%

**Informaticien / Ingénieur** — 3 Bonds — *Stat recommandée : INT*
- Informatique 60%, Artisanat (Électricien) 30%, Artisanat (Mécanicien) 30%, Artisanat (Microélectronique) 40%, Science (Mathématiques) 40%, ROEM 40%
- Choisir 4 parmi : Comptabilité 50%, Bureaucratie 50%, Artisanat (choix) 40%, Langue étrangère (choix) 40%, Engins lourds 50%, Droit 40%, Science (choix) 40%

**Agent fédéral** — 3 Bonds — *Stats recommandées : CON, POU, CHA*
- Vigilance 50%, Bureaucratie 40%, Criminologie 50%, Conduite 50%, Armes à feu 50%, Criminalistique 30%, ROHUM 60%, Droit 30%, Persuasion 50%, Recherche 50%, Combat à mains nues 60%
- Choisir 1 parmi : Comptabilité 60%, Informatique 50%, Langue étrangère (choix) 50%, Armes lourdes 50%, Pharmacologie 50%

**Médecin** — 3 Bonds — *Stats recommandées : INT, POU, DEX*
- Bureaucratie 50%, Premiers secours 60%, Médecine 60%, Persuasion 40%, Pharmacologie 50%, Science (Biologie) 60%, Recherche 40%
- Choisir 2 parmi : Criminalistique 50%, Psychothérapie 60%, Science (choix) 50%, Chirurgie 50%

**Scientifique** — 4 Bonds — *Stat recommandée : INT*
- Bureaucratie 40%, Informatique 40%, Science (choix) 60%, Science (autre) 50%, Science (autre) 50%
- Choisir 3 parmi : Comptabilité 50%, Artisanat (choix) 40%, Langue étrangère (choix) 40%, Criminalistique 40%, Droit 40%, Pharmacologie 40%

**Opérateur forces spéciales** — 2 Bonds — *Stats recommandées : FOR, CON, POU*
- Vigilance 60%, Athlétisme 60%, Explosifs 40%, Armes à feu 60%, Armes lourdes 50%, Armes de mêlée 50%, Sciences militaires (Terrestre) 60%, Orientation 50%, Discrétion 50%, Survie 50%, Natation 50%, Combat à mains nues 60%

**Criminel** — 4 Bonds — *Stats recommandées : FOR, DEX*
- Vigilance 50%, Criminologie 60%, Esquive 40%, Conduite 50%, Armes à feu 40%, Droit 40%, Armes de mêlée 40%, Persuasion 50%, Discrétion 50%, Combat à mains nues 50%
- Choisir 2 parmi : Artisanat (Serrurerie) 40%, Explosifs 40%, Déguisement 50%, Langue étrangère (choix) 40%, Criminalistique 40%, ROHUM 50%, Orientation 50%, Occultisme 50%, Pharmacologie 40%

**Pompier** — 3 Bonds — *Stats recommandées : FOR, DEX, CON*
- Vigilance 50%, Athlétisme 60%, Artisanat (Électricien) 40%, Artisanat (Mécanicien) 40%, Explosifs 50%, Conduite 50%, Premiers secours 50%, Criminalistique 40%, Engins lourds 50%, Orientation 50%, Recherche 40%

**Agent des affaires étrangères** — 3 Bonds — *Stats recommandées : INT, CHA*
- Comptabilité 40%, Anthropologie 40%, Bureaucratie 60%, Langue étrangère (choix) 50%, Langue étrangère (choix) 50%, Langue étrangère (choix) 40%, Histoire 40%, ROHUM 50%, Droit 40%, Persuasion 50%

**Analyste du renseignement** — 3 Bonds — *Stat recommandée : INT*
- Anthropologie 40%, Bureaucratie 50%, Informatique 40%, Criminologie 40%, Langue étrangère (choix) 50%, Langue étrangère (choix) 50%, Langue étrangère (choix) 40%, Histoire 40%, ROHUM 50%, ROEM 40%

**Officier traitant du renseignement** — 2 Bonds — *Stats recommandées : INT, POU, CHA*
- Vigilance 50%, Bureaucratie 40%, Criminologie 50%, Déguisement 50%, Conduite 40%, Armes à feu 40%, Langue étrangère (choix) 50%, Langue étrangère (autre) 40%, ROHUM 60%, Persuasion 60%, ROEM 40%, Discrétion 50%, Combat à mains nues 50%

**Avocat / Dirigeant d'entreprise** — 4 Bonds — *Stats recommandées : INT, CHA*
- Comptabilité 50%, Bureaucratie 50%, ROHUM 40%, Persuasion 60%
- Choisir 4 parmi : Informatique 50%, Criminologie 60%, Langue étrangère (choix) 50%, Droit 50%, Pharmacologie 50%

**Spécialiste médias** — 4 Bonds — *Stats recommandées : INT, CHA*
- Art (choix : Écriture, Poésie, Scénarisation, Journalisme...) 60%, Histoire 40%, ROHUM 40%, Persuasion 50%
- Choisir 5 parmi : Anthropologie 40%, Archéologie 40%, Art (choix) 40%, Bureaucratie 50%, Informatique 40%, Criminologie 50%, Langue étrangère (choix) 40%, Droit 40%, Sciences militaires (choix) 40%, Occultisme 50%, Science (choix) 40%

**Infirmier / Ambulancier** — 4 Bonds — *Stats recommandées : INT, POU, CHA*
- Vigilance 40%, Bureaucratie 40%, Premiers secours 60%, ROHUM 40%, Médecine 40%, Persuasion 40%, Pharmacologie 40%, Science (Biologie) 40%
- Choisir 2 parmi : Conduite 60%, Criminalistique 40%, Orientation 50%, Psychothérapie 50%, Recherche 60%

**Pilote / Marin** — 3 Bonds — *Stats recommandées : DEX, INT*
- Vigilance 60%, Bureaucratie 30%, Artisanat (Électricien) 40%, Artisanat (Mécanicien) 40%, Orientation 50%, Pilotage (choix) 60%, Science (Météorologie) 40%, Natation 40%
- Choisir 2 parmi : Langue étrangère (choix) 50%, Pilotage (autre) 50%, Armes lourdes 50%, Sciences militaires (choix) 50%

**Officier de police** — 3 Bonds — *Stats recommandées : FOR, CON, POU*
- Vigilance 60%, Bureaucratie 40%, Criminologie 40%, Conduite 50%, Armes à feu 40%, Premiers secours 30%, ROHUM 50%, Droit 30%, Armes de mêlée 50%, Orientation 40%, Persuasion 40%, Recherche 40%, Combat à mains nues 60%
- Choisir 1 parmi : Criminalistique 50%, Engins lourds 60%, Armes lourdes 50%, Équitation 60%

**Directeur de programme** — 4 Bonds — *Stats recommandées : INT, CHA*
- Comptabilité 60%, Bureaucratie 60%, Informatique 50%, Criminologie 30%, Langue étrangère (choix) 50%, Histoire 40%, Droit 40%, Persuasion 50%
- Choisir 1 parmi : Anthropologie 30%, Art (choix) 30%, Artisanat (choix) 30%, Science (choix) 30%

**Soldat / Marine** — 4 Bonds — *Stats recommandées : FOR, CON*
- Vigilance 50%, Athlétisme 50%, Bureaucratie 30%, Conduite 40%, Armes à feu 40%, Premiers secours 40%, Sciences militaires (Terrestre) 40%, Orientation 40%, Persuasion 30%, Combat à mains nues 50%
- Choisir 3 parmi : Artillerie 40%, Informatique 40%, Artisanat (choix) 40%, Explosifs 40%, Langue étrangère (choix) 40%, Engins lourds 50%, Armes lourdes 40%, Recherche 60%, ROEM 40%, Natation 60%

**Profession personnalisée**
- Choisir 10 compétences professionnelles, répartir 400 points (30-60% par compétence, max 60%)
- Bonds : base 3. +1 Bond (max 4) = −50 pts de compétence. −1 Bond (min 1) = +50 pts de compétence

La sélection d'une profession préremplie les compétences professionnelles.

**Bonus Skill Points** : choisir 8 compétences (sauf Inconcevable), +20% chacune, plafond 80%.  
Option : choisir un **package bonus** prédéfini (Artist, Combat Veteran, Police Officer...).

### Étape 4 — Attaches (Bonds)
- Nombre selon la profession (2 à 4)
- Valeur initiale = CHA
- Saisie du nom de chaque Attache

### Étape 5 — Détails finaux
- Nom, genre, âge, nationalité
- Description physique
- Motivations initiales (jusqu'à 5)
- Détails personnels libres
- Récapitulatif complet avant validation

> **Note** : La section "Damaged Veterans" (Extrême Violence / Captivité / Expérience Difficile / Ce que l'homme ne devrait pas savoir) n'est **pas** dans le wizard — réservée à l'édition de fiche post-création, appliquée par le GM ou le joueur.

---

## 6. Interface GM (GMApp)

### 6.1 Onglets

| Tab | Contenu |
|-----|---------|
| **TabSession (Agents)** | Vue de tous les personnages de la session, indicateurs de palier de dégradation, tags, contrôles GM |
| **TabJournal** | Journal de session partagé (standard plateforme) |

Pas de TabCombat en v1.

### 6.2 Contrôles GM sur les personnages

Comportement standard de la plateforme (identique aux autres slugs) — session/table de jeu, accès complet aux fiches, modification directe de toutes les données.

**Spécifique à Delta Green :**
- **Indicateur de palier** (0→4) avec contrôle de modification → envoi socket temps réel
- **Gestion des tags** : assignation/retrait depuis la vue Agents
- Bouton "Évolution post-session" accessible depuis la vue GM

### 6.3 Initiative (Combat v1)

Gestion légère, sans tab dédié, dans TabSession :
- Le Handler compte à rebours par DEX (plus haute → plus basse)
- Chaque agent agit quand son score est atteint
- En cas d'égalité : actions simultanées ou le GM choisit un départage
- Affichage : liste des agents triée par DEX décroissant, indicateur de tour actif

Pas de gestion des actions, dégâts ou états en v1 — tout géré oralement.

### 6.4 Ressources de session

**Aucune** ressource partagée de session dans Delta Green — tout est strictement par personnage.  
Pas de table `session_resources` pour ce slug.

---

## 7. Événements Socket

| Événement | Sens | Payload | Description |
|-----------|------|---------|-------------|
| `dg:degradation-update` | GM → tous | `{ characterId, palier: 0-4 }` | Change le palier de dégradation |
| `dg:tag-update` | GM → tous | `{ characterId, tags: Tag[] }` | Mise à jour des tags d'un agent |
| `dg:san-loss` | Broadcast | `{ characterId, situation, perte, newSan }` | Application d'une perte SAN |
| `dg:skill-check` | Broadcast | `{ characterId, skill, score, result, success }` | Résultat d'un jet de compétence |
| `dg:evolution` | GM/Joueur → serveur | `{ characterId }` | Déclenche l'évolution post-session |

---

## 8. Schéma de données (aperçu)

> Le schéma SQL détaillé sera produit en Phase 2.

### Tables principales

**`characters`**
```
id, name, alias, profession, employer, nationality, gender, age, birth_date,
education, physical_description, avatar_url,
str, con, dex, int, pow, cha,
hp_max, hp_current, wp_max, wp_current, san_max, san_current,
adapted_violence (bool), adapted_helplessness (bool),
degradation_palier (0-4), tags (JSON),
first_aid_applied (bool),
injuries (text/tiptap), personal_notes (text/tiptap),
family_developments (text/tiptap),
special_training (JSON),
officer_responsible, agent_signature,
distinctive_traits (JSON),
created_at, updated_at
```

**`character_bonds`**
```
id, character_id, name, score, is_damaged, position, created_at
```

**`character_motivations`**
```
id, character_id, text, type (motivation|trouble), position, created_at
```

**`character_skills`**
```
id, character_id, skill_key, score, specialty, failed_check (bool), created_at
```

**`character_languages`**
```
id, character_id, name, score, failed_check (bool)
```

**`character_san_log`**
```
id, character_id, session_id, situation_label, loss_success, loss_failure, loss_applied, notes, created_at
```

**`character_equipment`**
```
id, character_id, equipment_id (nullable), name, slot (a-g or null), quantity, notes
```

**`equipment`** *(catalogue global)*
```
id, slug, name, category, skill, expense, is_restricted, restriction_note, stats (JSON), notes
```

---

## 9. Contraintes d'architecture (rappel plateforme)

- `theme.css` chargé au niveau `PlayerPage`/`GMPage`, pas dans les composants lazy
- `fetchWithAuth` jamais dans les dépendances `useCallback`/`useEffect`
- `onCharacterUpdate` → PUT serveur ; `onCharacterHasUpdated` → état local uniquement
- `React.lazy()` appelé hors du corps de composant, pattern `lazyCache`
- Props de `Sheet.jsx` : `{ character, onCharacterUpdate, onLogout, journalUnread, onJournalRead, darkMode, onToggleDarkMode }`
- Tous les `fetch` utilisent `apiBase` (jamais `/api` en dur)
- Noms de vues dans la navigation hash : jamais de tirets

---

## 10. Ce qui est hors scope v1

- Contenu du catalogue équipement (structure prévue, données vides)
- Section "Damaged Veterans" dans le wizard
- Gestion des actions / dégâts / états en combat
- Enrichissement du log SAN (liaison notes de journal)
- Mécanique d'Épuisement / Insomnie / Stimulants (gestion orale, tags GM suffisants)
- Adaptations (Accoutumance) à impact mécanique automatique