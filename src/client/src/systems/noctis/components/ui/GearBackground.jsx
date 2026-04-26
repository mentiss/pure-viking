/**
 * GearBackground.jsx — Horlogerie squelette Noctis Solis
 *
 * Architecture correcte pour les évidements :
 *
 *  1. COURONNE DENTÉE  → path evenodd (dents CW + cercle intérieur CCW = anneau troué)
 *  2. CORPS (disque rootR) → dessiné avec mask SVG unique par instance
 *     Le mask perce les secteurs angulaires entre chaque spoke → évidements visibles
 *  3. SPOKES courbés → dessinés AU-DESSUS du corps masqué, sans mask
 *  4. HUB + rosette + détails → solides, no mask
 *
 *  IDs mask : `gm-${_gearCounter}` — compteur global, zéro conflit entre instances.
 */

/* ── Compteur global — garantit l'unicité des IDs SVG ──────────────────────── */
let _uid = 0;

/* ══════════════════════════════════════════════════════════════════════════════
   GÉOMÉTRIE
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Couronne dentée en ANNEAU (pas un disque plein).
 * Technique : path CW des dents + sub-path CCW du cercle intérieur.
 * fill-rule="evenodd" → l'intérieur du cercle est percé.
 */
function buildTeethAnnulus(cx, cy, teeth, outerR, rootR) {
    const step = (Math.PI * 2) / teeth;
    const addR = (outerR - rootR) * 0.28; // hauteur du flanc involute
    let d = '';

    /* Contour CW des dents */
    for (let i = 0; i < teeth; i++) {
        const a = i * step - Math.PI / 2;
        const pts = [
            [cx + rootR       * Math.cos(a - step * 0.38), cy + rootR       * Math.sin(a - step * 0.38)],
            [cx + (outerR-addR) * Math.cos(a - step * 0.13), cy + (outerR-addR) * Math.sin(a - step * 0.13)],
            [cx + outerR      * Math.cos(a - step * 0.06), cy + outerR      * Math.sin(a - step * 0.06)],
            [cx + outerR      * Math.cos(a + step * 0.06), cy + outerR      * Math.sin(a + step * 0.06)],
            [cx + (outerR-addR) * Math.cos(a + step * 0.13), cy + (outerR-addR) * Math.sin(a + step * 0.13)],
            [cx + rootR       * Math.cos(a + step * 0.38), cy + rootR       * Math.sin(a + step * 0.38)],
        ];
        d += (i === 0 ? 'M ' : 'L ') + pts.map(([x,y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ');
    }
    d += ' Z ';

    /* Sub-path CCW du cercle intérieur → perce le disque via evenodd */
    const r = (rootR - 0.5).toFixed(2);
    const rx = (cx + +r).toFixed(2);
    const lx = (cx - +r).toFixed(2);
    d += `M ${rx},${cy.toFixed(2)} `;
    d += `A ${r},${r} 0 1 0 ${lx},${cy.toFixed(2)} `;   /* demi-arc CCW */
    d += `A ${r},${r} 0 1 0 ${rx},${cy.toFixed(2)} Z`;   /* demi-arc CCW */

    return d;
}

/**
 * Secteur annulaire — utilisé dans le mask pour percer les évidements.
 * Trace CW le secteur entre a1 et a2, de innerR à outerR.
 */
function buildAnnularSector(cx, cy, a1, a2, innerR, outerR) {
    const f   = n => n.toFixed(2);
    const cos = Math.cos, sin = Math.sin;

    const x1o = cx + outerR * cos(a1); const y1o = cy + outerR * sin(a1);
    const x2o = cx + outerR * cos(a2); const y2o = cy + outerR * sin(a2);
    const x2i = cx + innerR * cos(a2); const y2i = cy + innerR * sin(a2);
    const x1i = cx + innerR * cos(a1); const y1i = cy + innerR * sin(a1);

    const span = a2 - a1;
    const lg   = span > Math.PI ? 1 : 0;

    return [
        `M ${f(x1o)},${f(y1o)}`,
        `A ${f(outerR)},${f(outerR)} 0 ${lg} 1 ${f(x2o)},${f(y2o)}`,  /* arc CW */
        `L ${f(x2i)},${f(y2i)}`,
        `A ${f(innerR)},${f(innerR)} 0 ${lg} 0 ${f(x1i)},${f(y1i)}`,  /* arc CCW */
        'Z',
    ].join(' ');
}

/**
 * Spoke courbé en quadratic bezier — style arabesque haute horlogerie.
 * curve > 0 → courbe vers la gauche ; alternés → effet rotatif élégant.
 */
function buildCurvedSpoke(cx, cy, angle, hubR, rimR, wHub, wRim, curve) {
    const perp = angle + Math.PI / 2;
    const midR = (hubR + rimR) / 2;

    /* Point de contrôle décalé latéralement */
    const cpx = cx + midR * Math.cos(angle) + curve * midR * Math.cos(perp);
    const cpy = cy + midR * Math.sin(angle) + curve * midR * Math.sin(perp);

    const f   = n => n.toFixed(2);
    const hMx = cx + hubR * Math.cos(angle); const hMy = cy + hubR * Math.sin(angle);
    const rMx = cx + rimR * Math.cos(angle); const rMy = cy + rimR * Math.sin(angle);

    const h1x = hMx - wHub * Math.cos(perp); const h1y = hMy - wHub * Math.sin(perp);
    const h2x = hMx + wHub * Math.cos(perp); const h2y = hMy + wHub * Math.sin(perp);
    const r1x = rMx - wRim * Math.cos(perp); const r1y = rMy - wRim * Math.sin(perp);
    const r2x = rMx + wRim * Math.cos(perp); const r2y = rMy + wRim * Math.sin(perp);

    return [
        `M ${f(h1x)},${f(h1y)}`,
        `Q ${f(cpx)},${f(cpy)} ${f(r1x)},${f(r1y)}`,
        `L ${f(r2x)},${f(r2y)}`,
        `Q ${f(cpx)},${f(cpy)} ${f(h2x)},${f(h2y)}`,
        'Z',
    ].join(' ');
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════════════════════════════ */
const WatchGear = ({ size, teeth, spokes = 4, direction = 'cw', curve = 0.20, style }) => {
    const id  = ++_uid;              // ID unique par instance rendue
    const mid = `gm-${id}`;         // mask ID garanti unique dans le DOM
    const cx  = size / 2;
    const cy  = size / 2;

    /* ── Rayons ─────────────────────────────────────────────────────────── */
    const outerR = size * 0.458;  // Pointe de dent
    const rootR  = size * 0.358;  // Pied de dent / bord ext. du corps
    const rimR   = size * 0.278;  // Anneau intérieur (attache des spokes côté ext.)
    const hubR   = size * 0.108;  // Moyeu (attache des spokes côté int.)
    const hubIR  = size * 0.060;  // Alésage décoratif
    const pinR   = size * 0.023;  // Goupille

    /* ── Largeurs des spokes ─────────────────────────────────────────────── */
    const wHub = size * 0.044;   // Plus large au centre
    const wRim = size * 0.028;   // Plus fin à l'anneau

    /* ── Angles des spokes ───────────────────────────────────────────────── */
    const step        = (Math.PI * 2) / spokes;
    const spokeAngles = Array.from({ length: spokes }, (_, i) => i * step);

    /*
     * Demi-angle angulaire occupé par un spoke à l'anneau rim.
     * Utilisé pour décaler les bords des évidements et éviter
     * que le mask ne coupe dans le spoke.
     * Facteur 1.35 : marge de sécurité visuelle.
     */
    const halfAng = Math.atan2(wRim, rimR) * 1.35;

    /* ── Rosette ─────────────────────────────────────────────────────────── */
    const rOrbit = hubIR + size * 0.026;
    const rPetal = size * 0.013;
    const nPetal = spokes <= 3 ? 6 : 8;

    return (
        <svg
            width={size} height={size} viewBox={`0 0 ${size} ${size}`}
            className={`ns-gear-${direction}`}
            style={{ position: 'fixed', display: 'block', transformOrigin: 'center center', ...style }}
            aria-hidden="true"
        >
            <defs>
                {/*
                    Mask de perçage :
                    ● fond blanc  = tout est visible par défaut
                    ● alésage noir = perce le trou central décoratif
                    ● secteurs noirs entre spokes = percent les évidements
                */}
                <mask id={mid}>
                    <rect width={size} height={size} fill="white" />

                    {/* Alésage central */}
                    <circle cx={cx} cy={cy} r={(hubIR - size * 0.004).toFixed(2)} fill="black" />

                    {/* Évidements inter-spokes */}
                    {spokeAngles.map((a, i) => {
                        /* Le spoke suivant — le dernier boucle sur 2π */
                        const nextA = i < spokes - 1 ? spokeAngles[i + 1] : step * spokes;
                        const a1    = a     + halfAng;
                        const a2    = nextA - halfAng;
                        if (a2 <= a1) return null; /* spoke trop large pour ce rayon */
                        return (
                            <path
                                key={i}
                                fill="black"
                                d={buildAnnularSector(cx, cy, a1, a2,
                                    hubR  + size * 0.005,   /* bord int. : légère marge */
                                    rootR - size * 0.005)}  /* bord ext. : légère marge */
                            />
                        );
                    })}
                </mask>
            </defs>

            <g fill="currentColor">

                {/* ── 1. Couronne dentée — anneau perforé via evenodd ──────── */}
                <path d={buildTeethAnnulus(cx, cy, teeth, outerR, rootR)} fillRule="evenodd" />

                {/* ── 2. Corps du rouage — masqué pour créer les évidements ── */}
                <circle cx={cx} cy={cy} r={rootR.toFixed(2)} mask={`url(#${mid})`} />

                {/* ── 3. Spokes courbés — au-dessus du mask, toujours visibles */}
                {spokeAngles.map((a, i) => (
                    <path key={i}
                          d={buildCurvedSpoke(cx, cy, a, hubR, rimR, wHub, wRim,
                              i % 2 === 0 ? curve : -curve)}
                    />
                ))}

                {/* ── 4. Filet d'anneau intérieur — style chanfrein platine ── */}
                <circle cx={cx} cy={cy} r={rimR.toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.011).toFixed(2)} />

                {/* ── 5. Second filet concentrique (détail horlogerie fine) ── */}
                <circle cx={cx} cy={cy} r={(rootR - size * 0.028).toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.007).toFixed(2)} opacity={0.55} />

                {/* ── 6. Moyeu plein ───────────────────────────────────────── */}
                <circle cx={cx} cy={cy} r={hubR.toFixed(2)} />

                {/* ── 7. Filet du moyeu ────────────────────────────────────── */}
                <circle cx={cx} cy={cy} r={hubR.toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.013).toFixed(2)} />

                {/* ── 8. Alésage décoratif ─────────────────────────────────── */}
                <circle cx={cx} cy={cy} r={hubIR.toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.009).toFixed(2)} opacity={0.65} />

                {/* ── 9. Rosette — couronne de petits cercles autour du pin ── */}
                {Array.from({ length: nPetal }, (_, i) => {
                    const a = (i * Math.PI * 2) / nPetal - Math.PI / 2;
                    return (
                        <circle key={i}
                                cx={(cx + rOrbit * Math.cos(a)).toFixed(2)}
                                cy={(cy + rOrbit * Math.sin(a)).toFixed(2)}
                                r={rPetal.toFixed(2)} />
                    );
                })}

                {/* ── 10. Goupille centrale (double cercle concentrique) ───── */}
                <circle cx={cx} cy={cy} r={pinR.toFixed(2)} />
                <circle cx={cx} cy={cy} r={(pinR * 0.48).toFixed(2)}
                        fill="none" stroke="currentColor" strokeWidth={(size * 0.005).toFixed(2)} opacity={0.5} />

                {/* ── 11. Rivets aux jonctions spoke ↔ anneau ──────────────── */}
                {spokeAngles.map((a, i) => (
                    <circle key={`rv-${i}`}
                            cx={(cx + rimR * Math.cos(a)).toFixed(2)}
                            cy={(cy + rimR * Math.sin(a)).toFixed(2)}
                            r={(size * 0.017).toFixed(2)} />
                ))}

                {/* ── 12. Rivets aux jonctions spoke ↔ moyeu ───────────────── */}
                {spokeAngles.map((a, i) => (
                    <circle key={`rv2-${i}`}
                            cx={(cx + hubR * Math.cos(a)).toFixed(2)}
                            cy={(cy + hubR * Math.sin(a)).toFixed(2)}
                            r={(size * 0.012).toFixed(2)} />
                ))}

                {/* ── 13. Graduations face (style cadran de régulateur) ─────
                    Traits longs tous les 4 crans, courts entre les deux.      */}
                {Array.from({ length: teeth * 2 }, (_, i) => {
                    const ga  = (i * Math.PI * 2) / (teeth * 2) - Math.PI / 2;
                    const r1  = rootR - size * 0.006;
                    const len = i % 4 === 0 ? size * 0.038 : size * 0.018;
                    const r2  = r1 - len;
                    return (
                        <line key={i}
                              x1={(cx + r1 * Math.cos(ga)).toFixed(2)} y1={(cy + r1 * Math.sin(ga)).toFixed(2)}
                              x2={(cx + r2 * Math.cos(ga)).toFixed(2)} y2={(cy + r2 * Math.sin(ga)).toFixed(2)}
                              stroke="currentColor"
                              strokeWidth={(i % 4 === 0 ? size * 0.009 : size * 0.005).toFixed(2)} />
                    );
                })}

            </g>
        </svg>
    );
};

