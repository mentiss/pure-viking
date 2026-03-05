# Spec — Système de Combat Générique

> Version 4.0 — Spécification finale (Phase 2 complète)  
> Statut : **Prêt pour Phase 3**

---

## 1. Objectif

Refactoriser le système de combat de l'application VTT pour le rendre **générique et extensible**. Chaque système de jeu (slug) déclare sa propre configuration de combat dans son `config.jsx`. Les composants et hooks génériques orchestrent le flow à partir de cette configuration, sans aucune connaissance des règles métier du slug.

### Principes directeurs

- **Le générique ne connaît pas les règles métier.** Il ne sait pas ce qu'est un token blessure, un seuil, de l'armure. Il orchestre.
- **Le slug déclare, le générique exécute.** Actions, affichage santé, calcul dégâts, jet de dés : tout est injecté via `combatConfig`.
- **Mutualisé = structurellement universel.** On mutualise uniquement ce qui est identique dans 99% des JDR : le flow des étapes, la gestion des états de la machine, la liste des combattants, le round/tour, le burn d'action.
- **Zéro régression.** Vikings doit fonctionner exactement comme avant, via sa propre déclaration de `combatConfig`.
- **Styles via variables CSS.** Les composants génériques utilisent `var(--color-*)`. Chaque slug fournit son `theme.css` avec ces variables — c'est leur contrat de thème.

---

## 2. Ce qui est générique (universel)

### Structure de l'état combat (mémoire serveur)

```js
{
  active: boolean,
  round: number,
  currentTurnIndex: number,       // index dans combatants[]
  combatants: Combatant[],
  pendingAttacks: PendingAttack[], // file d'attente validation GM
}
```

### Structure d'un combattant (générique)

```js
{
  id: string,                // uuid
  name: string,
  type: 'player' | 'npc',
  characterId: number|null,  // null pour NPC
  initiative: number,
  actionsRemaining: number,  // générique — utilisé par le bouton "Attaquer" et "Autre action"
  actionsMax: number,        // générique — 0 pour désactiver (ex: OpenD6 gère ses actions via turnData)
  activeStates: State[],     // [{ id, name, data: {} }] — contenu libre, géré par le slug
  healthData: {},            // objet opaque — santé, armure, seuil... structure définie par le slug
  turnData: {},              // objet opaque — ressources de tour spécifiques au slug
}
```

> `actionsRemaining`/`actionsMax` sont des champs génériques que le générique lit directement.  
> `healthData` et `turnData` sont intentionnellement opaques. Le générique ne les inspecte jamais.  
> `turnData` sert aux ressources de tour slug-spécifiques : pool de dés OpenD6, réactions D&D, Edge Shadowrun...  
> `activeStates` est un tableau libre. Le générique le transmet tel quel — jamais inspecté. La sémantique (Berserk, KO, Aveugle...) appartient au slug.

### Ce que le générique gère seul

