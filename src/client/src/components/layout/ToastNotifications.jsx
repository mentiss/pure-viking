// src/client/src/components/layout/ToastNotifications.jsx
// Toasts génériques : jets de dés, messages GM, objets GM.
//
// Props :
//   sessionId        — filtre les jets sur la session active
//   onViewHistory    — callback "Voir l'historique" (optionnel)
//   renderDiceToast  — (toast) => JSX | null
//                      Rendu slug-spécifique du toast de jet.
//                      Si absent ou retourne null → rendu générique.
//
// ⚠️ Aucune classe CSS viking-* ici.
//    Les couleurs utilisent exclusivement les variables CSS génériques :
//    --color-surface, --color-border, --color-text, --color-text-muted,
//    --color-accent, --color-success, --color-danger, --color-bg.
//    Chaque slug définit ces variables dans son theme.css.

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth }   from '../../context/AuthContext.jsx';
import {stripHtml} from "../shared/RichTextEditor.jsx";

const TOAST_DICE_TTL    = 5000;
const TOAST_MESSAGE_TTL = 8000;

const ToastNotifications = ({
                                sessionId       = null,
                                onViewHistory   = null,
                                renderDiceToast = null,
                            }) => {
    const [toasts, setToasts] = useState([]);
    const socket              = useSocket();
    const { user }            = useAuth();
    const myCharacterId       = user?.character?.id;

    const add = (toast, ttl) => {
        setToasts(prev => [toast, ...prev].slice(0, 3));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), ttl);
    };

    useEffect(() => {
        if (!socket) return;

        const onDice = (rollData) => {
            // Filtre session si précisée
            if (sessionId && rollData.session_id !== sessionId) return;

            add({
                id:        Date.now(),
                type:      'dice',
                animation: rollData.roll_result?.toastAnimation ?? 'default',
                ...rollData,
            }, TOAST_DICE_TTL);
        };

        const onGMMessage = (data) => {
            if (myCharacterId && data.characterId !== myCharacterId) return;
            add({
                id:        Date.now(),
                type:      'gm_message',
                animation: data.toastAnimation ?? 'default',
                title:     data.entry?.title   ?? 'Message du MJ',
                body:      data.entry?.body    ?? '',
                imageUrl:  data.entry?.metadata?.imageUrl ?? null,
            }, TOAST_MESSAGE_TTL);
        };

        const onGMItem = (data) => {
            if (myCharacterId && data.characterId !== myCharacterId) return;
            add({
                id:           Date.now(),
                type:         'gm_item',
                animation:    data.toastAnimation ?? 'default',
                itemName:     data.item?.name     ?? 'Objet',
                itemCategory: data.item?.category ?? 'misc',
            }, TOAST_MESSAGE_TTL);
        };

        socket.on('dice-roll',          onDice);
        socket.on('gm-message-received', onGMMessage);
        socket.on('gm-item-received',    onGMItem);

        return () => {
            socket.off('dice-roll',           onDice);
            socket.off('gm-message-received', onGMMessage);
            socket.off('gm-item-received',    onGMItem);
        };
    }, [socket, sessionId, myCharacterId]);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    const animClass = (a) => ({
        default:  'animate-slide-in-right',
        shake:    'animate-toast-shake',
        flash:    'animate-toast-flash',
        glitter:  'animate-toast-glitter',
    }[a] ?? 'animate-slide-in-right');

    if (!toasts.length) return null;

    return (
        <div className="fixed bottom-16 right-4 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <div key={toast.id} className={animClass(toast.animation)}>

                    {/* ── Message GM ──────────────────────────────────────── */}
                    {toast.type === 'gm_message' && (
                        <ToastShell
                            onClose={() => remove(toast.id)}
                            accent={toast.animation === 'glitter'}
                        >
                            <div className="flex items-start gap-2">
                                <span style={{ fontSize: '1.2rem' }}>📩</span>
                                <div className="min-w-0">
                                    <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                        {toast.title}
                                    </p>
                                    {toast.body && (
                                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                            {stripHtml(toast.body).slice(0, 120)}{stripHtml(toast.body).length > 120 ? '…' : ''}
                                        </p>
                                    )}
                                    {toast.imageUrl && (
                                        <img
                                            src={toast.imageUrl}
                                            alt=""
                                            className="mt-2 rounded max-h-24 object-cover"
                                        />
                                    )}
                                </div>
                            </div>
                        </ToastShell>
                    )}

                    {/* ── Objet GM ────────────────────────────────────────── */}
                    {toast.type === 'gm_item' && (
                        <ToastShell onClose={() => remove(toast.id)}>
                            <div className="flex items-center gap-2">
                                <span style={{ fontSize: '1.2rem' }}>🎁</span>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                        Objet reçu !
                                    </p>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                                        {toast.itemName}
                                    </p>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                        Consultez votre inventaire
                                    </p>
                                </div>
                            </div>
                        </ToastShell>
                    )}

                    {/* ── Jet de dés ──────────────────────────────────────── */}
                    {toast.type === 'dice' && (
                        <ToastShell onClose={() => remove(toast.id)}>
                            {/* Header commun */}
                            <div className="flex items-center gap-2 mb-2">
                                <span style={{ fontSize: '1.1rem' }}>🎲</span>
                                <div className="min-w-0">
                                    <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {toast.character_name}
                                    </p>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                        {toast.label ?? toast.roll_target ?? toast.roll_type ?? 'Jet'}
                                    </p>
                                </div>
                            </div>

                            {/* Rendu slug-spécifique ou fallback générique */}
                            {(() => {
                                // Tenter rendu slug-spécifique
                                if (renderDiceToast) {
                                    // Désérialiser roll_result si nécessaire
                                    let result = toast.roll_result;
                                    if (typeof result === 'string') {
                                        try { result = JSON.parse(result); } catch { result = null; }
                                    }
                                    const custom = renderDiceToast({ ...toast, roll_result: result });
                                    if (custom) return custom;
                                }

                                // Fallback générique — succès si disponible, sinon total
                                return (
                                    <div>
                                        {toast.successes != null ? (
                                            <p style={{
                                                fontWeight: 700, fontSize: '1.1rem',
                                                color: toast.successes >= 3 ? 'var(--color-success)'
                                                    : toast.successes > 0  ? 'var(--color-accent)'
                                                        : 'var(--color-danger)',
                                            }}>
                                                {toast.successes} succès
                                            </p>
                                        ) : toast.roll_result?.total != null ? (
                                            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>
                                                = {typeof toast.roll_result === 'string'
                                                ? JSON.parse(toast.roll_result)?.total
                                                : toast.roll_result?.total}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            })()}

                            {onViewHistory && (
                                <button
                                    onClick={onViewHistory}
                                    className="w-full mt-2 py-1 rounded text-xs font-semibold"
                                    style={{
                                        background: 'var(--color-surface-alt)',
                                        color:      'var(--color-text-muted)',
                                        border:     '1px solid var(--color-border)',
                                    }}
                                >
                                    Voir l'historique
                                </button>
                            )}
                        </ToastShell>
                    )}
                </div>
            ))}
        </div>
    );
};

// ── Shell de toast — fond + bordure + bouton fermer ───────────────────────────

const ToastShell = ({ children, onClose, accent }) => (
    <div
        className="rounded-lg shadow-xl p-3 min-w-64 max-w-sm relative"
        style={{
            background:   'var(--color-surface)',
            border:       `2px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
        }}
    >
        <button
            onClick={onClose}
            style={{
                position: 'absolute', top: 6, right: 8,
                color: 'var(--color-text-muted)', fontSize: '1rem', lineHeight: 1,
            }}
        >
            ✕
        </button>
        {children}
    </div>
);

export default ToastNotifications;