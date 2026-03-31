// src/client/src/components/modals/ConfirmModal.jsx
import React from 'react';

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirmer', cancelText = 'Annuler', danger = false }) => (
    <div
        className="fixed inset-0 flex items-center justify-center z-9999 bg-black/60"
        onClick={onCancel}
    >
        <div
            className={`flex flex-col gap-4 p-6 rounded-xl max-w-sm w-full mx-4 bg-surface border ${danger ? 'border-danger' : 'border-primary'}`}
            onClick={e => e.stopPropagation()}
        >
            <h3 className={`font-bold text-base ${danger ? 'text-danger' : 'text-primary'}`}>
                {title}
            </h3>

            <p className="text-base">{message}</p>

            <div className="flex gap-2 justify-end">
                <button
                    onClick={onCancel}
                    className="text-sm px-3 py-2 rounded-lg font-semibold bg-transparent text-muted border border-base hover:border-accent transition-all cursor-pointer"
                >
                    {cancelText}
                </button>
                <button
                    onClick={onConfirm}
                    className={`text-sm px-3 py-2 rounded-lg font-semibold border-none transition-all cursor-pointer ${danger ? 'bg-danger text-white' : 'bg-primary text-base'}`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    </div>
);

export default ConfirmModal;