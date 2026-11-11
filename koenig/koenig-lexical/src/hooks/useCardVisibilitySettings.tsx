import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {VisibilitySettings} from '../components/ui/VisibilitySettings';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from './useVisibilityToggle';

// Returns the contents of a card's Visibility tab, or null when the card has no
// visibility property or the site has visibility settings turned off.
// `showVisibilitySettings` is true when the panel should open on that tab.
export function useCardVisibilitySettings(nodeKey, {hiddenToggles = []} = {}) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {showVisibilitySettings} = useKoenigSelectedCardContext();
    const {isVisibilityEnabled, visibilityOptions, toggleVisibility} = useVisibilityToggle(editor, nodeKey, cardConfig);

    let hasVisibility = false;
    editor.getEditorState().read(() => {
        const cardNode = $getNodeByKey(nodeKey);
        hasVisibility = $isKoenigCard(cardNode) && cardNode.hasVisibility?.() === true;
    });

    if (!hasVisibility || !isVisibilityEnabled) {
        return {visibilitySettings: null, showVisibilitySettings: false};
    }

    const options = visibilityOptions.map(group => ({
        ...group,
        toggles: group.toggles.filter(toggle => !hiddenToggles.includes(toggle.key))
    }));

    return {
        visibilitySettings: <VisibilitySettings toggleVisibility={toggleVisibility} visibilityOptions={options} />,
        showVisibilitySettings
    };
}
