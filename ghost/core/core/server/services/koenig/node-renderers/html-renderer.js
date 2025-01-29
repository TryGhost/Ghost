import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';
import {ALL_MEMBERS_SEGMENT, usesOldVisibilityFormat, migrateOldVisibilityFormat, NO_MEMBERS_SEGMENT} from '../../utils/visibility';

export function renderHtmlNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const html = node.html;

    if (!html) {
        return renderEmptyContainer(document);
    }

    const wrappedHtml = `\n<!--kg-card-begin: html-->\n${html}\n<!--kg-card-end: html-->\n`;

    const textarea = document.createElement('textarea');
    textarea.value = wrappedHtml;

    if (!options.feature?.contentVisibility || !node.visibility) {
        // `type: 'value'` will render the value of the textarea element
        return {element: textarea, type: 'value'};
    }

    const visibility = node.visibility;
    const oldVisibilityFormat = usesOldVisibilityFormat(visibility);

    if (oldVisibilityFormat) {
        migrateOldVisibilityFormat(visibility);
    }

    if (options.target === 'email') {
        if (visibility.email.memberSegment === NO_MEMBERS_SEGMENT) {
            return renderEmptyContainer(document);
        }

        if (visibility.email.memberSegment === ALL_MEMBERS_SEGMENT) {
            return {element: textarea, type: 'value'};
        }

        const container = document.createElement('div');
        container.innerHTML = wrappedHtml;
        container.setAttribute('data-gh-segment', visibility.email.memberSegment);
        return {element: container, type: 'html'};
    }

    if (visibility.web.nonMember === false && visibility.web.memberSegment === NO_MEMBERS_SEGMENT) {
        return renderEmptyContainer(document);
    }

    // If there are restrictions on web visibility, wrap the HTML in a gated block comment
    if (visibility.web.nonMember !== true || visibility.web.memberSegment !== ALL_MEMBERS_SEGMENT) {
        const {nonMember, memberSegment} = visibility.web;
        const visibilityWrappedHtml = `\n<!--kg-gated-block:begin nonMember:${nonMember} memberSegment:"${memberSegment}" -->${textarea.value}<!--kg-gated-block:end-->\n`;
        textarea.value = visibilityWrappedHtml;
    }

    return {element: textarea, type: 'value'};
}
