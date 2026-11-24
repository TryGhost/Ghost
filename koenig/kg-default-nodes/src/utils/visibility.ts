import type {ExportDOMOutput} from '../export-dom.js';
import {renderEmptyContainer} from './render-empty-container.js';

export const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';
export const PAID_MEMBERS_SEGMENT = 'status:-free'; // paid + comped + gift
export const FREE_MEMBERS_SEGMENT = 'status:free';
export const NO_MEMBERS_SEGMENT = '';

export type MemberSegment =
    | typeof NO_MEMBERS_SEGMENT
    | typeof ALL_MEMBERS_SEGMENT
    | typeof FREE_MEMBERS_SEGMENT
    | typeof PAID_MEMBERS_SEGMENT;

const MEMBER_SEGMENTS: readonly unknown[] = [NO_MEMBERS_SEGMENT, ALL_MEMBERS_SEGMENT, FREE_MEMBERS_SEGMENT, PAID_MEMBERS_SEGMENT];

export function isMemberSegment(value: unknown): value is MemberSegment {
    return MEMBER_SEGMENTS.includes(value);
}

// A card's audiences in the current format, with every field present
export interface RenderedVisibility {
    web: {nonMember: boolean; memberSegment: MemberSegment};
    email: {memberSegment: MemberSegment};
}

const DEFAULT_VISIBILITY: RenderedVisibility = {
    web: {
        nonMember: true,
        memberSegment: ALL_MEMBERS_SEGMENT
    },
    email: {
        memberSegment: ALL_MEMBERS_SEGMENT
    }
};

function isNullish(value: unknown) {
    return value === null || value === undefined;
}

// ensure we always work with a deep copy to avoid accidental ref mutations
export function buildDefaultVisibility(): RenderedVisibility {
    return JSON.parse(JSON.stringify(DEFAULT_VISIBILITY));
}

// Visibility can be in old or new format
export interface Visibility {
    web?: { nonMember?: boolean; memberSegment?: string };
    email?: { memberSegment?: string };
    showOnEmail?: boolean;
    showOnWeb?: boolean;
    emailOnly?: boolean;
    segment?: string;
    [key: string]: unknown;
}

export function isOldVisibilityFormat(visibility: Visibility) {
    return !Object.prototype.hasOwnProperty.call(visibility, 'web')
        || !Object.prototype.hasOwnProperty.call(visibility, 'email')
        || !Object.prototype.hasOwnProperty.call(visibility.web ?? {}, 'nonMember')
        || isNullish(visibility.web?.memberSegment)
        || isNullish(visibility.email?.memberSegment);
}

export function isVisibilityRestricted(visibility: Visibility) {
    if (isOldVisibilityFormat(visibility)) {
        visibility = migrateOldVisibilityFormat(visibility);
    }

    return visibility.web?.nonMember === false
        || visibility.web?.memberSegment !== ALL_MEMBERS_SEGMENT
        || visibility.email?.memberSegment !== ALL_MEMBERS_SEGMENT;
}

interface SerializedNode {
    visibility?: Visibility;
    children?: SerializedNode[];
    [key: string]: unknown;
}

/**
 * Whether any card in a serialized Lexical document has restricted visibility.
 * Accepts the stored JSON string or the parsed document.
 */
export function hasRestrictedCards(lexical: string | {root?: SerializedNode} | null | undefined): boolean {
    if (!lexical) {
        return false;
    }

    const document = typeof lexical === 'string' ? JSON.parse(lexical) : lexical;

    const hasRestrictedNode = (nodes: unknown): boolean => Array.isArray(nodes) && nodes.some((node: SerializedNode) => (
        (node?.visibility && isVisibilityRestricted(node.visibility)) || hasRestrictedNode(node?.children)
    ));

    return hasRestrictedNode(document?.root?.children);
}

export function isWebVisibilityRestricted(visibility: Visibility | undefined) {
    if (!visibility) {
        return false;
    }

    const web = migrateOldVisibilityFormat(visibility).web;
    return web?.nonMember !== true || web?.memberSegment !== ALL_MEMBERS_SEGMENT;
}

// Email play/download links normally go to the post so readers get the full
// player. When the card is hidden from some web visitors, an email recipient
// can land on the post without it (not entitled on web, or not signed in), so
// link straight to the media file instead.
export function getEmailMediaHref(src: string, visibility: Visibility | undefined, postUrl?: string) {
    if (isWebVisibilityRestricted(visibility)) {
        return src;
    }
    return postUrl || src;
}

