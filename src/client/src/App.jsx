// App.js - Application principale (AVEC BACKEND)
import React, {useState, useEffect} from "react";
import {formatFullName} from "./tools/utils";
import ThemeToggle from "./components/shared/ThemeToggle.jsx";
import CharacterCreation from "./components/CharacterCreation";
import CharacterSheet from "./components/CharacterSheet";
import DiceModal from "./components/DiceModal";
import RunesTab from "./components/RunesTab";
import InventoryTab from "./components/InventoryTab";
import CharacterListModal from "./components/CharacterListModal";
import ToastNotifications from "./components/shared/ToastNotifications.jsx";
import CombatPanel from "./components/CombatPanel";
import HistoryPanel from "./components/shared/HistoryPanel.jsx";
import {useSocket} from "./context/SocketContext.jsx";
import {useAuth} from "./context/AuthContext.jsx";
import {useFetch} from "./hooks/useFetch.js";
import CodeModal from "./components/CodeModal.jsx";
import {useSession} from "./context/SessionContext.jsx";
import SessionPlayersBar from "./components/SessionPlayersBar.jsx";
import JournalTab from "./components/JournalTab.jsx";
import DiceConfigModal from "./components/shared/DiceConfigModal.jsx";

const App = ({ darkMode, onToggleDarkMode }) => {
    const { user, loading: authLoading, logout } = useAuth();
    const fetchWithAuth = useFetch();

    const [character, setCharacter] = useState(null);
    const [characterId, setCharacterId] = useState(null);
    const [mode, setMode] = useState('welcome'); // 'welcome', 'creation', 'sheet', 'loading'
    const [activeTab, setActiveTab] = useState('fiche');
    const [diceContext, setDiceContext] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCharacterList, setShowCharacterList] = useState(false);
    const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [showCharMenu, setShowCharMenu] = useState(false);
    const [selectedCharForCode, setSelectedCharForCode] = useState(null);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [error, setError] = useState(null);
    const {activeGMSession, updateCharacterSessions} = useSession();
    const [activeSessionName, setActiveSessionName] = useState('');
    const [showDiceConfig, setShowDiceConfig] = useState(false);
    
    // Titres en runes qui tournent
    const runesTitles = ['ᛟᛞᛁᚾ', 'ᚢᛁᚲᛁᛜ', 'ᛃᚨᚱᛚ', 'ᚢᛟᛚᚢᚨ', 'ᛊᚲᚨᛚᛞ', 'ᛈᚢᚱᛖ'];
    const [runeTitle] = useState(() => runesTitles[Math.floor(Math.random() * runesTitles.length)]);

    const [journalUnread, setJournalUnread] = useState(0);

    // Socket globale unique
    const socket = useSocket();

    useEffect(() => {
        if (!character || character.id === -1) return;

        const loadCharacterSessions = async () => {
            try {
                const response = await fetchWithAuth(`/api/characters/${character.id}/sessions`);
                const sessions = await response.json();

                console.log('[App] Character sessions:', sessions);
                updateCharacterSessions(sessions);

            } catch (error) {
                console.error('[App] Error loading character sessions:', error);
            }
        };

        loadCharacterSessions();
    }, [character?.id]);

    useEffect(() => {
        let isCancel = false;
        if (authLoading) return;

        // Vérifier si on accède via URL directe (ex: /brave-warrior-1234)
        const urlPath = window.location.pathname.substring(1); // Enlever le /

        if (urlPath && urlPath !== '' && !urlPath.startsWith('api') && !urlPath.startsWith('src')) {
            if(user && user.character.accessUrl === urlPath && !isCancel) {
                console.log("User connected and path is correct for current character");
                console.log(user);
                setCharacter(user.character);
                setCharacterId(user.character.id);
                setMode('sheet');
            } else {
                console.log("User not connected and path exists");
                // Tenter de charger le personnage par URL
                fetch(`/api/characters/by-url/${urlPath}`)
                    .then(res => res.ok ? res.json() : Promise.reject('Not found'))
                    .then(data => {
                        if(!isCancel) {
                            setSelectedCharForCode(data);
                            setShowCodeModal(true);
                        } else if(!isCancel) {
                            setMode('welcome');
                            window.history.pushState({}, '', '/');
                        }
                    })
                    .catch(() => {
                        if(!isCancel) setMode('welcome');
                    });
            }
        } else if(user) {
            console.log("User connected and no path");
            if(!isCancel) {
                setCharacter(user.character);
                setCharacterId(user.character.id);
                setMode('sheet');
                window.history.pushState({}, '', `/${user.character.accessUrl}`);
                console.log('Set mod to sheet for connected user with character '+user.character.id);
            }
        } else {
            console.log('Not connected and no path');
            setMode('welcome');
        }

        // Restaurer onglet depuis hash (#inventaire, #runes, etc.)
        const hash = window.location.hash.substring(1); // Enlever le #
        if (hash && ['fiche', 'dice', 'runes', 'inventaire', 'historique', 'journal'].includes(hash)) {
            setActiveTab(hash);
        } else if(mode === 'sheet') {
            setActiveTab('fiche');
        }

        return () => {
            isCancel = true;
        }
    }, [user, authLoading]);

    // Émettre character-loaded quand fiche chargée
    useEffect(() => {
        if (socket && character && mode === 'sheet') {
            console.log('[App] Emitting character-loaded for:', character.id);
            console.log(character);
            socket.emit('character-loaded', {
                characterId: character.id,
                name: `${character.prenom}${character.surnom ? ' "' + character.surnom + '"' : ''}`,
                playerName: character.playerName,
                agilite: character.agilite || 1,
                actionsMax: character.actionsDisponibles || 1
            });
        }

        return () => {
            if(socket && character?.id) {
                socket.emit('character-left', character.id);
            }
        }
    }, [socket, character?.id, mode]);
    
    // Écouter updates depuis serveur
    useEffect(() => {
        if (!socket) return;

        const onSocketCharacterUpdate = (data) => {
            console.log('[Socket] Update reçu pour ID:', data.characterId);

            // On vérifie que l'ID correspond bien (attention au type string/number)
            setCharacter(currentChar => {
                if (currentChar && String(data.characterId) === String(currentChar.id)) {
                    console.log('[React] Mise à jour de l\'état local avec:', data.updates);

                    // On crée une NOUVELLE référence d'objet pour forcer le refresh
                    return {
                        ...currentChar,
                        ...data.updates
                    };
                }
                return currentChar;
            });
        };
        socket.on('character-update', onSocketCharacterUpdate);
        const handleGMItemReceived = async (data) => {
            console.log('App.jsx handling item received:', data);
            if (data.characterId === characterId) {
                // Recharger le character complet pour avoir l'inventaire à jour
                try {
                    const response = await fetchWithAuth(`/api/characters/${characterId}`);
                    if (response.ok) {
                        const updated = await response.json();
                        setCharacter(updated);
                    }
                } catch (err) {
                    console.error('Error reloading character after item received:', err);
                }
                // Aussi incrémenter le badge journal (car un gm_item crée aussi une entrée journal)
                if (activeTab !== 'journal') {
                    setJournalUnread(prev => prev + 1);
                }
            }
        };
        socket.on('gm-item-received', handleGMItemReceived);

        const handleGMMessageForBadge = (data) => {
            if (data.characterId === characterId && activeTab !== 'journal') {
                setJournalUnread(prev => prev + 1);
            }
        };
        socket.on('gm-message-received', handleGMMessageForBadge);

        return () => {
            socket.off('character-update', onSocketCharacterUpdate);
            socket.off('gm-item-received', handleGMItemReceived);
            socket.off('gm-message-received', handleGMMessageForBadge);
        };
    }, [socket, characterId]);

    useEffect(() => {
        if (!activeGMSession) {
            setActiveSessionName('');
            return;
        }

        const loadSessionName = async () => {
            try {
                const response = await fetchWithAuth(`/api/sessions/${activeGMSession}`);
                const session = await response.json();
                setActiveSessionName(session.name);
            } catch (error) {
                console.error('Error loading session name:', error);
            }
        };

        loadSessionName();
    }, [activeGMSession]);

    const loadCharacterFromBackend = async () => {
        try {
            setMode('loading');
            
            // Essayer de récupérer l'ID depuis localStorage
            const savedId = localStorage.getItem('currentCharacterId');
            
            if (savedId && savedId != -1) {
                const response = await fetchWithAuth(`/api/characters/${savedId}`);
                if (response.ok) {
                    const data = await response.json();
                    setCharacter(data);
                    setCharacterId(data.id);
                    setMode('sheet');
                    return;
                }
            }
            
            // Pas d'ID sauvegardé, vérifier s'il existe des personnages
            // const response = await fetch('/api/characters');
            // if (response.ok) {
            //     const characters = await response.json();
            //     if (characters.length > 0) {
            //         // Charger le plus récent
            //         const latest = characters[0];
            //         if(latest.id != -1) {
            //             const detailResponse = await fetch(`/api/characters/${latest.id}`);
            //             const data = await detailResponse.json();
            //             setCharacter(data);
            //             setCharacterId(data.id);
            //             localStorage.setItem('currentCharacterId', data.id);
            //             setMode('sheet');
            //             return;
            //         }
            //     }
            // }
            
            // Aucun personnage, mode welcome
            setMode('welcome');
        } catch (err) {
            console.error('Error loading character:', err);
            setError('Erreur de connexion au serveur. Vérifiez que le serveur est démarré (npm run dev).');
            setMode('welcome');
        }
    };

    const handleCreateNew = () => {
        setCharacter(null);
        setCharacterId(null);
        setMode('creation');
    };

    const handleLoadExisting = async () => {
        await loadCharacterFromBackend();
    };

    const handleCreationComplete = async (newCharacter) => {
        try {
            // Appliquer les effets des traits
            let finalChar = {...newCharacter};
            
            newCharacter.traits.forEach(trait => {
                const traitData = TRAITS.find(t => t.name === trait.name);
                if (traitData?.effects) {
                    if (traitData.effects.actions) finalChar.actionsDisponibles += traitData.effects.actions;
                    if (traitData.effects.armure) finalChar.armure += traitData.effects.armure;
                    if (traitData.effects.seuil) finalChar.seuilCombat += traitData.effects.seuil;
                }
            });
            
            // Sauvegarder dans le backend
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalChar)
            });
            
            if (response.ok) {
                const saved = await response.json();
                setCharacter(saved);
                setCharacterId(saved.id);
                localStorage.setItem('currentCharacterId', saved.id);
                setMode('sheet');
            } else {
                throw new Error('Failed to save character');
            }
        } catch (err) {
            console.error('Error creating character:', err);
            setError('Erreur lors de la sauvegarde du personnage');
        }
    };

    const handleCharacterUpdate = async (updatedCharacter) => {
        setCharacter(updatedCharacter);
        
        // Sauvegarder dans le backend
        if (characterId) {
            try {
                await fetchWithAuth(`/api/characters/${characterId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedCharacter)
                });
                
                // Si combat actif, sync blessure/fatigue vers état combat
                try {
                    const combatRes = await fetch('/api/combat');
                    const combatState = await combatRes.json();
                    
                    if (combatState.active) {
                        // Trouver ce joueur dans combat
                        const myCombatant = combatState.combatants.find(c => 
                            c.type === 'player' && c.characterId === characterId
                        );
                        
                        if (myCombatant) {
                            // Update combat state avec nouvelles valeurs
                            await fetchWithAuth(`/api/combat/combatant/${myCombatant.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    updates: {
                                        blessure: updatedCharacter.tokensBlessure,
                                        fatigue: updatedCharacter.tokensFatigue,
                                        armure: updatedCharacter.armure,
                                        seuil: updatedCharacter.seuil
                                    }
                                })
                            });
                        }
                    }
                } catch (err) {
                    // Pas de combat actif, ignore
                }
            } catch (err) {
                console.error('Error updating character:', err);
            }
        }
    };

    const handleDelete = async () => {
        if (characterId) {
            try {
                await fetch(`/api/characters/${characterId}`, {
                    method: 'DELETE'
                });
            } catch (err) {
                console.error('Error deleting character:', err);
            }
        }
        
        localStorage.removeItem('currentCharacterId');
        setCharacter(null);
        setCharacterId(null);
        setShowDeleteModal(false);
        setMode('welcome');
    };

    const handleChangeTab = (tab, context = null) => {
        if (tab === 'historique') {
            setHistoryPanelOpen(true);
            return;
        }
        if (tab === 'journal') setJournalUnread(0);
        setActiveTab(tab);
        
        // Mettre à jour hash URL
        window.location.hash = tab;
        
        if (context) {
            setDiceContext(context);
        }
    };


    return (
        <div className="min-h-screen bg-viking-parchment dark:bg-gray-900 transition-colors">
            {/* Header */}
            <header className="bg-viking-brown dark:bg-gray-800 text-viking-parchment p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3 font-viking">
                        <span className="text-3xl font-bold tracking-wider text-viking-parchment">
                            {runeTitle}
                        </span>
                        {character && <span className="text-lg font-normal opacity-75">— {formatFullName(character)}</span>}
                    </div>
                    <div className="flex gap-2 items-center">
                        {character && character.accessCode && (
                            <div className="text-xs bg-viking-bronze px-3 py-1 rounded text-viking-brown font-mono font-bold">
                                Code: {character.accessCode}
                            </div>
                        )}
                        {character && character.accessUrl && (
                            <button 
                                onClick={() => {
                                    const url = `${window.location.origin}/${character.accessUrl}`;
                                    navigator.clipboard.writeText(url);
                                    setLinkCopied(true);
                                    setTimeout(() => setLinkCopied(false), 2000);
                                }}
                                className="px-3 py-1 bg-viking-bronze hover:bg-viking-leather text-viking-brown rounded text-xs font-semibold transition-colors"
                            >
                                {linkCopied ? '✅ Copié !' : '📋 Copier lien'}
                            </button>
                        )}
                        <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
                        {mode === 'sheet' && (
                            <div className="relative">
                                <button 
                                    onClick={() => setShowCharMenu(!showCharMenu)}
                                    className="px-3 py-2 bg-viking-leather hover:bg-viking-bronze text-viking-parchment rounded font-semibold text-lg transition-colors"
                                    title="Menu personnage"
                                >
                                    ⋮
                                </button>
                                
                                {showCharMenu && (
                                    <>
                                        {/* Overlay pour fermer */}
                                        <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setShowCharMenu(false)}
                                        />
                                        
                                        {/* Menu dropdown */}
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-viking-bronze z-20">
                                            <button 
                                                onClick={() => {
                                                    setShowCharMenu(false);
                                                    handleCreateNew();
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-viking-bronze/20 flex items-center gap-2 text-viking-brown dark:text-viking-parchment text-sm transition-colors rounded-t-lg"
                                            >
                                                ➕ Nouveau personnage
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setShowCharMenu(false);
                                                    setShowCharacterList(true);
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-viking-bronze/20 flex items-center gap-2 text-viking-brown dark:text-viking-parchment text-sm transition-colors"
                                            >
                                                🗂️ Changer de personnage
                                            </button>
                                            <div className="border-t border-viking-leather dark:border-viking-bronze" />
                                            <a 
                                                href="/mj"
                                                onClick={() => setShowCharMenu(false)}
                                                className="block w-full px-3 py-2 text-left hover:bg-viking-bronze/20 text-viking-bronze text-sm transition-colors"
                                            >
                                                ⚔️ Vue Maître du Jeu
                                            </a>
                                            <div className="border-t border-viking-leather dark:border-viking-bronze" />
                                            <button
                                                className="w-full px-3 py-2 text-left hover:bg-viking-bronze/20 flex items-center gap-2 text-viking-brown dark:text-viking-parchment text-sm transition-colors"
                                                onClick={() => setShowDiceConfig(true)}
                                            >🎲 Mes dés
                                            </button>
                                            <div className="border-t border-viking-leather dark:border-viking-bronze" />
                                            <button 
                                                onClick={() => {
                                                    setShowCharMenu(false);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 text-viking-danger text-sm transition-colors rounded-b-lg"
                                            >
                                                🗑️ Supprimer personnage
                                            </button>
                                            <div className="border-t border-viking-leather dark:border-viking-bronze" />
                                            <button
                                                onClick={async () => {
                                                    await logout();
                                                    setCharacter(null);
                                                    setCharacterId(null);
                                                    setMode('welcome');
                                                    window.history.pushState({}, '', '/');
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 text-sm transition-colors rounded-b-lg"
                                            >
                                                🚪 Déconnexion
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Tabs (si fiche) */}
            {mode === 'sheet' && (
                <nav className="bg-white dark:bg-gray-800 border-b border-viking-leather dark:border-viking-bronze">
                    <div className="max-w-7xl mx-auto flex gap-1 p-2">
                        {['fiche', 'dice', 'runes', 'inventaire', 'journal', 'historique'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleChangeTab(tab)}
                                className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                                    activeTab === tab
                                        ? 'bg-viking-bronze text-viking-brown'
                                        : 'bg-viking-parchment dark:bg-gray-700 text-viking-text dark:text-viking-parchment hover:bg-viking-bronze/30'
                                }`}
                            >
                                {tab === 'fiche' && '📋 Ma Fiche'}
                                {tab === 'dice' && '🎲 Lanceur de dés'}
                                {tab === 'runes' && '🔮 Runes'}
                                {tab === 'inventaire' && '🎒 Inventaire'}
                                {tab === 'journal' && <>📓 Journal{journalUnread > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-viking-bronze text-viking-brown rounded-full font-bold">
                                        {journalUnread}
                                    </span>
                                )}</>}
                                {tab === 'historique' && '📜 Historique' }
                            </button>
                        ))}
                    </div>
                </nav>
            )}

            {/* Content */}
            <div className="flex">
                {mode === 'sheet' && activeGMSession && (
                    <SessionPlayersBar
                        character={character}
                        sessionId={activeGMSession}
                        sessionName={activeSessionName}
                    />
                )}
                <div className="flex-1 mx-auto p-4">
                    {/* Barre des personnages de la session */}

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg text-red-600 dark:text-red-400">
                            {error}
                            <button onClick={() => setError(null)} className="ml-2 underline">Fermer</button>
                        </div>
                    )}

                    {mode === 'loading' && (
                        <div className="text-center p-8">
                            <div className="text-2xl mb-4">⚔️</div>
                            <div className="text-lg text-viking-text dark:text-viking-parchment">Chargement...</div>
                        </div>
                    )}

                    {mode === 'welcome' && (
                        <div className="max-w-2xl mx-auto mt-12">
                            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-xl p-8 border-4 border-viking-bronze">
                                <h2 className="text-3xl font-viking font-bold text-viking-brown dark:text-viking-parchment mb-6 text-center">
                                    Bienvenue, Guerrier !
                                </h2>
                                <div className="space-y-4">
                                    <button
                                        onClick={handleCreateNew}
                                        className="w-full px-6 py-4 bg-viking-bronze hover:bg-viking-leather text-viking-brown rounded-lg font-semibold text-lg transition-colors shadow-lg"
                                    >
                                        ⚔️ Créer un nouveau personnage
                                    </button>
                                    <button
                                        onClick={() => setShowCharacterList(true)}
                                        className="w-full px-6 py-4 bg-viking-parchment dark:bg-gray-800 hover:bg-viking-bronze/30 text-viking-text dark:text-viking-parchment rounded-lg font-semibold text-lg transition-colors"
                                    >
                                        📋 Se connecter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'creation' && (
                        <CharacterCreation onComplete={handleCreationComplete} />
                    )}

                    {mode === 'sheet' && character && (
                        <>
                            {activeTab === 'fiche' && <CharacterSheet character={character} onUpdate={handleCharacterUpdate} onChangeTab={handleChangeTab} />}
                            {activeTab === 'dice' && <DiceModal character={character} isBerserk={false} context={diceContext} onClose={() => handleChangeTab('fiche')} onUpdate={handleCharacterUpdate} sessionId={activeGMSession} />}
                            {activeTab === 'runes' && <RunesTab character={character} onUpdate={handleCharacterUpdate} />}
                            {activeTab === 'inventaire' && <InventoryTab character={character} onUpdate={handleCharacterUpdate} />}
                            {activeTab === 'historique' && <div className="text-center p-8 text-viking-text dark:text-viking-parchment">Historique à venir...</div>}
                            {activeTab === 'journal' && character && <JournalTab characterId={characterId} />}
                        </>
                    )}


                </div>

            </div>

            {/* Modal Suppression */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-red-600 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-4">
                            ⚠️ Supprimer le personnage ?
                        </h3>
                        <p className="text-viking-text dark:text-viking-parchment mb-6">
                            Cette action est irréversible. {formatFullName(character)} sera définitivement supprimé.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Liste Personnages */}
            {showCharacterList && (
                <CharacterListModal 
                    currentCharId={characterId || 0}
                    onClose={() => setShowCharacterList(false)}
                    onSelect={(char) => {
                        setSelectedCharForCode(char);
                        setShowCodeModal(true);
                        setShowCharacterList(false);
                    }}
                />
            )}
            
            {/* Bouton flottant historique (si perso chargé) */}
            {mode === 'sheet' && (
                <button
                    onClick={() => setHistoryPanelOpen(true)}
                    className="fixed bottom-2 right-1 w-10 h-10 bg-viking-bronze text-viking-brown rounded-full shadow-lg hover:bg-viking-leather transition-all z-30 flex items-center justify-center text-lg border-2 border-viking-leather"
                    title="Historique des jets"
                >
                    📜
                </button>
            )}
            
            {/* Toast Notifications */}
            <ToastNotifications onViewHistory={() => setHistoryPanelOpen(true)} sessionId={activeGMSession} />
            
            {/* History Panel */}
            <HistoryPanel isOpen={historyPanelOpen} onClose={() => setHistoryPanelOpen(false)} sessionId={activeGMSession} />

            {showDiceConfig && <DiceConfigModal onClose={() => setShowDiceConfig(false)} />}
            
            {/* Combat Panel */}
            {mode === 'sheet' && character && (
                <CombatPanel 
                    character={character}
                    onUpdateCharacter={handleCharacterUpdate}
                    onOpenDice={(context) => {
                        setDiceContext(context);
                        setActiveTab('dice');
                    }}
                />
            )}

            {/* Modal Code d'accès */}
            <CodeModal
                isOpen={showCodeModal}
                onClose={() => {
                    setShowCodeModal(false);
                    setSelectedCharForCode(null);
                }}
                character={selectedCharForCode}
                onSuccess={(loggedCharacter) => {
                    setCharacter(loggedCharacter);
                    setCharacterId(loggedCharacter.id);
                    setMode('sheet');
                    setActiveTab('sheet');
                    window.history.pushState({}, '', `/${loggedCharacter.accessUrl}`);
                }}
            />
        </div>
    );
};

export default App;
