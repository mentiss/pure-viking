// ConfirmModal.js - Modal de confirmation générique

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirmer', cancelText = 'Annuler', danger = false }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-4">
                    {title}
                </h3>
                
                <p className="text-viking-text dark:text-viking-parchment mb-6">
                    {message}
                </p>
                
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-600"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2 rounded font-semibold ${
                            danger 
                                ? 'bg-viking-danger text-white hover:bg-red-700' 
                                : 'bg-viking-success text-white hover:bg-green-700'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
