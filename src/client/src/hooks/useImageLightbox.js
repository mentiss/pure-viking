// src/client/src/hooks/useImageLightbox.js
// Attache des listeners dblclick sur toutes les <img> dans un élément DOM référencé.
// Utilisé pour brancher le lightbox sur le contenu rendu par RichTextEditor (TipTap).
//
// Usage :
//   const { lightboxSrc, openLightbox, closeLightbox, editorRef } = useImageLightbox();
//   <div ref={editorRef}><RichTextEditor ... /></div>
//   {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={closeLightbox} />}

import { useState, useRef, useEffect, useCallback } from 'react';

const useImageLightbox = () => {
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const containerRef = useRef(null);

    const openLightbox  = useCallback((src) => setLightboxSrc(src), []);
    const closeLightbox = useCallback(() => setLightboxSrc(null), []);

    // Attache/réattache les listeners quand le contenu du container change.
    // MutationObserver pour détecter l'ajout/suppression d'images par TipTap.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handler = (e) => {
            // Remonter jusqu'à une <img> si le clic vient d'un enfant
            const img = e.target.closest('img');
            if (img?.src) openLightbox(img.src);
        };

        const attachListeners = () => {
            container.querySelectorAll('img').forEach(img => {
                // Curseur pour indiquer l'interactivité
                img.style.cursor = 'zoom-in';
            });
            // Un seul listener sur le container (délégation d'événement)
            container.addEventListener('dblclick', handler);
        };

        attachListeners();

        // Observer les mutations pour mettre à jour si TipTap re-render des images
        const observer = new MutationObserver(() => {
            container.querySelectorAll('img').forEach(img => {
                img.style.cursor = 'zoom-in';
            });
        });
        observer.observe(container, { childList: true, subtree: true });

        return () => {
            container.removeEventListener('dblclick', handler);
            observer.disconnect();
        };
    }, [openLightbox]);

    return { lightboxSrc, openLightbox, closeLightbox, containerRef };
};

export default useImageLightbox;