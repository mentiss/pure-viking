// components/shared/AlertModal.jsx - Modale d'alerte générique (remplace alert() natif)
import React from 'react';

const AlertModal = ({ message, onClose }) => {
    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-6"
                onClick={e => e.stopPropagation()}
            >
                {/* Header avec croix */}
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">
                        ⚠️ Attention
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-viking-leather dark:text-viking-bronze hover:text-viking-danger text-xl leading-none ml-4 mt-0.5"
                        aria-label="Fermer"
                    >
                        ✕
                    </button>
                </div>

                {/* Message */}
                <p className="text-viking-text dark:text-viking-parchment mb-6">
                    {message}
                </p>

                {/* Bouton unique centré */}
                <div className="flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;