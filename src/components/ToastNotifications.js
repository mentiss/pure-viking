// ToastNotifications.js - Toast notifications pour jets de dés

const ToastNotifications = ({ onViewHistory }) => {
    const { useState, useEffect } = React;
    const [toasts, setToasts] = useState([]);
    
    useEffect(() => {
        // Connexion Socket.IO
        const socket = io();
        
        socket.on('dice-roll', (rollData) => {
            const toast = {
                id: Date.now(),
                ...rollData,
                timestamp: Date.now()
            };
            
            setToasts(prev => [toast, ...prev].slice(0, 3)); // Max 3 toasts
            
            // Auto-remove après 5 secondes
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 5000);
        });
        
        return () => socket.disconnect();
    }, []);
    
    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };
    
    const getRollTypeLabel = (type) => {
        const labels = {
            'carac': 'Caractéristique',
            'skill': 'Compétence',
            'saga_heroic': 'SAGA Héroïque',
            'saga_epic': 'SAGA Épique',
            'saga_insurance': 'SAGA Assurance'
        };
        return labels[type] || type;
    };
    
    return (
        <div className="fixed bottom-16 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="bg-white dark:bg-viking-brown border-2 border-viking-bronze rounded-lg shadow-xl p-3 min-w-64 max-w-sm animate-slide-in-right"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎲</span>
                            <div>
                                <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">
                                    {toast.character_name}
                                </div>
                                <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                    {toast.roll_target || getRollTypeLabel(toast.roll_type)}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-viking-leather dark:text-viking-bronze hover:text-viking-danger text-lg leading-none"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="mb-2">
                        <div className={`text-xl font-bold ${
                            toast.successes >= 3 
                                ? 'text-viking-success' 
                                : toast.successes > 0 
                                    ? 'text-viking-bronze' 
                                    : 'text-viking-danger'
                        }`}>
                            {toast.successes} succès
                        </div>
                        
                        {/* Affichage dés */}
                        {toast.results && toast.results.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                                {toast.results.map((die, idx) => (
                                    <span
                                        key={idx}
                                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                            die >= toast.threshold 
                                                ? 'bg-viking-success/20 text-viking-success border border-viking-success' 
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}
                                    >
                                        [{die}]
                                    </span>
                                ))}
                            </div>
                        )}
                        
                        {toast.saga_spent > 0 && (
                            <div className="text-xs text-viking-bronze mt-1">
                                SAGA : {toast.saga_spent}
                                {toast.saga_recovered > 0 && ' (récupérée !)'}
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={onViewHistory}
                        className="w-full px-2 py-1.5 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather text-xs"
                    >
                        Voir l'historique
                    </button>
                </div>
            ))}
        </div>
    );
};
