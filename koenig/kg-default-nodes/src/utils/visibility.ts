import type {ExportDOMOutput} from '../export-dom.js';
import {renderEmptyContainer} from './render-empty-container.js';

export const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';
export const PAID_MEMBERS_SEGMENT = 'status:-free'; // paid + comped
export const FREE_MEMBERS_SEGMENT = 'status:free';
export const NO_MEMBERS_SEGMENT = '';

const DEFAULT_VISIBILITY = {
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
export function buildDefaultVisibility() {
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

// old formats...
//
// "segment" only applies to email visibility
// {emailOnly: true/false, segment: ''}
// {showOnWeb: true/false, showOnEmail: true/false, segment: 'status:free,status:-free'}
//
// segment: '' = everyone
// segment: 'status:free' = free members
// segment: 'status:paid' = paid members (incorrect, misses comped)
// segment: 'status:-free' = paid members (correct, includes comped)
// segment: 'status:-free+status:-paid' = no-one (incorrect, misses comped)
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
// memberSegment: 'status:-free' = paid + comped members
export function migrateOldVisibilityFormat(visibility: Visibility) {
    if (!visibility || !isOldVisibilityFormat(visibility)) {
        return visibility;
    }

    // deep clone to avoid mutating the original object
    const newVisibility = JSON.parse(JSON.stringify(visibility));

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

export function renderWithVisibility(originalRenderOutput: ExportDOMOutput, visibility: Visibility | undefined, options: {target?: string}) {
    if (!visibility) {
        return originalRenderOutput;
    }

    const {element} = originalRenderOutput;

    if (!element || !('ownerDocument' in element)) {
        return originalRenderOutput;
    }

    const document = element.ownerDocument;
    const content = _getRenderContent(originalRenderOutput);

    const migrated = migrateOldVisibilityFormat(visibility);

    const email = migrated.email ?? {memberSegment: ALL_MEMBERS_SEGMENT};
    const web = migrated.web ?? {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT};

    if (options.target === 'email') {
        if (email.memberSegment === NO_MEMBERS_SEGMENT) {
            return renderEmptyContainer(document);
        }

        if (email.memberSegment === ALL_MEMBERS_SEGMENT) {
            return originalRenderOutput;
        }

        return _renderWithEmailVisibility(document, content, email as {memberSegment: string});
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
        return _renderWithWebVisibility(document, content, web as {nonMember: boolean; memberSegment: string});
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

function _renderWithEmailVisibility(document: Document, content: string, emailVisibility: {memberSegment: string}): ExportDOMOutput<'html'> {
    const {memberSegment} = emailVisibility;
    const container = document.createElement('div');
    container.innerHTML = content;
    container.setAttribute('data-gh-segment', memberSegment);
    container.classList.add('kg-visibility-wrapper');
    return {element: container, type: 'html' as const};
}

function _renderWithWebVisibility(document: Document, content: string, webVisibility: {nonMember: boolean; memberSegment: string}): ExportDOMOutput<'value'> {
    const {nonMember, memberSegment} = webVisibility;
    const wrappedContent = `\n<!--kg-gated-block:begin nonMember:${nonMember} memberSegment:"${memberSegment}" -->${content}<!--kg-gated-block:end-->\n`;
    const textarea = document.createElement('textarea');
    textarea.value = wrappedContent;
    return {element: textarea, type: 'value' as const};
}
