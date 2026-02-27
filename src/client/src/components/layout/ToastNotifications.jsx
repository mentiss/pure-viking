// ToastNotifications.jsx - Toast notifications (jets de dés + messages GM)
import React, { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const ToastNotifications = ({ onViewHistory, sessionId = null }) => {
    const [toasts, setToasts] = useState([]);
    const socket = useSocket();
    const { user } = useAuth();

    const myCharacterId = user?.character?.id;

    useEffect(() => {
        if (!socket) return;

        // --- Jets de dés (existant) ---
        const handleDiceRoll = (rollData) => {
            if (!sessionId || rollData.session_id === sessionId) {
                const toast = {
                    id: Date.now(),
                    type: 'dice',
                    animation: 'default',
                    ...rollData,
                    timestamp: Date.now()
                };

                setToasts(prev => [toast, ...prev].slice(0, 3));
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                }, 5000);
            }
        };

        // --- Messages GM ---
        const handleGMMessage = (data) => {
            console.log('Received socket message', data);
            // Ne montrer le toast que si ce message est pour MOI
            if (myCharacterId && data.characterId === myCharacterId) {
                const toast = {
                    id: Date.now(),
                    type: 'gm_message',
                    animation: data.toastAnimation || 'default',
                    title: data.entry?.title || 'Message du MJ',
                    body: data.entry?.body || '',
                    imageUrl: data.entry?.metadata?.imageUrl || null,
                    timestamp: Date.now()
                };

                setToasts(prev => [toast, ...prev].slice(0, 3));
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                }, 8000); // Plus long pour les messages GM
            }
        };
        const handleGMItem = (data) => {
            if (myCharacterId && data.characterId === myCharacterId) {
                const toast = {
                    id: Date.now(),
                    type: 'gm_item',
                    animation: data.toastAnimation || 'default',
                    itemName: data.item?.name || 'Objet',
                    itemCategory: data.item?.category || 'item',
                    timestamp: Date.now()
                };
                setToasts(prev => [toast, ...prev].slice(0, 3));
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                }, 8000);
            }
        };

        socket.on('dice-roll', handleDiceRoll);
        socket.on('gm-message-received', handleGMMessage);
        socket.on('gm-item-received', handleGMItem);

        return () => {
            socket.off('dice-roll', handleDiceRoll);
            socket.off('gm-message-received', handleGMMessage);
            socket.off('gm-item-received', handleGMItem);
        };
    }, [socket, sessionId, myCharacterId]);

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

    // Mapper animation → classe CSS
    const getAnimationClass = (animation) => {
        const map = {
            'default': 'animate-slide-in-right',
            'shake': 'animate-toast-shake',
            'flash': 'animate-toast-flash',
            'glitter': 'animate-toast-glitter',
        };
        return map[animation] || map['default'];
    };

    return (
        <div className="fixed bottom-16 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <div key={toast.id}>
                    {toast.type === 'gm_message' ? (
                        // --- Toast Message GM ---
                        <div
                            className={`bg-viking-parchment dark:bg-viking-brown border-2 rounded-lg shadow-xl p-3 min-w-64 max-w-sm ${getAnimationClass(toast.animation)} ${
                                toast.animation === 'glitter'
                                    ? 'border-yellow-500'
                                    : 'border-viking-bronze'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">📨</span>
                                    <div>
                                        <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">
                                            Message du MJ
                                        </div>
                                        {toast.title && (
                                            <div className="text-xs font-semibold text-viking-bronze">
                                                {toast.title}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-viking-leather dark:text-viking-bronze hover:text-viking-danger text-lg leading-none"
                                >
                                    ✕
                                </button>
                            </div>

                            {toast.body && (
                                <div className="text-sm text-viking-text dark:text-viking-parchment mb-2 line-clamp-3">
                                    {toast.body}
                                </div>
                            )}

                            {toast.imageUrl && (
                                <img
                                    src={toast.imageUrl}
                                    alt=""
                                    className="max-h-24 rounded border border-viking-bronze mb-2"
                                />
                            )}

                            <div className="text-[10px] text-viking-leather dark:text-viking-bronze">
                                Consultez votre journal pour plus de détails
                            </div>
                        </div>
                    ) : toast.type === 'gm_item' ? (
                        // --- Toast Item reçu ---
                        <div className={`bg-viking-parchment dark:bg-viking-brown border-2 rounded-lg shadow-xl p-3 min-w-64 max-w-sm ${getAnimationClass(toast.animation)} ${
                            toast.animation === 'glitter' ? 'border-yellow-500' : 'border-viking-bronze'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🎁</span>
                                    <div>
                                        <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">
                                            Objet reçu !
                                        </div>
                                        <div className="text-xs font-semibold text-viking-bronze">
                                            {toast.itemName}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeToast(toast.id)}
                                        className="text-viking-leather dark:text-viking-bronze hover:text-viking-danger text-lg leading-none">✕</button>
                            </div>
                            <div className="text-[10px] text-viking-leather dark:text-viking-bronze">
                                Consultez votre inventaire
                            </div>
                        </div>
                    ) : (
                        // --- Toast Jet de dés (existant) ---
                        <div
                            className={`bg-white dark:bg-viking-brown border-2 border-viking-bronze rounded-lg shadow-xl p-3 min-w-64 max-w-sm ${getAnimationClass(toast.animation)}`}
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
                    )}
                </div>
            ))}
        </div>
    );
};

export default ToastNotifications;