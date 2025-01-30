import {$getNodeByKey} from 'lexical';
import {generateVisibilityMessage, getVisibilityOptions, parseVisibilityToToggles, serializeOptionsToVisibility, serializeTogglesToVisibility} from '../utils/visibility';

export const useVisibilityToggle = (editor, nodeKey, cardConfig) => {
    const isStripeEnabled = cardConfig?.stripeEnabled;
    const isContentVisibilityAlphaEnabled = cardConfig?.feature?.contentVisibilityAlpha || false;

    let currentVisibility;
    let isVisibilityActive = false;

    editor.getEditorState().read(() => {
        const htmlNode = $getNodeByKey(nodeKey);
        currentVisibility = htmlNode.visibility;
        isVisibilityActive = htmlNode.getIsVisibilityActive();
    });

    const visibilityData = parseVisibilityToToggles(currentVisibility);
    const visibilityOptions = getVisibilityOptions(currentVisibility, {isStripeEnabled});

    let visibilityMessage = '';
    if (isVisibilityActive && !isContentVisibilityAlphaEnabled) {
        visibilityMessage = generateVisibilityMessage(currentVisibility);
    }

    return {
        visibilityData,
        visibilityOptions,
        visibilityMessage,
        // used with contentVisibility
        updateVisibility: (newVisibilityData) => {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.visibility = serializeTogglesToVisibility(newVisibilityData);
            });
        },
        // used with contentVisibilityAlpha
        toggleVisibility: (type, key, value) => {
            editor.update(() => {
                const newVisibilityOptions = structuredClone(visibilityOptions);
                const group = newVisibilityOptions.find(g => g.key === type);
                const toggle = group.toggles.find(t => t.key === key);
                toggle.checked = value;

                const node = $getNodeByKey(nodeKey);
                node.visibility = serializeOptionsToVisibility(newVisibilityOptions);
            });
        }
    };
};
