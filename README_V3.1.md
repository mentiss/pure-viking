# PURE VIKINGS V3.1 - CORRECTIONS APPLIQUÉES

## ✅ CORRECTIONS DÉJÀ FAITES

### 1. ✅ Fils/Fille Automatique
**Fichier** : `src/utils.js` ligne 122
**Change** : `character.sexe === 'homme' ? 'fils' : 'fille'` (au lieu de typeParent)
**Résultat** : Le nom affiche automatiquement "fils de" ou "fille de" selon le sexe

### 2. ✅ Données Complètes Intégrées
**Fichier** : `src/data.js` (remplacé par data-COMPLETE.js)
**Contenu** :
- ✅ **35 compétences** avec descriptions complètes
- ✅ **60+ traits/backgrounds** avec descriptions, effets, prérequis, incompatibilités
- ✅ **24 runes** du Futhark avec traduction littérale + sens ésotérique

### 3. ✅ Malus Fatigue Corrigé
**Fichier** : `src/utils.js` ligne 45
**Code** : Seul index 0 gratuit, 1=+1, 2-3=+2, etc.

## ⚠️ CORRECTIONS À APPLIQUER MANUELLEMENT

Les corrections suivantes nécessitent des modifications dans plusieurs fichiers. Voici le guide :

### 4. Dark Mode
**Fichier** : `src/App.jsx` ligne ~169
**Problème** : `setDarkMode is not a function`
**Solution** : Vérifier que ThemeToggle reçoit bien `onToggle={toggleDarkMode}`
```jsx
<ThemeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
```

### 5. Token Fatigue Visual
**Fichier** : `src/components/CharacterSheet.jsx` ligne ~330
**Problème** : Index 0 ET 1 affichés en pointillés
**Solution** : Ne mettre `border-dashed` QUE sur index 0
```jsx
// Ligne ~330-340 dans le map des tokens fatigue
{[0,1,2,4,6,8].map(i => (
  <div 
    key={i} 
    onClick={() => toggleToken('fatigue',i)} 
    className={`w-6 h-6 rounded border-2 cursor-pointer transition-all ${
      i < character.tokensFatigue 
        ? 'bg-viking-leather border-viking-leather' 
        : i === 0 
          ? 'border-dashed border-viking-leather dark:border-viking-bronze'  // DASHED UNIQUEMENT SUR 0
          : 'border-viking-leather dark:border-viking-bronze hover:border-viking-leather'
    } ${i === 8 ? 'border-amber-800' : ''}`} 
    title={i === 0 ? 'Gratuit' : i === 8 ? 'Épuisé' : ''} 
  />
))}
```

### 6. Nouvelle Compétence = 3 SAGA
**Fichier** : `src/components/EvolutionModal.jsx` ligne ~10
**Problème** : `newSkill: 1`
**Solution** : Changer en `newSkill: 3`
```javascript
const costs = {
    carac: 2,
    skill: 1,
    newSkill: 3,  // CHANGER ICI
    trait: 4,
    rune: 2,
    newRune: 3
};
```

### 7. Bouton Copier URL
**Fichier** : `src/App.jsx` ou `src/components/CharacterSheet.jsx`
**Ajouter** : Dans le header, après le code d'accès
```jsx
{character && character.accessUrl && (
  <button 
    onClick={() => {
      const url = `${window.location.origin}/${character.accessUrl}`;
      navigator.clipboard.writeText(url);
      alert('✅ URL copiée : ' + url);
    }}
    className="px-3 py-1 bg-viking-bronze hover:bg-viking-leather text-viking-brown rounded text-xs font-semibold transition-colors"
  >
    📋 Copier lien
  </button>
)}
```

### 8. Accès Direct par URL
**Fichier Backend** : `src/server/server.js` ligne ~50 (avant le fallback `app.get('*')`)
```javascript
// Route pour accès direct par URL de personnage
app.get('/:url', (req, res, next) => {
  // Si c'est une route API ou fichier statique, passer au suivant
  if (req.params.url.startsWith('api') || 
      req.params.url.startsWith('src') ||
      req.params.url.includes('.')) {
    return next();
  }
  
  // Sinon, servir le SPA (index.html gérera la redirection)
  res.sendFile(path.join(__dirname, '../../index.html'));
});
```

