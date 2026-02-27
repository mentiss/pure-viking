// src/client/src/AppRouter.jsx
// Routage déclaratif uniquement — aucune logique métier ici.
// Toute la logique (auth GM, chargement personnage, erreur système) est dans les pages.

import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { loadTheme, saveTheme } from './tools/utils';
import SystemLayout from './pages/SystemLayout.jsx';
import GMPage      from './pages/GMPage.jsx';
import PlayerPage  from './pages/PlayerPage.jsx';

const AppRouter = () => {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const saved = loadTheme();
        setDarkMode(saved);
        document.documentElement.classList.toggle('dark', saved);
    }, []);

    const toggleDarkMode = () => {
        const next = !darkMode;
        setDarkMode(next);
        saveTheme(next);
        document.documentElement.classList.toggle('dark', next);
    };

    const router = createBrowserRouter([
        // Redirections legacy
        { path: '/',   element: <Navigate to="/vikings/" replace /> },
        { path: '/mj', element: <Navigate to="/vikings/gm" replace /> },
        { path: '/gm', element: <Navigate to="/vikings/gm" replace /> },

        // Routes système
        {
            path: '/:system',
            element: <SystemLayout darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />,
            children: [
                { index: true,        element: <PlayerPage /> },
                { path: 'gm',         element: <GMPage /> },
                { path: ':accessUrl', element: <PlayerPage /> },
            ]
        },
    ]);

    return <RouterProvider router={router} />;
};

export default AppRouter;