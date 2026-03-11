# Spec — Refactoring DiceEngine v2

> **Statut** : Prêt pour implémentation  
> **Périmètre** : `diceEngine.js` + `diceAnimBridge.js` + `DiceAnimationOverlay.jsx` + `HistoryPanel.jsx` + `DiceHistoryPage.jsx` + `vikingsConfig.dice` + `duneConfig.dice` + tous les appelants (modales joueur + GM, Vikings + Dune)  
> **Objectif** : Moteur de dés véritablement générique, sans aucune connaissance des systèmes de jeu

---

## Principes directeurs

1. **Le moteur exécute, le slug décide.** Le moteur ne sait pas ce qu'est un succès, une complication, une ressource.
2. **Pas de defaults métier.** Aucune valeur par défaut liée à un système (pas de `d10`, pas de `threshold: 7`).
3. **Contrat de hooks clair et stable.** Un slug peut être implémenté sans lire le code du moteur.
4. **Persist et animation sont des responsabilités moteur.** Le slug ne fait jamais `POST /dice/roll` lui-même, n'instancie jamais `DiceAnimationOverlay` directement.
5. **`buildNotation` est appelé par le composant, pas par le moteur.** Le moteur reçoit la notation déjà construite.

---

## Étape 0 — Bridge animation (nouveau fichier)

### Problème

`roll()` est une fonction utilitaire (`diceEngine.js`) — elle ne peut pas `useState` ni rendre du JSX. Pourtant elle doit pouvoir déclencher l'animation et **attendre sa fin** avant de persister et rendre la main.

### Solution : `diceAnimBridge.js`

Un singleton léger (~20 lignes), zéro dépendance externe :

```js
// src/client/src/tools/diceAnimBridge.js

let _resolve  = null;
let _listener = null;

export const diceAnimBridge = {
  /** Appelé par <DiceAnimationOverlay> au mount pour s'enregistrer */
  onPlay: (fn) => { _listener = fn; },

  /** Appelé par diceEngine — déclenche l'animation et attend sa fin */
  play: (seq) => new Promise((res) => {
    _resolve = res;
    _listener?.(seq);
  }),

  /** Appelé par <DiceAnimationOverlay> dans son onComplete */
  complete: () => {
    _resolve?.();
    _resolve = null;
  },
};
```

### Singleton `<DiceAnimationOverlay />`

Un seul overlay dans le DOM, monté dans `PlayerPage.jsx` et `GMPage.jsx` (racines de chaque surface). Il s'enregistre sur le bridge à son mount :

```jsx
// Dans DiceAnimationOverlay.jsx
useEffect(() => {
  diceAnimBridge.onPlay((seq) => setCurrentSequence(seq));
}, []);

// Dans le handler onComplete interne
const handleComplete = () => {
  setCurrentSequence(null);
  diceAnimBridge.complete();
};
```

**Aucun composant ne monte plus son propre overlay local.** Les props `animationSequence`, `sequences` (legacy) et `insuranceData` disparaissent — l'overlay ne répond qu'au bridge.

---

## Étape 1 — Contrat de `roll()`

### Signature

```js
await roll(notation, ctx, hooks)
```

`roll()` est **asynchrone** — elle attend la fin de l'animation avant de rendre la main. Le slug reçoit le résultat une seule fois, quand tout est terminé.

| Param | Type | Description |
|---|---|---|
| `notation` | `string \| string[]` | Notation(s) rpg-dice-roller construites par le slug. Une string = 1 groupe. Un tableau = N groupes, un `DiceRoll()` par entrée. |
| `ctx` | `object` | Contexte complet du jet — voir structure ci-dessous |
| `hooks` | `object` | Callbacks slug — voir catalogue ci-dessous |

### Structure de `ctx`

```js
{
    // ── Accès réseau (requis pour le persist) ─────────────────────────────
    apiBase:   string,          // ex: '/api/vikings'
    fetchFn:   Function,        // fetchWithAuth du slug

    // ── Métadonnées pour l'historique ─────────────────────────────────────
    characterId:    number | null,  // null = jet GM anonyme
    sessionId:      number | null,  // null = hors session
    characterName:  string | null,
    rollType:       string,         // identifiant libre slug ex: 'vikings_skill', 'dune_2d20'
    persistHistory: boolean,        // défaut : true — voir section dédiée Étape 5

    // ── Données système opaques ───────────────────────────────────────────
    // Le moteur ne lit jamais ce champ — transmis tel quel aux hooks
    systemData: { /* libre */ },

    // ── Affichage ─────────────────────────────────────────────────────────
    label: string,
}
```

### Catalogue des hooks

| Hook | Signature | Rôle | Obligatoire |
|---|---|---|---|
| `beforeRoll` | `(ctx) → ctx` | Validation, enrichissement. Peut lever `RollError`. | Non |
| `afterRoll` | `(raw, ctx) → result` | Interprétation complète des résultats bruts. | Non |
| `buildAnimationSequence` | `(raw, ctx, result) → AnimationSequence \| null` | Structure pour l'overlay. `null` = skip animation. | Non |
| `renderHistoryEntry` | `(entry) → JSX \| null` | Rendu dans l'historique. `null` = rendu générique. | Non |

> **`buildNotation` n'est PAS un hook moteur.** C'est une fonction déclarée dans `config.dice` du slug, appelée par le composant avant de passer la notation à `roll()`. Le moteur reçoit toujours une notation déjà construite.

---

## Étape 2 — Le raw

Sortie de l'exécution interne, entrée de `afterRoll`. **Aucune interprétation.**

### Distinction fondamentale : groupe vs vague

**Groupe** = unité sémantique définie par le slug dans la notation. Le slug décide combien il y en a et ce qu'ils signifient. Le moteur ne crée jamais de groupe supplémentaire — les explosions de dés n'ajoutent pas de groupe.

**Vague** = séquence mécanique à l'intérieur d'un groupe, générée par les explosions. Le moteur les calcule automatiquement. Elles n'existent que pour l'animation.

```
notation : ["3d10!>=9>=7", "3d10!>=10>=7"]
            └─ groupe 0 ─┘   └─ groupe 1 ─┘   ← définis par le slug

raw.groups[0]   ← jet principal  (sens donné par le slug)
  .notation = "3d10!>=9>=7"
  .values   = [9, 4, 10, 6]     ← faces de dés uniquement, explosions incluses, À PLAT
  .total    = 29                 ← total lib (idem ici, pas de modificateur arithmétique)
  .waves    = [
      { dice: [9, 4, 10] },     ← vague 0 : les 3 dés initiaux
      { dice: [6] },            ← vague 1 : explosion du 10 → 1 dé supplémentaire
  ]
```

**Règles :**
- Le nombre de groupes dans `raw` correspond **toujours** au nombre de termes dans la notation.
- `groups[i].values` contient **les faces de dés uniquement** (pas les modificateurs arithmétiques), explosions incluses. C'est ce que `afterRoll` utilise pour interpréter.
- `groups[i].total` contient le total lib (dés + modificateurs arithmétiques) — utile pour les systèmes D&D-like.
- `groups[i].waves` ne sert qu'à `buildAnimationSequence`.

### Modificateurs arithmétiques — règle d'extraction

`rpg-dice-roller` permet des notations mixtes comme `"2d6+3"` ou `"1d20+5"`. Le `+3` est un modificateur arithmétique — il contribue au total de la lib mais **n'est pas une face de dé**.

Règle : `_buildGroups()` n'extrait dans `values[]` et `waves[]` **que les objets `RollResult` correspondant à des dés réels** (pas les modificateurs). Le total arithmétique complet est disponible dans `groups[i].total`.

```
notation : "1d20+5"

raw.groups[0]
  .notation = "1d20+5"
  .values   = [10]    ← face du d20 uniquement
  .total    = 15      ← 10 (dé) + 5 (modificateur)
  .waves    = [{ dice: [10] }]

// Dans afterRoll d'un système D&D-like :
afterRoll: (raw, ctx) => ({
    total:    raw.groups[0].total,   // 15 — on utilise le total avec modificateur
    values:   raw.groups[0].values,  // [10] — la face brute si besoin
})
```

