# Spec — Refactoring DiceEngine v2

> **Statut** : Implémenté  
> **Périmètre** : `diceEngine.js` · `diceAnimBridge.js` · `DiceAnimationOverlay.jsx` · `HistoryPanel.jsx` · `DiceHistoryPage.jsx` · `config.dice` de chaque slug  
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
"2d6+1d8"      → "d6"    ← premier dé trouvé — non applicable : pour du mixed, passer diceType en notation complète (voir Étape 6bis)
```

> **Dés hétérogènes dans une animation unique — implémenté.**
> `dice-box-threejs` accepte nativement une notation composite comme `"1d100+1d10@40,5"` —
> le parser `DiceNotation` de la lib crée un `set[]` avec une entrée par type de dé,
> spawne les bons modèles 3D et applique les valeurs forcées (`@`) dans l'ordre du set.
>
> Pour déclencher ce comportement, il suffit de passer une **notation complète** dans le
> champ `diceType` du groupe d'animation, et de fournir les valeurs dans `waves[].dice`
> dans le même ordre que les types déclarés.
>
> `buildBoxNotation` dans l'overlay détecte automatiquement si `diceType` est une notation
> complète (contient `+` ou commence par un chiffre) et l'utilise telle quelle au lieu de
> préfixer le count :
>
> ```js
> // Mono-type (comportement historique inchangé)
> diceType: 'd10',  waves: [{ dice: [7, 3, 9] }]
> → "3d10@7,3,9"
>
> // Multi-type (nouveau)
> diceType: '1d100+1d10',  waves: [{ dice: [40, 5] }]
> → "1d100+1d10@40,5"
> ```

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
            diceType: string,
            // Deux formes possibles :
            //   Forme simple  : 'd10' | 'd20' | 'd6' | 'dF' | ...
            //                   → l'overlay préfixe le count : "3d10@7,3,9"
            //   Forme notation: '1d100+1d10' | '2d6+1d8' | ...
            //                   → l'overlay l'utilise telle quelle : "1d100+1d10@40,5"
            //                   Règle de détection : contient '+' OU commence par /^\d+d/

            color:    string,   // 'default' | 'wild' | 'fortune' | 'saga' | 'danger'
            label:    string,
            waves:    [{ dice: number[] }],
            // waves[i].dice doit lister les valeurs dans l'ORDRE des types déclarés
            // dans diceType. Exemple pour '1d100+1d10' :
            //   dice: [40, 5]   ← 40 pour le d100 (dizaines), 5 pour le d10 (unités)
        }
    ],
}
```

## Étape 6bis — Cas d'usage : animation d100 (percentile + unités)

### Contexte

Un jet de 1d100 implique physiquement deux dés distincts :
- un **d100** (percentile) qui affiche les dizaines : 00, 10, 20 … 90
- un **d10** qui affiche les unités : 0–9

La valeur calculée par le moteur est un entier entre 1 et 100.
L'animation doit afficher les deux dés simultanément avec les bonnes faces.

### Décomposition de la valeur

```js
const v     = raw.groups[0].values[0]; // ex: 45
const tens  = Math.floor(v / 10) * 10; // → 40  (face du d100)
const units = v % 10;                  // → 5   (face du d10)
// dice: [40, 5]  ← dans cet ordre, car diceType = '1d100+1d10'
```

⚠️ **Attention** : `raw.groups[0].values` est un **tableau**. Ne jamais appliquer
d'opérateurs arithmétiques directement dessus — JS fait une coercion implicite qui
"fonctionne" si le tableau a exactement un élément, mais plantera avec `NaN` dès qu'il
en a plusieurs. Toujours accéder à `raw.groups[0].values[0]`.

### Pattern complet dans `buildAnimationSequence`

```js
buildAnimationSequence: (raw, ctx, result) => {
    const { diceType } = ctx.systemData;
 
    if (diceType === 'd100') {
        const v = raw.groups[0].values[0];
        return {
            mode: 'single',
            groups: [{
                id:       'main',
                diceType: '1d100+1d10',
                label:    ctx.systemData.rollLabel ?? '',
                waves:    [{ dice: [Math.floor(v / 10) * 10, v % 10] }],
            }],
        };
    }
 
    // Cas standard mono-type
    return {
        mode: 'single',
        groups: [{
            id:       'main',
            diceType: diceType,
            label:    ctx.systemData.rollLabel ?? '',
            waves:    [{ dice: raw.groups[0].values }],
        }],
    };
},
```

### Ce qui a changé dans l'overlay (`DiceAnimationOverlay.jsx`)

```js
// buildBoxNotation — détecte si diceType est une notation complète
const buildBoxNotation = (diceValues, diceType) => {
    // Notation complète (ex: "1d100+1d10", "2d6+1d8")
    if (diceType.includes('+') || /^\d+d/.test(diceType)) {
        return `${diceType}@${diceValues.join(',')}`;
    }
    // Mono-type standard (ex: "d10", "d20", "dF")
    return `${diceValues.length}${diceType}@${diceValues.join(',')}`;
};
```

Aucun fork de `dice-box-threejs` n'est nécessaire. Le parser `DiceNotation` de la lib
supporte nativement les notations composites multi-type. Le blocage était uniquement dans
notre `buildBoxNotation` qui ne généraient que des notations mono-type.