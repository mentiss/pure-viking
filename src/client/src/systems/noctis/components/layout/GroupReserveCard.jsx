import { useState, useEffect } from 'react';
import {useFetch} from "../../../../hooks/useFetch.js";
import useSystem from "../../../../hooks/useSystem.js";
import {useSocket} from "../../../../context/SocketContext.jsx";

const GroupReserveCard = ({ character }) => {
    const [reserve, setReserve]   = useState({ current: 0, cap: 12 });
    const [loading, setLoading]   = useState(false);
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();
    const socket = useSocket();

    console.log(`apiBase:${apiBase}`);
    // Chargement initial + sync socket
    useEffect(() => {
        fetchWithAuth(`${apiBase}/group-reserve`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setReserve(data); });

        if (!socket) return;
        socket.emit('noctis:group-reserve-get');

        const handler = (data) => setReserve(prev => ({ ...prev, ...data }));
        socket.on('noctis:group-reserve-update', handler);
        return () => socket.off('noctis:group-reserve-update', handler);
    }, [socket]); // eslint-disable-line

    const patch = async (payload) => {
        setLoading(true);
        try {
            await fetchWithAuth(`${apiBase}/group-reserve`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            // Le socket broadcaste la mise à jour à tous
        } finally {
            setLoading(false);
        }
    };

    // Sacrifice : retire définitivement du max de la réserve perso
    const handleSacrifice = async (type) => {
        const maxKey  = type === 'effort' ? 'reserve_effort_max' : 'reserve_sangfroid_max';
        const currKey = type === 'effort' ? 'reserve_effort_current' : 'reserve_sangfroid_current';
        const currMax = character[maxKey] ?? 0;
        if (currMax <= 0) return;

        // Décrémente le max perso (PATCH personnage) + incrémente réserve groupe
        await fetchWithAuth(`${apiBase}/characters/${character.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                [maxKey]:  currMax - 1,
                [currKey]: Math.min(character[currKey] ?? 0, currMax - 1),
            }),
        });
        await patch({ delta: 1 });
    };

    const pct = reserve.cap > 0 ? (reserve.current / reserve.cap) * 100 : 0;

    return (
        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
            <h2 className="text-primary font-bold text-sm uppercase tracking-wide">
                Réserve de Groupe
            </h2>

            {/* Jauge */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted">
                    <span>Dés disponibles</span>
                    <span className="text-default font-bold">{reserve.current} / {reserve.cap}</span>
                </div>
                <div className="h-4 bg-surface-alt rounded-full overflow-hidden border border-default">
                    <div
                        className="h-full bg-secondary transition-all duration-300 rounded-full"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Utilisation */}
            <div className="flex gap-2">
                <button
                    onClick={() => patch({ delta: -1 })}
                    disabled={reserve.current <= 0 || loading}
                    className="flex-1 py-1 text-xs rounded bg-surface-alt border border-default text-danger disabled:opacity-30"
                >
                    −1 Utiliser
                </button>
            </div>

            {/* Sacrifice */}
            <div className="border-t border-default pt-3 space-y-1">
                <p className="text-muted text-xs">Sacrifice (perte définitive du max) :</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSacrifice('effort')}
                        disabled={(character.reserve_effort_max ?? 0) <= 0 || loading}
                        className="flex-1 py-1 text-xs rounded border border-default text-secondary bg-surface-alt disabled:opacity-30"
                    >
                        Effort → Groupe
                    </button>
                    <button
                        onClick={() => handleSacrifice('sangfroid')}
                        disabled={(character.reserve_sangfroid_max ?? 0) <= 0 || loading}
                        className="flex-1 py-1 text-xs rounded border border-default text-secondary bg-surface-alt disabled:opacity-30"
                    >
                        Sang-Froid → Groupe
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupReserveCard;