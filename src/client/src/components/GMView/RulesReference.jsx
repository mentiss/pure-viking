
// Référence Règles Combat
import React from "react";
import {useSocket} from "../../context/SocketContext.jsx";

const RulesReference = () => {
    return (
        <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-4">
            <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-3">
                📖 Règles Combat (Référence)
            </h2>

            <div className="space-y-3 text-sm text-viking-text dark:text-viking-parchment">
                <div>
                    <div className="font-bold text-viking-bronze mb-1">Initiative</div>
                    <div>2d10 + Agilité (calculée automatiquement)</div>
                </div>

                <div>
                    <div className="font-bold text-viking-bronze mb-1">Actions par Tour</div>
                    <div>Variable selon personnage/adversaire. Reset à chaque nouveau tour.</div>
                </div>

                <div>
                    <div className="font-bold text-viking-bronze mb-1">Posture Défensive (1 action)</div>
                    <div className="ml-3">
                        <div>• <strong>Actif:</strong> Jet combat CàC, si 1+ succès → Seuil attaquant = Seuil + MR</div>
                        <div>• <strong>Passif:</strong> Seuil attaquant = Seuil + (Combat / 2, arrondi inf, max 3)</div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                            Exemple: Combat 4 → Passif +2 seuil | Combat 7 → Passif +3 seuil
                        </div>
                    </div>
                </div>

                <div>
                    <div className="font-bold text-viking-bronze mb-1">Blessures</div>
                    <div>KO à 5 tokens pour joueurs. Variable pour adversaires.</div>
                </div>

                <div>
                    <div className="font-bold text-viking-bronze mb-1">Fatigue</div>
                    <div>Affecte les jets mais pas ajoutée pendant combat (sauf traits spéciaux).</div>
                </div>
            </div>
        </div>
    );
};


export default RulesReference;