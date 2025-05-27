const {renderEmptyContainer} = require('./render-empty-container');

const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';
const PAID_MEMBERS_SEGMENT = 'status:-free'; // paid + comped
const FREE_MEMBERS_SEGMENT = 'status:free';
const NO_MEMBERS_SEGMENT = '';

const DEFAULT_VISIBILITY = {
    web: {
        nonMember: true,
        memberSegment: ALL_MEMBERS_SEGMENT
    },
    email: {
        memberSegment: ALL_MEMBERS_SEGMENT
    }
};

function isNullish(value) {
    return value === null || value === undefined;
}

// ensure we always work with a deep copy to avoid accidental ref mutations
function buildDefaultVisibility() {
    return JSON.parse(JSON.stringify(DEFAULT_VISIBILITY));
}

function isOldVisibilityFormat(visibility) {
    return !Object.prototype.hasOwnProperty.call(visibility, 'web')
        || !Object.prototype.hasOwnProperty.call(visibility, 'email')
        || !Object.prototype.hasOwnProperty.call(visibility.web, 'nonMember')
        || isNullish(visibility.web.memberSegment)
        || isNullish(visibility.email.memberSegment);
}

function isVisibilityRestricted(visibility) {
    if (isOldVisibilityFormat(visibility)) {
        return visibility.showOnEmail === false
            || visibility.showOnWeb === false
            || visibility.emailOnly === true
            || visibility.segment !== '';
    } else {
        return visibility.web.nonMember === false
            || visibility.web.memberSegment !== ALL_MEMBERS_SEGMENT
            || visibility.email.memberSegment !== ALL_MEMBERS_SEGMENT;
    }
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
function migrateOldVisibilityFormat(visibility) {
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

function renderWithVisibility(originalRenderOutput, visibility, options) {
    const document = originalRenderOutput.element.ownerDocument;
    const content = _getRenderContent(originalRenderOutput);

    visibility = migrateOldVisibilityFormat(visibility);

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

module.exports = {
    ALL_MEMBERS_SEGMENT,
    PAID_MEMBERS_SEGMENT,
    FREE_MEMBERS_SEGMENT,
    NO_MEMBERS_SEGMENT,
    buildDefaultVisibility,
    isOldVisibilityFormat,
    isVisibilityRestricted,
    migrateOldVisibilityFormat,
    renderWithVisibility
};
