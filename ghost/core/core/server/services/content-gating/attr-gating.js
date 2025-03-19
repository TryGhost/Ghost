const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const accessChecks = require('./access-checks');
const gatedBlocks = require('./gated-blocks');

/**
 * @typedef {import ('./typings').GatedMember} GatedMember
 * @typedef {import ('./typings').GatedPost} GatedPost
 * @typedef {import ('./typings').GatePostAttrsOptions} GatePostAttrsOptions
 */

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

function _applyPaywall(attrs) {
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

/**
 * Modifies the post attributes based on the member's access level.
 * It modifies the attrs object by reference as this is a hot path and we want
 * to avoid unnecessary deep cloning.
 *
 * @param {GatedPost} postAttrs
 * @param {GatedMember} member
 * @param {GatePostAttrsOptions} [options]
 */
module.exports.gatePostAttrs = function gatePostAttrs(postAttrs, member, options) {
    const defaultOptions = {addAccessAttr: true};
    options = Object.assign({}, defaultOptions, options);

    const memberHasAccess = accessChecks.checkPostAccess(postAttrs, member);

    // CASE: Access always defaults to true, unless members is enabled and the member does not have access
    if (options.addAccessAttr) {
        postAttrs.access = memberHasAccess;
    }

    if (!memberHasAccess) {
        _applyPaywall(postAttrs);
    }

    if (options.labs?.isSet('contentVisibility') && gatedBlocks.htmlHasGatedBlocks(postAttrs.html)) {
        postAttrs.html = gatedBlocks.removeGatedBlocksFromHtml(postAttrs.html, member);
        _updatePlaintext(postAttrs);
        _updateExcerpt(postAttrs);
    }
};
