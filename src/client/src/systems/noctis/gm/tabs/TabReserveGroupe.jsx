import { useState, useEffect } from 'react';
import { useFetch }  from '../../../../hooks/useFetch.js';
import { useSystem } from '../../../../hooks/useSystem.js';

const TabReserveGroupe = ({ socket }) => {
    const { apiBase }       = useSystem();
    const fetchWithAuth = useFetch();

    const [reserve,  setReserve]  = useState({ current: 0, cap: 12 });
    const [loading,  setLoading]  = useState(false);
    const [editCap,  setEditCap]  = useState(false);
    const [capDraft, setCapDraft] = useState(12);

    // ── Chargement initial ────────────────────────────────────────────────────

    useEffect(() => {
        fetchWithAuth(`${apiBase}/group-reserve`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d) { setReserve(d); setCapDraft(d.cap); }
            });

        if (!socket) return;
        socket.emit('noctis:group-reserve-get');

        const handler = (data) => setReserve(prev => ({ ...prev, ...data }));
        socket.on('noctis:group-reserve-update', handler);
        return () => socket.off('noctis:group-reserve-update', handler);
    }, [socket, apiBase]); // fetchWithAuth absent

    // ── Patch ─────────────────────────────────────────────────────────────────

    const patch = async (payload) => {
        setLoading(true);
        try {
            await fetchWithAuth(`${apiBase}/group-reserve`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCap = () => {
        patch({ cap: capDraft });
        setEditCap(false);
    };

    const pct = reserve.cap > 0 ? Math.min(100, (reserve.current / reserve.cap) * 100) : 0;

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            <h2 className="text-primary font-bold text-lg uppercase tracking-wide">
                Réserve de Groupe
            </h2>

            {/* ── Jauge ──────────────────────────────────────────────────── */}
            <div className="bg-surface border border-default rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-muted text-xs uppercase">Dés disponibles</p>
                        <p className="text-primary font-bold text-5xl">{reserve.current}</p>
                    </div>
                    <p className="text-muted text-sm">/ {reserve.cap}</p>
                </div>

                <div className="h-5 bg-surface-alt rounded-full overflow-hidden border border-default">
                    <div
                        className="h-full bg-secondary transition-all duration-500 rounded-full"
                        style={{ width: `${pct}%` }}
                    />
                </div>

                {/* Contrôles */}
                <div className="flex gap-3">
                    <button
                        onClick={() => patch({ delta: -1 })}
                        disabled={reserve.current <= 0 || loading}
                        className="flex-1 py-2 rounded border border-danger text-danger text-sm font-semibold disabled:opacity-30"
                    >
                        −1 Utiliser
                    </button>
                    <button
                        onClick={() => patch({ delta: 1 })}
                        disabled={reserve.current >= reserve.cap || loading}
                        className="flex-1 py-2 rounded border border-success text-success text-sm font-semibold disabled:opacity-30"
                    >
                        +1 Ajouter
                    </button>
                    <button
                        onClick={() => patch({ current: 0 })}
                        disabled={reserve.current === 0 || loading}
                        className="px-4 py-2 rounded border border-default text-muted text-sm disabled:opacity-30"
                    >
                        Vider
                    </button>
                </div>
            </div>

            {/* ── Limite haute ───────────────────────────────────────────── */}
            <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-primary font-semibold text-sm uppercase">Limite haute</h3>
                    {!editCap ? (
                        <button
                            onClick={() => { setEditCap(true); setCapDraft(reserve.cap); }}
                            className="text-xs text-muted border border-default rounded px-2 py-1"
                        >
                            Modifier
                        </button>
                    ) : (
                        <div className="flex gap-2 items-center">
                            <input
                                type="number" min="0" max="50"
                                className="w-20 bg-surface-alt border border-default rounded px-2 py-1 text-default text-sm"
                                value={capDraft}
                                onChange={e => setCapDraft(+e.target.value)}
                            />
                            <button
                                onClick={handleSaveCap}
                                className="text-xs bg-primary text-accent rounded px-2 py-1 font-bold"
                            >
                                ✓
                            </button>
                            <button
                                onClick={() => setEditCap(false)}
                                className="text-xs text-muted"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
                <p className="text-muted text-xs">
                    La limite haute est fixée en début d'aventure par le groupe.
                    En général 3D par joueur (ex : 4 joueurs = 12D).
                </p>
            </div>

            {/* ── Rappel des règles ──────────────────────────────────────── */}
            <div className="bg-surface border border-default rounded-lg p-4 space-y-2">
                <h3 className="text-primary font-semibold text-sm uppercase">Rappel des règles</h3>
                <ul className="text-muted text-xs space-y-1.5">
                    <li>• Chaque joueur peut sacrifier des dés de ses propres réserves (max personnel réduit définitivement).</li>
                    <li>• L'utilisation de la réserve coûte 1D — le retrait est définitif quelle que soit l'issue.</li>
                    <li>• La limite de 1D par jet s'applique toujours, sans bonus de spécialité.</li>
                    <li>• Le groupe doit s'entendre sur les conditions d'accès (libre, majoritaire, unanime).</li>
                    <li>• +3D si un principe est accompli par un seul membre, +5D si plusieurs y participent.</li>
                    <li>• −3D / −5D si un interdit est transgressé (même logique).</li>
                </ul>
            </div>
        </div>
    );
};

export default TabReserveGroupe;