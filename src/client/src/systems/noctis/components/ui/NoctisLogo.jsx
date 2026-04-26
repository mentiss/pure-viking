/**
 * NoctisLogo.jsx — Logo Noctis Solis
 *
 * Deux engrenages skeleton watch animés en rotation lente (time-based,
 * pas scroll-driven) + "Noctis Solis" en police Underdove.
 *
 * Les engrenages partagent la même géométrie que GearBackground
 * mais sont en position statique (flux normal) et utilisent des
 * keyframes CSS à vitesse constante plutôt que la scroll-timeline.
 *
 * Vitesses calculées pour simuler l'engrènement :
 *   Grand  (12 dents) → 14s / tour CW
 *   Petit  (7 dents)  → 14 × 7/12 ≈ 8.2s → 8s / tour CCW
 */

/* ── Compteur local (IDs mask uniques, indépendants de GearBackground) ─────── */
let _logoUid = 0;

/* ══════════════════════════════════════════════════════════════════════════════
   GÉOMÉTRIE — copie minimale des fonctions de GearBackground
   (NoctisLogo est autonome pour ne pas créer de dépendance circulaire)
   ══════════════════════════════════════════════════════════════════════════════ */

function buildTeethAnnulus(cx, cy, teeth, outerR, rootR) {
    const step = (Math.PI * 2) / teeth;
    const addR = (outerR - rootR) * 0.28;
    let d = '';

    for (let i = 0; i < teeth; i++) {
        const a = i * step - Math.PI / 2;
        const pts = [
            [cx + rootR        * Math.cos(a - step * 0.38), cy + rootR        * Math.sin(a - step * 0.38)],
            [cx + (outerR-addR)* Math.cos(a - step * 0.13), cy + (outerR-addR)* Math.sin(a - step * 0.13)],
            [cx + outerR       * Math.cos(a - step * 0.06), cy + outerR       * Math.sin(a - step * 0.06)],
            [cx + outerR       * Math.cos(a + step * 0.06), cy + outerR       * Math.sin(a + step * 0.06)],
            [cx + (outerR-addR)* Math.cos(a + step * 0.13), cy + (outerR-addR)* Math.sin(a + step * 0.13)],
            [cx + rootR        * Math.cos(a + step * 0.38), cy + rootR        * Math.sin(a + step * 0.38)],
        ];
        d += (i === 0 ? 'M ' : 'L ') + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ');
    }
    d += ' Z ';

    /* Cercle intérieur CCW → perce le disque via fill-rule evenodd */
    const r  = (rootR - 0.5).toFixed(2);
    const rx = (cx + +r).toFixed(2);
    const lx = (cx - +r).toFixed(2);
    d += `M ${rx},${cy.toFixed(2)} A ${r},${r} 0 1 0 ${lx},${cy.toFixed(2)} A ${r},${r} 0 1 0 ${rx},${cy.toFixed(2)} Z`;
    return d;
}

function buildAnnularSector(cx, cy, a1, a2, innerR, outerR) {
    const f = n => n.toFixed(2);
    const x1o = cx + outerR * Math.cos(a1); const y1o = cy + outerR * Math.sin(a1);
    const x2o = cx + outerR * Math.cos(a2); const y2o = cy + outerR * Math.sin(a2);
    const x2i = cx + innerR * Math.cos(a2); const y2i = cy + innerR * Math.sin(a2);
    const x1i = cx + innerR * Math.cos(a1); const y1i = cy + innerR * Math.sin(a1);
    const lg  = (a2 - a1) > Math.PI ? 1 : 0;
    return `M ${f(x1o)},${f(y1o)} A ${f(outerR)},${f(outerR)} 0 ${lg} 1 ${f(x2o)},${f(y2o)} L ${f(x2i)},${f(y2i)} A ${f(innerR)},${f(innerR)} 0 ${lg} 0 ${f(x1i)},${f(y1i)} Z`;
}

