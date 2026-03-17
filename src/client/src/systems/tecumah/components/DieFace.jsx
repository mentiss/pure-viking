const DieFace = ({ value, gold, wildInitial }) => (
    <div
        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
        style={{
            background:  gold ? '#B8860B' : 'var(--color-surface-alt)',
            border:      `2px solid ${gold ? (wildInitial === 1 ? 'var(--color-danger)' : '#DAA520') : 'var(--color-border)'}`,
            color:       gold ? '#fff' : 'var(--color-text)',
        }}
    >
        {value}
    </div>
);

export default DieFace;