`allDice` reste la concat de tous les `groups[i].values` — uniquement des faces de dés, jamais de modificateurs.

### Structure complète

```js
raw = {
    groups: [
        {
            notation: string,   // terme exact passé à DiceRoll
            values:   number[], // faces de dés uniquement (modificateurs exclus)
            total:    number,   // total lib (dés + modificateurs arithmétiques)
            waves: [
                { dice: number[] },   // vague 0 : dés initiaux
                { dice: number[] },   // vague 1+ : explosions
            ],
        },
    ],
    allDice: number[],      // concat de tous les groups[i].values (faces de dés)
    flags: {
        exploded: number[], // valeurs ayant déclenché une explosion (tous groupes confondus)
    },
}
```

---

## Étape 3 — Comportements par défaut des hooks

| Hook | Comportement par défaut |
|---|---|
| `beforeRoll` | Passe `ctx` tel quel |
| `afterRoll` | Retourne `{ allDice, groups, flags }` — pas d'interprétation |
| `buildAnimationSequence` | Séquence simple : un groupe par `raw.groups`, `diceType` inféré depuis la notation, label depuis `ctx.label` |
| `renderHistoryEntry` | `null` → rendu générique |

### Inférence de `diceType`

Le `diceType` pour l'animation est extrait de la notation du groupe par regex — on cherche le premier `d<N>` ou `dF` :

```
"3d10!>=9>=7"  → "d10"
"2d20"         → "d20"
"1d20+5"       → "d20"   ← modificateur ignoré pour l'inférence
"4dF"          → "dF"
"2d6+1d8"      → "d6"    ← premier dé trouvé (cas : utiliser un tableau pour les hétérogènes)
```

> **Vision future — dés hétérogènes dans une animation unique :** aujourd'hui l'overlay joue les groupes séquentiellement (un `clearDice()` entre chaque). À terme, `dice-box-threejs` supporte l'affichage simultané — on pourra jouer un groupe avec des `diceType` différents dans une même vague sans changer le contrat du moteur. `buildAnimationSequence` peut déjà préparer des groupes avec des `diceType` distincts — c'est l'overlay qui évoluera, pas le contrat.

---

## Étape 4 — Double jet (avantage, fortune, assurance...)

`rollWithInsurance` n'existe plus. Les groupes rendent cette abstraction superflue.

### Pattern

```js
await roll(["3d10!>=9>=7", "3d10!>=9>=7"], ctx, hooks)
//          └─ jet 1 ──────┘  └─ jet 2 ──────┘
```

`afterRoll` compare les deux groupes et décide lequel garder :

```js
afterRoll: (raw, ctx) => {
    const successes1 = countSuccesses(raw.groups[0].values, ctx);
    const successes2 = countSuccesses(raw.groups[1].values, ctx);
    const keptGroup  = successes1 >= successes2 ? 0 : 1;
    return {
        successes: Math.max(successes1, successes2),
        keptGroup,
        detail: {
            successes1, successes2,
            values1: raw.groups[0].values,
            values2: raw.groups[1].values,
        },
    };
},
```

`buildAnimationSequence` reçoit `result` et peut mettre en valeur le jet gardé :

```js
buildAnimationSequence: (raw, ctx, result) => ({
    mode: 'single',
    groups: [
        {
            id: 'jet-1', diceType: 'd10',
            color: result.keptGroup === 0 ? 'fortune' : 'default',
            label: result.keptGroup === 0 ? '✅ Jet 1 — gardé' : 'Jet 1',
            waves: raw.groups[0].waves,
        },
        {
            id: 'jet-2', diceType: 'd10',
            color: result.keptGroup === 1 ? 'fortune' : 'default',
            label: result.keptGroup === 1 ? '✅ Jet 2 — gardé' : 'Jet 2',
            waves: raw.groups[1].waves,
        },
    ],
}),
```

