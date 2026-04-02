import {STAT_LABELS} from "../../config.jsx";
import React from "react";
import {Card} from "./Card.jsx";

const HEX_GRID = [
    { stat: 'cran',   col: 0, row: 0 },
    { stat: 'pro',    col: 1, row: 0 },
    { stat: 'chair',  col: 0, row: 1 },
    { stat: 'esprit', col: 1, row: 1 },
    { stat: 'style',  col: 0, row: 2 },
    { stat: 'synth',  col: 1, row: 2 },
];

// Hexagone de stat cliquable
const StatHex = ({ statKey, value, onClick }) => {
    const HEX_SIZE = 60;

    return (
        <button
            onClick={() => onClick(statKey)}
            title={`Jet de ${STAT_LABELS[statKey]} (${value >= 0 ? '+' : ''}${value})`}
            // On utilise "group" pour piloter les enfants
            className="group relative flex flex-col items-center justify-center transition-all active:scale-90"
            style={{
                width: `${HEX_SIZE}px`,
                height: `${Math.round(HEX_SIZE * 1.15)}px`,
                background: 'none', border: 'none', padding: 0
            }}
        >
            {/* 1. Le SVG (Fond + Bordure) */}
            <svg
                viewBox="0 0 100 115"
                className={`
                    absolute inset-0 w-full h-full transition-all duration-300
                    text-primary/20 fill-surface/10
                    group-hover:text-primary/100 group-hover:glow-sm-primary/80
                `}
                style={{ stroke: 'currentColor', fill: 'var(--cp-hex-bg)' }}
            >
                <polygon
                    points="50 0, 100 28.75, 100 86.25, 50 115, 0 86.25, 0 28.75"
                    fill="var(--cp-hex-bg)"
                    stroke="var(--cp-hex-border)"
                    strokeWidth="4"
                    className="transition-all duration-300 group-hover:stroke-[6px]"
                />
            </svg>

            {/* 2. L'effet de Scanline (uniquement au hover via CSS) */}
            <div className="hex-scan-container">
                <div className="hex-scan-line" style={{ animationDuration: '0.8s', height: '2px', opacity: 0.7 }} />
                <div
                    className="hex-glitch-line cp-bg-glow-amber"
                    style={{
                        animationDuration: '1.8s, 0.1s, 0.3s',
                        animationDelay: '-0.5s',
                        height: '1px',
                        filter: 'blur(1px)'
                    }}
                />
            </div>

            {/* 3. La Valeur (+1, -2, etc.) */}
            <span
                className={`
                    cp-font-mono font-bold text-xl select-none z-10 transition-all
                    text-primary/80 group-hover:text-primary/100 group-hover:glow-xs-primary/100 group-hover:animate-glitch-amber
                `}
                //style={{ color: 'var(--cp-hex-text)' }}
            >
                {value >= 0 ? `+${value}` : value}
            </span>
        </button>
    );
};

/**
 *
 * @param {boolean} editMode
 * @param {object} char
 * @param {object} editableChar
 * @param {function} setMoveModal
 * @param {function} set
 * @returns {React.JSX.Element}
 * @constructor
 */
export const StatCard = ({ editMode, char, editableChar, setMoveModal, set }) => {
    // Calcul de position honeycomb
    const HEX_W    = 75;  // espacement horizontal
    const HEX_H    = 80;  // espacement vertical
    const OFFSET_X = 10;  // décalage X colonne droite
    const OFFSET_Y = 40;  // décalage Y colonne droite (demi-hex)
    const HEX_FULL_HEIGHT = Math.round(HEX_W * 1.15); // La hauteur réelle de l'hexagone

// 2. Calcule la hauteur totale nécessaire
// On cherche la ligne max (row) et on ajoute l'offset de la colonne 2 + la taille d'un hexagone
    const maxRow = Math.max(...HEX_GRID.map(h => h.row));
    const totalGridHeight = (maxRow * HEX_H) + OFFSET_Y + HEX_FULL_HEIGHT;
    return (
        <Card title="Stats">
            <div
                className="relative w-full flex items-center justify-center"
                style={{ height: `${totalGridHeight + 20}px` }}
            >
                {HEX_GRID.map(({ stat, col, row }) => {
                    const x = col * (HEX_W + OFFSET_X);
                    const y = row * HEX_H + (col === 1 ? OFFSET_Y : 0);
                    const isRight = col === 1;

                    return (
                        <div
                            key={stat}
                            className={`flex items-center gap-3 ${isRight ? 'flex-row' : 'flex-row-reverse'}`}
                            style={{
                                position:  'absolute',
                                top:       `${y}px`,

                                left: isRight
                                    ? `calc(50% + ${OFFSET_X / 2}px)`
                                    : `calc(50% - ${OFFSET_X / 2}px)`,

                                // On retire la largeur fixe pour que le texte puisse dépasser sur les côtés
                                transform: isRight ? 'none' : 'translateX(-100%)',
                                // Note : si tes X sont déjà calculés pour le centre,
                                // ajuste le transform ou le point d'ancrage.
                            }}
                        >
                            {/* 1. L'Hexagone (Le bouton principal) */}
                            <div className="shrink-0">
                                <StatHex
                                    statKey={stat}
                                    value={editMode
                                        ? (editableChar?.[stat] ?? 0)
                                        : (char?.[stat] ?? 0)
                                    }
                                    onClick={(s) => {
                                        if (!editMode) {
                                            setMoveModal({ mode: 'stat', statKey: s });
                                        }
                                    }}
                                />
                            </div>

                            {/* 2. Bloc Texte + Edition */}
                            <div className={`flex flex-col ${isRight ? 'items-start' : 'items-end'}`}>
                                <span
                                    className={`
                                        text-[18px] cp-font-mono font-bold uppercase tracking-widest leading-none mb-1 transition-all
                                        text-muted/50 group-hover/item:text-accent/100 group-hover/item:glow-3xs-accent
                                    `}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {STAT_LABELS[stat]}
                                </span>

                                {/* Contrôles édition */}
                                {editMode && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => set(stat, Math.max(-2, (editableChar?.[stat] ?? 0) - 1))}
                                            className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                                            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
                                        >
                                            −
                                        </button>
                                        <button
                                            onClick={() => {
                                                const max = (editableChar?.baseAdvancements ?? 0) >= 5 ? 3 : 2;
                                                set(stat, Math.min(max, (editableChar?.[stat] ?? 0) + 1));
                                            }}
                                            className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                                            style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {!editMode && (
                <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Cliquez sur un hexagone pour déclencher un jet
                </p>
            )}
        </Card>
    );
}
