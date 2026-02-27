/**
 * DiceAnimationOverlay.jsx
 * Emplacement : src/client/src/components/shared/DiceAnimationOverlay.jsx
 *
 * Importe buildDiceBoxConfig et readDiceConfig depuis DiceConfigModal.jsx
 * (même dossier shared/) — pas de hook externe.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox from '@3d-dice/dice-box-threejs';
import { buildDiceBoxConfig, readDiceConfig } from '../modals/DiceConfigModal.jsx';

const WAVE_SETTLE_DELAY  = 800;
const EXPLOSION_FLASH    = 350;
const END_DISPLAY_DELAY  = 1200;

const DiceAnimationOverlay = ({ sequences, diceType = 'd10', onComplete, onSkip }) => {
    const containerRef    = useRef(null);
    const diceBoxRef      = useRef(null);
    const abortedRef      = useRef(false);
    const onCompleteRef   = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    const [isReady,     setIsReady]     = useState(false);
    const [label,       setLabel]       = useState('');
    const [isExploding, setIsExploding] = useState(false);
    const [isFinished,  setIsFinished]  = useState(false);

    // ── Init DiceBox ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;
        abortedRef.current = false;

        const el = containerRef.current;
        const containerId = `dice-overlay-${Date.now()}`;
        el.id = containerId;
        el.style.width  = `${window.innerWidth}px`;
        el.style.height = `${window.innerHeight}px`;

        // Lire localStorage au moment du montage — valeur fraîche garantie
        const userConfig = buildDiceBoxConfig(readDiceConfig());
        console.log('[DiceAnimationOverlay] Config chargée:', userConfig);

        const box = new DiceBox(`#${containerId}`, {
            assetPath: '/dice-assets/',
            ...userConfig,
        });

        box.initialize()
            .then(() => {
                if (abortedRef.current) return;
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
                onCompleteRef.current?.();
            });

        return () => {
            abortedRef.current = true;
            try { diceBoxRef.current?.clearDice?.(); } catch (_) {}
            diceBoxRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (isReady) runAnimation();
    }, [isReady]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const buildNotation = (diceValues, type) =>
        `${diceValues.length}${type}@${diceValues.join(',')}`;

    const rollAndWait = (box, notation) =>
        new Promise(resolve => box.roll(notation).then(resolve));

    // ── Séquence vagues ───────────────────────────────────────────────────────
    const playSequence = async (box, waveSequence, sequenceLabel = '') => {
        for (let i = 0; i < waveSequence.length; i++) {
            if (abortedRef.current) return;
            const wave = waveSequence[i];

            if (i > 0) {
                setIsExploding(true);
                await delay(EXPLOSION_FLASH);
                if (abortedRef.current) return;
                setIsExploding(false);
                setLabel(`💥 Explosion ! (vague ${i + 1})`);
                box.clearDice();
                await delay(200);
            } else {
                setLabel(sequenceLabel);
            }

            if (abortedRef.current) return;
            await rollAndWait(box, buildNotation(wave.dice, diceType));
            if (i < waveSequence.length - 1) await delay(WAVE_SETTLE_DELAY);
        }
    };

    // ── Mode assurance ────────────────────────────────────────────────────────
    const playInsurance = async (box, { seq1, seq2, keptRoll }) => {
        await playSequence(box, seq1, '🎲 Jet 1');
        if (abortedRef.current) return;
        await delay(WAVE_SETTLE_DELAY);
        box.clearDice();
        await delay(300);

        await playSequence(box, seq2, '🎲 Jet 2');
        if (abortedRef.current) return;
        await delay(WAVE_SETTLE_DELAY);
        box.clearDice();
        await delay(300);

        const keptSeq = keptRoll === 1 ? seq1 : seq2;
        setLabel(keptRoll === 1 ? '✅ Jet 1 gardé !' : '✅ Jet 2 gardé !');
        await rollAndWait(box, buildNotation(keptSeq[0].dice, diceType));
    };

    // ── Orchestrateur ─────────────────────────────────────────────────────────
    const runAnimation = async () => {
        const box = diceBoxRef.current;
        if (!box) return;
        try {
            if (sequences?.type === 'insurance') {
                await playInsurance(box, sequences);
            } else {
                await playSequence(box, sequences);
            }
        } catch (err) {
            if (!abortedRef.current) console.error('[DiceAnimationOverlay]', err);
        }
        if (abortedRef.current) return;
        setIsFinished(true);
        setLabel('');
        await delay(END_DISPLAY_DELAY);
        if (!abortedRef.current) onCompleteRef.current?.();
    };

    const handleSkip = useCallback(() => {
        abortedRef.current = true;
        onSkip?.();
    }, [onSkip]);

    return (
        <div
            className="fixed inset-0 z-[200]"
            style={{ background: 'rgba(8, 5, 2, 0.93)' }}
            onClick={e => e.stopPropagation()}
        >
            <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0 }} />

            {label && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 10 }}>
                    <div className={`px-6 py-2 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
                        isExploding
                            ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/50'
                            : 'bg-viking-bronze/80 text-viking-brown backdrop-blur-sm'
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
                    <div className="w-8 h-8 border-2 border-viking-bronze border-t-transparent rounded-full animate-spin" />
                    <span className="text-viking-parchment/60 text-sm tracking-wide">Invocation des dés...</span>
                </div>
            )}

            {isReady && !isFinished && (
                <button
                    onClick={handleSkip}
                    className="absolute bottom-6 right-6 px-4 py-2 rounded-lg text-xs text-viking-parchment/40 hover:text-viking-parchment/80 border border-white/10 hover:border-white/30 transition-all duration-200 backdrop-blur-sm"
                    style={{ zIndex: 10 }}
                >
                    Passer →
                </button>
            )}
        </div>
    );
};

const delay = ms => new Promise(r => setTimeout(r, ms));

export default DiceAnimationOverlay;