---

## Étape 5 — Persist historique

### Timing

Après fin d'animation (ou immédiatement si `animationEnabled === false`). Jamais avant.

### Flag `persistHistory`

`ctx.persistHistory` contrôle si le jet est enregistré en base. **Défaut : `true`.**

| Valeur | Comportement |
|---|---|
| `true` (défaut) | `POST ${apiBase}/dice/roll` après animation |
| `false` | Aucun persist — le jet n'apparaît pas dans l'historique |

**Quand passer `false` :**
- Jets GM secrets (résultat non visible des joueurs)
- Jets de prévisualisation ou debug

**Tous les autres jets sont historisés par défaut**, y compris les jets de posture (`PostureModal`), les jets NPC (`NPCAttackModal`), les jets de compétence — le flag n'est à préciser qu'en cas d'exception.

```js
// Jet GM secret
const result = await roll(notation, { ...ctx, persistHistory: false }, hooks);

// Jet normal — persistHistory non précisé → true par défaut
const result = await roll(notation, ctx, hooks);
```

### Payload `POST ${ctx.apiBase}/dice/roll`

```js
{
    session_id:     ctx.sessionId,
    character_id:   ctx.characterId,
    character_name: ctx.characterName,
    roll_type:      ctx.rollType,
    notation:       notation,           // string ou JSON.stringify(array)
    roll_result:    JSON.stringify(result),
    successes:      result.successes ?? null,
}
```

---

## Étape 6 — Animation

### Flux complet

```
roll(notation, ctx, hooks) appelé
  → hooks.beforeRoll(ctx)                      peut lever RollError
  → _executeGroups(notation)                   construit raw
  → hooks.afterRoll(raw, ctx)                  → result
  → hooks.buildAnimationSequence(raw, ctx, result)
      → null  → skip vers persist
      → AnimSeq, animationEnabled === false → skip vers persist
      → AnimSeq, animation activée → diceAnimBridge.play(seq) [await]
  → persist (si ctx.persistHistory !== false)
  → return result
```

### Format `AnimationSequence`

```js
{
    mode: 'single',
    groups: [
        {
            id:       string,
            diceType: string,   // 'd6' | 'd10' | 'd20' | 'dF' | ...
            color:    string,   // 'default' | 'wild' | 'fortune' | 'saga' | 'danger'
            label:    string,
            waves:    [{ dice: number[] }],
        }
    ],
}
```

---

## Étape 7 — Historique : `DiceHistoryPage` et `HistoryPanel`

### `HistoryPanel` — dé-vikingisation

Remplacer toutes les classes `viking-*` par des variables CSS génériques :

| Classe Viking actuelle | Variable CSS générique |
|---|---|
| `text-viking-leather` | `var(--color-text-muted)` |
| `text-viking-bronze` | `var(--color-accent)` |
| `text-viking-parchment` | `var(--color-text)` |
| `text-viking-brown` | `var(--color-text)` |
| `bg-viking-parchment` | `var(--color-surface)` |
| `border-viking-leather` | `var(--color-border)` |
| `border-viking-bronze` | `var(--color-border)` |

Ces variables doivent être présentes dans le `theme.css` de chaque slug.

### `HistoryPanel` — props requises

```jsx
<HistoryPanel
  apiBase={apiBase}                                        // via useSystem()
  renderHistoryEntry={slugConfig.dice?.renderHistoryEntry} // optionnel
/>
```

URL corrigée :
```js
// Avant (incorrect hors Vikings)
const url = `/api/dice/history?limit=100`;
// Après
const url = `${apiBase}/dice/history?limit=100`;
```

### `DiceHistoryPage` — prop optionnelle

```jsx
<DiceHistoryPage renderHistoryEntry={slugConfig.dice?.renderHistoryEntry} />
```

### Hook `renderHistoryEntry`

Déclaré dans `config.dice` du slug, injecté par `Sheet.jsx` / `GMView.jsx` :

