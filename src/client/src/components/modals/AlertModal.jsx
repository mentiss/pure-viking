// src/client/src/components/modals/AlertModal.jsx
import React from 'react';

const AlertModal = ({ message, onClose }) => (
    <div
        className="fixed inset-0 flex items-center justify-center z-9999 bg-black/60"
        onClick={onClose}
    >
        <div
            className="flex flex-col gap-4 p-6 rounded-xl max-w-sm w-full mx-4 bg-surface border border-base"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-base text-accent">⚠ Attention</h3>
                <button
                    onClick={onClose}
                    className="text-muted hover:text-base transition-colors cursor-pointer text-sm leading-none"
                >
                    ✕
                </button>
            </div>

            <p className="text-base">{message}</p>

            <div className="flex justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg font-semibold bg-surface-alt text-base border border-base hover:border-accent transition-all cursor-pointer"
                >
                    OK
                </button>
            </div>
        </div>
    </div>
);

export default AlertModal;