- Route REST `/api/combat` montée par le systemResolver pour chaque slug (voir section 9)
- Chargement et écoute temps réel de `combat-update`
- Affichage de la liste des combattants (ordre, tour actif, round)
- Itération sur `combatConfig.actions` pour afficher les boutons d'action filtrés par `condition`
- Bouton "Autre action" si `actionsRemaining > 0` (burn d'action générique)
- Appel de `onAction(ctx)` au clic sur une action
- Orchestration du flow d'attaque via `useAttackFlow`
- Rendu des slots injectés par le slug à chaque étape du flow

### Ce que le générique ne gère PAS

- Le drag & drop de l'ordre des combattants → reste dans `TabCombat.jsx` côté GM (hors scope)
- L'affichage santé → slot `renderHealthDisplay` injecté par le slug
- Tout calcul métier (dégâts, seuils, armure, états...)
- La persistance en BDD (déléguée au slug via callbacks)

---

## 3. Ce que le slug déclare

Tout est déclaré dans un bloc `combat: { ... }` dans `src/client/src/systems/:slug/config.jsx`.

### Schéma complet de `combatConfig`

```js
// Dans src/client/src/systems/vikings/config.jsx
const vikingsConfig = {
  slug: 'vikings',
  label: 'Pure Vikings',

  dice: { /* hooks dés existants — inchangés */ },

  // ─── BLOC COMBAT ──────────────────────────────────────────────────────────
  combat: {

    // ── Affichage santé ────────────────────────────────────────────────────
    // Reçoit le combattant complet. Retourne du JSX.
    // Affiché dans CombatantRow (liste) et CombatPanel (fiche propre).
    renderHealthDisplay: (combatant) => <TokensDisplay combatant={combatant} />,

    // ── Actions spéciales du slug ──────────────────────────────────────────
    // Le générique affiche un bouton par entrée dont condition est truthy.
    // L'ordre du tableau détermine l'ordre d'affichage.
    actions: [
      {
        id: 'posture-defensive',
        label: 'Posture Défensive',
        // condition(character, combatant, combatState) → bool
        condition: (character, combatant) =>
          !combatant.activeStates?.some(s => s.id === 'posture-defensive'),
        // onAction : le slug a la main totale.
        // ctx = { character, combatant, combatState, fetchWithAuth, apiBase, openModal, socket }
        onAction: (ctx) => ctx.openModal('posture-defensive'),
        // Modal optionnel : instancié par openModal(id)
        // Interface contractuelle : { character, combatant, combatState, onClose }
        // Le slug gère lui-même le burn d'action dans son Modal ou onAction (via onBurnAction)
        Modal: PostureModal,
      },
      {
        id: 'berserk',
        label: '🔥 Berserk',
        condition: (character, combatant) =>
          character.traits?.some(t => t.name === 'Berserk') &&
          !combatant.activeStates?.some(s => s.id === 'berserk'),
        // Action directe sans modal
        onAction: async (ctx) => {
          await ctx.fetchWithAuth(`${ctx.apiBase}/combat/combatant/${ctx.combatant.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              updates: {
                activeStates: [
                  ...ctx.combatant.activeStates,
                  { id: 'berserk', name: 'Berserk', data: {} }
                ]
              }
            })
          });
        },
      },
    ],

    // ── Flow d'attaque ─────────────────────────────────────────────────────
    attack: {
      // Si null, le bouton Attaquer n'apparaît pas
      // Le générique vérifie déjà actionsRemaining > 0 avant d'appeler condition —
      // le slug peut y ajouter des conditions métier supplémentaires
      condition: (character, combatant) => true, // Vikings : pas de condition métier supplémentaire

      // Armes disponibles pour l'attaquant joueur
      // Retourne [{ id, nom, degats }]
      getWeapons: (character) => {
        const weapons = (character?.items || [])
          .filter(i => i.location === 'equipped' && i.category === 'weapon')
          .map(i => ({ id: i.id, nom: i.name, degats: parseInt(i.damage || 2) }));
        return weapons.length > 0 ? weapons : [{ id: 'fists', nom: 'Mains nues', degats: 1 }];
      },

      // Étape 1 : jet de dés
      // props = { character, combatant, activeStates, onRollComplete, onClose }
      // Le slug extrait depuis activeStates tout ce dont il a besoin (ex: isBerserk)
      // Si null → le flow saute directement à l'étape target avec rollResult = null
      renderRollStep: (props) => (
        <DiceModal
          character={props.character}
          isBerserk={props.activeStates?.some(s => s.id === 'berserk')}
          onClose={props.onClose}
          onUpdate={() => {}}
          context={{ type: 'combat-attack', onRollComplete: props.onRollComplete }}
        />
      ),

      // Calcul des dégâts suggérés — appelé dans TargetSelectionModal
      // rollResult = objet retourné par diceEngine (champ .successes)
      calculateDamage: (target, weapon, rollResult) => {
        const successes = rollResult?.successes ?? 0;
        const mr = Math.max(0, successes - (target.healthData?.seuil || 1));
        return Math.max(0, (weapon?.degats || 0) + mr - (target.healthData?.armure || 0));
      },

      // Affichage des stats d'une cible dans TargetSelectionModal
      // Retourne string ou JSX
      renderTargetInfo: (combatant) =>
        `Seuil ${combatant.healthData?.seuil ?? '?'} | Armure ${combatant.healthData?.armure ?? 0}`,

      // ── Opportunité de défense ──────────────────────────────────────────
      // null = pas de défense possible dans ce système (cas Pure Vikings :
      //   la parade/esquive est intégrée dans le seuil de l'adversaire,
      //   1 jet max par attaque est un principe fort du système).
      // Si défini : le GM peut déclencher une opportunité de défense depuis sa
      //   file de validation. Le serveur route alors combat-defense-opportunity
      //   vers le défenseur. L'attaquant n'est pas impliqué à cette étape.
      defenseOpportunity: null,

      // Exemple WoD :
      // defenseOpportunity: {
      //   condition: (attacker, target, rollResult) => target.type === 'player',
      //   renderDefenseStep: (props) => <DodgeParryModal ... />,
      //   // Calcule les dégâts finaux après résolution défense
      //   // defenseResult = résultat du jet de défense du joueur ciblé
      //   onDefenseResult: (defenseResult, attackRollResult, weapon) => finalDamage,
      // },
    },

    // ── Callbacks lifecycle ────────────────────────────────────────────────
    // Tous optionnels. Côté client uniquement : feedback UI, mises à jour locales.
    // La persistance réelle se fait via fetchWithAuth dans ces callbacks.

    // Appelé avant application des dégâts — peut modifier le montant final
    // ctx = { attacker, target, damage, weapon, rollResult }
    // Retourne le damage final
    onBeforeDamage: (ctx) => ctx.damage,

    // Appelé lors de la validation GM, exécuté sur le client du GM.
    // C'est le GM qui persiste les dégâts en BDD via la route characters du slug.
    // ctx = { attacker, target, damage, weapon, rollResult, newHealthData, fetchWithAuth, apiBase }
    onDamage: async (ctx) => {
      if (ctx.target.type !== 'player' || !ctx.target.characterId) return;
      await ctx.fetchWithAuth(`${ctx.apiBase}/characters/${ctx.target.characterId}`, {
        method: 'PUT',
        body: JSON.stringify({ tokens_blessure: ctx.newHealthData.tokensBlessure })
      });
    },

    // Appelé quand un combattant est éliminé (KO, mort...)
    // Le slug décide dans onDamage si la condition est remplie
    // ctx = { combatant, cause }
    onDeath: (ctx) => void,

    // Appelé quand activeStates change sur un combattant
    // ctx = { combatant, oldStates, newStates }
    onStateChange: (ctx) => void,
    onAfterStateChange: (ctx) => void,

    // Appelé à chaque nouveau round pour tous les combattants
    // Reçoit la liste complète, retourne la liste modifiée
    // Permet de nettoyer/transformer les états (ex: posture expire au round suivant)
    onStateNewRound: (combatants) => combatants.map(c => ({
      ...c,
      activeStates: c.activeStates.filter(s => s.id !== 'posture-defensive'),
    })),

    // Appelé en début de round, avant que les joueurs agissent.
    // Permet au slug de déclencher un reroll d'initiative si le système le requiert
    // (ex: WoD reroll l'initiative à chaque round, d'autres systèmes la gardent fixe).
    // ctx = { combatants, fetchWithAuth, apiBase }
    // Retourne la liste des combattants avec initiatives potentiellement modifiées,
    // ou null si aucun changement (pas de reroll).
    onRoundStart: null,
    // Exemple WoD :
    // onRoundStart: async (ctx) => {
    //   return ctx.combatants.map(c => ({
    //     ...c,
    //     initiative: rollInitiative(c), // reroll à chaque round
    //   }));
    // },

    // ── Burn d'action ─────────────────────────────────────────────────────
    // Condition d'affichage du bouton "Autre action" générique.
    // Le générique vérifie actionsRemaining > 0 par défaut.
    // Le slug peut surcharger pour ajouter des conditions métier supplémentaires.
    // Si non déclaré : le générique utilise actionsRemaining > 0 seul.
    // ctx = { combatant }
    canBurnAction: ({ combatant }) => combatant.actionsRemaining > 0,

    // Appelé quand le joueur clique "Autre action", APRÈS que le générique
    // a décrémenté actionsRemaining via POST /combat/action.
    // Permet au slug d'effectuer des effets secondaires spécifiques au JDR
    // (ex: mise à jour de turnData, déclenchement d'un effet...).
    // null = pas d'effet secondaire, le décrément générique suffit.
    // ctx = { combatant, fetchWithAuth, apiBase }
    onBurnAction: null,
  },
};
```

---

## 4. Architecture des fichiers

### Frontend

```
src/client/src/
├── components/
│   └── combat/                          ← NOUVEAU — générique
│       ├── CombatPanel.jsx              ← panneau principal joueur
│       ├── CombatantList.jsx            ← liste combattants (affichage seul)
│       ├── CombatantRow.jsx             ← une ligne combattant (healthDisplay injecté)
│       └── modals/
│           └── TargetSelectionModal.jsx ← sélection cible (renderTargetInfo injecté)
│
├── hooks/
│   ├── useAttackFlow.js                 ← NOUVEAU — hook générique flow attaque (client attaquant)
│   └── useDefenseOpportunity.js         ← NOUVEAU — hook générique opportunité de défense (client défenseur)
│
└── systems/vikings/
    ├── config.jsx                        ← MODIFIÉ — ajout bloc combat:{}
    ├── Combat.jsx                       ← SUPPRIMÉ (remplacé par CombatPanel + config)
    └── components/modals/
        ├── PostureModal.jsx             ← minimal refacto interface contractuelle
        └── DiceModal.jsx               ← inchangé