```js
renderHistoryEntry: (entry) => {
    if (entry.roll_type === 'vikings_skill')   return <VikingsSkillRow   entry={entry} />;
    if (entry.roll_type === 'vikings_posture') return <VikingsPostureRow entry={entry} />;
    return null; // → rendu générique
},
```

### Rendu générique (fallback)

Quand `renderHistoryEntry` est absent ou retourne `null` :
- Horodatage
- Nom du personnage
- Notation
- `allDice` ou `groups[i].values` à plat
- `successes` si présent dans `roll_result`
- `total` si présent dans `roll_result`

---

## Étape 8 — Nettoyage Vikings

| Ce qui sort | Destination |
|---|---|
| `rollSagaBonus()` | Supprimé — remplacé par notation composite |
| `rollWithInsurance()` | Supprimé — remplacé par notation tableau |
| `buildRollParams` hook | Supprimé — remplacé par `buildNotation` côté slug |
| `countSuccesses()` dans `_executeRoll` | Supprimé du raw, recalculé dans `vikingsConfig.afterRoll` |
| Defaults `d10 / threshold 7 / explosion 10` | Supprimés du moteur |

### Pattern SAGA — notation composite, zéro confirmation

**Décision UX :** La SAGA Vikings est déclarée **avant** le jet. Le joueur choisit son mode (Héroïque, Épique) dans la modale avant de lancer. **Il n'y a pas d'étape de confirmation** entre le jet principal et le jet bonus.

Conséquence technique : le slug construit une notation composite dès le départ. Le moteur roule **tout en un seul appel** `roll()`. C'est `afterRoll` qui décide d'utiliser ou non le groupe bonus selon que la condition est remplie (`mainSuccesses >= 3`). Le joueur voit les deux jets s'animer séquentiellement, puis le résultat final consolidé.

```js
// vikingsConfig.dice.buildNotation — appelé par DiceModal avant roll()
buildNotation: (ctx) => {
    const { isSaga, pool, explodeMin, threshold } = ctx.systemData;
    const mainGroup = `${pool}d10!>=${explodeMin}>=${threshold}`;
    if (!isSaga) return mainGroup;
    // SAGA déclarée → tableau → 2 groupes roulés en un seul appel
    return [mainGroup, `3d10!>=10>=7`];
},

// vikingsConfig.dice.afterRoll
afterRoll: (raw, ctx) => {
    const mainValues    = raw.groups[0].values;
    const mainSuccesses = countMainSuccesses(mainValues, ctx);

    if (!ctx.systemData.isSaga) {
        return buildStandardResult(mainSuccesses, raw, ctx);
    }

    // raw.groups[1] existe toujours — afterRoll décide de l'utiliser ou non
    const sagaValues = raw.groups[1].values;
    if (mainSuccesses < 3) {
        // Condition non remplie → groupe SAGA ignoré
        // sagaFailed: true permet à renderHistoryEntry d'afficher la tentative
        return buildStandardResult(mainSuccesses, raw, ctx, { sagaFailed: true });
    }
    return buildSagaResult(mainSuccesses, sagaValues, raw, ctx);
},

// vikingsConfig.dice.buildAnimationSequence
buildAnimationSequence: (raw, ctx, result) => {
    const groups = [{
        id: 'main', diceType: 'd10', color: 'default',
        label: ctx.label, waves: raw.groups[0].waves,
    }];
    // N'animer le groupe SAGA que si la condition était remplie
    if (ctx.systemData.isSaga && !result.sagaFailed) {
        groups.push({
            id: 'saga', diceType: 'd10', color: 'saga',
            label: `Jet ${ctx.systemData.sagaMode === 'epic' ? 'Épique' : 'Héroïque'} — SAGA`,
            waves: raw.groups[1].waves,
        });
    }
    return { mode: 'single', groups };
},
```

> **Note :** quand `sagaFailed: true`, `raw.groups[1]` existe (le moteur a roulé les dés) mais l'animation ne le joue pas et `afterRoll` l'ignore. Comportement intentionnel — le moteur roule tout, le slug décide de ce qu'il affiche.

---

## Étape 9 — Migration Dune (complète)

