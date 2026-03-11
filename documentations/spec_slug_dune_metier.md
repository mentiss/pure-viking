# Dune: Adventures in the Imperium — Spec Fonctionnelle VTT

---

## Personnage

**Identité**
Nom, statut social (libre), maison (optionnel), description libre.

**Compétences** (5, fixes)
Analyse · Combat · Discipline · Mobilité · Rhétorique
Chacune a un **rang** (valeur numérique, pas de maximum — évolution XP) et une **spécialisation** (texte libre optionnel).

**Principes** (5, fixes) — max rang 8
Devoir · Domination · Foi · Justice · Vérité
Chacun a un **rang** (1–8) et une **maxime** (phrase RP libre, optionnelle).

**Détermination**
Ressource personnelle. Démarre à 1. Augmentée par le MJ (interface session) ou via l'édition de fiche. Utilisable une fois par jet (voir Jets). La régénération est narrative — décidée par le MJ.

**Atouts**
Inventaire libre : nom, description, quantité.

**Talents**
Liste de capacités spéciales : nom + description. Ajout libre ou depuis une liste officielle.

---

## Création de personnage

Wizard en plusieurs étapes : identité → compétences → principes → talents → atouts → freebies → récap.
Les **freebies** sont des points de création libres répartis sur les rangs en fin de wizard.
**Création ouverte** : pas besoin d'être connecté, n'importe qui peut créer un personnage.
La fiche est **éditable librement** par le joueur à tout moment.
À la fin du wizard, un **code d'accès** est généré (modifiable) et une **URL thématique** est attribuée (termes liés à l'univers Dune : maisons, planètes, personnages...). Le code reste visible en permanence en haut de la fiche.

---

## Ressources de session (partagées entre tous)

| Ressource | Visible par | Max | Géré par |
|---|---|---|---|
| **Impulsions** | Joueurs + MJ | 6 | Joueurs + MJ |
| **Menace** | Joueurs + MJ | Aucun | MJ (lecture seule joueurs, sauf lors d'un jet) |
| **Complications** | MJ uniquement | Aucun | MJ |

**Maison :** nom + description rattachés à la session. Éditable par le MJ et les joueurs. Pas de mécanique pour l'instant, purement narratif.

---

## Jets de dés — 2D20

**Constitution du rang :** avant chaque jet, le joueur sélectionne **une compétence et un principe**. Leurs deux rangs sont additionnés pour former le rang du jet.

**Base :** on lance 2d20, on compte les succès.
- Résultat ≤ rang → **1 succès**
- Résultat ≤ rang ET spécialisation renseignée sur la compétence choisie → **2 succès**
- Résultat = 20 → **Complication** (envoyée automatiquement au MJ)

**Difficulté :** nombre de succès à atteindre, communiquée oralement par le MJ et saisie par le joueur dans la modale.

**Acheter des dés supplémentaires** (avant le lancer, max 5d20 au total) :

Coût en Impulsions (barème dégressif) :

| Dés supplémentaires | Coût total en Impulsions |
|---|---|
| +1d20 | 1 Impulsion |
| +2d20 | 3 Impulsions |
| +3d20 | 6 Impulsions |

Alternativement, générer de la Menace : **1 Menace = +1 dé** (1 pour 1, sans barème).

**Détermination** (si ≥ 1, consommée) :
- *Relancer* : lancer le pool deux fois, garder le meilleur résultat
- *Critique automatique* : un dé du pool compte comme double succès

**Autres usages des Impulsions (hors jet) :**
- Poser une question au MJ sur la scène en cours (coût à définir avec le MJ)

**Après le jet :**
- Succès excédentaires (au-delà de la difficulté) → le joueur peut les convertir en Impulsions ajoutées au pool partagé
- Complications → compteur MJ incrémenté automatiquement, mention dans le résultat du joueur (sans valeur)
- Tous les résultats sont **publics** : toast visible par tous + historique de session (identique à Vikings)

---

## Journal

Chaque **joueur** dispose d'un journal personnel pour ses notes privées (texte riche).
Le **MJ** a également son propre journal, et peut en plus envoyer des notes à un ou plusieurs joueurs et envoyer des atouts directement dans l'inventaire d'un joueur.
L'**historique des jets de dés** est visible par tous (MJ et joueurs).

---

## Jets de dés — MJ

Le MJ dispose d'une modale de jet dédiée. Il saisit :
- Un **rang libre** (valeur numérique saisie à la volée)
- Une **difficulté**
- Des dés supplémentaires en dépensant de la **Menace** (1 Menace = +1 dé, max 5d20 total)

Les résultats des jets MJ sont également **publics** (toast + historique).

---

## Interface MJ

- Vue des **personnages** de la session (fiches en lecture, actions : modifier la détermination, envoyer un atout, envoyer une note)
- Vue des **jauges** (Impulsions, Menace, Complications) avec contrôle +/−
- **Maison** de la session : édition nom + description
- Accès au **journal** et à l'**historique des jets**

---

## Ce qui n'est PAS dans le scope (v1)

- Système de combat dédié (les combats se jouent via les jets de dés classiques)
- Mécanique de blessures / santé (purement narratif)
- Mécanique de Maison (narratif uniquement pour l'instant)
- Gestion de PNJs (prévu plus tard, via adaptation du système existant)