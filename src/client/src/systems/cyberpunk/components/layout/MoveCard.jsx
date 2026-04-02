import {STAT_LABELS} from "../../config.jsx";

const STAT_BADGE_CLASS = {
    cran:   'cp-stat-badge-cran',
    pro:    'cp-stat-badge-pro',
    chair:  'cp-stat-badge-chair',
    esprit: 'cp-stat-badge-esprit',
    style:  'cp-stat-badge-style',
    synth:  'cp-stat-badge-synth',
};

export const MoveCard = ({ move, isUnlocked, onClick, showFull = false, isEditMode = false, isAcquired = false }) => {
    const isClickable = (isUnlocked && move.stat) && !isEditMode;

    const toggleStyle = isEditMode ? {
        background: isAcquired ? 'rgba(0,229,255,0.1)' : 'var(--cp-move-hover)',
        border:     `1px solid ${isAcquired ? 'var(--color-primary)' : 'var(--cp-move-border)'}`,
        cursor:     'pointer',
        opacity:    1,
    } : {
        background: isUnlocked ? 'var(--cp-move-hover)' : 'transparent',
        border:     `1px solid ${isUnlocked ? 'var(--cp-move-border)' : 'transparent'}`,
        cursor:     isClickable ? 'pointer' : 'default',
        opacity:    isUnlocked ? 1 : 0.35,
    };

    return (
        <button
            onClick={onClick}
            className={`
                group w-full text-left rounded-lg px-3 py-2.5 
                flex flex-col gap-1 transition-all
                ${isClickable ? 'move-button cursor-pointer' : 'cursor-default'}
            `}
            style={toggleStyle}
        >
            <div className="flex items-center gap-2">
                {isEditMode && (
                    <span
                        className="w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                        style={{
                            background: isAcquired ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                            border:     `1px solid ${isAcquired ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            color:      'var(--color-bg)',
                        }}
                    >
                        {isAcquired ? '✓' : ''}
                    </span>
                )}
                <span
                    className={`text-sm font-semibold leading-tight flex-1 ${isUnlocked || showFull ? 'text-default' : 'text-muted'} ${isClickable ? 'group-hover:text-primary move-title-glitch' : ''}`}
                >
                    {move.name}
                </span>
                {move.playbook && showFull && move.playbook !== '' && (
                    <span className="text-xs cp-font-ui px-1.5 py-0.5 rounded flex-shrink-0" style={{
                        background: 'rgba(255,170,0,0.12)',
                        color: 'var(--cp-neon-amber)',
                        border: '1px solid rgba(255,170,0,0.3)'
                    }}>
                        {move.playbook}
                    </span>
                )}
                {move.stat && (
                    <span className={`cp-stat-badge ${STAT_BADGE_CLASS[move.stat] ?? ''} flex-shrink-0`}>
                        {STAT_LABELS[move.stat]}
                    </span>
                )}

            </div>
            {(isUnlocked || showFull || isEditMode) && (
                <p className={`text-xs leading-relaxed line-clamp-3 text-muted ${isClickable ? 'group-hover:text-default' : ''}`}>
                    {move.description}
                </p>
            )}
        </button>
    )
};

