// src/client/src/systems/cyberpunk/GMApp.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shell GM cyberpunk — point d'entrée détecté par auto-discovery.
// Contrat props imposé par GMPage.jsx.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import './theme.css';
import GMView from './gm/GMView.jsx';

const GMApp = ({ activeSession, onSessionChange, onlineCharacters, darkMode, onToggleDarkMode }) => (
    <GMView
        activeSession={activeSession}
        onSessionChange={onSessionChange}
        onlineCharacters={onlineCharacters}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
    />
);

export default GMApp;