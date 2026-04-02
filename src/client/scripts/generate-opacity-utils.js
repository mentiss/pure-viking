// scripts/generate-css-utils.js
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────────

const OPACITIES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

const BG_TOKENS = {
    'primary':     '--color-primary',
    'secondary':   '--color-secondary',
    'accent':      '--color-accent',
    'danger':      '--color-danger',
    'success':     '--color-success',
    'surface':     '--color-surface',
    'surface-alt': '--color-surface-alt',
    'default':     '--color-bg',
    'base':        '--color-bg',
};

const TEXT_TOKENS = {
    ...BG_TOKENS,
    'default': '--color-text',
    'base':    '--color-text',
    'muted':   '--color-text-muted',
};

const BORDER_TOKENS = {
    ...BG_TOKENS,
    'default': '--color-border',
    'base': '--color-border',
}

const VARIANTS = [
    { prefix: '',               pseudo: '',         wrapper: null },
    { prefix: 'hover\\:',       pseudo: ':hover',   wrapper: null },
    { prefix: 'focus\\:',       pseudo: ':focus',   wrapper: null },
    { prefix: 'active\\:',      pseudo: ':active',  wrapper: null },
    { prefix: 'disabled\\:',    pseudo: ':disabled',wrapper: null },
    { prefix: 'group-hover\\:', pseudo: '',         wrapper: '.group:hover' },
    { prefix: 'group-focus\\:', pseudo: '',         wrapper: '.group:focus' },
];

const GLOW_SIZES = {
    '3xs': '0.5px',
    '2xs': '1px',
    'xs':  '2px',
    'sm':  '3px',
    'md':  '4px',
    'lg':  '6px',
    'xl':  '8px',
    '2xl': '12px',
    '3xl': '16px',
    '4xl': '20px',
    '5xl': '24px',
    '6xl': '32px',
    '7xl': '40px',
};

const DEFAULT_GLOW_SIZE = GLOW_SIZES['md']; // md