```

> Le drag & drop des combattants reste dans `TabCombat.jsx` côté GM — hors scope.

### Backend

```
src/server/
├── routes/
│   └── combat.js                       ← NOUVEAU — route combat générique
│                                          (remplace systems/vikings/routes/combat.js)
└── systems/vikings/
    └── routes/
        └── combat.js                   ← SUPPRIMÉ
```

> `PlayerPage.jsx`, `Sheet.jsx`, `usePlayerSession.js`, `useGMSession.js`, `TabCombat.jsx` restent intacts.

---

## 5. Flows de combat — machines d'état

Le flow de combat implique trois acteurs distincts avec leurs propres machines d'état : l'attaquant, le GM, et le défenseur (si opportunité de défense). Ces trois flows sont **indépendants** — l'attaquant n'est pas bloqué en attente du GM ou du défenseur.

---

### 5a. Hook `useAttackFlow` — côté attaquant

```
idle → rolling → targeting → submitting → idle
```

L'attaquant soumet son attaque et récupère immédiatement la main. La validation et la défense sont gérées séparément.

#### Interface

```js
const {
  step,                    // 'idle' | 'rolling' | 'targeting' | 'submitting'
  rollResult,              // objet rollResult après étape roll (null si skippée)
  selectedWeapon,
  setSelectedWeapon,
  startAttack,             // () => void
  handleRollComplete,      // (result) => void — appelé par renderRollStep
  handleTargetConfirm,     // (target, damage) => void — appelé par TargetSelectionModal
  cancel,                  // () => void
} = useAttackFlow({ character, combatant, combatState, attackConfig, fetchWithAuth, apiBase });
```

#### Comportement

1. `startAttack()` → si `attackConfig.renderRollStep` défini : `step = 'rolling'`. Sinon saute à `step = 'targeting'` avec `rollResult = null`.
2. `handleRollComplete(result)` → `rollResult = result`, `step = 'targeting'`.
3. `handleTargetConfirm(target, finalDamage)` :
   - POST `{apiBase}/combat/action` → décrémente `actionsRemaining` générique
   - Appelle `onBurnAction(ctx)` si défini → effets secondaires slug
   - POST `{apiBase}/combat/submit-attack` → attaque en file d'attente GM
   - `step = 'idle'` — l'attaquant a terminé, le GM prend la main

#### Rendu dans `CombatPanel`

```jsx
{flow.step === 'rolling' && attackConfig.renderRollStep({
  character,
  combatant: myCombatant,
  activeStates: myCombatant.activeStates,
  onRollComplete: flow.handleRollComplete,
  onClose: flow.cancel,
})}

