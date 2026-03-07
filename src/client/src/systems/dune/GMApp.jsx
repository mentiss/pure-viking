// src/client/src/systems/dune/GMApp.jsx
// Wrapper minimal — contrat GMPage identique à tous les slugs.
// Délègue entièrement à GMView.

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