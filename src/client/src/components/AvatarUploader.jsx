// components/AvatarUploader.jsx - Upload et crop d'avatar
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import AlertModal from "./shared/AlertModal.jsx";

const AvatarUploader = ({ currentAvatar, onAvatarChange, onClose }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);

    // Callback quand le crop change
    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Traiter un fichier
    const processFile = (file) => {
        if (!file) return;

        // Vérifier le type
        if (!file.type.startsWith('image/')) {
            setAlertMessage('Veuillez sélectionner une image');
            return;
        }

        // Vérifier la taille (max 5MB avant crop)
        if (file.size > 5000000) {
            setAlertMessage('Image trop grande (max 5MB)');
            return;
        }

        // Lire et afficher l'image
        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Upload fichier via input
    const handleFileUpload = (e) => {
        processFile(e.target.files[0]);
    };

    // Drag & Drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    // Créer l'image croppée
    const createCroppedImage = async () => {
        setLoading(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Taille finale : 256x256
            canvas.width = 256;
            canvas.height = 256;

            // Charger l'image source
            const image = new Image();
            image.src = imageSrc;

            await new Promise((resolve) => {
                image.onload = resolve;
            });

            // Dessiner la partie croppée
            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                256,
                256
            );

            // Convertir en base64 JPEG (qualité 85%)
            const base64 = canvas.toDataURL('image/jpeg', 0.85);

            // Vérifier la taille finale
            const sizeInKB = Math.round((base64.length * 3) / 4 / 1024);
            console.log(`Avatar size: ${sizeInKB}KB`);

            onAvatarChange(base64);
            onClose();
        } catch (error) {
            console.error('Error cropping image:', error);
            setAlertMessage('Erreur lors du traitement de l\'image');
        } finally {
            setLoading(false);
        }
    };

    // Supprimer l'avatar
    const handleRemoveAvatar = () => {
        onAvatarChange(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-4 border-viking-bronze">
                {/* Header */}
                <div className="p-4 border-b-2 border-viking-bronze flex-shrink-0">
                    <h2 className="text-2xl font-bold text-viking-brown dark:text-viking-parchment">
                        🖼️ Avatar du personnage
                    </h2>
                </div>

                {/* Content - Scrollable */}
                <div className="p-4 overflow-y-auto flex-1">
                    {!imageSrc ? (
                        // Upload initial
                        <div className="space-y-4">
                            {currentAvatar && (
                                <div className="text-center">
                                    <p className="text-sm text-viking-leather dark:text-viking-bronze mb-2">
                                        Avatar actuel :
                                    </p>
                                    <img
                                        src={currentAvatar}
                                        alt="Avatar actuel"
                                        className="w-32 h-32 rounded-full mx-auto border-4 border-viking-bronze"
                                    />
                                </div>
                            )}

                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    isDragging
                                        ? 'border-viking-bronze bg-viking-bronze/10'
                                        : 'border-viking-leather dark:border-viking-bronze'
                                }`}
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="avatar-upload"
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="cursor-pointer block"
                                >
                                    <div className="text-6xl mb-2">{isDragging ? '📥' : '📸'}</div>
                                    <div className="text-viking-brown dark:text-viking-parchment font-semibold mb-2">
                                        {isDragging ? 'Déposez l\'image ici' : 'Choisir une image'}
                                    </div>
                                    <div className="text-sm text-viking-leather dark:text-viking-bronze">
                                        Glissez-déposez ou cliquez pour sélectionner
                                    </div>
                                    <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1">
                                        JPG, PNG, GIF - Max 5MB - Redimensionné en 256×256px
                                    </div>
                                </label>
                            </div>
                        </div>
                    ) : (
                        // Cropper
                        <div className="space-y-4">
                            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-black rounded-lg overflow-hidden">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>

                            {/* Zoom slider */}
                            <div className="px-4">
                                <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                    🔍 Zoom
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Instructions */}
                            <div className="text-center text-sm text-viking-leather dark:text-viking-bronze">
                                💡 Faites glisser pour repositionner, utilisez le zoom pour ajuster
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t-2 border-viking-bronze bg-viking-parchment/30 dark:bg-gray-800/30 flex gap-3 flex-shrink-0">
                    {imageSrc ? (
                        <>
                            <button
                                onClick={() => setImageSrc(null)}
                                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                            >
                                ← Choisir une autre image
                            </button>
                            <button
                                onClick={createCroppedImage}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded-lg font-semibold hover:bg-viking-leather disabled:opacity-50"
                            >
                                {loading ? 'Traitement...' : '✓ Valider'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                            >
                                Annuler
                            </button>
                            {currentAvatar && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                                >
                                    🗑️ Supprimer l'avatar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
            {alertMessage && (
                <AlertModal
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </div>
    );
};

export default AvatarUploader;