{flow.step === 'targeting' && (
  <TargetSelectionModal
    combatState={combatState}
    attacker={myCombatant}
    rollResult={flow.rollResult}
    selectedWeapon={flow.selectedWeapon}
    onWeaponChange={flow.setSelectedWeapon}
    availableWeapons={attackConfig.getWeapons(character)}
    calculateDamage={attackConfig.calculateDamage}
    renderTargetInfo={attackConfig.renderTargetInfo}
    onConfirm={flow.handleTargetConfirm}
    onClose={flow.cancel}
  />
)}
```

---

### 5b. Flow GM — validation des attaques

Le GM voit les attaques en file dans `AttackValidationQueue`. Pour chaque attaque :
- Il peut modifier les dégâts (`allowDamageEdit={true}` dans `TargetSelectionModal`)
- Si `defenseOpportunity` est défini dans le slug et les conditions sont remplies, il peut déclencher une opportunité de défense → le serveur émet `combat-defense-opportunity` vers le joueur ciblé
- Il valide → le **client GM** exécute `onBeforeDamage` → `onDamage` (qui persiste en BDD via la route `characters` du slug), puis PUT `/combat/combatant/:id` avec le `healthData` mis à jour → `combat-update` broadcast
- Il rejette → l'attaque est annulée

Le GM pilote tout. Toutes les attaques (JcJ, JcE, EcJ, EcE) passent par cette validation.

---

### 5c. Hook `useDefenseOpportunity` — côté défenseur

Déclenché uniquement si le GM a activé l'opportunité de défense depuis sa file de validation.

```
idle → defending → submitting → idle
```

```js
const {
  step,                   // 'idle' | 'defending' | 'submitting'
  attackData,             // données de l'attaque entrante
  handleDefenseComplete,  // (defenseResult) => void — appelé par renderDefenseStep
  cancel,                 // () => void — abandon (défense échoue)
} = useDefenseOpportunity({ combatConfig, fetchWithAuth, apiBase, socket });
```

#### Comportement

1. Socket reçoit `combat-defense-opportunity` → `step = 'defending'`, `attackData` rempli
2. Slug rend `combatConfig.attack.defenseOpportunity.renderDefenseStep(props)` → le joueur fait son jet
3. `handleDefenseComplete(defenseResult)` :
   - POST `{apiBase}/combat/defense-response` avec `{ defenseResult, attackId }`
   - `step = 'submitting'` puis `step = 'idle'`
4. Le GM voit le résultat mis à jour dans sa file et applique les dégâts finaux

> Si le défenseur ne répond pas dans le délai configuré par le slug (timeout), `cancel()` est appelé automatiquement — la défense est considérée comme abandonnée.

---

## 6. `CombatPanel.jsx` — Responsabilités

**Ce qu'il fait :**
- `GET /api/:slug/combat` au mount pour charger l'état initial
- Écoute `combat-update` via socket → `setCombatState`
- Affiche le round et le combattant actif
- Instancie `CombatantList` avec `renderHealthDisplay` depuis `combatConfig`
- Itère `combatConfig.actions` → boutons filtrés par `condition(character, combatant, combatState)`
- Bouton "Autre action" présent si `combatConfig.canBurnAction(ctx)` truthy (défaut : `actionsRemaining > 0`)
- Bouton "Attaquer" si `attackConfig.condition` truthy
- Gère `openModal(id)` → instancie le `Modal` de l'action correspondante
- Délègue le flow attaque à `useAttackFlow`

**État inactif (`combatState.active === false`) :**  
Le panneau ne s'affiche pas. `Sheet.jsx` rend `CombatPanel` inconditionnellement — c'est `CombatPanel` qui ne rend rien si le combat est inactif.

**Collapse :**  
Quand le combat est actif, un header cliquable permet de replier le panneau vers le bas. État collapse local (useState), non persisté. Permet au joueur d'accéder au reste de sa fiche sans quitter le combat.

**Props reçues :**
```jsx
<CombatPanel
  character={character}
  combatConfig={vikingsConfig.combat}  // injecté par Sheet.jsx
