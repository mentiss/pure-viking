// src/client/src/systems/vikings/GMApp.jsx
// Point d'entrée GM pour le système Vikings.
// Contrat obligatoire de chaque système : props darkMode + onToggleDarkMode.
// C'est ici qu'on importe le thème et qu'on compose GMView avec les éléments spécifiques Vikings.

import './theme.css';
import React from 'react';
import GMView from './gm/GMView.jsx';

const GMApp = ({ darkMode, onToggleDarkMode }) => {
    return (
        <GMView
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
        />
    );
};

export default GMApp;