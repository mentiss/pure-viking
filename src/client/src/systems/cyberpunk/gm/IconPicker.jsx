// src/client/src/systems/cyberpunk/gm/IconPicker.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur d'icône partagé : grille d'emojis prédéfinis + upload image.
// L'icône est soit un emoji/texte court, soit une data-URL base64.
// Props :
//   value    : string (emoji ou data:image/…)
//   onChange : (newValue: string) => void
//   presets  : string[] optionnel (liste d'emojis)
// ─────────────────────────────────────────────────────────────────────────────

import React, {useRef, useState} from 'react';
import AlertModal from "../../../components/modals/AlertModal.jsx";

const DEFAULT_THREAT_PRESETS = ['⚠','💀','🏢','🤖','🔫','🧬','👁','🐍','💣','🕷','🌆','🔥','⚡','🩸','🎭'];
const DEFAULT_CLOCK_PRESETS  = ['⏱','⌛','🔔','💡','🌀','📡','🗓','⚙','🔒','💥','🌊','🎯','📈','🧨','🔴'];

// Resize canvas-side à 64×64 avant encodage
function resizeToBase64(file, size = 64) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width  = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                // Crop carré centré
                const min  = Math.min(img.width, img.height);
                const sx   = (img.width  - min) / 2;
                const sy   = (img.height - min) / 2;
                ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                resolve(canvas.toDataURL('image/webp', 0.85));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

const IconPreview = ({ value, size = 'text-2xl' }) => {
    if (value?.startsWith('data:image/')) {
        return (
            <img
                src={value}
                alt="icône"
                className="rounded object-cover shrink-0"
                style={{ width: '2rem', height: '2rem' }}
            />
        );
    }
    return <span className={`${size} leading-none`}>{value || ''}</span>;
};

export { IconPreview };

const IconPicker = ({ value, onChange, presets, label = 'Icône' }) => {
    const fileRef  = useRef(null);
    const list     = presets ?? DEFAULT_THREAT_PRESETS;
    const isImage  = value?.startsWith('data:image/');
    const [alertMsg, setAlertMsg] = useState(null);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setAlertMsg('Image trop lourde (max 2 Mo avant resize)');
            return;
        }
        try {
            const b64 = await resizeToBase64(file);
            onChange(b64);
        } catch {
            setAlertMsg("Impossible de lire l'image.");
        }
        // Reset input pour permettre re-sélection du même fichier
        e.target.value = '';
    };

    return (
        <>
            {alertMsg && <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />}
            <div className="flex flex-col gap-2">
                <label className="text-xs cp-font-ui uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    {label}
                </label>

                {/* Prévisualisation + bouton reset si image */}
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center rounded-lg"
                        style={{ width: '2.5rem', height: '2.5rem', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
                    >
                        <IconPreview value={value} />
                    </div>
                    {isImage && (
                        <button
                            onClick={() => onChange('⚠')}
                            className="text-xs text-muted hover:text-base transition-colors"
                        >
                            ✕ Supprimer l'image
                        </button>
                    )}
                </div>

                {/* Grille emojis prédéfinis */}
                <div className="flex flex-wrap gap-1">
                    {list.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => onChange(emoji)}
                            title={emoji}
                            className={`text-lg px-1.5 py-0.5 rounded transition-all ${value === emoji ? 'cp-border-neon' : 'border border-base hover:border-accent'}`}
                            style={{
                                background: value === emoji ? 'rgba(0,229,255,0.1)' : 'var(--color-surface-alt)',
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {/* Upload image */}
                <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-left text-muted hover:text-base transition-colors"
                >
                    📎 Importer une image (PNG/JPEG/WebP, redimensionnée à 64×64)
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFile}
                />
            </div>
        </>
    );
};

export { DEFAULT_CLOCK_PRESETS };
export default IconPicker;