/>
```

> `Sheet.jsx` importe `vikingsConfig` et passe `vikingsConfig.combat` à `CombatPanel`.  
> `CombatPanel` ne contient aucun import système.

---

## 7. `TargetSelectionModal.jsx` — Responsabilités

- Affiche la liste des cibles (tous sauf l'attaquant)
- Pour chaque cible : appelle `renderTargetInfo(combatant)` pour les stats spécifiques
- Calcule les dégâts suggérés via `calculateDamage(target, weapon, rollResult)`
- Sélection d'arme parmi `availableWeapons`
- Prop `allowDamageEdit` (défaut `false`) — le GM passe `true` depuis `NPCAttackModal`
- Confirme avec `onConfirm(target, finalDamage)`
- Styles via `var(--color-*)` — compatible avec tous les thèmes slug

---

## 8. Gestion des états combattant (`activeStates`)

`activeStates` est un tableau libre : `[{ id: string, name: string, data: {} }]`.

- Le générique ne lit jamais le contenu de `data`.
- Le générique transmet `activeStates` tel quel dans tous les callbacks et props.
- Le slug est seul responsable de la sémantique (Berserk, Posture, KO...).
- `onStateNewRound` permet au slug de nettoyer/transformer les états à chaque round.
- Toutes les conséquences d'un état en jeu (bonus dés, malus, expiration...) sont gérées exclusivement par le slug.

---

## 9. Opportunité de défense

Certains systèmes permettent à la cible de réagir à une attaque entrante avant que les dégâts soient appliqués (esquive WoD, parade Te Deum, bloc Cyberpunk...). D'autres intègrent la défense dans le calcul de l'attaque sans jet séparé (Pure Vikings : le seuil fait office de défense passive).

### Hook `defenseOpportunity` dans `combatConfig.attack`

- `null` (défaut) → pas d'étape de défense, les dégâts s'appliquent directement. Aucun changement au flow existant.
- Objet défini → le générique insère une étape de défense entre "cible confirmée" et "dégâts appliqués".

### Flow avec défense activée

La défense est déclenchée par le GM depuis sa file de validation, pas automatiquement par l'attaquant. Le GM décide au moment de valider si une opportunité de défense est pertinente.

```
[Attaque en file GM]
  → GM décide de déclencher la défense
      → Serveur : emit combat-defense-opportunity → joueur ciblé
      → Défenseur : useDefenseOpportunity → jet de dés → POST /combat/defense-response
      → Serveur : met à jour la pendingAttack avec defenseResult
      → GM voit le résultat, applique onDefenseResult → dégâts finaux → valide
