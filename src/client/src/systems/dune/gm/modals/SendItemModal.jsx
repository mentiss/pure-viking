// src/client/src/systems/dune/gm/modals/SendItemModal.jsx
// Envoi d'un atout du GM vers un joueur (ajout dans son inventaire).
// Émet gm-item-received via le serveur → toast + rechargement fiche côté joueur.

import React, { useState } from 'react';
import { useFetch }  from '../../../../hooks/useFetch.js';
import { useSystem } from '../../../../hooks/useSystem.js';

/**
 * @param {number}   props.characterId
 * @param {string}   props.characterName
 * @param {Function} props.onClose
 */
const SendItemModal = ({ characterId, characterName, onClose }) => {
    const { apiBase }       = useSystem();
    const fetchWithAuth = useFetch();
    const [nom,         setNom]         = useState('');
    const [description, setDescription] = useState('');
    const [quantite,    setQuantite]    = useState(1);
    const [sending,     setSending]     = useState(false);
    const [sent,        setSent]        = useState(false);

    const handleSend = async () => {
        if (!nom.trim() || sending) return;
        setSending(true);
        try {
            // On passe par l'endpoint characters PUT qui gère le push d'item
            // Via la route dédiée gm-send-item si elle existe, sinon on ajoute
            // directement dans les items du personnage via PUT.
            const r = await fetchWithAuth(`${apiBase}/characters/${characterId}/send-item`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom: nom.trim(), description: description.trim(), quantite }),
            });
            if (r.ok) {
                setSent(true);
                setTimeout(onClose, 1000);
            }
        } catch (e) {
            console.error('[SendItemModal] Erreur:', e);
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
                    🎁 Envoyer un atout → {characterName}
                </div>

                <div className="p-4 space-y-3">
                    {sent ? (
                        <div className="text-center py-4 text-sm"
                             style={{ color: 'var(--dune-success)' }}>✅ Atout envoyé</div>
                    ) : (
                        <>
                            <input
                                value={nom}
                                onChange={e => setNom(e.target.value)}
                                className="dune-input text-sm font-bold"
                                placeholder="Nom de l'atout…"
                                autoFocus
                            />
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="dune-input text-sm"
                                rows={3}
                                placeholder="Description…"
                            />
                            <div className="flex items-center gap-2">
                                <span className="dune-label flex-none">Quantité</span>
                                <input
                                    type="number"
                                    min={1}
                                    value={quantite}
                                    onChange={e => setQuantite(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="dune-input w-20 text-sm"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={onClose} className="dune-btn-secondary flex-1 text-xs">Annuler</button>
                                <button onClick={handleSend} disabled={!nom.trim() || sending}
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

export default SendItemModal;