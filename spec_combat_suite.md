# Spec Combat Générique — Step 11 : NPCModal & Gestion des Templates NPC

## Contexte

L'étape 10 a livré un système de combat générique fonctionnel côté joueur et GM.
`NPCAttackModal` restait sur l'ancienne implémentation Vikings hardcodée (jet custom sans
diceEngine, pas d'animation, pas de `combatConfig`).

Ce step finalise la généricité du système en :
- Rendant `NPCAttackModal` entièrement générique via `combatConfig`
- Ajoutant la persistance des templates NPC en BDD (CRUD complet)
- Regroupant toute la gestion NPC dans une seule modal `NPCModal`
- Remplaçant les templates hardcodés de `data.js` par la BDD

---

## Backend

### Route générique `/api/:slug/npc`

Montée comme route partagée dans `loader.js` (au même titre que `sessions`, `journal`, `dice`).

| Méthode  | Endpoint  | Description              |
|----------|-----------|--------------------------|
| `GET`    | `/`       | Liste tous les templates |
| `GET`    | `/:id`    | Un template par id       |
| `POST`   | `/`       | Créer un template        |
| `PUT`    | `/:id`    | Modifier un template     |
| `DELETE` | `/:id`    | Supprimer un template    |

**Contrat de données :**
- `combat_stats` : JSON opaque — sérialisé/désérialisé par le slug, jamais inspecté par la route
- `system_data` : JSON opaque — données additionnelles slug-spécifiques
- La route parse `combat_stats` et `system_data` en JSON au retour (`JSON.parse`)
- La route sérialise en string à l'écriture (`JSON.stringify`)

**Table BDD cible :** `npc_templates` (déjà présente via migration `28022026_add_npc_templates.sql`)

---

## Frontend

### `NPCModal.jsx` — modal unifiée de gestion NPC

Remplace `AddNPCModal.jsx` et `EditNPCModal.jsx`. Quatre modes internes :

#### Mode `library` (défaut)
- Charge les templates via `GET /npc`
- Liste les templates avec boutons **Utiliser en combat**, **Éditer**, **Supprimer**
- Confirmation avant suppression (ConfirmModal)
- Bouton **Nouveau template** → bascule en mode `create`

#### Mode `create`
- Formulaire générique : nom, description, actionsMax
- Slot slug-spécifique : `renderNPCForm(formData, onChange)` injecté par `combatConfig`
- Bouton **Sauvegarder** → `POST /npc` avec `buildNPCCombatStats(formData)`
- Bouton **Utiliser sans sauvegarder** → instanciation directe en combat

#### Mode `edit`
- Même formulaire que `create`, prérempli via `parseNPCCombatStats(combat_stats)`
- Sauvegarde via `PUT /npc/:id`

#### Mode `instanciate`
- Modale légère de confirmation avant ajout en combat
- Permet de renommer le NPC pour cette instance
- Calcule l'initiative et instancie le combattant mémoire

#### Instanciation en combattant mémoire

```js
{
    type:       'npc',
    name:       instanceName,           // modifiable à l'instanciation
    actionsMax: combatStats.actionsMax,
    attaques:   combatStats.attaques,
    initiative: rollInitiative(),
    healthData: combatConfig.buildNPCHealthData(combatStats),
    // Champs top-level pour compatibilité CombatantCard (fallback)
    blessure:    0,
    blessureMax: combatStats.blessureMax,
    armure:      combatStats.armure,
    seuil:       combatStats.seuil,
}
```

---

### `NPCAttackModal.jsx` — réécriture générique

**Props :**
```
npc           — combattant NPC (depuis combatState)
combatState   — état combat complet
combatConfig  — config slug injectée depuis TabCombat
onClose
onAttackSubmitted(attackData)
```

**Machine à états :** `select` → `roll` → `rolled` → `target`

| État     | Condition d'affichage     | Contenu                                           |
|----------|---------------------------|---------------------------------------------------|
| `select` | `npc.attaques.length > 1` | Liste des attaques du NPC                         |
| `roll`   | Attaque sélectionnée      | Bouton lancer + checkbox broadcast                |
| `rolled` | Après animation           | Résultat dés + succès + bouton "Choisir la cible" |
| `target` | Résultat disponible       | `TargetSelectionModal` générique                  |

**Jet de dés :**

```js
const ctx    = combatConfig.attack.getNPCRollContext(npc, selectedAttack);
const result = roll(ctx, combatConfig.dice);
```