### Principe

`DuneDiceModal` et `DuneGMDiceModal` cessent d'utiliser `DiceRoll` directement et d'instancier leur propre `<DiceAnimationOverlay />`. Ils passent par `roll(notation, ctx, duneConfig.dice)`.

### `duneConfig.dice`

```js
// src/client/src/systems/dune/config.jsx

dice: {
    buildNotation: (ctx) => `${ctx.systemData.nbDes}d20`,

    beforeRoll: (ctx) => {
        if (ctx.systemData.nbDes < 1) throw new RollError('NO_DICE', 'Aucun dé à lancer');
        return ctx;
    },

    afterRoll: (raw, ctx) => {
        const { rang, hasSpec, competenceRang, difficulte } = ctx.systemData;
        const results = raw.allDice;
        let succesTotal = 0, complications = 0;

        for (const value of results) {
            if (value === 20) { complications++; continue; }
            if (value <= rang) {
                succesTotal += (hasSpec && value <= competenceRang) ? 2 : 1;
            }
        }

        const reussite = succesTotal >= difficulte;
        const excedent = Math.max(0, succesTotal - difficulte);
        return { results, rang, hasSpec, succesTotal, complications, reussite, difficulte, excedent };
    },

    buildAnimationSequence: (raw, ctx, result) => ({
        mode: 'single',
        groups: [{
            id: 'dune-roll', diceType: 'd20',
            color: result.reussite ? 'fortune' : 'default',
            label: ctx.label || `${ctx.systemData.nbDes}d20`,
            waves: raw.groups[0].waves,
        }],
    }),

    renderHistoryEntry: (entry) => <DuneHistoryEntry entry={entry} />,
},
```

### Flux `DuneDiceModal` après migration

```
Étape 1-2 : sélection + dépenses (inchangé — pur UI)
↓
Étape 3 : jet
  → Décrémenter détermination si useDetMin (AVANT roll(), ou dans beforeRoll)
  → Construire ctx avec systemData complet
  → notation = duneConfig.dice.buildNotation(ctx)
  → result = await roll(notation, ctx, duneConfig.dice)
              [animation + persist inclus]
  → Afficher résultats depuis result
↓
Étape 4 (post-jet — après que roll() rend la main) :
  → socket.emit('update-session-resources', ...)
  → Bouton "Convertir excédent en impulsions" si applicable
```

---

## Étape 10 — Cas particuliers : `PostureModal` et `NPCAttackModal`

### `PostureModal`

`PostureModal` effectue un jet de posture défensive active. Ce jet est historisé normalement — pas de traitement spécial.

Migration :
- Supprimer l'overlay local
- Appeler `await roll(notation, ctx, vikingsConfig.dice)` avec `rollType: 'vikings_posture'`
- `persistHistory` non précisé → `true` par défaut

```js
// PostureModal — handleRollActif
const notation = vikingsConfig.dice.buildNotation(ctx);
const result   = await roll(notation, {
    apiBase,
    fetchFn:       fetchWithAuth,
    characterId:   character.id,
    characterName: character.prenom,
    sessionId:     combatState?.sessionId ?? null,
    rollType:      'vikings_posture',
    label:         'Posture Défensive',
    systemData:    { ... },
}, vikingsConfig.dice);

// roll() a déjà animé et persisté — on lit juste le résultat
activate('actif', result.successes);
```

### `NPCAttackModal`

`NPCAttackModal` utilise l'ancienne signature `roll(ctx, combatConfig.dice)`. Migration vers la nouvelle :

```js
// Avant
const engine = roll(ctx, combatConfig.dice);

// Après
const notation = combatConfig.dice.buildNotation(ctx);
const result   = await roll(notation, ctx, combatConfig.dice);
```

`getNPCRollContext` dans `combatConfig.attack` doit fournir un `ctx` complet compatible avec la nouvelle signature — incluant `apiBase`, `fetchFn`, `characterName`, `rollType` :

