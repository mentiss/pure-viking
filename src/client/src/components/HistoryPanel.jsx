// HistoryPanel.js - Panneau latéral historique jets de dés
import React, { useState, useEffect } from "react";
import {useSocket} from "../context/SocketContext.jsx";

const HistoryPanel = ({ isOpen, onClose }) => {
    const { useState, useEffect } = React;
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/dice/history?limit=100');
            const data = await response.json();
            setHistory(data);
        } catch (error) {
            console.error('Error loading history:', error);
        }
        setLoading(false);
    };
    
    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);
    
    const socket = useSocket();
    
    useEffect(() => {
        if (!socket) return;
        
        const handleDiceRoll = (rollData) => {
            setHistory(prev => [rollData, ...prev]);
        };
        
        socket.on('dice-roll', handleDiceRoll);
        
        return () => {
            socket.off('dice-roll', handleDiceRoll);
        };
    }, [socket]);
    
    const deleteRoll = async (id) => {
        if (!confirm('Supprimer ce jet ?')) return;
        
        try {
            await fetch(`/api/dice/history/${id}`, { method: 'DELETE' });
            setHistory(prev => prev.filter(h => h.id !== id));
        } catch (error) {
            console.error('Error deleting roll:', error);
        }
    };
    
    const resetHistory = async () => {
        if (!confirm('⚠️ Supprimer TOUT l\'historique ? Cette action est irréversible.')) return;
        
        try {
            await fetch('/api/dice/history', { method: 'DELETE' });
            setHistory([]);
        } catch (error) {
            console.error('Error resetting history:', error);
        }
    };
    
    const getTimeAgo = (timestamp) => {
        const now = new Date();
        // SQLite retourne YYYY-MM-DD HH:MM:SS en UTC
        // Ajouter 'Z' si pas déjà présent pour forcer interprétation UTC
        const timestampStr = timestamp.includes('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
        const then = new Date(timestampStr);
        const seconds = Math.floor((now - then) / 1000);
        
        if (seconds < 0) return 'à l\'instant';
        if (seconds < 60) return `il y a ${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `il y a ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `il y a ${hours}h`;
        const days = Math.floor(hours / 24);
        return `il y a ${days}j`;
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
    
    if (!isOpen) return null;
    
    return (
        <>
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-viking-brown border-l-4 border-viking-bronze z-50 shadow-2xl animate-slide-in-right">
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-3 border-b-2 border-viking-bronze flex justify-between items-center">
                        <h2 className="text-base font-bold text-viking-brown dark:text-viking-parchment">
                            📜 Historique des jets
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={resetHistory}
                                disabled={history.length === 0}
                                className="px-2 py-1 bg-viking-leather dark:bg-gray-700 text-viking-parchment text-xs rounded hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Supprimer tout l'historique"
                            >
                                🗑️
                            </button>
                            <button
                                onClick={onClose}
                                className="text-xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    {/* Liste */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="text-center text-viking-leather dark:text-viking-bronze p-8">
                                Chargement...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center text-viking-leather dark:text-viking-bronze p-8">
                                Aucun jet enregistré
                            </div>
                        ) : (
                            history.map(roll => (
                                <div
                                    key={roll.id}
                                    className="p-3 bg-viking-parchment dark:bg-gray-800 border-2 border-viking-leather dark:border-viking-bronze rounded-lg"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">🎲</span>
                                            <div>
                                                {roll.player_name && (
                                                    <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                                        {roll.player_name}
                                                    </div>
                                                )}
                                                <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment">
                                                    {roll.character_name}
                                                </div>
                                                <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                                    {roll.roll_target || getRollTypeLabel(roll.roll_type)}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteRoll(roll.id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className={`text-lg font-bold ${
                                            roll.successes >= 3 
                                                ? 'text-viking-success' 
                                                : roll.successes > 0 
                                                    ? 'text-viking-bronze' 
                                                    : 'text-viking-danger'
                                        }`}>
                                            {roll.successes} succès
                                        </div>
                                        <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                            {getTimeAgo(roll.created_at)}
                                        </div>
                                    </div>
                                    
                                    {roll.saga_spent > 0 && (
                                        <div className="mt-2 text-xs text-viking-bronze">
                                            SAGA : {roll.saga_spent} dépensée
                                            {roll.saga_recovered > 0 && ' (récupérée !)'}
                                        </div>
                                    )}
                                    
                                    <details className="mt-2">
                                        <summary className="text-xs text-viking-leather dark:text-viking-bronze cursor-pointer hover:text-viking-bronze">
                                            Détails
                                        </summary>
                                        <div className="mt-2 text-xs space-y-1 text-viking-text dark:text-viking-parchment">
                                            <div>Pool : {roll.pool}d10</div>
                                            <div>Seuil : {roll.threshold}+</div>
                                            <div>
                                                Dés : {roll.results.map(d => `[${d}]`).join(' ')}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default HistoryPanel;