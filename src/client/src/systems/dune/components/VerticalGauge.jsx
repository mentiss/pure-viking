// src/client/src/systems/dune/components/VerticalGauge.jsx
// Jauge verticale Dune — 0 en bas, max en haut.
// Composant purement visuel : reçoit value, max, callbacks.
// Utilisé dans Sheet.jsx (flancs) et TabResources.jsx (GM).

import React from 'react';

/**
 * @param {object}   props
 * @param {string}   props.label       — Libellé affiché en haut
 * @param {number}   props.value       — Valeur actuelle
 * @param {number}   props.max         — Valeur maximale (cellules affichées)
 * @param {string}   props.filledColor — Couleur CSS des cellules remplies
 * @param {string}   props.emptyColor  — Couleur CSS des cellules vides
 * @param {string}   props.borderColor — Couleur CSS du contour des cellules
 * @param {Function} [props.onInc]     — Callback sur + (undefined = désactivé)
 * @param {Function} [props.onDec]     — Callback sur − (undefined = désactivé)
 * @param {boolean}  [props.readonly]  — Masque les boutons
 * @param {string}   [props.className] — Classes supplémentaires sur le container
 */
const VerticalGauge = ({
                           label,
                           value,
                           max,
                           filledColor,
                           emptyColor  = 'transparent',
                           borderColor,
                           onInc,
                           onDec,
                           readonly    = false,
                           className   = '',
                       }) => {
    // Hauteur d'une cellule — on cible ~240px de hauteur totale de barre
    const cellH = Math.max(14, Math.floor(240 / max));

    return (
        <div
            className={`flex flex-col items-center gap-1 select-none ${className}`}
            style={{ userSelect: 'none' }}
        >
            {/* Label */}
            <span
                className="text-[9px] font-bold tracking-widest uppercase text-center leading-tight"
                style={{ color: borderColor, writingMode: 'horizontal-tb' }}
            >
                {label}
            </span>

            {/* Valeur numérique */}
            <span
                className="text-sm font-bold tabular-nums"
                style={{ color: filledColor }}
            >
                {value}
            </span>

            {/* Barre verticale — flex-col-reverse → index 0 = bas */}
            <div
                className="flex flex-col-reverse gap-px"
                style={{ width: 28 }}
            >
                {Array.from({ length: max }).map((_, i) => {
                    const filled = i < value;
                    return (
                        <div
                            key={i}
                            style={{
                                height:        cellH,
                                width:         '100%',
                                borderRadius:  3,
                                background:    filled ? filledColor : emptyColor,
                                border:        `1.5px solid ${borderColor}`,
                                opacity:       filled ? 1 : 0.35,
                                transition:    'background 0.15s ease',
                            }}
                        />
                    );
                })}
            </div>

            {/* Boutons */}
            {!readonly && (
                <div className="flex flex-col gap-1 mt-1">
                    {/* + en haut (ajoute) */}
                    <button
                        onClick={onInc}
                        disabled={!onInc || value >= max}
                        className="w-7 h-7 rounded font-bold text-sm flex items-center justify-center disabled:opacity-25 transition-opacity"
                        style={{ background: filledColor, color: '#fff' }}
                        title={`+1 ${label}`}
                    >
                        +
                    </button>
                    {/* − en bas (retire) */}
                    <button
                        onClick={onDec}
                        disabled={!onDec || value <= 0}
                        className="w-7 h-7 rounded font-bold text-sm flex items-center justify-center disabled:opacity-25 transition-opacity"
                        style={{ background: 'transparent', color: filledColor, border: `1.5px solid ${filledColor}` }}
                        title={`-1 ${label}`}
                    >
                        −
                    </button>
                </div>
            )}
        </div>
    );
};

export default VerticalGauge;