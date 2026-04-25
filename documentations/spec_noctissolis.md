# Spécification Fonctionnelle — Slug Noctis Solis
## Mentiss VTT — Phase 1

---

## 1. Contexte général

### 1.1 Jeu de rôle

**Noctis Solis** — univers maison steampunk-gothique utilisant une version modifiée des règles de Vermine 2047 (dernière version).  
Le Royaume de Selvarine, 1881 par défaut (l'année de départ recommandée, avant l'Éclipse sans fin de 1895). Vapeur, Étherum noir, Maladie Noire rampante, entités cosmiques corrompant la réalité par les Failles.

Système de résolution : **pool de D10** à seuil de succès.
- 1–6 : échec
- 7–9 : 1 succès
- 10 : 2 succès

La difficulté est annoncée **après** le jet. Les joueurs investissent leurs réserves **avant** de connaître le seuil requis.

### 1.2 Identité visuelle

Esthétique **steampunk-gothique fin XIXe** : papier vieilli, encre sépia, ornements métalliques, typographie à empattement. L'atmosphère est celle d'un carnet de terrain tenu par quelqu'un qui sait que la nuit ne finira pas.

Dark mode supporté via `data-theme`, variables CSS dans `theme.css`.

---

## 2. Identité du personnage

La fiche affiche les informations suivantes dans son en-tête :

| Champ | Nature |
|---|---|
| Nom | Texte libre |
| Avatar | Image |
| Description physique | Texte libre — apparence, traits marquants |
| Activité | Texte libre — métier, rôle reconnu dans le groupe |
| Faction | Texte libre — optionnel |
| Année de campagne | Entier — 1881 par défaut |
| Statut Fracturé | Booléen — **non affiché sur la fiche joueur**, visible du MJ uniquement |

L'**activité** est une information narrative centrale : c'est l'identité fonctionnelle du personnage dans le groupe, pas un simple hobby.

---

## 3. Caractéristiques

### 3.1 Les 12 caractéristiques

Réparties en 4 domaines. Valeur de 1 à 5. Le score de 5 est réservé à l'évolution héroïque, impossible à la création.

| Domaine | Caractéristiques |
|---|---|
| **Physique** | Force, Santé, Athlétisme |
| **Manuel** | Agilité, Précision, Technique |
| **Mental** | Connaissance, Perception, Volonté |
| **Social** | Persuasion, Psychologie, Entregent |

### 3.2 Création par répartition

- Tous les personnages commencent avec **1** dans chaque caractéristique (12 points de base).
- **16 points** supplémentaires à répartir librement.
- Aucune caractéristique ne peut dépasser **4** à la création.
- La **somme des 3 caractéristiques d'un même domaine** ne peut pas dépasser **10** à la création.
- Minimum par caractéristique : **1**.

### 3.3 Valeurs dérivées (calculées, non stockées)

Ces valeurs sont calculées automatiquement et affichées en lecture seule sur la fiche.

| Valeur | Formule |
|---|---|
| **Initiative** | Agilité + Athlétisme |
| **Réserve d'Effort (max)** | Σ Physique + Σ Manuel |
| **Réserve de Sang-Froid (max)** | Σ Mental + Σ Social |

*Σ domaine = somme des 3 caractéristiques du domaine.*

---

## 4. Spécialités

### 4.1 Définition

Une spécialité représente un entraînement précis, un métier ou un talent particulier. Elle s'ajoute au pool de dés lors d'un jet lié. Les spécialités sont à **noms libres**, proposées avec une liste de référence en autocomplétion lors de la création ou de l'ajout.

Chaque spécialité a :
- un **nom** (saisi librement ou choisi dans la liste de référence)
- un **niveau** : Débutant, Confirmé, Expert
- un **type** : Normal, Complexe, Rare
- éventuellement des **notes narratives** libres

### 4.2 Bonus par niveau

| Niveau | Bonus au pool | Dépense de réserve max par jet |
|:---|:---:|:---:|
| Sans spécialité | +0D | 1D |
| Débutant | +1D | 1D |
| Confirmé | +1D | 2D |
| Expert | +2D | 3D |

### 4.3 Types et coûts XP