**Fichier Frontend** : `src/App.jsx` dans `useEffect` au chargement
```javascript
useEffect(() => {
  const urlPath = window.location.pathname.substring(1); // Enlever le /
  
  if (urlPath && urlPath !== '' && !urlPath.startsWith('api')) {
    // Tenter de charger le personnage par URL
    fetch(`/api/characters/by-url/${urlPath}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not found');
      })
      .then(data => {
        setCharacter(data);
        setCharacterId(data.id);
        localStorage.setItem('currentCharacterId', data.id);
        setMode('sheet');
        // Nettoyer l'URL pour éviter confusion
        window.history.replaceState({}, '', '/');
      })
      .catch(() => {
        // URL invalide, charger normalement
        loadCharacterFromBackend();
      });
  } else {
    loadCharacterFromBackend();
  }
  
  // ... reste du code thème ...
}, []);
```

### 9. Code Éditable
**Fichier** : `src/components/CharacterSheet.jsx` dans la section Info Générale (mode édition)
**Ajouter** : Input pour modifier le code
```jsx
{editMode && (
  <div className="mt-2 pt-2 border-t border-viking-leather dark:border-viking-bronze">
    <label className="text-xs text-viking-leather dark:text-viking-bronze">Code d'accès</label>
    <input 
      value={editableChar.accessCode || ''} 
      onChange={e => setEditableChar({...editableChar, accessCode: e.target.value.toUpperCase()})}
      placeholder="ABC123"
      maxLength={6}
      className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment mt-1"
    />
    <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
      Plusieurs persos peuvent avoir le même code (groupe)
    </div>
  </div>
)}
```

**Validation Backend** : `src/server/routes/characters.js` dans PUT
```javascript
// Vérifier que l'URL reste unique (mais code peut être dupliqué)
if (req.body.accessUrl) {
  const existingUrl = db.prepare(
    'SELECT id FROM characters WHERE access_url = ? AND id != ?'
  ).get(req.body.accessUrl, req.params.id);
  
  if (existingUrl) {
    return res.status(400).json({ error: 'Cette URL est déjà utilisée par un autre personnage' });
  }
}
```

### 10. Code Custom à la Création
**Fichier** : `src/components/CharacterCreation.jsx`
**Ajouter** : Input pour code personnalisé (optionnel)
```jsx
// Dans le state
const [customCode, setCustomCode] = useState('');

// Dans le formulaire (avant le bouton Créer)
<div className="space-y-2">
  <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment">
    Code d'accès personnalisé (optionnel)
  </label>
  <input 
    value={customCode}
    onChange={e => setCustomCode(e.target.value.toUpperCase().substring(0, 6))}
    placeholder="Laisser vide pour génération auto"
    maxLength={6}
    className="w-full px-3 py-2 border-2 border-viking-leather dark:border-viking-bronze rounded-lg bg-white dark:bg-gray-800 text-viking-text dark:text-viking-parchment"
  />
  <div className="text-xs text-viking-leather dark:text-viking-bronze">
    6 caractères max. Plusieurs persos peuvent partager le même code (utile pour groupes).
  </div>
</div>

// Dans onComplete, passer le code custom
const characterToSave = {
  ...finalChar,
  ...(customCode && { accessCode: customCode })
};
onComplete(characterToSave);
```

**Backend** : `src/server/routes/characters.js` dans POST
```javascript
// Si code fourni, l'utiliser, sinon générer
const { code, url } = req.body.accessCode 
  ? { code: req.body.accessCode.toUpperCase(), url: generateAccessUrl() }
  : ensureUniqueCode('character');

