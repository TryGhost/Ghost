import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {SettingsPanel} from './ui/SettingsPanel';
import {useCardVisibilitySettings} from '../hooks/useCardVisibilitySettings';

interface CardSettingsTab {
    id: string;
    label: string;
    content: React.ReactNode;
}

interface CardSettingsPanelProps {
    // the card's own settings groups, e.g. Design. Visibility is added last.
    tabs?: CardSettingsTab[];
    // visibility toggles that don't apply to this card, e.g. `nonMembers`
    hiddenVisibilityToggles?: string[];
}

// A card's single settings panel, shown while the card is in edit mode.
// Renders nothing when the card has no settings to show.
export function CardSettingsPanel({tabs = [], hiddenVisibilityToggles}: CardSettingsPanelProps) {
    const {darkMode} = React.useContext(KoenigComposerContext);
    const {isEditing, nodeKey, cardWidth} = React.useContext(CardContext);
    const {visibilitySettings, showVisibilitySettings} = useCardVisibilitySettings(nodeKey, {hiddenToggles: hiddenVisibilityToggles});

    const allTabs = visibilitySettings
        ? [...tabs, {id: 'visibility', label: 'Visibility', content: visibilitySettings}]
        : tabs;

    if (!isEditing || allTabs.length === 0) {
        return null;
    }

    return (
        <SettingsPanel
            cardWidth={cardWidth}
            darkMode={darkMode}
            defaultTab={showVisibilitySettings && visibilitySettings ? 'visibility' : allTabs[0].id}
            tabs={allTabs.map(({id, label}) => ({id, label}))}
        >
            {Object.fromEntries(allTabs.map(tab => [tab.id, tab.content]))}
        </SettingsPanel>
    );
}
