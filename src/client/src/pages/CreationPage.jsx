// src/client/src/pages/CreationPage.jsx
import React, { Suspense } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import LoadingScreen from "../components/gm/layout/LoadingScreen.jsx";

const CREATIONS = import.meta.glob('../systems/*/Creation.jsx');
const lazyCache = {};
const getLazyComponent = (glob, key) => {
    if (!lazyCache[key]) lazyCache[key] = React.lazy(glob[key]);
    return lazyCache[key];
};

const CreationPage = () => {
    const { system }                     = useParams();
    const navigate               = useNavigate();
    const { darkMode, onToggleDarkMode } = useOutletContext();

    const creationKey = `../systems/${system}/Creation.jsx`;
    if (!CREATIONS[creationKey]) {
        navigate(`/${system}/`);
        return null;
    }

    const SystemCreation = getLazyComponent(CREATIONS, creationKey);

    const handleCreated = (newCharacter) => {
        navigate(`/${system}/${newCharacter.accessUrl}`);
    };

    const handleCancel = () => {
        navigate(`/${system}/`);
    };

    return (
        <Suspense fallback={<LoadingScreen />}>
            <SystemCreation
                onCreated={handleCreated}
                onCancel={handleCancel}
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
            />
        </Suspense>
    );
};

export default CreationPage;