// Vérifier unicité URL (pas code)
let finalUrl = url;
while (db.prepare('SELECT id FROM characters WHERE access_url = ?').get(finalUrl)) {
  finalUrl = generateAccessUrl(); // Régénérer jusqu'à unicité
}
```

### 11. Menu Sélection Personnages
**Fichier** : `src/App.jsx` + nouveau composant `CharacterListModal.jsx`

**Dans App.jsx** : Ajouter bouton dans header
```jsx
{mode === 'sheet' && (
  <button 
    onClick={() => setShowCharacterList(true)} 
    className="px-4 py-2 bg-viking-leather hover:bg-viking-bronze text-viking-parchment rounded font-semibold text-sm"
  >
    🗂️ Changer de personnage
  </button>
)}
```

**Nouveau fichier** : `src/components/CharacterListModal.jsx`
```jsx
const CharacterListModal = ({ currentCharId, onClose, onSelect }) => {
  const { useState, useEffect } = React;
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/characters')
      .then(res => res.json())
      .then(data => {
        setCharacters(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading characters:', err);
        setLoading(false);
      });
  }, []);
  
  const handleSelect = async (id) => {
    try {
      const res = await fetch(`/api/characters/${id}`);
      const data = await res.json();
      onSelect(data);
    } catch (err) {
      console.error('Error loading character:', err);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown">
          <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">Choisir un personnage</h3>
          <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-viking-text dark:text-viking-parchment">Chargement...</div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8 text-viking-text dark:text-viking-parchment">Aucun personnage trouvé</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {characters.map(char => (
                <button
                  key={char.id}
                  onClick={() => handleSelect(char.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    char.id === currentCharId
                      ? 'bg-viking-bronze border-viking-leather text-viking-brown'
                      : 'bg-viking-parchment dark:bg-gray-800 border-viking-leather dark:border-viking-bronze text-viking-text dark:text-viking-parchment hover:border-viking-bronze'
                  }`}
                >
                  <div className="font-bold text-lg">{char.name}</div>
                  <div className="text-sm opacity-75 mt-1">
                    Code: <span className="font-mono font-bold">{char.accessCode}</span>
                  </div>
                  {char.id === currentCharId && (
                    <div className="text-xs mt-2 text-viking-success">✓ Personnage actuel</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

## 📊 RÉSUMÉ DES CHANGEMENTS

### ✅ Appliqué Automatiquement
- Fils/fille selon sexe
- Données complètes (35 compétences, 60 traits, 24 runes)
- Malus fatigue (déjà correct dans utils.js)

### ⚠️ À Appliquer Manuellement
1. Dark mode (1 ligne App.jsx)
2. Token fatigue visuel (1 section CharacterSheet.jsx)
3. newSkill cost (1 ligne EvolutionModal.jsx)
4. Bouton copier URL (ajout App.jsx)
5. Accès direct URL (backend + frontend)
6. Code éditable (CharacterSheet.jsx + backend)
7. Code custom création (CharacterCreation.jsx + backend)
8. Menu sélection persos (nouveau composant)

## 🚀 INSTALLATION

```bash
# 1. Extraire le ZIP
cd pure-vikings-v3.1

# 2. Appliquer les corrections manuelles ci-dessus

# 3. Installer dépendances
npm install

# 4. Initialiser DB
npm run init-db

# 5. Lancer
npm run dev
```

## 📝 FICHIERS MODIFIÉS
- ✅ `src/data.js` (remplacé par version complète)
- ✅ `src/utils.js` (fils/fille corrigé)
- ⚠️ `src/App.jsx` (dark mode + URL + menu)
- ⚠️ `src/components/CharacterSheet.jsx` (tokens + copier + code éditable)
- ⚠️ `src/components/EvolutionModal.jsx` (newSkill cost)
- ⚠️ `src/components/CharacterCreation.jsx` (code custom)
- ⚠️ `src/server/server.js` (route URL)
- ⚠️ `src/server/routes/characters.js` (validation)
- ⚠️ **NOUVEAU** `src/components/CharacterListModal.jsx`
