// src/client/src/components/ui/ImageLightbox.jsx
// Lightbox plein écran pour afficher une image en grand.
// Fermeture : clic sur l'overlay, touche Escape, ou bouton ✕.

import React, { useEffect, useCallback } from 'react';

/**
 * @param {string}   props.src     - URL de l'image à afficher
 * @param {Function} props.onClose - callback fermeture
 */
const ImageLightbox = ({ src, onClose }) => {
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        // Bloquer le scroll de la page pendant l'ouverture
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            onClick={onClose}
        >
            {/* Bouton fermer */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-opacity hover:opacity-75 z-10"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                title="Fermer (Échap)"
            >
                ✕
            </button>

            {/* Image — stoppe la propagation pour éviter de fermer au clic sur l'image */}
            <img
                src={src}
                alt=""
                className="rounded-lg shadow-2xl"
                style={{
                    maxWidth:  '90vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    cursor: 'default',
                }}
                onClick={e => e.stopPropagation()}
            />
        </div>
    );
};

export default ImageLightbox;