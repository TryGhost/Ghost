/**
 * The add-on authoring surface. Add-ons import Preact components for the
 * `gh-*` vocabulary and types for the `ghost` bridge from here.
 *
 * Entry modules default-export a function receiving the `ghost` bridge and
 * render into `document.body`:
 *
 * ```tsx
 * import {render} from 'preact';
 * import {GhStack, GhText, type GhostBridge} from '@tryghost/addon-kit/addon';
 *
 * export default (ghost: GhostBridge) => {
 *     render(<GhStack><GhText>Hello</GhText></GhStack>, document.body);
 * };
 * ```
 *
 * The authoring contract promises only that `gh-*` primitives are observed —
 * anything else done to the (hidden, inert) sandbox document is not part of
 * the contract and may stop working.
 */

export {GhBadge, GhButton, GhHeading, GhInline, GhSeparator, GhSparkline, GhStack, GhStat, GhTab, GhTabs, GhText} from './components.ts';
export {
    registerGhostElements,
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
    type GhBadgeVariant,
    type GhButtonVariant,
    type GhHeadingLevel,
    type GhInlineJustify,
    type GhSparklineColor,
    type GhStackGap,
    type GhStatDeltaDirection,
    type GhTextTone,
    type GhTextWeight
} from './elements.ts';
export type {
    AddonDataEnvelope,
    AddonManifest,
    AddonModuleFunction,
    GhostBridge
} from '../types.ts';
