// src/client/src/systems/deltagreen/components/sheet/sections/SanLogSection.jsx
import React from 'react';

const SanLogSection = ({ sanLog }) => {
    const entries = sanLog ?? [];

    return (
        <div>
            <p className="dg-section-label text-base mb-3 border-b border-default pb-1">
                14. PERTE DE SAN N'AYANT PAS ENTRAÎNÉ LA FOLIE
            </p>

            {entries.length === 0 ? (
                <p className="text-sm text-muted font-mono italic">Aucune perte enregistrée.</p>
            ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {entries.map((e) => (
                        <div key={e.id} className="flex items-baseline gap-3 text-xs font-mono border-b border-default/40 pb-1">
                            {/* Date */}
                            <span className="text-muted flex-shrink-0 w-32">
                                {e.createdAt
                                    ? new Date(e.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                    : '—'}
                            </span>
                            {/* Situation */}
                            <span className="flex-1 text-default">{e.situationLabel}</span>
                            {/* Perte appliquée */}
                            <span className="text-danger font-bold flex-shrink-0">−{e.lossApplied}</span>
                            {/* SAN avant → après */}
                            <span className="text-muted flex-shrink-0">{e.sanBefore}→{e.sanAfter}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SanLogSection;