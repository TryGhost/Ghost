import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {VISIBILITY_SETTINGS, getVisibilityOptions, isCardVisibilityAvailable, parseVisibilityToToggles, serializeOptionsToVisibility} from '../utils/visibility';
import {getRenderedVisibility} from '@tryghost/kg-default-nodes/visibility';
import type {CardConfig} from '../context/KoenigComposerContext';
import type {LexicalEditor, NodeKey} from 'lexical';
import type {RenderedVisibility, Visibility} from '@tryghost/kg-default-nodes/visibility';
import type {ToggleVisibility} from '../utils/visibility';

// Reads a card's visibility and builds its toggle options. A plain function, so
// callers can skip the work when no settings are shown; useVisibilityToggle is
// the same function for callers that always need it.
export const getVisibilityToggle = (editor: LexicalEditor, nodeKey: NodeKey, cardConfig?: CardConfig) => {
    const isStripeEnabled = cardConfig?.stripeEnabled;
    const visibilitySetting = cardConfig?.visibilitySettings ?? VISIBILITY_SETTINGS.WEB_AND_EMAIL;
    const showWeb = visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.WEB_ONLY;
    const showEmail = visibilitySetting === VISIBILITY_SETTINGS.WEB_AND_EMAIL || visibilitySetting === VISIBILITY_SETTINGS.EMAIL_ONLY;

    let currentVisibility: RenderedVisibility | undefined;
    let visibilityEnabled = false;

    editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isKoenigCard(node)) {
            return;
        }
        currentVisibility = getRenderedVisibility(node.visibility as Visibility | undefined);
        visibilityEnabled = isCardVisibilityAvailable(node.getType(), cardConfig);
    });

    const visibilityData = parseVisibilityToToggles(currentVisibility);
    const visibilityOptions = getVisibilityOptions(currentVisibility, {isStripeEnabled, showWeb, showEmail});

    const toggleVisibility: ToggleVisibility = (groupKey, toggleKey, value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (!$isKoenigCard(node)) {
                return;
            }
            const nodeVisibility = getRenderedVisibility(node.visibility as Visibility | undefined);
            const newVisibilityOptions = structuredClone(getVisibilityOptions(nodeVisibility, {isStripeEnabled, showWeb, showEmail}));
            const toggle = newVisibilityOptions.find(g => g.key === groupKey)?.toggles?.find(t => t.key === toggleKey);
            if (!toggle) {
                return;
            }

            toggle.checked = value;
            node.visibility = serializeOptionsToVisibility(newVisibilityOptions, nodeVisibility);
        });
    };

    return {
        isVisibilityEnabled: visibilityEnabled,
        visibilityData,
        visibilityOptions,
        toggleVisibility
    };
};

export const useVisibilityToggle = getVisibilityToggle;
