import { useState } from 'react';
import { useGroupReserve } from '../../hooks/useGroupReserve.js';

const REGLE_OPTIONS = [
    { value: 'libre',     label: 'Libre — tout joueur peut puiser à tout moment' },
    { value: 'majorite',  label: 'Majorité — décision collective simple' },
    { value: 'unanimite', label: 'Unanimité — accord de tous requis' },
];

const TabReserveGroupe = () => {
    const { groupReserve, hasSession, loading, updateGroupReserve, applyFluctuation } = useGroupReserve();

    const [principeDraft, setPrincipeDraft] = useState('');
    const [interditDraft, setInterditDraft] = useState('');

    const current   = groupReserve.current ?? 0;
    const principes = groupReserve.principes ?? [];
    const interdits = groupReserve.interdits ?? [];

    const gaugeMax = Math.max(current, 12);
    const pct      = gaugeMax > 0 ? Math.min(100, (current / gaugeMax) * 100) : 0;

    const addPrincipe = () => {
        if (!principeDraft.trim()) return;
        updateGroupReserve({ principes: [...principes, principeDraft.trim()] });
        setPrincipeDraft('');
    };

    const removePrincipe = (i) =>
        updateGroupReserve({ principes: principes.filter((_, idx) => idx !== i) });

    const addInterdit = () => {
        if (!interditDraft.trim()) return;
        updateGroupReserve({ interdits: [...interdits, interditDraft.trim()] });
        setInterditDraft('');
    };

    const removeInterdit = (i) =>
        updateGroupReserve({ interdits: interdits.filter((_, idx) => idx !== i) });

    if (!hasSession) {
        return (
            <div className="flex items-center justify-center h-48 text-muted text-sm">
                Aucune session active.
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6">

            {/* ── Jauge principale ─────────────────────────────────────── */}
            <div className={`ns-card ns-paper space-y-4 transition-shadow
                ${current > 0 ? 'ns-etherum-glow' : ''}`}>
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="ns-domain-header text-accent">Réserve de Compagnie</h3>
                        <p className="text-muted text-xs mt-1">Étherum partagé — dépenses définitives</p>
                    </div>
                    <span className="font-bold text-5xl font-mono"
                          style={{ color: current > 0 ? 'var(--color-accent)' : 'var(--color-muted)',
                              textShadow: current > 0
                                  ? '0 0 16px color-mix(in srgb, var(--color-accent) 50%, transparent)'
                                  : 'none' }}>
                        {current}
                    </span>
                </div>

                <div className="ns-gauge-track" style={{ borderColor: 'var(--color-accent)' }}>
                    <div
                        className="ns-gauge-fill"
                        style={{
                            width:      `${pct}%`,
                            background: `linear-gradient(to right,
                                color-mix(in srgb, var(--color-accent) 60%, black),
                                var(--color-accent))`,
                        }}
                    />
                </div>

                {/* Contrôles dépense / ajout direct */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => applyFluctuation(-1, 'Dépense GM')}
                        disabled={current <= 0 || loading}
                        className="py-1.5 px-3 text-xs rounded-sm border border-danger text-danger
                                   hover:bg-danger/10 disabled:opacity-30 transition-colors"
                    >
                        −1D
                    </button>
                    <button
                        onClick={() => applyFluctuation(1, 'Ajout GM')}
                        disabled={loading}
                        className="py-1.5 px-3 text-xs rounded-sm border border-accent text-accent
                                   hover:bg-accent/10 disabled:opacity-30 transition-colors"
                    >
                        +1D
                    </button>
                    <button
                        onClick={() => applyFluctuation(0 - current, 'Remise à zéro')}
                        disabled={current === 0 || loading}
                        className="py-1.5 px-3 text-xs rounded-sm border border-default text-muted
                                   hover:text-default disabled:opacity-30 transition-colors"
                    >
                        Vider
                    </button>
                </div>

                {/* Fluctuations narratives */}
                <div>
                    <p className="text-muted text-xs uppercase tracking-widest mb-2">Fluctuations narratives</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => applyFluctuation(+3, 'Principe accompli — 1 membre')}
                            className="py-1.5 text-xs rounded-sm border border-accent/50 text-accent
                                       hover:bg-accent/10 transition-colors"
                        >
                            ⚓ +3D  principe (1 membre)
                        </button>
                        <button
                            onClick={() => applyFluctuation(+5, 'Principe accompli — groupe')}
                            className="py-1.5 text-xs rounded-sm border border-accent text-accent
                                       hover:bg-accent/10 transition-colors font-bold"
                        >
                            ⚓ +5D  principe (groupe)
                        </button>
                        <button
                            onClick={() => applyFluctuation(-3, 'Interdit transgressé — 1 membre')}
                            className="py-1.5 text-xs rounded-sm border border-danger/50 text-danger
                                       hover:bg-danger/10 transition-colors"
                        >
                            ✕ −3D  interdit (1 membre)
                        </button>
                        <button
                            onClick={() => applyFluctuation(-5, 'Interdit transgressé — groupe')}
                            className="py-1.5 text-xs rounded-sm border border-danger text-danger
                                       hover:bg-danger/10 transition-colors font-bold"
                        >
                            ✕ −5D  interdit (groupe)
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Règle d'accès ─────────────────────────────────────────── */}
            <div className="ns-card ns-paper space-y-2">
                <h3 className="ns-domain-header text-primary">Règle d'accès</h3>
                <div className="space-y-1">
                    {REGLE_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="regle_acces"
                                value={opt.value}
                                checked={groupReserve.regle_acces === opt.value}
                                onChange={() => updateGroupReserve({ regle_acces: opt.value })}
                                className="mt-0.5 accent-primary"
                            />
                            <span className={`text-sm ${groupReserve.regle_acces === opt.value ? 'text-default' : 'text-muted'}`}>
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* ── Principes & Interdits ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">

                {/* Principes */}
                <div className="ns-card ns-paper space-y-3">
                    <h3 className="ns-domain-header text-accent">Principes</h3>
                    <ul className="space-y-1.5">
                        {principes.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 group">
                                <span className="text-accent text-xs mt-0.5 shrink-0">⚓</span>
                                <span className="text-default text-sm flex-1 leading-snug">{p}</span>
                                <button
                                    onClick={() => removePrincipe(i)}
                                    className="text-muted hover:text-danger text-xs opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                        {principes.length === 0 && (
                            <p className="text-muted text-xs italic">Aucun principe défini.</p>
                        )}
                    </ul>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            className="flex-1 bg-surface-alt border border-default rounded px-2 py-1 text-default text-xs"
                            placeholder="Ajouter un principe…"
                            value={principeDraft}
                            onChange={e => setPrincipeDraft(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addPrincipe()}
                        />
                        <button
                            onClick={addPrincipe}
                            disabled={!principeDraft.trim()}
                            className="px-2 py-1 text-xs rounded bg-accent/20 text-accent border border-accent/40
                                       hover:bg-accent/30 disabled:opacity-30 transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Interdits */}
                <div className="ns-card ns-paper space-y-3">
                    <h3 className="ns-domain-header text-danger">Interdits</h3>
                    <ul className="space-y-1.5">
                        {interdits.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 group">
                                <span className="text-danger text-xs mt-0.5 shrink-0">✕</span>
                                <span className="text-default text-sm flex-1 leading-snug">{p}</span>
                                <button
                                    onClick={() => removeInterdit(i)}
                                    className="text-muted hover:text-danger text-xs opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                        {interdits.length === 0 && (
                            <p className="text-muted text-xs italic">Aucun interdit défini.</p>
                        )}
                    </ul>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            className="flex-1 bg-surface-alt border border-default rounded px-2 py-1 text-default text-xs"
                            placeholder="Ajouter un interdit…"
                            value={interditDraft}
                            onChange={e => setInterditDraft(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addInterdit()}
                        />
                        <button
                            onClick={addInterdit}
                            disabled={!interditDraft.trim()}
                            className="px-2 py-1 text-xs rounded bg-danger/20 text-danger border border-danger/40
                                       hover:bg-danger/30 disabled:opacity-30 transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Notes partagées ───────────────────────────────────────── */}
            <div className="ns-card ns-paper space-y-2">
                <h3 className="ns-domain-header text-primary">Notes partagées</h3>
                <textarea
                    rows={4}
                    className="w-full bg-surface-alt border border-default rounded px-2 py-1.5
                               text-default text-sm resize-none"
                    value={groupReserve.notes ?? ''}
                    onChange={e => updateGroupReserve({ notes: e.target.value })}
                    placeholder="Notes visibles de tous les joueurs…"
                />
            </div>

            {/* ── Rappel des règles ─────────────────────────────────────── */}
            <div className="ns-card">
                <h3 className="ns-domain-header text-muted mb-3">Rappel mécanique</h3>
                <ul className="text-muted text-xs space-y-1.5 leading-snug">
                    <li>· Le sacrifice réduit définitivement le maximum de réserve personnelle.</li>
                    <li>· La dépense en jeu coûte 1D — définitif, quelle que soit l'issue du jet.</li>
                    <li>· Limite : 1D par jet, sans bonus de spécialité.</li>
                    <li>· +3D/+5D selon l'accomplissement d'un principe (1 membre / groupe).</li>
                    <li>· −3D/−5D selon la transgression d'un interdit (même logique).</li>
                </ul>
            </div>
        </div>
    );
};

export default TabReserveGroupe;