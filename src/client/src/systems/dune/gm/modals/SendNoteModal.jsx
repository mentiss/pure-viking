// src/client/src/systems/dune/gm/modals/SendNoteModal.jsx
// Envoi d'une note du GM vers un joueur.
// Pattern identique à GMSendModal générique — adapté au thème Dune.

import React, { useState } from 'react';
import { useFetch }  from '../../../../hooks/useFetch.js';
import { useSystem } from '../../../../hooks/useSystem.js';

/**
 * @param {number}   props.characterId
 * @param {string}   props.characterName
 * @param {Function} props.onClose
 */
const SendNoteModal = ({ characterId, characterName, onClose }) => {
    const { apiBase }       = useSystem();
    const fetchWithAuth = useFetch();
    const [content,  setContent]  = useState('');
    const [sending,  setSending]  = useState(false);
    const [sent,     setSent]     = useState(false);

    const handleSend = async () => {
        if (!content.trim() || sending) return;
        setSending(true);
        try {
            await fetchWithAuth(`${apiBase}/journal/${characterId}`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '📩 Note du MJ', body: content, isGMNote: true }),
            });
            setSent(true);
            setTimeout(onClose, 1000);
        } catch (e) {
            console.error('[SendNoteModal] Erreur:', e);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
                 style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-gold)' }}>

                <div className="px-4 py-3 font-bold text-sm"
                     style={{ background: 'var(--dune-dark)', color: 'var(--dune-gold)', borderBottom: '1px solid var(--dune-gold)' }}>
                    📩 Note → {characterName}
                </div>

                <div className="p-4 space-y-3">
                    {sent ? (
                        <div className="text-center py-4 text-sm"
                             style={{ color: 'var(--dune-success)' }}>✅ Note envoyée</div>
                    ) : (
                        <>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="dune-input text-sm"
                                rows={5}
                                placeholder="Contenu de la note…"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button onClick={onClose} className="dune-btn-secondary flex-1 text-xs">Annuler</button>
                                <button onClick={handleSend} disabled={!content.trim() || sending}
                                        className="dune-btn-primary flex-1 text-xs disabled:opacity-40">
                                    {sending ? 'Envoi…' : 'Envoyer'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SendNoteModal;