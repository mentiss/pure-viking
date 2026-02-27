// src/client/src/systems/vikings/GMApp.jsx
// Contrat : reçoit activeSession, onSessionChange, onlineCharacters depuis GMPage.
// Les sockets génériques sont gérés dans GMPage via useGMSession.

import './theme.css';
import React from 'react';
import GMView from './gm/GMView.jsx';

const GMApp = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => {
    return (
        <GMView
            activeSession={activeSession}
            onSessionChange={onSessionChange}
            onlineCharacters={onlineCharacters}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
        />
    );
};

export default GMApp;