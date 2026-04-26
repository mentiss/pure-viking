/**
 * SteamTrainProgress.jsx — Noctis Solis
 *
 * Locomotive steampunk angulaire vue de profil :
 *  - Corps uniforme (hauteur constante, pas de cabine surélevée)
 *  - Cabine conducteur à l'ARRIÈRE (gauche) = petite fenêtre unique
 *  - Pas de fenêtres passagers — c'est une locomotive de fret/vapeur
 *  - Grilles d'évacuation latérales sur le corps central
 *  - Nez multi-facettes angulaire à l'avant (droite)
 *  - Rail = une seule ligne horizontale (profil)
 *  - À l'arrêt : grilles s'ouvrent + lueur radiale de fournaise + vapeur
 *  - Wagons progressifs (1 par étape franchie)
 */

import React, { useState, useEffect, useRef } from 'react';

/* ── Dimensions ─────────────────────────────────────────────────────────── */
const LOCO_W        = 60;
const LOCO_H        = 24;
const WAGON_W       = 32;
const WAGON_GAP     = 0;
const MAX_WAGONS    = 4;
const MOVE_DURATION = 3000;

/* ── ID unique par montage (pour les filtres SVG) ───────────────────────── */
let _uid = 0;

/* ── Animations CSS ─────────────────────────────────────────────────────── */
const STYLE = `
    @keyframes ns-tr-steam {
        0%   { transform: translate(0,0)      scale(1);    opacity: 0.7;  }
        55%  { transform: translate(-3px,-14px) scale(1.5); opacity: 0.25; }
        100% { transform: translate(-5px,-30px) scale(0.3); opacity: 0;   }
    }
    @keyframes ns-tr-glow-pulse {
        0%,100% { opacity: 0.55; }
        50%     { opacity: 0.90; }
    }
    @keyframes ns-tr-wagon-in {
        from { opacity:0; transform:translateX(6px); }
        to   { opacity:1; transform:translateX(0);   }
    }
`;

/* ── Vapeur ──────────────────────────────────────────────────────────────── */
const SteamPuff = ({ x, y, delay }) => (
    <div style={{
        position:      'absolute',
        left:          x,
        top:           y,
        width:         8,
        height:        7,
        borderRadius:  '50%',
        background:    'color-mix(in srgb, var(--ns-ornament) 50%, var(--color-muted))',
        opacity:       0,
        pointerEvents: 'none',
        animation:     `ns-tr-steam ${1.6 + delay * 0.4}s ${delay}s ease-out infinite`,
    }} />
);

/* ═══════════════════════════════════════════════════════════════════════════
   SVG LOCOMOTIVE
   ViewBox 0 0 76 38
   Avant (nez) = DROITE. Cabine conducteur = GAUCHE (arrière).

   Corps (uniforme) :
     x=0 à x=60 : corps chaudière/moteur (rectangle)
     x=60 à x=72 : nez angulaire (polygon multi-facettes)
     Hauteur : y=5 à y=29 (24px)

   Cabine (intégrée dans le corps, pas plus haute) :
     x=2 à x=18 : zone cabine, identifiée par 1 petite fenêtre et
                  une ligne de séparation verticale

   Grilles : x=24 à x=50, 4 barres horizontales

   Châssis : y=29 à y=33
   Roues   : cy=35, r=5 (x=12, x=40, x=64)
   ═══════════════════════════════════════════════════════════════════════════ */
