import React from "react";

const BOLT_PATHS = [
    "M10,20 L30,10 L25,40 L50,30",
    "M0,50 L40,40 L60,60 L100,20",
    "M20,0 L15,30 L40,25 L30,60",
    "M0,20 L30,25 L10,50 L40,60",
    "M50,10 L45,40 L70,35 L60,80"
];
const BoltFarm = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '130%', left: '-15%' }}>
            {[...Array(10)].map((_, i) => {
                // On génère du chaos contrôlé
                const duration = 4 + Math.random() * 8; // Entre 4s et 12s
                const delay = Math.random() * 10;      // Délai de départ aléatoire
                const path = BOLT_PATHS[i % BOLT_PATHS.length];

                return (
                    <svg
                        key={i}
                        className="absolute mega-glow-bolt"
                        style={{
                            top: `${Math.random() * 80}%`,
                            left: `${Math.random() * 80}%`,
                            width: `${20 + Math.random() * 20}%`,
                            height: `${20 + Math.random() * 20}%`,
                            animation: `zap-vibe ${duration}s step-end infinite ${delay}s`,
                            transform: `rotate(${Math.random() * 360}deg)`
                        }}
                        viewBox="0 0 100 100"
                    >
                        <path d={path} fill="none" />
                    </svg>
                );
            })}
        </div>
    );
};

export default BoltFarm;