// old formats...
//
// "segment" only applies to email visibility
// {emailOnly: true/false, segment: ''}
// {showOnWeb: true/false, showOnEmail: true/false, segment: 'status:free,status:-free'}
//
// segment: '' = everyone
// segment: 'status:free' = free members
// segment: 'status:paid' = paid members (incorrect, misses comped + gift)
// segment: 'status:-free' = paid members (correct, includes comped + gift)
// segment: 'status:-free+status:-paid' = no-one (incorrect, misses comped + gift)
//
// new format...
//
// {
//     web: {
//         nonMember: true/false,
//         memberSegment: 'status:free,status:-free'
//     },
//     email: {
//         memberSegment: 'status:free,status:-free'
//     }
// }
//
// memberSegment: '' = no-one
// memberSegment: 'status:free,status:-free' = everyone
// memberSegment: 'status:free' = free members
// memberSegment: 'status:-free' = paid + comped + gift members
export function migrateOldVisibilityFormat(visibility: Visibility): Visibility {
    if (!visibility || !isOldVisibilityFormat(visibility)) {
        return visibility;
    }

    // deep clone to avoid mutating the original object
    const newVisibility: Visibility = JSON.parse(JSON.stringify(visibility));

    // ensure we have expected objects ready to populate
    newVisibility.web ??= {};
    newVisibility.email ??= {};

    // convert web visibility, old formats only had on/off for web visibility rather than specific segments
    if (isNullish(visibility.showOnWeb) && isNullish(visibility.emailOnly)) {
        newVisibility.web = buildDefaultVisibility().web;
    } else if (!isNullish(visibility.emailOnly)) {
        newVisibility.web.nonMember = !visibility.emailOnly;
        newVisibility.web.memberSegment = visibility.emailOnly ? NO_MEMBERS_SEGMENT : ALL_MEMBERS_SEGMENT;
    } else {
        newVisibility.web.nonMember = visibility.showOnWeb;
        newVisibility.web.memberSegment = visibility.showOnWeb ? ALL_MEMBERS_SEGMENT : NO_MEMBERS_SEGMENT;
    }

    // convert email visibility, taking into account the old (and sometimes incorrect) segment formats
    if (isNullish(visibility.showOnEmail) && isNullish(visibility.emailOnly)) {
        newVisibility.email = buildDefaultVisibility().email;
    } else if (visibility.showOnEmail === false) {
        newVisibility.email.memberSegment = NO_MEMBERS_SEGMENT;
    } else if (visibility.segment === 'status:-free+status:-paid') {
        newVisibility.email.memberSegment = NO_MEMBERS_SEGMENT;
    } else if (visibility.segment === 'status:free') {
        newVisibility.email.memberSegment = FREE_MEMBERS_SEGMENT;
    } else if (visibility.segment === 'status:paid' || visibility.segment === 'status:-free') {
        newVisibility.email.memberSegment = PAID_MEMBERS_SEGMENT;
    } else if (!visibility.segment) {
        newVisibility.email.memberSegment = ALL_MEMBERS_SEGMENT;
    }

    return newVisibility;
}

// The audiences a card is rendered for. Only Ghost's own member segments and a
// true or false visitor setting are valid. Any other web value hides the card on
// the web, and any other email segment sends it to no-one, which is how the email
// service already treats segments it doesn't recognise.
export function getRenderedVisibility(visibility: Visibility | undefined): RenderedVisibility {
    const migrated = visibility ? migrateOldVisibilityFormat(visibility) : buildDefaultVisibility();

    const {nonMember, memberSegment: webSegment} = migrated.web ?? {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT};
    const {memberSegment: emailSegment} = migrated.email ?? {memberSegment: ALL_MEMBERS_SEGMENT};
    const validWebSegment = isMemberSegment(webSegment);

    return {
        web: {
            nonMember: validWebSegment && nonMember === true,
            memberSegment: validWebSegment ? webSegment : NO_MEMBERS_SEGMENT
        },
        email: {
            memberSegment: isMemberSegment(emailSegment) ? emailSegment : NO_MEMBERS_SEGMENT
        }
    };
}

export function renderWithVisibility(originalRenderOutput: ExportDOMOutput, visibility: Visibility | undefined, options: {target?: string}) {
    if (!visibility) {
        return originalRenderOutput;
    }

    const {element} = originalRenderOutput;

    if (!element || !('ownerDocument' in element)) {
        return originalRenderOutput;
    }

    const document = element.ownerDocument;

    const {web, email} = getRenderedVisibility(visibility);

    if (options.target === 'email') {
        if (email.memberSegment === NO_MEMBERS_SEGMENT) {
            return renderEmptyContainer(document);
        }

        if (email.memberSegment === ALL_MEMBERS_SEGMENT) {
            return originalRenderOutput;
        }

        return _renderWithEmailVisibility(document, _getRenderContent(originalRenderOutput), email);
    }

    const isNotVisibleOnWeb =
        web.nonMember === false &&
        web.memberSegment === NO_MEMBERS_SEGMENT;

    if (isNotVisibleOnWeb) {
        return renderEmptyContainer(document);
    }

    const hasWebVisibilityRestrictions =
        web.nonMember !== true ||
        web.memberSegment !== ALL_MEMBERS_SEGMENT;

    if (hasWebVisibilityRestrictions) {
        return _renderWithWebVisibility(document, _getRenderContent(originalRenderOutput), web);
    }

    return originalRenderOutput;
}

/* Private functions -------------------------------------------------------- */

function _getRenderContent({element, type}: ExportDOMOutput) {
    if (type === 'inner') {
        if (element && 'innerHTML' in element) {
            return element.innerHTML;
        }

        return '';
    } else if (type === 'value') {
        if (element && 'value' in element && typeof element.value === 'string') {
            return element.value;
        }

        return '';
    } else {
        if (element && 'outerHTML' in element) {
            return element.outerHTML;
        }

        return '';
    }
}

function _renderWithEmailVisibility(document: Document, content: string, emailVisibility: RenderedVisibility['email']): ExportDOMOutput<'html'> {
    const {memberSegment} = emailVisibility;
    const container = document.createElement('div');
    container.innerHTML = content;
    container.setAttribute('data-gh-segment', memberSegment);
    container.classList.add('kg-visibility-wrapper');
    return {element: container, type: 'html' as const};
}

function _renderWithWebVisibility(document: Document, content: string, webVisibility: RenderedVisibility['web']): ExportDOMOutput<'value'> {
    const {nonMember, memberSegment} = webVisibility;
    const wrappedContent = `\n<!--kg-gated-block:begin nonMember:${nonMember} memberSegment:"${memberSegment}" -->${content}<!--kg-gated-block:end-->\n`;
    const textarea = document.createElement('textarea');
    textarea.value = wrappedContent;
    return {element: textarea, type: 'value' as const};
}