const LocoSVG = ({ stopped, uid }) => {
    const C  = 'var(--ns-ornament)';
    const BG = 'var(--color-bg)';

    /* Couleur de la fournaise */
    const FURNACE_HOT  = '#e85d04';
    const FURNACE_WARM = '#f48c06';

    return (
        <svg width={LOCO_W} height={LOCO_H} viewBox="0 0 76 38"
             style={{ display:'block', overflow:'visible', flexShrink:0 }}>
            <defs>
                {/* Dégradé radial de la lueur fournaise */}
                <radialGradient id={`fg-${uid}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={FURNACE_HOT}  stopOpacity="0.95" />
                    <stop offset="45%"  stopColor={FURNACE_WARM} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={FURNACE_HOT}  stopOpacity="0"    />
                </radialGradient>
                {/* Halo externe diffus */}
                <radialGradient id={`fh-${uid}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={FURNACE_WARM} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={FURNACE_WARM} stopOpacity="0"    />
                </radialGradient>
            </defs>

            {/* ── Corps principal ──────────────────────────────────── */}
            <rect x="0" y="5" width="60" height="24" fill={C} />

            {/* ── Nez angulaire (droite / avant) ───────────────────── */}
            {/*
                Plan coupé steampunk — 3 facettes angulaires :
                Départ (60,5) → pan haut (66,9) → pointe avant (72,17) →
                base avant (72,29) → (60,29) → retour
            */}
            <polygon
                points="60,5 66,9 72,17 72,29 60,29"
                fill={C}
            />
            {/* Ligne de facette interne */}
            <line x1="60" y1="5"  x2="72" y2="17"
                  stroke={BG} strokeWidth="0.8" opacity="0.4" />

            {/* ── Châssis ───────────────────────────────────────────── */}
            <rect x="-1" y="28" width="75" height="5" fill={C} />

            {/* ── Tampon avant ──────────────────────────────────────── */}
            <rect x="72" y="18" width="4" height="10" fill={C} />

            {/* ── Séparation cabine / chaudière ─────────────────────── */}
            <line x1="19" y1="5" x2="19" y2="29"
                  stroke={BG} strokeWidth="1.2" opacity="0.55" />

            {/* ── Fenêtre cabine conducteur ─────────────────────────── */}
            {/* Petite fenêtre unique, à l'arrière gauche */}
            <rect x="5" y="10" width="10" height="9"
                  fill={BG} opacity="0.85" rx="0" />

            {/* ── Lueur fournaise (uniquement à l'arrêt) ───────────── */}
            {stopped && (
                <>
                    {/* Halo diffus externe — ellipse large */}
                    <ellipse cx="37" cy="17" rx="20" ry="12"
                             fill={`url(#fh-${uid})`}
                             style={{ animation: 'ns-tr-glow-pulse 1.2s 0.1s ease-in-out infinite' }}
                    />
                    {/* Cœur lumineux — ellipse centrée sur les grilles */}
                    <ellipse cx="37" cy="17" rx="13" ry="8"
                             fill={`url(#fg-${uid})`}
                             style={{ animation: 'ns-tr-glow-pulse 0.9s ease-in-out infinite' }}
                    />
                </>
            )}

            {/* ── Grilles d'évacuation latérales ────────────────────── */}
            {/* 4 barres horizontales fines — toujours présentes,
                mais l'espace entre elles laisse voir la lueur à l'arrêt */}
            {[10, 15, 20, 25].map((y, i) => (
                <rect key={i}
                      x="24" y={y} width="26" height="2.5"
                      fill={C}
                />
            ))}

            {/* ── Phare avant (dans le nez) ─────────────────────────── */}
            <circle cx="70" cy="23" r="3.5" fill={C} />
            <circle cx="70" cy="23" r={stopped ? 2.5 : 1.5}
                    fill={stopped
                        ? 'color-mix(in srgb, var(--ns-ornament) 90%, white)'
                        : BG}
                    opacity={stopped ? 1 : 0.6}
                    style={stopped
                        ? { animation: 'ns-tr-glow-pulse 2s ease-in-out infinite' }
                        : {}}
            />

            {/* ── Roues ─────────────────────────────────────────────── */}
            {[12, 40, 62].map((cx, i) => (
                <g key={i}>
                    <circle cx={cx} cy="35" r={i === 2 ? 4 : 5} fill={C} />
                    <circle cx={cx} cy="35" r={i === 2 ? 1.5 : 2}
                            fill={BG} opacity="0.65" />
                </g>
            ))}

        </svg>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SVG WAGON — silhouette de fret (pas de fenêtres passagers)
   ViewBox 0 0 44 38
   ═══════════════════════════════════════════════════════════════════════════ */
const WagonSVG = ({ variant = 0 }) => {
    const C  = 'var(--ns-ornament)';
    const BG = 'var(--color-bg)';

    return (
        <svg width={WAGON_W} height={LOCO_H} viewBox="0 0 44 38"
             style={{ display:'block', overflow:'visible', flexShrink:0 }}>

            {/* Corps */}
            <rect x="1" y="5" width="42" height="24" fill={C} />

            {/* Châssis */}
            <rect x="0" y="28" width="44" height="5" fill={C} />

            {/* Tampons */}
            <rect x="0"  y="14" width="2" height="9" fill={C} />
            <rect x="42" y="14" width="2" height="9" fill={C} />

            {/* Détails selon variant — wagons de fret, pas de fenêtres */}
            {variant === 0 ? (
                /* Wagon couvert : juste une porte coulissante centrale */
                <>
                    <line x1="22" y1="5" x2="22" y2="29"
                          stroke={BG} strokeWidth="1" opacity="0.4" />
                    {/* Poignée de porte */}
                    <rect x="19" y="16" width="6" height="2" fill={BG} opacity="0.5" />
                </>
            ) : (
                /* Wagon plateforme : 3 sangles / liens de chargement */
                <>
                    {[10, 22, 34].map((x, i) => (
                        <line key={i} x1={x} y1="5" x2={x} y2="29"
                              stroke={BG} strokeWidth="1" opacity="0.35" />
                    ))}
                </>
            )}

            {/* Roues */}
            {[9, 35].map((cx, i) => (
                <g key={i}>
                    <circle cx={cx} cy="35" r="5" fill={C} />
                    <circle cx={cx} cy="35" r="2"
                            fill={BG} opacity="0.65" />
                </g>
            ))}

        </svg>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════ */
const SteamTrainProgress = ({ steps, currentStep }) => {
    const n         = steps.length;
    const pct       = n > 1 ? currentStep / (n - 1) : 0;
    const uidRef    = useRef(++_uid);
    const uid       = uidRef.current;

    /* Détection arrêt */
    const [isMoving, setIsMoving] = useState(false);
    useEffect(() => {
        setIsMoving(true);
        const t = setTimeout(() => setIsMoving(false), MOVE_DURATION);
        return () => clearTimeout(t);
    }, [currentStep]);

    const stopped   = !isMoving;
    const numWagons = Math.min(currentStep, MAX_WAGONS);

    const trainLeft = `calc(${pct} * (100% - ${LOCO_W}px))`;
    const stationX  = (i) =>
        `calc(${n > 1 ? i / (n - 1) : 0} * (100% - ${LOCO_W}px) + ${LOCO_W / 2}px)`;

    /* Coords vapeur (relatives au div loco) — grilles à x~24 dans SVG */
    const sx = 20;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: STYLE }} />

            <div style={{ position:'relative', paddingBottom:'1.25rem' }}>

                {/* ── Rail — une seule ligne ───────────────────────── */}
                <div style={{
                    position:   'absolute',
                    bottom:     '15px',
                    left:       0,
                    right:      0,
                    height:     '2px',
                    background: 'var(--ns-ornament)',
                    opacity:    0.5,
                }} />

                {/* ── Marqueurs losange sur le rail ────────────────── */}
                <svg style={{
                    position:      'absolute',
                    bottom:        '10px',
                    left:          `${LOCO_W / 2}px`,
                    width:         `calc(100% - ${LOCO_W}px)`,
                    height:        '18px',
                    pointerEvents: 'none',
                    overflow:      'visible',
                }} preserveAspectRatio="none">
                    {steps.map((_, i) => {
                        const x      = n > 1 ? `${(i / (n - 1)) * 100}%` : '50%';
                        const done   = i < currentStep;
                        const active = i === currentStep;
                        return (
                            <g key={i}>
                                <polygon points="0,-6 5,0 0,6 -5,0"
                                         transform={`translate(${x}, 9)`}
                                         fill={active ? 'var(--ns-ornament)'
                                             : done    ? 'var(--color-muted)'
                                                 :           'var(--color-surface-alt)'}
                                         stroke="var(--ns-ornament)" strokeWidth="0.8"
                                         opacity={active ? 1 : done ? 0.55 : 0.22}
                                         style={{ transition:'fill 0.4s, opacity 0.4s' }}
                                />
                                {done && (
                                    <text transform={`translate(${x}, 13)`}
                                          textAnchor="middle" fill="var(--color-bg)"
                                          fontSize="6" fontWeight="bold">✓</text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* ── Train ───────────────────────────────────────── */}
                <div style={{
                    position:      'absolute',
                    bottom:        '16px',
                    left:          trainLeft,
                    width:         `${LOCO_W}px`,
                    height:        `${LOCO_H}px`,
                    display:       'flex',
                    flexDirection: 'row-reverse',
                    alignItems:    'flex-end',
                    overflow:      'visible',
                    gap:           `${WAGON_GAP}px`,
                    transition:    `left ${MOVE_DURATION}ms cubic-bezier(0.3, 0.05, 0.15, 1)`,
                }}>
                    {/* Locomotive */}
                    <div style={{ position:'relative', flexShrink:0, marginLeft:'-3px' }}>
                        <LocoSVG stopped={stopped} uid={uid} />

                        {/* Vapeur depuis les grilles — uniquement à l'arrêt */}
                        {stopped && (
                            <>
                                <SteamPuff x={sx}      y={-4}  delay={0}    />
                                <SteamPuff x={sx + 8}  y={-7}  delay={0.55} />
                                <SteamPuff x={sx + 4}  y={-3}  delay={1.1}  />
                                <SteamPuff x={sx + 13} y={-5}  delay={0.8}  />
                                <SteamPuff x={sx + 2}  y={-8}  delay={1.5}  />
                                <SteamPuff x={sx + 10} y={-6}  delay={0.3}  />
                            </>
                        )}
                    </div>

                    {/* Wagons progressifs */}
                    {Array.from({ length: MAX_WAGONS }, (_, i) => {
                        const visible = i < numWagons;
                        return (
                            <div key={i} style={{
                                flexShrink:    0,
                                marginRight:   '-2px',
                                opacity:       visible ? 1 : 0,
                                animation:     visible
                                    ? `ns-tr-wagon-in 0.35s ${i * 0.1}s both ease-out`
                                    : 'none',
                                pointerEvents: 'none',
                            }}>
                                <WagonSVG variant={i % 2} />
                            </div>
                        );
                    })}
                </div>

                {/* ── Labels ──────────────────────────────────────── */}
                {steps.map((s, i) => {
                    const active = i === currentStep;
                    const done   = i < currentStep;
                    return (
                        <div key={i} style={{
                            position:      'absolute',
                            bottom:        0,
                            left:          stationX(i),
                            transform:     'translateX(-50%)',
                            textAlign:     'center',
                            fontFamily:    'var(--ns-font-tech)',
                            fontSize:      '0.55rem',
                            fontWeight:    active ? 600 : 400,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color:         active ? 'var(--ns-ornament)' : 'var(--color-muted)',
                            opacity:       active ? 1 : done ? 0.65 : 0.28,
                            whiteSpace:    'nowrap',
                            transition:    'color 0.4s, opacity 0.4s',
                            pointerEvents: 'none',
                        }}>
                            {s.label}
                        </div>
                    );
                })}

                {/* Espace réservé */}
                <div style={{ height:`${LOCO_H + 28}px` }} />
            </div>
        </>
    );
};

export default SteamTrainProgress;