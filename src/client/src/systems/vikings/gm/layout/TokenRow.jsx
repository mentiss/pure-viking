import React from "react";

const TokenRow = ({ label, current, max, type, onToggle }) => {
    const colorFilled = type === 'blessure'
        ? 'bg-red-500 border-red-600'
        : 'bg-amber-500 border-amber-600';
    const colorEmpty = 'border-viking-leather dark:border-viking-bronze';

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-viking-brown dark:text-viking-parchment w-20">
                {label}
            </span>
            <div className="flex gap-1">
                {Array.from({ length: max }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => onToggle(type, i)}
                        className={`w-5 h-5 border-2 transition-all cursor-pointer hover:scale-110 ${
                            i < current ? colorFilled : colorEmpty
                        }`}
                        title={`${type === 'blessure' ? 'Blessure' : 'Fatigue'} ${i + 1}`}
                    />
                ))}
            </div>
            <span className="text-xs text-viking-leather dark:text-viking-bronze ml-1">
                {current}/{max}
            </span>
        </div>
    );
};

export default TokenRow;