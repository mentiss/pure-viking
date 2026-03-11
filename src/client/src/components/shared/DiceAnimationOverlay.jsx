// src/client/src/components/shared/DiceAnimationOverlay.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Overlay animation 3D des dés via dice-box-threejs.
//
// ARCHITECTURE SINGLETON :
// Ce composant est monté UNE SEULE FOIS dans PlayerPage.jsx et GMPage.jsx.
// Il s'abonne au diceAnimBridge à son mount — diceEngine.roll() appelle
// diceAnimBridge.play(seq) et attend la promesse que ce composant résout.
//
// ⚠️ FIX SPINNER GM :
// Le composant ne retourne JAMAIS null. Quand inactif, il reste dans le DOM
// mais est invisible (z-index -1, transparent, sans pointer-events).
// Raison : si on retourne null, containerRef.current vaut null au moment
// où l'useEffect d'init DiceBox s'exécute → DiceBox ne s'initialise pas →
// isReady reste false → le spinner tourne indéfiniment dès qu'une animation
// est déclenchée.
//
// Format AnimationSequence attendu :
// {
//   mode: 'single',
//   groups: [{ id, diceType, color, label, waves }],
// }
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox from '@3d-dice/dice-box-threejs';
import { diceAnimBridge } from '../../tools/diceAnimBridge.js';
import { buildDiceBoxConfig, readDiceConfig } from '../modals/DiceConfigModal.jsx';

const WAVE_SETTLE_DELAY = 800;
const EXPLOSION_FLASH   = 350;
const END_DISPLAY_DELAY = 1200;