function buildCurvedSpoke(cx, cy, angle, hubR, rimR, wHub, wRim, curve) {
    const perp = angle + Math.PI / 2;
    const midR = (hubR + rimR) / 2;
    const cpx  = cx + midR * Math.cos(angle) + curve * midR * Math.cos(perp);
    const cpy  = cy + midR * Math.sin(angle) + curve * midR * Math.sin(perp);
    const f    = n => n.toFixed(2);
    const hMx  = cx + hubR * Math.cos(angle); const hMy = cy + hubR * Math.sin(angle);
    const rMx  = cx + rimR * Math.cos(angle); const rMy = cy + rimR * Math.sin(angle);
    const h1x  = hMx - wHub * Math.cos(perp); const h1y = hMy - wHub * Math.sin(perp);
    const h2x  = hMx + wHub * Math.cos(perp); const h2y = hMy + wHub * Math.sin(perp);
    const r1x  = rMx - wRim * Math.cos(perp); const r1y = rMy - wRim * Math.sin(perp);
    const r2x  = rMx + wRim * Math.cos(perp); const r2y = rMy + wRim * Math.sin(perp);
    return `M ${f(h1x)},${f(h1y)} Q ${f(cpx)},${f(cpy)} ${f(r1x)},${f(r1y)} L ${f(r2x)},${f(r2y)} Q ${f(cpx)},${f(cpy)} ${f(h2x)},${f(h2y)} Z`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   LogoGear — engrenage inline (position statique, animation time-based)
   ══════════════════════════════════════════════════════════════════════════════ */
const LogoGear = ({ size, teeth, spokes, direction, curve = 0.20, style }) => {
    const id  = ++_logoUid;
    const mid = `lgm-${id}`;
    const cx  = size / 2;
    const cy  = size / 2;

    const outerR = size * 0.458;
    const rootR  = size * 0.358;
    const rimR   = size * 0.278;
    const hubR   = size * 0.110;
    const hubIR  = size * 0.062;
    const pinR   = size * 0.024;
    const wHub   = size * 0.044;
    const wRim   = size * 0.028;

    const step        = (Math.PI * 2) / spokes;
    const spokeAngles = Array.from({ length: spokes }, (_, i) => i * step);
    const halfAng     = Math.atan2(wRim, rimR) * 1.35;

    /* Classe CSS d'animation — time-based définie dans theme.css */
    const animClass = direction === 'cw' ? 'ns-logo-gear-cw' : 'ns-logo-gear-ccw';

    return (
        <svg
            width={size} height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={animClass}
            style={{ display: 'block', transformOrigin: 'center center', ...style }}
            aria-hidden="true"
        >
            <defs>
                <mask id={mid}>
                    <rect width={size} height={size} fill="white" />
                    <circle cx={cx} cy={cy} r={(hubIR - size * 0.004).toFixed(2)} fill="black" />
                    {spokeAngles.map((a, i) => {
                        const nextA = i < spokes - 1 ? spokeAngles[i + 1] : step * spokes;
                        const a1 = a + halfAng;
                        const a2 = nextA - halfAng;
                        if (a2 <= a1) return null;
                        return (
                            <path key={i} fill="black"
                                  d={buildAnnularSector(cx, cy, a1, a2,
                                      hubR  + size * 0.005,
                                      rootR - size * 0.005)} />
                        );
                    })}
                </mask>
            </defs>

            <g fill="currentColor">
                <path d={buildTeethAnnulus(cx, cy, teeth, outerR, rootR)} fillRule="evenodd" />
                <circle cx={cx} cy={cy} r={rootR.toFixed(2)} mask={`url(#${mid})`} />
                {spokeAngles.map((a, i) => (
                    <path key={i}
                          d={buildCurvedSpoke(cx, cy, a, hubR, rimR, wHub, wRim,
                              i % 2 === 0 ? curve : -curve)} />
                ))}
                <circle cx={cx} cy={cy} r={rimR.toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.011).toFixed(2)} />
                <circle cx={cx} cy={cy} r={hubR.toFixed(2)} />
                <circle cx={cx} cy={cy} r={hubR.toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.013).toFixed(2)} />
                <circle cx={cx} cy={cy} r={hubIR.toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.009).toFixed(2)} opacity={0.6} />
                {/* Rosette */}
                {Array.from({ length: spokes <= 3 ? 6 : 8 }, (_, i) => {
                    const a = (i * Math.PI * 2) / (spokes <= 3 ? 6 : 8) - Math.PI / 2;
                    const r = hubIR + size * 0.026;
                    return <circle key={i}
                                   cx={(cx + r * Math.cos(a)).toFixed(2)}
                                   cy={(cy + r * Math.sin(a)).toFixed(2)}
                                   r={(size * 0.013).toFixed(2)} />;
                })}
                <circle cx={cx} cy={cy} r={pinR.toFixed(2)} />
                {spokeAngles.map((a, i) => (
                    <circle key={`rv-${i}`}
                            cx={(cx + rimR * Math.cos(a)).toFixed(2)}
                            cy={(cy + rimR * Math.sin(a)).toFixed(2)}
                            r={(size * 0.017).toFixed(2)} />
                ))}
            </g>
        </svg>
    );
};

/* ══════════════════════════════════════════════════════════════════════════════
   NoctisLogo
   ══════════════════════════════════════════════════════════════════════════════ */
const NoctisLogo = () => (
    <div className="ns-logo" aria-label="Noctis Solis">

        {/*
            Conteneur des deux engrenages.
            Grand (30px) en haut-gauche, petit (19px) en bas-droit,
            positionnés pour que leurs couronnes dentées se touchent.

            Calcul :
              Grand outerR  = 30 × 0.458 = 13.7px
              Petit outerR  = 19 × 0.458 =  8.7px
              Distance centres = 13.7 + 8.7 = 22.4px
              Angle 135° (bas-droit) :
                petit centre = (15 + 22.4×cos45°, 15 + 22.4×sin45°)
                             = (15 + 15.8, 15 + 15.8) = (30.8, 30.8)
              → petit top-left = (30.8 - 9.5, 30.8 - 9.5) = (21.3, 21.3)
              Conteneur : 40 × 40px
        */}
        <div className="ns-logo-gears">
            {/* Grand engrenage — 12 dents, 4 spokes, 14s CW */}
            <LogoGear
                size={30} teeth={12} spokes={4} direction="cw" curve={0.22}
                style={{ position: 'absolute', top: 0, left: 0 }}
            />
            {/* Petit engrenage — 7 dents, 3 spokes, 8s CCW */}
            <LogoGear
                size={19} teeth={7} spokes={3} direction="ccw" curve={0.18}
                style={{ position: 'absolute', top: '21px', left: '21px' }}
            />
        </div>

        {/* Texte Underdove */}
        <span className="ns-logo-text" aria-hidden="false">
            Noctis Solis
        </span>
    </div>
);

export default NoctisLogo;