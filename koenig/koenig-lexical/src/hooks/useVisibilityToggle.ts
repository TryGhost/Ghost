import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {VISIBILITY_SETTINGS, getVisibilityOptions, parseVisibilityToToggles, serializeOptionsToVisibility} from '../utils/visibility';
import type {LexicalEditor, NodeKey} from 'lexical';
import type {Visibility} from '../utils/visibility';

interface CardConfig {
    stripeEnabled?: boolean;
    visibilitySettings?: string;
    [key: string]: unknown;
}

export const useVisibilityToggle = (editor: LexicalEditor, nodeKey: NodeKey, cardConfig: CardConfig | undefined) => {
    const isStripeEnabled = cardConfig?.stripeEnabled;
    const visibilitySetting = cardConfig?.visibilitySettings ?? VISIBILITY_SETTINGS.WEB_AND_EMAIL;
    const isVisibilityEnabled = visibilitySetting !== VISIBILITY_SETTINGS.NONE;
    const showWeb = visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.WEB_ONLY;
    const showEmail = visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.EMAIL_ONLY;

    let currentVisibility: Visibility | undefined;

    editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isKoenigCard(node)) {
            return;
        }
        currentVisibility = node.visibility as Visibility | undefined;
    });

    const visibilityData = parseVisibilityToToggles(currentVisibility);
    const visibilityOptions = getVisibilityOptions(currentVisibility, {isStripeEnabled, showWeb, showEmail});

    return {
        isVisibilityEnabled,
        visibilityData,
        visibilityOptions,
        toggleVisibility: (type: string, key: string, value: boolean) => {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                if (!$isKoenigCard(node)) {
                    return;
                }
                const nodeVisibility = node.visibility as Visibility | undefined;
                const newVisibilityOptions = structuredClone(getVisibilityOptions(nodeVisibility, {isStripeEnabled, showWeb, showEmail}));
                const toggle = newVisibilityOptions.find(g => g.key === type)?.toggles?.find(t => t.key === key);
                if (!toggle) {
                    return;
                }

                toggle.checked = value;
                node.visibility = serializeOptionsToVisibility(newVisibilityOptions, nodeVisibility);
            });
        }
    };
};
