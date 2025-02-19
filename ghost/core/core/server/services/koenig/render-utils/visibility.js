import {renderEmptyContainer} from './render-empty-container';

export const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';
export const NO_MEMBERS_SEGMENT = '';

const DEFAULT_VISIBILITY = {
    web: {
        nonMember: true,
        memberSegment: 'status:free,status:-free'
    },
    email: {
        memberSegment: 'status:free,status:-free'
    }
};

// ensure we always work with a deep copy to avoid accidental constant mutations
export function buildDefaultVisibility() {
    return JSON.parse(JSON.stringify(DEFAULT_VISIBILITY));
}

export function usesOldVisibilityFormat(visibility) {
    return !Object.prototype.hasOwnProperty.call(visibility, 'web')
        || !Object.prototype.hasOwnProperty.call(visibility, 'email')
        || !Object.prototype.hasOwnProperty.call(visibility.web, 'nonMember');
}

export function migrateOldVisibilityFormat(visibility) {
    visibility.web ??= {};
    visibility.web.nonMember ??= visibility.showOnWeb;
    visibility.web.memberSegment ??= visibility.showOnWeb ? ALL_MEMBERS_SEGMENT : NO_MEMBERS_SEGMENT;

    visibility.email ??= {};
    if (visibility.showOnEmail) {
        visibility.email.memberSegment ??= visibility.segment ? visibility.segment : ALL_MEMBERS_SEGMENT;
    } else {
        visibility.email.memberSegment = NO_MEMBERS_SEGMENT;
    }
}

export function renderWithVisibility(originalRenderOutput, visibility, options) {
    const document = originalRenderOutput.element.ownerDocument;
    const content = _getRenderContent(originalRenderOutput);

    if (usesOldVisibilityFormat(visibility)) {
        migrateOldVisibilityFormat(visibility);
    }

    if (options.target === 'email') {
        if (visibility.email.memberSegment === NO_MEMBERS_SEGMENT) {
            return renderEmptyContainer(document);
        }

        if (visibility.email.memberSegment === ALL_MEMBERS_SEGMENT) {
            return originalRenderOutput;
        }

        return _renderWithEmailVisibility(document, content, visibility.email);
    }

    const isNotVisibleOnWeb =
        visibility.web.nonMember === false &&
        visibility.web.memberSegment === NO_MEMBERS_SEGMENT;

    if (isNotVisibleOnWeb) {
        return renderEmptyContainer(document);
    }

    const hasWebVisibilityRestrictions =
        visibility.web.nonMember !== true ||
        visibility.web.memberSegment !== ALL_MEMBERS_SEGMENT;

    if (hasWebVisibilityRestrictions) {
        return _renderWithWebVisibility(document, content, visibility.web);
    }

    return originalRenderOutput;
}

/* Private functions -------------------------------------------------------- */

function _getRenderContent({element, type}) {
    if (type === 'inner') {
        return element.innerHTML;
    } else if (type === 'value') {
        if ('value' in element) {
            return element.value;
        }
        return '';
    } else {
        return element.outerHTML;
    }
}

function _renderWithEmailVisibility(document, content, emailVisibility) {
    const {memberSegment} = emailVisibility;
    const container = document.createElement('div');
    container.innerHTML = content;
    container.setAttribute('data-gh-segment', memberSegment);
    container.classList.add('kg-visibility-wrapper');
    return {element: container, type: 'html'};
}

function _renderWithWebVisibility(document, content, webVisibility) {
    const {nonMember, memberSegment} = webVisibility;
    const wrappedContent = `\n<!--kg-gated-block:begin nonMember:${nonMember} memberSegment:"${memberSegment}" -->${content}<!--kg-gated-block:end-->\n`;
    const textarea = document.createElement('textarea');
    textarea.value = wrappedContent;
    return {element: textarea, type: 'value'};
}
