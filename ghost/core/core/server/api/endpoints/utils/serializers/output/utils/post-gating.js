const contentGatingService = require('../../../../../../services/content-gating');
const labs = require('../../../../../../../shared/labs');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

function _updatePlaintext(attrs) {
    if (attrs.html) {
        attrs.plaintext = htmlToPlaintext.excerpt(attrs.html);
    }
}

function _updateExcerpt(attrs) {
    if (!attrs.custom_excerpt && attrs.excerpt) {
        attrs.excerpt = htmlToPlaintext.excerpt(attrs.html).substring(0, 500);
    }
}

// @TODO: reconsider the location of this - it's part of members and adds a property to the API
const forPost = (attrs, frame) => {
    // CASE: Access always defaults to true, unless members is enabled and the member does not have access
    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'))) {
        attrs.access = true;
    }

    const memberHasAccess = contentGatingService.checkPostAccess(attrs, frame.original.context.member);

    if (!memberHasAccess) {
        const paywallIndex = (attrs.html || '').indexOf('<!--members-only-->');

        if (paywallIndex !== -1) {
            attrs.html = attrs.html.slice(0, paywallIndex);
            _updatePlaintext(attrs);
            _updateExcerpt(attrs);
        } else {
            ['plaintext', 'html', 'excerpt'].forEach((field) => {
                if (attrs[field] !== undefined) {
                    attrs[field] = '';
                }
            });
        }
    }

    if (labs.isSet('contentVisibility') && contentGatingService.htmlHasGatedBlocks(attrs.html)) {
        attrs.html = contentGatingService.removeGatedBlocksFromHtml(attrs.html, frame.original.context.member);
        _updatePlaintext(attrs);
        _updateExcerpt(attrs);
    }

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'))) {
        attrs.access = memberHasAccess;
    }

    return attrs;
};

module.exports = {
    forPost
};
