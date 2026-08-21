import {createRemoteComponent, type RemoteComponentTypeFromElementConstructor} from '@remote-dom/preact';
import type {RemoteConnection} from '@remote-dom/core/elements';
import {GhostMutationMirror} from './mutation-mirror.ts';
import {
    GhBadgeElement,
    GhButtonElement,
    GhHeadingElement,
    GhInlineElement,
    GhSeparatorElement,
    GhSparklineElement,
    GhStackElement,
    GhStatElement,
    GhTabElement,
    GhTabsElement,
    GhTextElement,
    registerGhostElements
} from './elements.ts';

registerGhostElements();

// The mirror MUST come from the same @remote-dom/core copy as the element
// definitions — remote-dom wires connections through module-internal state, so
// a second copy (e.g. one bundled into the bootstrap) would deliver structure
// but silently drop event listeners and property updates. The authoring
// package owns both; the bootstrap only passes the connection through.
(globalThis as Record<string, unknown>).__ghostAddonConnect = (connection: RemoteConnection, root: Node) => {
    const mirror = new GhostMutationMirror(connection);
    mirror.observe(root);
    return mirror;
};

/**
 * Preact components over the `gh-*` vocabulary. Add-on authors render these;
 * the host maps each tag to a real Shade component.
 */

export const GhText = createRemoteComponent('gh-text', GhTextElement);

export const GhStack = createRemoteComponent('gh-stack', GhStackElement);

export const GhInline = createRemoteComponent('gh-inline', GhInlineElement);

export const GhBadge = createRemoteComponent('gh-badge', GhBadgeElement);

export const GhHeading = createRemoteComponent('gh-heading', GhHeadingElement);

export const GhSeparator = createRemoteComponent('gh-separator', GhSeparatorElement);

export const GhStat = createRemoteComponent('gh-stat', GhStatElement);

export const GhSparkline = createRemoteComponent('gh-sparkline', GhSparklineElement);

export const GhTabs = createRemoteComponent('gh-tabs', GhTabsElement, {
    eventProps: {
        onChange: {event: 'change'}
    }
    // See GhButton: eventProps are not threaded into the component type.
}) as RemoteComponentTypeFromElementConstructor<typeof GhTabsElement, {onChange?: (event: CustomEvent<string>) => void}>;

export const GhTab = createRemoteComponent('gh-tab', GhTabElement);

export const GhButton = createRemoteComponent('gh-button', GhButtonElement, {
    eventProps: {
        onPress: {event: 'press'}
    }
    // The library's return type does not thread eventProps into the component
    // props, so the authoring-facing type is asserted here.
}) as RemoteComponentTypeFromElementConstructor<typeof GhButtonElement, {onPress?: () => void}>;
