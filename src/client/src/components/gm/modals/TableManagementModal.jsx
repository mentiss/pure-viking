// components/gm/tables/TableManagementModal.jsx - Gestion des tables/sessions
import React, { useState, useEffect } from 'react';
import { useFetch } from '../../../hooks/useFetch.js';
import TableCharactersModal from './TableCharactersModal.jsx';
import AlertModal from "../../modals/AlertModal.jsx";

const TableManagementModal = ({ isOpen, onClose, onSelectTable, activeSessionId }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [showCharactersModal, setShowCharactersModal] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);

    const fetchWithAuth = useFetch();

    useEffect(() => {
        if (isOpen) loadSessions();
    }, [isOpen]);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth('/api/sessions');
            const data = await response.json();
            setSessions(data);
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (sessionData) => {
        try {
            const response = await fetchWithAuth('/api/sessions', {
                method: 'POST',
                body: JSON.stringify(sessionData)
            });
            if (response.ok) {
                await loadSessions();
                setShowCreateModal(false);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            setAlertMessage('Erreur lors de la création de la table');
        }
    };

    const handleUpdateSession = async (sessionId, sessionData) => {
        try {
            const response = await fetchWithAuth(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify(sessionData)
            });
            if (response.ok) {
                await loadSessions();
                setShowEditModal(false);
                setEditingSession(null);
            }
        } catch (error) {
            console.error('Error updating session:', error);
            setAlertMessage('Erreur lors de la modification de la table');
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette table ?')) return;
        try {
            const response = await fetchWithAuth(`/api/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                if (sessionId === activeSessionId) {
                    localStorage.removeItem('activeSessionId');
                    onSelectTable(null);
                }
                await loadSessions();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            setAlertMessage('Erreur lors de la suppression de la table');
        }
    };

    const filteredSessions = sessions.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-surface rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border-4 border-default">

                    {/* Header */}
                    <div className="p-4 border-b-2 border-default flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-default">
                                📋 Gestion des tables
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-2xl text-muted hover:text-danger"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto flex-1">

                        {/* Recherche + Créer */}
                        <div className="mb-4 space-y-3">
                            <input
                                type="text"
                                placeholder="🔍 Rechercher une table..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-default rounded-lg bg-surface text-default"
                            />
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="w-full px-4 py-3 bg-primary text-bg rounded-lg font-semibold hover:opacity-90"
                            >
                                ✨ Créer une nouvelle table
                            </button>
                        </div>

                        {/* Liste des tables */}
                        {loading ? (
                            <div className="text-center py-8 text-muted">
                                Chargement...
                            </div>
                        ) : filteredSessions.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                {filter ? 'Aucune table trouvée' : 'Aucune table créée'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredSessions.map(session => {
                                    const isActive = session.id === activeSessionId;
                                    return (
                                        <div
                                            key={session.id}
                                            className={`p-4 rounded-lg border-2 ${
                                                isActive
                                                    ? 'bg-primary/20 border-primary'
                                                    : 'bg-surface-alt border-default'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="text-lg font-bold text-default">
                                                            {session.name}
                                                        </div>
                                                        {isActive && (
                                                            <span className="px-2 py-0.5 bg-primary text-bg text-xs font-bold rounded">
                                                                ACTIVE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted">
                                                        {session.characterCount} personnage{session.characterCount > 1 ? 's' : ''}
                                                    </div>
                                                    {session.notes && (
                                                        <div className="text-xs text-muted mt-1 italic">
                                                            {session.notes}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    {!isActive && (
                                                        <button
                                                            onClick={() => { onSelectTable(session); onClose(); }}
                                                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                        >
                                                            ✓ Activer
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowCharactersModal(session)}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                                    >
                                                        👥 Persos
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingSession(session); setShowEditModal(true); }}
                                                        className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSession(session.id)}
                                                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showCreateModal && (
                <SessionFormModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateSession}
                    onAlert={setAlertMessage}
                    title="Créer une nouvelle table"
                />
            )}

            {showEditModal && editingSession && (
                <SessionFormModal
                    isOpen={showEditModal}
                    onClose={() => { setShowEditModal(false); setEditingSession(null); }}
                    onSubmit={(data) => handleUpdateSession(editingSession.id, data)}
                    onAlert={setAlertMessage}
                    initialData={editingSession}
                    title="Modifier la table"
                />
            )}

            {showCharactersModal && (
                <TableCharactersModal
                    isOpen={!!showCharactersModal}
                    onClose={() => setShowCharactersModal(null)}
                    session={showCharactersModal}
                    onSessionUpdated={loadSessions}
                />
            )}

            {alertMessage && (
                <AlertModal
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </>
    );
};

// Modale de formulaire création/édition
const SessionFormModal = ({ isOpen, onClose, onSubmit, initialData = null, title, onAlert }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        notes: initialData?.notes || ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            onAlert('Le nom de la table est requis');
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-surface rounded-lg shadow-2xl max-w-md w-full mx-4 border-4 border-default p-6">
                <h3 className="text-2xl font-bold text-default mb-4">
                    {title}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-default mb-1">
                            Nom de la table *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-default rounded bg-surface text-default"
                            placeholder="Campagne principale"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-default mb-1">
                            Notes (optionnel)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-default rounded bg-surface text-default"
                            rows="3"
                            placeholder="Session hebdomadaire du mercredi..."
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary text-bg rounded-lg font-semibold hover:opacity-90"
                        >
                            {initialData ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TableManagementModal;