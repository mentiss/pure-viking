import React from "react";

export const SectionTitle = ({ children }) => (
    <h2
        className="text-xs font-bold cp-font-ui uppercase tracking-widest mb-3"
        style={{ color: 'var(--color-text-muted)' }}
    >
        {children}
    </h2>
);

const VARIANT_CLASSES = {
    default: 'bg-surface-alt text-base border border-base hover:bg-surface hover:border-accent hover:cp-neon-glow-el',
    primary: 'bg-primary text-accent border-none cp-glow-cyan',
    danger:  'bg-danger text-white border-none',
    success: 'bg-success text-bg border-none',
    ghost:   'bg-transparent text-muted border border-base hover:border-accent',
};

export const Btn = ({ onClick, children, variant = 'default', small = false, disabled = false }) => {
    const sizeClasses   = small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-2';
    const variantClasses = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default;
    const stateClasses  = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`rounded-lg font-semibold transition-all ${sizeClasses} ${variantClasses} ${stateClasses}`}
        >
            {children}
        </button>
    );
};

export const Input = ({ value, onChange, placeholder, type = 'text', small = false }) => (
    <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`rounded-lg outline-none w-full ${small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-2'}`}
        style={{
            background: 'var(--color-surface-alt)',
            border:     '1px solid var(--color-border)',
            color:      'var(--color-text)',
        }}
    />
);

export const Textarea = ({ value, onChange, placeholder, rows = 3 }) => (
    <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="rounded-lg outline-none w-full text-sm px-3 py-2 resize-none"
        style={{
            background: 'var(--color-surface-alt)',
            border:     '1px solid var(--color-border)',
            color:      'var(--color-text)',
        }}
    />
);