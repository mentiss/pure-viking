// useSocket.js - Hook pour socket.io globale unique

// Créer socket IMMÉDIATEMENT au chargement du script
console.log('[Socket] Initializing global socket');
const globalSocket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

globalSocket.on('connect', () => {
    console.log('[Socket] Connected');
});

globalSocket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
});

globalSocket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
});

// Hook simple qui retourne juste la socket globale
const useSocket = () => {
    return globalSocket;
};
