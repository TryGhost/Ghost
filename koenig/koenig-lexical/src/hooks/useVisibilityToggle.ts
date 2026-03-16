import {$getNodeByKey} from 'lexical';
import {VISIBILITY_SETTINGS, getVisibilityOptions, parseVisibilityToToggles, serializeOptionsToVisibility} from '../utils/visibility';

export const useVisibilityToggle = (editor, nodeKey, cardConfig) => {
    const isStripeEnabled = cardConfig?.stripeEnabled;
    const visibilitySetting = cardConfig?.visibilitySettings ?? VISIBILITY_SETTINGS.WEB_AND_EMAIL;
    const isVisibilityEnabled = visibilitySetting !== VISIBILITY_SETTINGS.NONE;
    const showWeb = visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.WEB_ONLY;
    const showEmail = visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.EMAIL_ONLY;

    let currentVisibility;

    editor.getEditorState().read(() => {
        const htmlNode = $getNodeByKey(nodeKey);
        if (!htmlNode) {
            return;
        }
        currentVisibility = htmlNode.visibility;
    });

    const visibilityData = parseVisibilityToToggles(currentVisibility);
    const visibilityOptions = getVisibilityOptions(currentVisibility, {isStripeEnabled, showWeb, showEmail});

    return {
        isVisibilityEnabled,
        visibilityData,
        visibilityOptions,
        toggleVisibility: (type, key, value) => {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                if (!node) {
                    return;
                }
                const newVisibilityOptions = structuredClone(getVisibilityOptions(node.visibility, {isStripeEnabled, showWeb, showEmail}));
                const toggle = newVisibilityOptions.find(g => g.key === type)?.toggles?.find(t => t.key === key);
                if (!toggle) {
                    return;
                }

                toggle.checked = value;
                node.visibility = serializeOptionsToVisibility(newVisibilityOptions, node.visibility);
            });
        }
    };
};
