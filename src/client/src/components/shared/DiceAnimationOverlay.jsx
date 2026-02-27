// src/client/src/components/shared/DiceAnimationOverlay.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Overlay animation 3D des dés via dice-box-threejs.
// Accepte le format AnimationSequence produit par diceEngine.
//
// Prop principale : animationSequence (AnimationSequence)
//   - mode: 'single' | 'insurance'
//   - groups: [{ id, diceType, color, label, waves }]
//   - insuranceData: { groups1, groups2, keptRoll } | null
//
// Rétrocompatibilité : accepte aussi l'ancien prop `sequences` (format legacy)
// pour ne pas casser les composants non encore migrés.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox from '@3d-dice/dice-box-threejs';
import { buildDiceBoxConfig, readDiceConfig } from '../modals/DiceConfigModal.jsx';

const WAVE_SETTLE_DELAY = 800;
const EXPLOSION_FLASH   = 350;
const END_DISPLAY_DELAY = 1200;

// Couleurs de groupes de dés
const GROUP_COLORS = {
    default:    null,   // utilise la config utilisateur
    wild:       0xffd700,  // or
    fortune:    0x9b59b6,  // violet
    saga:       0xff6b35,  // orange vif
    danger:     0xe74c3c,  // rouge
};

/**
 * @param {object}   animationSequence - Format AnimationSequence du diceEngine
 * @param {object}   [sequences]       - Format legacy (rétrocompatibilité)
 * @param {string}   [diceType='d10']  - Type de dé legacy
 * @param {function} onComplete
 * @param {function} onSkip
 */
const DiceAnimationOverlay = ({ animationSequence, sequences, diceType = 'd10', onComplete, onSkip }) => {

    // Normalisation : accepte l'ancien format `sequences` ou le nouveau `animationSequence`
    const normalizedSequence = animationSequence ?? _legacyToAnimationSequence(sequences, diceType);

    const containerRef  = useRef(null);
    const diceBoxRef    = useRef(null);
    const abortedRef    = useRef(false);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    const [isReady,     setIsReady]     = useState(false);
    const [label,       setLabel]       = useState('');
    const [isExploding, setIsExploding] = useState(false);
    const [isFinished,  setIsFinished]  = useState(false);

    // ── Init DiceBox ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;
        abortedRef.current = false;

        const el          = containerRef.current;
        const containerId = `dice-overlay-${Date.now()}`;
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

    /** Construit la notation dice-box-threejs depuis un groupe et ses valeurs de dés */
    const buildBoxNotation = (diceValues, groupDiceType) =>
        `${diceValues.length}${groupDiceType}@${diceValues.join(',')}`;

    const rollAndWait = (box, notation) =>
        new Promise(resolve => box.roll(notation).then(resolve));

    // ── Joue une séquence de vagues pour UN groupe ────────────────────────────
    const playGroup = async (box, group, overrideLabel = '') => {
        const { diceType: groupDiceType, waves, label: groupLabel } = group;
        const displayLabel = overrideLabel || groupLabel || '';

        for (let i = 0; i < waves.length; i++) {
            if (abortedRef.current) return;
            const wave = waves[i];

            if (i > 0) {
                // Vague d'explosion
                setIsExploding(true);
                await delay(EXPLOSION_FLASH);
                if (abortedRef.current) return;
                setIsExploding(false);
                setLabel(`💥 Explosion ! (vague ${i + 1})`);
                box.clearDice();
                await delay(200);
            } else {
                setLabel(displayLabel);
            }

            if (abortedRef.current) return;
            await rollAndWait(box, buildBoxNotation(wave.dice, groupDiceType));
            if (i < waves.length - 1) await delay(WAVE_SETTLE_DELAY);
        }
    };

    // ── Mode single : joue tous les groupes en séquence ──────────────────────
    const playSingle = async (box, groups) => {
        for (const group of groups) {
            if (abortedRef.current) return;
            await playGroup(box, group);
            if (groups.length > 1) {
                await delay(WAVE_SETTLE_DELAY);
                box.clearDice();
                await delay(300);
            }
        }
    };

    // ── Mode assurance : joue les 2 pools, affiche juste un label pour le gardé ─
    const playInsurance = async (box, { groups1, groups2, keptRoll }) => {
        // Pool 1
        await playSingle(box, groups1.map(g => ({ ...g, label: `🎲 Jet 1` })));
        if (abortedRef.current) return;
        await delay(WAVE_SETTLE_DELAY);
        box.clearDice();
        await delay(300);

        // Pool 2
        await playSingle(box, groups2.map(g => ({ ...g, label: `🎲 Jet 2` })));
        if (abortedRef.current) return;
        await delay(WAVE_SETTLE_DELAY);

        // Juste un label — pas de rejeu
        setLabel(keptRoll === 1 ? '✅ Jet 1 gardé !' : '✅ Jet 2 gardé !');
        await delay(800);
    };

    // ── Orchestrateur ─────────────────────────────────────────────────────────
    const runAnimation = async () => {
        const box = diceBoxRef.current;
        if (!box || !normalizedSequence) return;

        try {
            if (normalizedSequence.mode === 'insurance' && normalizedSequence.insuranceData) {
                await playInsurance(box, normalizedSequence.insuranceData);
            } else {
                await playSingle(box, normalizedSequence.groups || []);
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

    // ─── Render ───────────────────────────────────────────────────────────────
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

// ─── Rétrocompatibilité : convertit l'ancien format vers AnimationSequence ───
// Permet aux composants non migrés de continuer à fonctionner.

function _legacyToAnimationSequence(sequences, diceType) {
    if (!sequences) return null;

    // Ancien format insurance : { type: 'insurance', seq1, seq2, keptRoll }
    if (sequences.type === 'insurance') {
        return {
            mode: 'insurance',
            groups: null,
            insuranceData: {
                groups1: [{ id: 'main', diceType, color: 'default', label: 'Jet 1', waves: sequences.seq1 }],
                groups2: [{ id: 'main', diceType, color: 'default', label: 'Jet 2', waves: sequences.seq2 }],
                keptRoll: sequences.keptRoll,
            },
        };
    }

    // Ancien format simple : tableau de vagues [{ wave, dice }]
    // ou objet { sequences: [...] }
    const waves = Array.isArray(sequences) ? sequences : (sequences.waves || []);
    return {
        mode: 'single',
        groups: [{ id: 'main', diceType, color: 'default', label: '', waves }],
        insuranceData: null,
    };
}

const delay = ms => new Promise(r => setTimeout(r, ms));

export default DiceAnimationOverlay;