| Type | Coût ouverture | Débutant → Confirmé | Confirmé → Expert |
|:---|:---:|:---:|:---:|
| Normal | 10 XP | 20 XP | 30 XP |
| Complexe | 20 XP | 40 XP | 60 XP |
| Rare | 30 XP | 60 XP | 90 XP |

L'ouverture d'une nouvelle spécialité nécessite **une justification narrative** (mentor, exposition, pratique). Les spécialités Complexes ou Rares demandent une justification renforcée.

### 4.4 Capital de départ

- **6 points de spécialité** à la création.
- Coût : Débutant = 1 pt, Confirmé = 2 pts, Expert = 3 pts.
- Exemples : 6 Débutants, ou 2 Experts, ou 1 Expert + 1 Confirmé + 1 Débutant.

### 4.5 Spécialités de Fracture

Les pouvoirs des Fracturés sont des spécialités à part entière dans la même liste, distinguées visuellement. Elles suivent les mêmes niveaux et le coût des spécialités Rares. Règles spécifiques :

- **Limite de corruption** = Volonté + Santé (valeurs actuelles des caractéristiques).
- Un personnage ne peut pas posséder plus de Spécialités de Fracture (actives **et** dormantes cumulées) que sa limite de corruption.
- Une Spécialité de Fracture est d'abord **dormante** (manifestée narrativement) puis **activée** pour 10 XP.
- L'acquisition d'un premier pouvoir d'un nouvel Ancien dégrade une spécialité existante d'un niveau (Débutant → dormante si applicable).
- Ces contraintes sont vérifiées et signalées à l'ajout.

### 4.6 Liste de référence

La liste de référence propose des spécialités organisées par domaine thématique. Non exhaustive, elle sert de point de départ. Le joueur peut toujours saisir un nom libre.

- **Combat** : Bagarre, Esquive, Parade, Arc, Épée, Hache, Masse, Marteau, Lance, Sabre, Fronde, Javelot, Bouclier, Fusil *(C)*, Arme à feu *(C)*, Fusil, Pistolet
- **Savoirs appliqués** : Médecine *(C)*, Chirurgie *(R)*, Chimie *(R)*, Botanique *(R)*, Zoologie *(R)*, Psychologie *(C)*, Théologie solaire *(C)*, Droit canonique *(C)*, Histoire *(R)*, Linguistique *(R)*, Astronomie *(R)*, Cartographie, Météorologie *(R)*, Pharmacologie *(C)*, Alchimie *(R)*, Analyse des plantes *(C)*
- **Artisanat** : Forgeron, Menuisier, Céramiste, Cordonnier, Couturier, Calligraphe *(C)*, Tanneur, Métallurgiste *(R)*, Taille-roche *(R)*, Verrier *(C)*, Jardinier
- **Négociation** : Persuasion, Intimidation, Marchandage, Étiquette, Commandement, Séduction
- **Technique** : Mécanique *(C)*, Horlogerie *(R)*, Navigation *(C)*, Télégraphe *(C)*, Colombophile *(C)*, Pyrotechnie *(R)*
- **Chasse** : Pistage, Pièges, Discrétion, Sens du danger, Empathie animale, Pêche

*(C) = Complexe — (R) = Rare. Sans indication = Normal.*

---

## 5. Réserves individuelles

### 5.1 Fonctionnement

Les réserves sont les ressources héroïques du personnage. Avant un jet, le joueur peut dépenser des points pour augmenter son pool.

- **1 point dépensé = +1D10** ajouté au pool.
- La limite de dépense par jet est déterminée par le niveau de spécialité applicable (voir tableau section 4.2). Sans spécialité : max 1D.
- **Effort** : actions physiques et manuelles.
- **Sang-Froid** : actions mentales et sociales.
- Si la réserve d'Effort est vide, le joueur peut puiser dans le Sang-Froid (la volonté supplée l'épuisement physique).

### 5.2 Valeur courante

Chaque réserve a une **valeur courante** modifiable, plafonnée par la valeur maximum calculée. Elle est visible et éditable directement sur la fiche.

### 5.3 Récupération

- **Repos complet** (nuit sûre) : restauration totale des deux réserves.
- **Repos partiel** (bivouac, sommeil agité) : récupération partielle, à la discrétion du MJ.
- **Moments narratifs** : le MJ peut accorder quelques points suite à une victoire, une scène de camaraderie, ou un acte en accord avec les motivations du personnage.
- **Perte passive** : l'environnement peut coûter des points sans jet (marche forcée, vision d'horreur, etc.).

