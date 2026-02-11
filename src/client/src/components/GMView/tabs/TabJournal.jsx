// components/GMView/tabs/TabJournal.jsx - Onglet Journal MJ
// Réutilise directement le composant JournalTab joueur avec characterId=-1
import React from 'react';
import JournalTab from '../../JournalTab.jsx';

const TabJournal = () => {
    return <JournalTab characterId={-1} />;
};

export default TabJournal;