import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {VisibilitySettings} from '../components/ui/VisibilitySettings';
import {getVisibilityToggle} from './useVisibilityToggle';
import {isCardVisibilityAvailable} from '../utils/visibility';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// Whether the editor offers visibility settings for this card: it has a
// visibility property and the host supports visibility for its type.
export function useCardVisibilityAvailable(nodeKey) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);

    let isAvailable = false;
    editor.getEditorState().read(() => {
        const cardNode = $getNodeByKey(nodeKey);
        isAvailable = $isKoenigCard(cardNode)
            && cardNode.hasVisibility?.() === true
            && isCardVisibilityAvailable(cardNode.getType(), cardConfig);
    });
    return isAvailable;
}

// Returns the contents of a card's Visibility tab while the card is being
// edited, or null when it isn't or the card has no visibility settings.
// `showVisibilitySettings` is true when the panel should open on that tab.
export function useCardVisibilitySettings(nodeKey, {hiddenToggles = []} = {}) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {showVisibilitySettings} = useKoenigSelectedCardContext();
    const isAvailable = useCardVisibilityAvailable(nodeKey);

    // the panel is only shown in edit mode, so don't build options for every card
    if (!isEditing || !isAvailable) {
        return {visibilitySettings: null, showVisibilitySettings: false};
    }

    const {visibilityOptions, toggleVisibility} = getVisibilityToggle(editor, nodeKey, cardConfig);

    const options = visibilityOptions.map(group => ({
        ...group,
        toggles: group.toggles.filter(toggle => !hiddenToggles.includes(toggle.key))
    }));

    // Nested text editors can leave a range selection in the parent editor.
    // Restore the card selection before updating, as the card's other toggles do.
    const handleToggleVisibility = (type, key, value) => {
        setEditing(true);
        toggleVisibility(type, key, value);
    };

    return {
        visibilitySettings: <VisibilitySettings toggleVisibility={handleToggleVisibility} visibilityOptions={options} />,
        showVisibilitySettings
    };
}