---

## 6. Santé & Blessures

### 6.1 Seuils de blessure

Déterminés par la caractéristique Santé. Affichés en référence sur la fiche (lecture seule, calculé).

| Santé | Seuil Touché | Seuil Blessé | Seuil Tué |
|:---:|:---:|:---:|:---:|
| 1 | 3 | 5 | 7 |
| 2 | 4 | 6 | 8 |
| 3 | 5 | 7 | 9 |
| 4 | 6 | 8 | 10 |
| 5 | 7 | 9 | 10 |

### 6.2 Cases de blessure

Un personnage humain standard dispose de **4 cases Touché, 2 cases Blessé, 1 case Tué**. Ces maximums peuvent être modifiés par le MJ (Fracturés notamment). Chaque niveau a un compteur de cases cochées.

Lorsqu'une blessure est reçue :
1. On compare les dégâts totaux aux seuils du tableau ci-dessus.
2. On coche **une seule case** correspondant au seuil atteint.
3. **Débordement** : si toutes les cases d'un niveau sont cochées, la blessure remonte au niveau supérieur.

### 6.3 Malus actif

Le malus affiché est celui de la **blessure la plus grave** actuellement cochée. Les malus ne s'additionnent pas.

| État | Malus |
|---|---|
| Au moins une case Touché cochée | -1D à tous les jets |
| Au moins une case Blessé cochée | -2D à tous les jets |
| Au moins une case Tué cochée | -3D à tous les jets |

Ce malus est affiché en permanence sur la fiche et pris en compte dans tout calcul de pool.

---

## 7. Éclats & Ombres

### 7.1 Éclats

Les Éclats sont les points d'héroïsme du personnage. Ils se dépensent **après** un jet.

| Usage | Effet |
|---|---|
| **Le Sursaut** (sur un échec) | Transforme l'échec en réussite simple, sans marge |
| **Le Panache** (sur une réussite) | Ajoute +2 succès au résultat final |

**Capital :**
- Base : **1 Éclat** pour tout personnage.
- +1 Éclat par Ombre choisie (max 3 Éclats, donc max 2 Ombres).

**Récupération :** uniquement à la fin d'un arc narratif majeur ou lors d'un sacrifice héroïque — à la discrétion du MJ.

La fiche affiche : valeur courante + maximum, avec contrôles de dépense et de récupération.

### 7.2 Ombres

Une Ombre est un fardeau narratif et mécanique choisi à la création contre un Éclat supplémentaire. Elle doit être **visible et lisible en permanence** sur la fiche — c'est un levier MJ, pas une note enfouie.

Chaque Ombre affiche :
- son **type**
- sa **description narrative** (saisie libre)
- son **effet mécanique** explicite

| Type | Effet mécanique de référence |
|---|---|
| Dette ou Obligation | La faction créditrice peut exiger remboursement à tout moment (événement narratif déclenché par le MJ) |
| Recherché | Le personnage doit maintenir une discrétion active ; toute exposition publique peut déclencher une complication |
| Addiction | Sans satisfaction quotidienne : -1D à la réserve de Sang-Froid au réveil |
| Séquelle Physique | Malus de -1D aux jets de Santé lors d'efforts prolongés |
| Traumatisme | Face au déclencheur : jet de Volonté requis ou le personnage est paralysé/paniqué |

Le joueur peut personnaliser la description dans le cadre du type. L'effet mécanique est pré-rempli selon le type mais reste éditable.

---

## 8. Fiche de groupe

### 8.1 Définition

La fiche de groupe est un document partagé entre tous les joueurs d'une même session. Elle n'appartient à aucun personnage individuel. Elle est accessible depuis l'interface de session, en parallèle des fiches individuelles.

### 8.2 Contenu

**Principes et interdits**

Le groupe définit à la création de la campagne une liste de principes (ce que le groupe fait) et d'interdits (ce qu'il ne fait pas). Ces règles forment le socle moral narratif du groupe — minimum 1 principe et 3 interdits recommandés.

Affichage : liste formatée, clairement lisible. Éditable par le MJ, éventuellement par les joueurs selon les paramètres de session.

**Règle d'accès à la réserve**

