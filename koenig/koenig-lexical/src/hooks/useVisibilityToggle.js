import {$getNodeByKey} from 'lexical';
import {getVisibilityOptions, parseVisibilityToToggles, serializeOptionsToVisibility} from '../utils/visibility';

export const useVisibilityToggle = (editor, nodeKey, cardConfig) => {
    const isStripeEnabled = cardConfig?.stripeEnabled;

    let currentVisibility;

    editor.getEditorState().read(() => {
        const htmlNode = $getNodeByKey(nodeKey);
        currentVisibility = htmlNode.visibility;
    });

    const visibilityData = parseVisibilityToToggles(currentVisibility);
    const visibilityOptions = getVisibilityOptions(currentVisibility, {isStripeEnabled});

    return {
        visibilityData,
        visibilityOptions,
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
