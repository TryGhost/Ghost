import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {SettingsPanel} from './ui/SettingsPanel';
import {useCardVisibilitySettings} from '../hooks/useCardVisibilitySettings';
import type {VisibilityToggleKey} from '../utils/visibility';

interface CardSettingsPanelProps {
    // visibility toggles that don't apply to this card, e.g. `nonMembers`
    hiddenVisibilityToggles?: VisibilityToggleKey[];
}

// The settings panel of a card with no settings of its own, which only has
// its Visibility tab. Shown while the card is in edit mode, and renders
// nothing when the card has no visibility settings to show.
export function CardSettingsPanel({hiddenVisibilityToggles}: CardSettingsPanelProps) {
    const {darkMode} = React.useContext(KoenigComposerContext);
    const {isEditing, nodeKey, cardWidth} = React.useContext(CardContext);
    const {visibilitySettings, showVisibilitySettings} = useCardVisibilitySettings(nodeKey, {hiddenToggles: hiddenVisibilityToggles});

    if (!isEditing || !visibilitySettings) {
        return null;
    }

    return (
        <SettingsPanel
            cardWidth={cardWidth}
            darkMode={darkMode}
            showVisibilitySettings={showVisibilitySettings}
            tabs={[]}
            visibilitySettings={visibilitySettings}
        >
            {{}}
        </SettingsPanel>
    );
}