Les hooks `combatConfig.dice` (`buildNotation`, `beforeRoll`, `afterRoll`,
`buildAnimationSequence`) sont les mêmes que pour les joueurs. La différence est
dans le contexte fourni par `getNPCRollContext` : pas de compétence ni de
caractéristique, les valeurs de seuil et d'explosion viennent directement de
`attack.succes` et `attack.explosion`.

Animation via `DiceAnimationOverlay` — respecte la config utilisateur (`readDiceConfig()`).

**Broadcast historique :** checkbox optionnelle, `POST /dice/roll` si cochée.

**Calcul dégâts :** délégué à `combatConfig.attack.calculateDamage` — même fonction
que pour les attaques joueur.

---

### `EditNPCModal.jsx`

Supprimé — remplacé par le mode `edit` de `NPCModal`.

---

## Config slug — nouveaux callbacks dans `combatConfig`

Tous les callbacks NPC sont préfixés `NPC` pour les distinguer des callbacks génériques.

```js
// Formulaire slug-spécifique (champs combat_stats : armure, seuil, attaques...)
renderNPCForm(formData, onChange) → JSX

// Sérialise formData → combat_stats pour POST/PUT BDD
buildNPCCombatStats(formData) → object

// Désérialise combat_stats → formData pour préremplir le formulaire édition
parseNPCCombatStats(combat_stats) → formData

// Instancie healthData runtime depuis combat_stats (état initial du combattant)
buildNPCHealthData(combat_stats) → object

// Construit le RollContext NPC complet pour diceEngine.roll()
// Lit npc.attaques[x] pour pool/seuil/explosion
// Pas de compétence ni de caractéristique — valeurs directes depuis attack
attack.getNPCRollContext(npc, attack) → RollContext
```

### Callbacks Vikings — exemple d'implémentation

**`buildNPCCombatStats`** sérialise : `blessureMax`, `armure`, `seuil`, `actionsMax`, `attaques[]`

**`parseNPCCombatStats`** est l'inverse de `buildNPCCombatStats`.

**`buildNPCHealthData`** retourne : `{ tokensBlessure: 0, blessureMax, armure, seuil }`

**`getNPCRollContext`** construit un `RollContext` avec :
- `pool` calculé depuis `getBlessureMalus(npc.healthData.tokensBlessure)`
- `threshold` = `attack.succes`
- `explosionThresholds` = `[attack.explosion]`
- Les hooks `vikingsConfig.dice` sont utilisés tels quels par `roll()`

---

## Chaîne de propagation `combatConfig`

```
GMView
  → TabCombat
      → NPCModal       (renderNPCForm, buildNPCCombatStats, parseNPCCombatStats, buildNPCHealthData)
      → NPCAttackModal (attack.getNPCRollContext, attack.calculateDamage, attack.renderTargetInfo,
                        dice — hooks diceEngine)
      → AttackValidationQueue (déjà générique — inchangé)
```

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/server/routes/npc.js` | Création (route générique CRUD) |
| `src/server/systems/loader.js` | Ajout `npc` dans `SHARED_ROUTES` |
| `src/client/src/components/gm/npc/NPCModal.jsx` | Création (remplace AddNPCModal + EditNPCModal) |
| `src/client/src/components/gm/npc/AddNPCModal.jsx` | Suppression |
| `src/client/src/components/gm/npc/EditNPCModal.jsx` | Suppression |
| `src/client/src/components/gm/npc/NPCAttackModal.jsx` | Réécriture générique |
| `src/client/src/systems/vikings/gm/tabs/TabCombat.jsx` | Renommage AddNPCModal→NPCModal, passage `combatConfig` |
| `src/client/src/systems/vikings/gm/GMView.jsx` | Renommage refs AddNPCModal→NPCModal |
| `src/client/src/systems/vikings/config.jsx` | Ajout callbacks NPC préfixés |

---

## Bugs connus à traiter (hors périmètre step 11 mais à ne pas oublier)

| Bug | Composant | Description |
|---|---|---|
| Bouton "Lancer" visible après jet | `DiceModal` | En mode combat-attack, le bouton Lancer reste affiché après le jet |
| `Combat.jsx` Vikings | `Sheet.jsx` | Ancien fichier à supprimer |
| `AttackModal.jsx` | Composant racine | Ancien fichier à supprimer |
| `NPC_TEMPLATES` dans `data.js` | `data.js` | À retirer après validation BDD |

---

## Ce qui n'est pas dans ce step

- Migration BDD supplémentaire — `npc_templates` existe déjà
- UX/UI passes générales — différées
- Systèmes futurs (Noctis, Tecumah) — les callbacks slug seront à implémenter par système