const GLOW_VARIANTS = [
    { prefix: '',               pseudo: '',          wrapper: null },
    { prefix: 'hover\\:',       pseudo: ':hover',    wrapper: null },
    { prefix: 'focus\\:',       pseudo: ':focus',    wrapper: null },
    { prefix: 'group-hover\\:', pseudo: '',          wrapper: '.group:hover' },
    { prefix: 'group-focus\\:', pseudo: '',          wrapper: '.group:focus' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const escapeToken = (token) => token.replace(/-/g, '\\-');
const escapeSlash = (pct)   => `\\/${pct}`;

const mix = (varName, pct) =>
    pct === 0   ? 'transparent' :
        pct === 100 ? `var(${varName})` :
            `color-mix(in srgb, var(${varName}) ${pct}%, transparent)`;

function selector(variant, className) {
    return variant.wrapper
        ? `${variant.wrapper} .${variant.prefix}${className}`
        : `.${variant.prefix}${className}${variant.pseudo}`;
}

function propPrefix(prop) {
    return {
        'background-color': 'bg',
        'color':            'text',
        'border-color':     'border',
        'outline-color':    'outline',
        'divide-color':     'divide',
        'caret-color':      'caret',
    }[prop] ?? prop;
}

function glowSelector(variant, className) {
    return variant.wrapper
        ? `${variant.wrapper} .${variant.prefix}${className}`
        : `.${variant.prefix}${className}${variant.pseudo}`;
}

// ── Générateurs ───────────────────────────────────────────────────────────────

function generateProp(prop, tokens) {
    const lines = [];
    const pp    = propPrefix(prop);

    for (const [token, varName] of Object.entries(tokens)) {
        const t = escapeToken(token);

        lines.push(`/* ${pp}-${token} */`);
        for (const variant of VARIANTS) {
            lines.push(`${selector(variant, `${pp}-${t}`)} { ${prop}: var(${varName}); }`);
        }
        lines.push('');

        lines.push(`/* ${pp}-${token}/x */`);
        for (const pct of OPACITIES) {
            for (const variant of VARIANTS) {
                lines.push(`${selector(variant, `${pp}-${t}${escapeSlash(pct)}`)} { ${prop}: ${mix(varName, pct)}; }`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}

function generatePlaceholder(tokens) {
    const lines = ['/* ── Placeholder ──────────────────────────────────────────────────────── */\n'];

    for (const [token, varName] of Object.entries(tokens)) {
        const t = escapeToken(token);
        lines.push(`/* placeholder-${token} */`);
        lines.push(`.placeholder-${t}::placeholder { color: var(${varName}); }`);
        lines.push(`.focus\\:placeholder-${t}:focus::placeholder { color: var(${varName}); }`);
        for (const pct of OPACITIES) {
            lines.push(`.placeholder-${t}${escapeSlash(pct)}::placeholder { color: ${mix(varName, pct)}; }`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

function generateRing(tokens) {
    const lines = ['/* ── Ring ─────────────────────────────────────────────────────────────── */\n'];

    for (const [token, varName] of Object.entries(tokens)) {
        const t = escapeToken(token);
        lines.push(`/* ring-${token} */`);

        for (const variant of VARIANTS) {
            lines.push(`${selector(variant, `ring-${t}`)} { --tw-ring-color: var(${varName}); box-shadow: 0 0 0 var(--tw-ring-width, 3px) var(--tw-ring-color); }`);
        }
        for (const pct of OPACITIES) {
            for (const variant of VARIANTS) {
                lines.push(`${selector(variant, `ring-${t}${escapeSlash(pct)}`)} { --tw-ring-color: ${mix(varName, pct)}; box-shadow: 0 0 0 var(--tw-ring-width, 3px) var(--tw-ring-color); }`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}

function generateGlow(tokens) {
    const lines = ['/* ── Glow (drop-shadow) ───────────────────────────────────────────────── */\n'];

    for (const [token, varName] of Object.entries(tokens)) {
        const t = escapeToken(token);
        lines.push(`/* glow-${token} */`);

        // glow-{token} sans taille → taille par défaut
        for (const variant of GLOW_VARIANTS) {
            const sel = glowSelector(variant, `glow-${t}`);
            lines.push(`${sel} { filter: drop-shadow(0 0 ${DEFAULT_GLOW_SIZE} var(${varName})); }`);
        }
        lines.push('');

        // glow-{token}-{size}
        lines.push(`/* glow-${token}-{size} */`);
        for (const [size, sizeVal] of Object.entries(GLOW_SIZES)) {
            for (const variant of GLOW_VARIANTS) {
                const sel = glowSelector(variant, `glow-${t}-${size}`);
                lines.push(`${sel} { filter: drop-shadow(0 0 ${sizeVal} var(${varName})); }`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}

// ── Assemblage ────────────────────────────────────────────────────────────────

const output = [
    '/* ════════════════════════════════════════════════════════════════════════',
    '   GENERATED — ne pas éditer manuellement.',
    '   Regénérer via : npm run generate:css',
    '   ════════════════════════════════════════════════════════════════════════ */\n',

    '/* ── Backgrounds ──────────────────────────────────────────────────────── */',
    generateProp('background-color', BG_TOKENS),

    '/* ── Textes ───────────────────────────────────────────────────────────── */',
    generateProp('color', TEXT_TOKENS),

    '/* ── Bordures ─────────────────────────────────────────────────────────── */',
    generateProp('border-color', BORDER_TOKENS),

    '/* ── Outline ──────────────────────────────────────────────────────────── */',
    generateProp('outline-color', BG_TOKENS),

    '/* ── Divide ───────────────────────────────────────────────────────────── */',
    generateProp('divide-color', BG_TOKENS),

    '/* ── Caret ────────────────────────────────────────────────────────────── */',
    generateProp('caret-color', TEXT_TOKENS),

    generatePlaceholder(TEXT_TOKENS),
    generateRing(BG_TOKENS),
    generateGlow(BG_TOKENS),
].join('\n');

// Si scripts/ est à la racine du projet (projet/scripts/generate-css-utils.js)
const outPath = path.resolve(__dirname, '../src/generated-css-utils.css');

fs.writeFileSync(outPath, output, 'utf8');

const lineCount = output.split('\n').length;
console.log(`✅ Généré : ${outPath} (${lineCount} lignes)`);