```js
// vikingsConfig — combatConfig.attack.getNPCRollContext
getNPCRollContext: (npc, attack, { apiBase, fetchFn, sessionId }) => ({
    apiBase,
    fetchFn,
    characterId:   null,             // NPC — pas de characterId BDD
    characterName: npc.name,
    sessionId,
    rollType:      'vikings_npc_attack',
    label:         `${npc.name} — ${attack.name}`,
    // persistHistory: true par défaut — jets NPC historisés
    systemData: {
        pool:      npc.healthData?.pool ?? 2,
        threshold: attack.succes,
        explodeMin: attack.explosion,
        caracLevel: null,            // NPC : seuils fixes, pas de caracLevel
    },
}),
```

`NPCAttackModal` passe `{ apiBase, fetchFn, sessionId }` en troisième argument à `getNPCRollContext`.

---

## Récapitulatif des fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `src/client/src/tools/diceAnimBridge.js` | **Nouveau** — bridge singleton animation |
| `src/client/src/tools/diceEngine.js` | **Réécriture complète** — nouvelle signature async, suppression `rollWithInsurance` / `rollSagaBonus` / `buildRollParams`, extraction faces-de-dés uniquement dans `values[]`, `total` par groupe |
| `src/client/src/components/shared/DiceAnimationOverlay.jsx` | S'abonner au bridge, supprimer mode `insurance` et props locales |
| `src/client/src/components/layout/HistoryPanel.jsx` | Supprimer classes `viking-*` → variables CSS, corriger URL → `apiBase`, prop `renderHistoryEntry` |
| `src/client/src/components/gm/layout/DiceHistoryPage.jsx` | Prop `renderHistoryEntry` optionnelle |
| `src/client/src/systems/vikings/config.jsx` | Nouveau contrat `dice` complet — `buildNotation`, `afterRoll(raw,ctx)`, `buildAnimationSequence(raw,ctx,result)`, `renderHistoryEntry`, pattern SAGA composite sans confirmation ; `getNPCRollContext` étendu avec `apiBase`/`fetchFn`/`sessionId` |
| `src/client/src/systems/vikings/components/modals/DiceModal.jsx` | `buildNotation` + `await roll()`, supprimer overlay local, supprimer phase de confirmation SAGA |
| `src/client/src/systems/vikings/components/modals/PostureModal.jsx` | `buildNotation` + `await roll()`, supprimer overlay local |
| `src/client/src/systems/vikings/gm/modals/GMDiceModal.jsx` | Migrer vers `await roll(notation, ctx, hooks)` |
| `src/client/src/components/gm/npc/NPCAttackModal.jsx` | Nouvelle signature `await roll(notation, ctx, hooks)`, passer `{apiBase, fetchFn, sessionId}` à `getNPCRollContext`, supprimer overlay local |
| `src/client/src/systems/dune/config.jsx` | Ajouter bloc `dice` complet — `buildNotation`, `afterRoll(raw,ctx)`, `buildAnimationSequence`, `renderHistoryEntry` |
| `src/client/src/systems/dune/dice/DuneDiceModal.jsx` | Supprimer `DiceRoll` direct + overlay local, passer par `await roll()` |
| `src/client/src/systems/dune/gm/modals/GMDiceModal.jsx` | Idem |
| `PlayerPage.jsx` / `GMPage.jsx` | Monter le singleton `<DiceAnimationOverlay />` |

### Ordre d'implémentation recommandé

1. `diceAnimBridge.js` — zéro dépendance
2. `diceEngine.js` — réécriture complète, dépend du bridge
3. `DiceAnimationOverlay.jsx` — s'abonne au bridge, montage singleton dans les pages racines
4. `vikingsConfig.dice` — nouveau contrat complet (SAGA composite, `getNPCRollContext` étendu)
5. Appelants Vikings (`DiceModal`, `PostureModal`, `GMDiceModal`, `NPCAttackModal`)
6. `duneConfig.dice` — bloc complet
7. Appelants Dune (`DuneDiceModal`, `GMDiceModal`)
8. `HistoryPanel` + `DiceHistoryPage` — dé-vikingisation + props