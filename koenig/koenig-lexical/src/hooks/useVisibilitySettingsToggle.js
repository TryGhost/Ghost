import React from 'react';
import {$getNodeByKey} from 'lexical';
import {$isHtmlNode} from '../nodes/HtmlNode';
import {DESELECT_CARD_COMMAND, EDIT_CARD_COMMAND, SELECT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';

export function useVisibilitySettingsToggle(editor, nodeKey, isSelected, showVisibilitySettings, setShowVisibilitySettings, isEditing) {
    return React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();

        editor.update(() => {
            const cardNode = $getNodeByKey(nodeKey);

            // If the card is an html card, we toggle the visibility settings differently
            // because we want to show the visibility settings panel while in selected mode
            // instead of entering edit mode
            if ($isHtmlNode(cardNode)) {
                setShowVisibilitySettings(showVisibilitySettings ? false : true);
                if (!isSelected) {
                    editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: true});
                }
            } else {
                if (cardNode?.hasEditMode?.() && !isEditing) {
                    editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: true});
                } else if (isEditing) {
                    editor.dispatchCommand(DESELECT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: true});
                }
            }
        });
    }, [editor, isSelected, nodeKey, setShowVisibilitySettings, showVisibilitySettings, isEditing]);
}
