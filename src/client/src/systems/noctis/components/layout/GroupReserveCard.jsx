import { useState } from 'react';
import { useFetch }        from '../../../../hooks/useFetch.js';
import { useSystem }       from '../../../../hooks/useSystem.js';
import {useGroupReserve} from "../../hooks/useGroupReserve.jsx";

const REGLE_LABELS = {
    libre:      'Libre',
    majorite:   'Majorité',
    unanimite:  'Unanimité',
};

// ── Ligne principe ou interdit ────────────────────────────────────────────────
const CodeLine = ({ text, variant }) => (
    <li className="flex items-start gap-2 text-sm">
        <span className={`shrink-0 mt-0.5 text-xs font-bold
            ${variant === 'principe' ? 'text-accent' : 'text-danger'}`}>
            {variant === 'principe' ? '⚓' : '✕'}
        </span>
        <span className="text-default leading-snug">{text}</span>
    </li>
);

// ── Composant principal ───────────────────────────────────────────────────────
const GroupReserveCard = ({ character }) => {
    const { groupReserve, hasSession, updateGroupReserve, applyFluctuation } = useGroupReserve();
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();

    const [notesEdit,   setNotesEdit]   = useState(false);
    const [notesDraft,  setNotesDraft]  = useState('');
    const [sacrificeOpen, setSacrificeOpen] = useState(false);

    const current = groupReserve.current ?? 0;
    const hasContent = groupReserve.principes?.length > 0
        || groupReserve.interdits?.length > 0;

    // Barre étherum — teal, graduée
    const gaugeMax = Math.max(current, 12); // jauge relative, plancher à 12
    const pct      = gaugeMax > 0 ? Math.min(100, (current / gaugeMax) * 100) : 0;

    // La réserve peut être utilisée si règle libre (ou forcée par prop GM — géré dans TabReserveGroupe)
    const canSpend = hasSession && current > 0 && groupReserve.regle_acces === 'libre';

    // ── Sacrifice : réduit la réserve perso + alimente la réserve de groupe ───
    const handleSacrifice = async (reserveType) => {
        if (!character) return;
        const maxKey  = reserveType === 'effort' ? 'reserve_effort_max'     : 'reserve_sangfroid_max';
        const currKey = reserveType === 'effort' ? 'reserve_effort_current' : 'reserve_sangfroid_current';
        const currMax = character[maxKey]  ?? 0;
        const currVal = character[currKey] ?? 0;
        if (currMax <= 0) return;

        // PATCH le personnage (réduit le max définitivement)
        await fetchWithAuth(`${apiBase}/characters/${character.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                [maxKey]:  currMax - 1,
                [currKey]: Math.min(currVal, currMax - 1),
            }),
        });
        // Alimente la réserve de groupe
        await applyFluctuation(1, `Sacrifice ${reserveType} — ${character.prenom ?? ''}`);
        setSacrificeOpen(false);
    };

    const handleNotesSave = () => {
        updateGroupReserve({ notes: notesDraft });
        setNotesEdit(false);
    };

    // ── Rendu : pas de session ─────────────────────────────────────────────────
    if (!hasSession) {
        return (
            <div className="ns-card ns-paper flex items-center justify-center py-6">
                <p className="text-muted text-xs italic text-center">
                    Réserve de compagnie<br />
                    <span className="opacity-60">— aucune session active —</span>
                </p>
            </div>
        );
    }

    return (
        <div
            className={`ns-card ns-paper space-y-3 transition-shadow duration-700
                ${current > 0 ? 'ns-etherum-glow' : ''}`}
        >
            {/* ── En-tête ────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="ns-domain-header text-accent">
                        Réserve de Compagnie
                    </h3>
                    <p className="text-muted text-xs mt-0.5">
                        Accès : <span className="text-default">{REGLE_LABELS[groupReserve.regle_acces] ?? '—'}</span>
                    </p>
                </div>

                {/* Compteur proéminent */}
                <div className="text-right">
                    <span
                        className="font-bold text-4xl font-mono leading-none"
                        style={{
                            color:      current > 0 ? 'var(--color-accent)' : 'var(--color-muted)',
                            textShadow: current > 0
                                ? '0 0 12px color-mix(in srgb, var(--color-accent) 50%, transparent)'
                                : 'none',
                        }}
                    >
                        {current}
                    </span>
                    <p className="text-muted text-xs">dés</p>
                </div>
            </div>

            {/* ── Manomètre étherum ─────────────────────────────────────── */}
            <div className="ns-gauge-track border border-ns-sangfroid" style={{ borderColor: 'var(--color-accent)' }}>
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

            {/* ── Dépense ───────────────────────────────────────────────── */}
            <div className="flex gap-2">
                <button
                    onClick={() => applyFluctuation(-1, 'Dépense jet')}
                    disabled={!canSpend}
                    className="flex-1 py-1 text-xs rounded-sm border text-muted
                               hover:text-default hover:border-muted disabled:opacity-25 transition-colors"
                    style={{ borderColor: canSpend ? 'var(--color-accent)' : undefined,
                        color:       canSpend ? 'var(--color-accent)' : undefined }}
                >
                    −1D Dépenser
                </button>
                <button
                    onClick={() => setSacrificeOpen(v => !v)}
                    className="px-3 py-1 text-xs rounded-sm border border-default text-muted
                               hover:text-default hover:border-muted transition-colors"
                    title="Sacrifier une dé de réserve personnelle"
                >
                    ⇡ Sacrifice
                </button>
            </div>

            {/* ── Panneau sacrifice ─────────────────────────────────────── */}
            {sacrificeOpen && (
                <div className="rounded p-3 space-y-2"
                     style={{ background: 'var(--color-surface-alt)', border: '1px dashed var(--color-border)' }}>
                    <p className="text-muted text-xs italic leading-snug">
                        Sacrifier un dé réduit définitivement votre maximum de réserve
                        et alimente la réserve de compagnie.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSacrifice('effort')}
                            disabled={(character?.reserve_effort_max ?? 0) <= 0}
                            className="flex-1 py-1.5 text-xs rounded-sm border border-ns-effort text-ns-effort
                                       hover:bg-ns-effort/10 disabled:opacity-30 transition-colors"
                        >
                            −1 Effort
                            <span className="text-muted ml-1">
                                (max : {character?.reserve_effort_max ?? 0})
                            </span>
                        </button>
                        <button
                            onClick={() => handleSacrifice('sangfroid')}
                            disabled={(character?.reserve_sangfroid_max ?? 0) <= 0}
                            className="flex-1 py-1.5 text-xs rounded-sm border border-ns-sangfroid text-ns-sangfroid
                                       hover:bg-ns-sangfroid/10 disabled:opacity-30 transition-colors"
                        >
                            −1 Sang-Froid
                            <span className="text-muted ml-1">
                                (max : {character?.reserve_sangfroid_max ?? 0})
                            </span>
                        </button>
                    </div>
                    <button
                        onClick={() => setSacrificeOpen(false)}
                        className="w-full text-xs text-muted hover:text-default"
                    >
                        Annuler
                    </button>
                </div>
            )}

            {/* ── Code moral : principes & interdits ───────────────────── */}
            {hasContent && (
                <>
                    <hr className="ns-divider-ornate" />
                    <div className="grid grid-cols-2 gap-4">
                        {groupReserve.principes?.length > 0 && (
                            <div>
                                <p className="text-accent text-xs uppercase tracking-widest mb-1.5 font-bold">
                                    Principes
                                </p>
                                <ul className="space-y-1.5">
                                    {groupReserve.principes.map((p, i) => (
                                        <CodeLine key={i} text={p} variant="principe" />
                                    ))}
                                </ul>
                            </div>
                        )}
                        {groupReserve.interdits?.length > 0 && (
                            <div>
                                <p className="text-danger text-xs uppercase tracking-widest mb-1.5 font-bold">
                                    Interdits
                                </p>
                                <ul className="space-y-1.5">
                                    {groupReserve.interdits.map((p, i) => (
                                        <CodeLine key={i} text={p} variant="interdit" />
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Notes partagées ───────────────────────────────────────── */}
            <hr className="ns-divider" />
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-muted text-xs uppercase tracking-widest">
                        Notes partagées
                    </label>
                    {!notesEdit && (
                        <button
                            onClick={() => { setNotesDraft(groupReserve.notes ?? ''); setNotesEdit(true); }}
                            className="text-xs text-muted hover:text-default transition-colors"
                        >
                            Modifier
                        </button>
                    )}
                </div>
                {notesEdit ? (
                    <div className="space-y-1">
                        <textarea
                            rows={3}
                            autoFocus
                            className="w-full bg-surface-alt border border-default rounded px-2 py-1.5
                                       text-default text-sm resize-none"
                            value={notesDraft}
                            onChange={e => setNotesDraft(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleNotesSave}
                                className="flex-1 py-1 text-xs rounded-sm bg-primary text-bg font-bold"
                            >
                                ✓ Sauvegarder
                            </button>
                            <button
                                onClick={() => setNotesEdit(false)}
                                className="px-3 py-1 text-xs rounded-sm border border-default text-muted"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-default text-sm whitespace-pre-wrap min-h-[2rem] italic"
                       style={{ opacity: 0.8 }}>
                        {groupReserve.notes || <span className="text-muted not-italic">—</span>}
                    </p>
                )}
            </div>
        </div>
    );
};

export default GroupReserveCard;