const DiceAnimationOverlay = () => {
    // currentSequence : AnimationSequence | null
    // null = overlay masqué (mais composant toujours monté)
    const [currentSequence, setCurrentSequence] = useState(null);

    const containerRef  = useRef(null);
    const diceBoxRef    = useRef(null);
    const abortedRef    = useRef(false);

    const [isReady,     setIsReady]     = useState(false);
    const [label,       setLabel]       = useState('');
    const [isExploding, setIsExploding] = useState(false);
    const [isFinished,  setIsFinished]  = useState(false);

    // ── Enregistrement sur le bridge au mount ─────────────────────────────────
    useEffect(() => {
        diceAnimBridge.onPlay((seq) => {
            // Réinitialiser l'état avant chaque animation
            setIsFinished(false);
            setLabel('');
            setIsExploding(false);
            setCurrentSequence(seq);
        });
    }, []);

    // ── Handlers bridge ───────────────────────────────────────────────────────
    const handleComplete = useCallback(() => {
        setCurrentSequence(null);
        diceAnimBridge.complete();
    }, []);

    const handleSkip = useCallback(() => {
        abortedRef.current = true;
        setCurrentSequence(null);
        diceAnimBridge.skip();
    }, []);

    // ── Init DiceBox (une seule fois, monté en permanence) ────────────────────
    // containerRef est toujours dans le DOM (composant ne retourne jamais null)
    // donc cet effet peut s'exécuter correctement dès le mount.
    useEffect(() => {
        if (!containerRef.current) return;

        const el          = containerRef.current;
        const containerId = `dice-overlay-singleton`;
        el.id             = containerId;
        el.style.width    = `${window.innerWidth}px`;
        el.style.height   = `${window.innerHeight}px`;

        const userConfig = buildDiceBoxConfig(readDiceConfig());

        const box = new DiceBox(`#${containerId}`, {
            assetPath: '/dice-assets/',
            ...userConfig,
        });

        box.initialize()
            .then(() => {
                const canvas = el.querySelector('canvas');
                if (canvas) {
                    Object.assign(canvas.style, {
                        position: 'absolute',
                        top: '0', left: '0',
                        width: '100%', height: '100%',
                        zIndex: '1',
                    });
                }
                diceBoxRef.current = box;
                setIsReady(true);
            })
            .catch(err => {
                console.error('[DiceAnimationOverlay] Init error:', err);
            });

        return () => {
            try { diceBoxRef.current?.clearDice?.(); } catch (_) {}
            diceBoxRef.current = null;
        };
    }, []);

    // ── Lancer l'animation dès qu'une séquence arrive ET que le box est prêt ──
    useEffect(() => {
        if (currentSequence && isReady) {
            abortedRef.current = false;
            runAnimation(currentSequence);
        }
    }, [currentSequence, isReady]);

    // ── Orchestrateur ─────────────────────────────────────────────────────────
    const runAnimation = async (seq) => {
        const box = diceBoxRef.current;
        if (!box || !seq) return;

        try {
            await playSingle(box, seq.groups || []);
        } catch (err) {
            if (!abortedRef.current) console.error('[DiceAnimationOverlay]', err);
        }

        if (abortedRef.current) return;

        setIsFinished(true);
        setLabel('');
        await delay(END_DISPLAY_DELAY);

        if (!abortedRef.current) handleComplete();
    };

    // ── Joue tous les groupes en séquence ─────────────────────────────────────
    const playSingle = async (box, groups) => {
        for (let gi = 0; gi < groups.length; gi++) {
            if (abortedRef.current) return;
            await playGroup(box, groups[gi]);
            if (gi < groups.length - 1) {
                await delay(WAVE_SETTLE_DELAY);
                box.clearDice();
                await delay(300);
            }
        }
    };

    // ── Joue un groupe (toutes ses vagues) ────────────────────────────────────
    const playGroup = async (box, group) => {
        const { diceType, waves, label: groupLabel } = group;

        for (let i = 0; i < waves.length; i++) {
            if (abortedRef.current) return;
            const wave = waves[i];

            if (i > 0) {
                setIsExploding(true);
                await delay(EXPLOSION_FLASH);
                if (abortedRef.current) return;
                setIsExploding(false);
                setLabel(`💥 Explosion ! (vague ${i + 1})`);
                box.clearDice();
                await delay(200);
            } else {
                setLabel(groupLabel || '');
            }

            if (abortedRef.current) return;
            await rollAndWait(box, buildBoxNotation(wave.dice, diceType));
            if (i < waves.length - 1) await delay(WAVE_SETTLE_DELAY);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const buildBoxNotation = (diceValues, diceType) =>
        `${diceValues.length}${diceType}@${diceValues.join(',')}`;

    const rollAndWait = (box, notation) =>
        new Promise(resolve => box.roll(notation).then(resolve));

    // ── Rendu ─────────────────────────────────────────────────────────────────
    // On ne retourne JAMAIS null — le conteneur DiceBox doit toujours être dans
    // le DOM pour que l'initialisation fonctionne (PlayerPage ET GMPage).
    // Quand inactif : z-index négatif + transparent + sans interaction.
    const isActive = !!currentSequence;

    return (
        <div
            className="fixed inset-0"
            style={{
                zIndex:        isActive ? 200 : -1,
                background:    isActive ? 'rgba(8, 5, 2, 0.93)' : 'transparent',
                pointerEvents: isActive ? 'auto' : 'none',
            }}
            onClick={e => isActive && e.stopPropagation()}
        >
            {/* Container DiceBox — toujours présent pour l'init */}
            <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0 }} />

            {/* Contenu visible seulement quand une animation est en cours */}
            {isActive && (
                <>
                    {label && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 10 }}>
                            <div className={`px-6 py-2 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
                                isExploding
                                    ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/50'
                                    : 'bg-white/10 text-white/80 backdrop-blur-sm'
                            }`}>
                                {label}
                            </div>
                        </div>
                    )}

                    {isExploding && (
                        <div className="absolute inset-0 pointer-events-none" style={{
                            zIndex: 9,
                            background: 'radial-gradient(circle at center, rgba(251,146,60,0.3) 0%, transparent 70%)',
                        }} />
                    )}

                    {!isReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ zIndex: 10 }}>
                            <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                            <span className="text-white/60 text-sm tracking-wide">Invocation des dés…</span>
                        </div>
                    )}

                    {isReady && !isFinished && (
                        <button
                            onClick={handleSkip}
                            className="absolute bottom-6 right-6 px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/80 border border-white/10 hover:border-white/30 transition-all duration-200 backdrop-blur-sm"
                            style={{ zIndex: 10 }}
                        >
                            Passer →
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

const delay = ms => new Promise(r => setTimeout(r, ms));

export default DiceAnimationOverlay;