```

### Côté socket

```
// Serveur → joueur ciblé (déclenché par action GM)
combat-defense-opportunity : { attackId, attackData, targetCombatantId }

// Joueur ciblé → serveur
combat-defense-response    : { attackId, defenseResult }
```

### Endpoint supplémentaire

```
POST /combat/defense-response  → { attackId, defenseResult }
     met à jour la pendingAttack correspondante, notifie le GM
POST /combat/trigger-defense   → { attackId }
     déclenché par le GM pour envoyer l'opportunité au défenseur
```

Le timeout (abandon de défense) est configurable dans `defenseOpportunity` du slug. À expiration, la défense est considérée nulle et le GM peut valider avec les dégâts originaux.

### Ce qui reste hors flow automatique (géré par le GM)

Réactions D&D, Hold Cyberpunk RED, interruptions diverses — ce n'est pas orchestré par le générique. Le GM les résout directement depuis son interface, soit via un jet de dés classique, soit via les actions de son panneau GM. C'est le bon niveau de "VTT light" : on automatise le flux naturel de l'application, la table gère le reste.

---

## 10. Route combat générique (backend)

La route combat devient **générique** et est montée dans `routes/combat.js`, au même niveau que `sessions.js` et `journal.js`. Le systemResolver la monte automatiquement sous `/api/:slug/combat` pour chaque slug chargé — la route elle-même ne déclare pas `:slug`, elle reçoit `req.system` et `req.db` via le middleware.

### Endpoints (préfixe `/api/:slug/combat` résolu par le systemResolver)

```
GET    /                 → état courant
POST   /start            → démarre le combat
POST   /next-turn        → tour suivant
POST   /end              → termine le combat
POST   /combatant        → ajoute un combattant (healthData fourni par l'appelant)
PUT    /combatant/:id    → met à jour champs libres (activeStates, healthData...)
DELETE /combatant/:id    → retire un combattant
POST   /action           → décrémente actionsRemaining (champ générique) (appelé par useAttackFlow et bouton "Autre action")
POST   /submit-attack    → ajoute en file pendingAttacks
POST   /validate-attack  → valide une attaque en file
POST   /reject-attack    → rejette une attaque en file
POST   /reorder          → réordonne les combattants (D&D GM)
POST   /sync-states      → { combatants: [...] } — remplace les activeStates en bloc
POST   /trigger-defense  → { attackId } — GM déclenche opportunité de défense vers le défenseur
POST   /defense-response → { attackId, defenseResult } — défenseur soumet son résultat de défense
```

### Flow `onStateNewRound`

Toute la logique de nettoyage/transformation des états au nouveau round reste côté **client**, dans `combatConfig.combat.onStateNewRound`. Cela évite de dupliquer des hooks slug côté serveur.

Flow au `next-turn` :
1. Client : `POST /combat/next-turn`
2. Serveur : incrémente round/currentTurnIndex, broadcast `combat-update`
3. Client reçoit `combat-update` → applique `onStateNewRound(combatants)` → liste transformée
4. Client : `POST /combat/sync-states` avec la liste complète des combattants modifiés
5. Serveur : remplace les activeStates en mémoire, broadcast `combat-update` final

Un seul aller-retour supplémentaire, la source de vérité reste le serveur.

### Ce que la route générique ne fait PAS

- Elle ne touche pas à la BDD personnage. `healthData` est stocké dans le combatState en mémoire uniquement.
- La persistance BDD est déclenchée côté **client** via le callback `onDamage` du slug (qui appelle la route `characters` du slug).
- La construction du `healthData` initial est faite côté **client** par le slug avant le POST `/combatant`.

> Ce découplage est intentionnel : la route générique ne dépend d'aucune structure BDD slug.

### Isolation par slug

Le `combatState.js` expose un Map keyed par slug : `combatStates.get(slug)`. La route générique récupère l'instance via `req.system.slug`. Dans les faits l'app sera utilisée par une table à la fois, mais l'isolation est triviale à mettre en place et évite tout bug de cross-contamination entre slugs.

### `combatState.js` — changement structurel

Les champs plats actuels migrent pour Vikings :
- `armure`, `seuil`, `postureDefensive`, `tokensBlessure` → **`healthData`** (opaque)
- `actionsRemaining`, `actionsMax` → restent **champs génériques** de premier niveau

La structure générique d'un combattant est celle listée en section 2.

---

## 11. Partie GM — NPCs (périmètre réduit)

L'objectif est de rendre la **gestion des NPCs générique** : formulaire et affichage des données propres au JDR sont injectés par le slug.

### Ce qui devient générique côté GM

- `AddNPCModal.jsx` → formulaire de base (nom, initiative, actions) + slot `renderNPCForm(formData, onChange)` injecté par le slug pour les champs spécifiques (armure, seuil, attaques...)
- `CombatantCard.jsx` → affichage générique (nom, tour actif, actions restantes) + `renderHealthDisplay` + `renderNPCStats` injectés par le slug

### Ce qui reste hors scope Phase 3

- `NPCAttackModal.jsx` → adapté pour utiliser le `healthData` opaque mais logique inchangée
- Drag & drop dans `TabCombat.jsx` → inchangé

---

## 12. Ce qui NE change PAS

| Fichier | Raison |
|---|---|
| `PlayerPage.jsx` | Orchestrateur générique, déjà propre |
| `Sheet.jsx` | Une ligne : passe `combatConfig` à `CombatPanel` |
| `usePlayerSession.js` | Hors scope |
| `useGMSession.js` | Hors scope |
| `TabCombat.jsx` | Hors scope (D&D, logique GM intacte) |
| `DiceModal.jsx` | Inchangé, injecté via `renderRollStep` |
| `PostureModal.jsx` | Minimal refacto : interface contractuelle |
| BDD | Aucune migration nécessaire |

---

## 13. Plan d'implémentation (Phase 3)

| Ordre | Fichier | Nature | Risque |
|---|---|---|---|
| 1 | `src/client/src/hooks/useAttackFlow.js` | Création | Nul |
| 1b | `src/client/src/hooks/useDefenseOpportunity.js` | Création | Nul |
| 2 | `src/client/src/components/combat/TargetSelectionModal.jsx` | Refacto générique | Faible |
| 3 | `src/client/src/components/combat/CombatantRow.jsx` | Création | Nul |
| 4 | `src/client/src/components/combat/CombatantList.jsx` | Création | Nul |
| 5 | `src/client/src/components/combat/CombatPanel.jsx` | Création | Nul |
| 6 | `src/server/routes/combat.js` | Création depuis vikings/routes/combat.js | Moyen |
| 7 | `src/server/utils/combatState.js` | Refacto `healthData` opaque | Moyen |
| 8 | `src/client/src/systems/vikings/config.jsx` | Ajout bloc `combat:{}` | Faible |
| 9 | `src/client/src/systems/vikings/Combat.jsx` | Suppression | — |
| 10 | `src/client/src/systems/vikings/Sheet.jsx` | Passe `combatConfig` à `CombatPanel` | Faible |

> Étapes 1–5 : création pure, zéro risque de régression.  
> Étapes 6–7 : backend, tester immédiatement après chacune.  
> Étapes 8–10 : à faire ensemble et tester en bloc.

### Limitations connues (hors scope Phase 3)

- **Actions hors tour** (réactions D&D, Hold Cyberpunk...) → gérées manuellement par le GM, pas orchestrées par le générique.
- **OpenD6 et dérivés** (SWD6, Tecumah, Elder Scrolls) → `actionsMax: 0` masque les boutons génériques, modèle d'actions déclaratif géré intégralement dans `turnData` + UI slug dédiée.