Le groupe décide en amont comment la réserve est utilisable :
- **Libre** : tout joueur peut y puiser à tout moment
- **Majorité** : une décision collective simple est requise
- **Unanimité** : accord de tous les membres requis

Cette règle est définie une fois et s'applique pour toute la campagne ou l'aventure.

**Réserve de groupe**

- Constituée en début de campagne par sacrifice volontaire de dés issus des réserves personnelles des joueurs (sans minimum ni maximum, liberté totale).
- **Ce sacrifice est définitif et irréversible : les dés versés réduisent le maximum de la réserve personnelle du joueur de façon permanente.** Ce n'est pas une dépense de valeur courante — c'est une perte de capacité maximale.
- Limite haute recommandée : environ 3D par joueur (ex : 12D pour 4 joueurs).
- **Toute dépense en jeu est également définitive** — les points perdus lors d'un jet ne reviennent jamais, que le jet réussisse ou non.
- Limite de dépense : **1D par jet**, indépendamment des spécialités. Aucune règle de spécialité ne s'applique ici.
- La réserve peut **fluctuer en cours de partie** :
    - +3D si un membre accomplit un principe du groupe
    - +5D si plusieurs membres y participent
    - -3D si un membre transgresse un interdit
    - -5D si plusieurs membres y participent

La réserve de groupe est accessible depuis d'autres points de l'interface (notamment depuis les jets de dés).

**Notes partagées**

Champ texte libre, visible et éditable par tous.

---

## 9. Évolution XP

### 9.1 Gain d'expérience

Le MJ attribue des points d'XP en fin de session ou d'arc narratif. L'XP est visible sur la fiche et éditable par le MJ.

### 9.2 Dépenses

| Action | Coût |
|---|---|
| Ouvrir une nouvelle spécialité (Normal) | 10 XP + justification narrative |
| Ouvrir une nouvelle spécialité (Complexe) | 20 XP + justification narrative |
| Ouvrir une nouvelle spécialité (Rare) | 30 XP + justification narrative |
| Débutant → Confirmé (Normal) | 20 XP |
| Débutant → Confirmé (Complexe) | 40 XP |
| Débutant → Confirmé (Rare) | 60 XP |
| Confirmé → Expert (Normal) | 30 XP |
| Confirmé → Expert (Complexe) | 60 XP |
| Confirmé → Expert (Rare) | 90 XP |
| Activer une Spécialité de Fracture Dormante | 10 XP |

L'ouverture d'une spécialité nécessite une justification narrative validée par le MJ (mentor, exposition, pratique). Le joueur saisit cette justification lors de la dépense, elle est conservée dans les notes de la spécialité.

### 9.3 Interface

La fiche joueur affiche le solde d'XP courant. Un panneau de dépense permet de sélectionner une spécialité existante ou d'en créer une nouvelle, affiche le coût calculé selon le type et le niveau cible, et déduit l'XP après confirmation. Le MJ peut ajuster l'XP directement depuis la vue session.

---

## 10. Journal de personnage

Le journal est un espace de notes personnelles attaché à chaque personnage. Il s'appuie sur la table `character_journal` déjà présente dans `base.sql`.

Fonctionnement identique aux autres slugs : éditeur TipTap, entrées horodatées, lecture/écriture par le joueur, lecture par le MJ. L'icône journal sur la fiche affiche un badge si des entrées non lues existent (logique `journalUnread` standard de la plateforme).

---

## 11. Vue MJ

Le MJ dispose d'un accès complet aux fiches des joueurs depuis l'interface de session, conforme aux autres slugs :
- Lecture de toutes les données y compris le statut Fracturé
- Édition des champs (caractéristiques, blessures, réserves, éclats, cases de blessure max, XP)
- Envoi de messages
- Copie du lien et du code d'accès
- Modification de la fiche de groupe (principes, interdits, réserve, règle d'accès)

---

## 12. Hors périmètre Phase 1

Les éléments suivants sont **prévus structurellement** mais **non implémentés** :

- Catalogue armes & équipement (avec prix en Selvarins)
- Résolution de combat (jets d'opposition, calcul dégâts, armures) — **hors périmètre définitif**
- Interface dédiée à la mécanique Fracturé (acquisition narrative de pouvoirs, choix en cas de dépassement de limite, dégradation de spécialités)