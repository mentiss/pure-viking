// components/CodeModal.jsx - Modale pour demander le code d'accès
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const CodeModal = ({ isOpen, onClose, character, onSuccess }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!code.trim()) {
            setError('Veuillez entrer le code d\'accès');
            return;
        }

        setLoading(true);

        try {
            const loggedCharacter = await login(code, character.accessUrl ?? character.access_url);
            onSuccess(loggedCharacter);
            setCode('');
            onClose();
        } catch (err) {
            setError(err.message || 'Code incorrect');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCode('');
        setError('');
        onClose();
    };

    if (!isOpen || !character) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-surface rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 border-4 border-default">

                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-default mb-2">
                        🔐 Code d'accès
                    </h2>
                    <p className="text-muted mb-1">
                        Entrez le code pour accéder à :
                    </p>
                    <p className="text-lg font-semibold text-accent">
                        {character.name}
                    </p>
                    <p className="text-sm text-muted">
                        👤 {character.playerName}
                    </p>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="ABC123"
                            maxLength={6}
                            className="w-full px-4 py-3 border-2 border-default rounded-lg bg-surface text-default uppercase text-center text-2xl font-bold tracking-widest"
                            autoFocus
                        />
                        <p className="text-xs text-muted mt-2 text-center">
                            Code à 6 caractères
                        </p>
                    </div>

                    {/* Erreur */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {/* Boutons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !code}
                            className="flex-1 px-4 py-2 bg-primary text-accent rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Vérification...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CodeModal;