/* ══════════════════════════════════════════════════════════════════════════════
   COMPOSITION — 4 pièces dont un pignon de renvoi en tandem
   ══════════════════════════════════════════════════════════════════════════════ */
const GearBackground = () => (
    <div className="ns-gears-bg" aria-hidden="true">

        {/* Grand régulateur — coin bas-droit, partiellement hors-écran */}
        <WatchGear size={310} teeth={32} spokes={4} direction="cw"   curve={0.22}
                   style={{ bottom: '-105px', right: '-105px' }} />

        {/* Pignon de renvoi — engagé mécaniquement avec le grand, sens inverse */}
        <WatchGear size={96}  teeth={10} spokes={3} direction="ccw"  curve={0.16}
                   style={{ bottom: '76px', right: '158px' }} />

        {/* Montre de gousset — coin haut-gauche, 5 spokes élégants */}
        <WatchGear size={192} teeth={24} spokes={5} direction="ccw"  curve={0.18}
                   style={{ top: '-64px', left: '-64px' }} />

        {/* Petite roue de renvoi — bord gauche mi-hauteur */}
        <WatchGear size={80}  teeth={12} spokes={4} direction="cw"   curve={0.15}
                   style={{ top: '44%', left: '-24px' }} />

    </div>
);

export default GearBackground;