const membersService = require('../../../../../../services/members');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

const {PERMIT_ACCESS} = membersService.contentGating;

const HAS_GATED_BLOCKS_REGEX = /<!--\s*kg-gated-block:begin/;
const GATED_BLOCK_REGEX = /<!--\s*kg-gated-block:begin\s+([^\n]+?)\s*-->\s*([\s\S]*?)\s*<!--\s*kg-gated-block:end\s*-->/g;

const parseGatedBlockParams = function (paramsString) {
    const params = {};
    // Match key-value pairs with optional quotes around the value
    const paramsRegex = /\b(?<key>\w+):["']?(?<value>[^"'\s]+)["']?/g;
    let match;
    while ((match = paramsRegex.exec(paramsString)) !== null) {
        const key = match.groups.key;
        const value = match.groups.value;
        // Convert "true"/"false" strings to booleans for `nonMember`
        params[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
    return params;
};

/**
 * @param {string} html - The HTML to strip gated blocks from
 * @param {object} member - The member who's access should be checked
 * @returns {string} HTML with gated blocks stripped
 */
const stripGatedBlocks = function (html, member) {
    return html.replace(GATED_BLOCK_REGEX, (match, params, content) => {
        const gatedBlockParams = module.exports.parseGatedBlockParams(params);
        const checkResult = membersService.contentGating.checkGatedBlockAccess(gatedBlockParams, member);

        if (checkResult === PERMIT_ACCESS) {
            // return content rather than match to avoid rendering gated block wrapping comments
            return content;
        } else {
            return '';
        }
    });
};

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

    const memberHasAccess = membersService.contentGating.checkPostAccess(attrs, frame.original.context.member);

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

    const hasGatedBlocks = HAS_GATED_BLOCKS_REGEX.test(attrs.html);
    if (hasGatedBlocks) {
        attrs.html = module.exports.stripGatedBlocks(attrs.html, frame.original.context.member);
        _updatePlaintext(attrs);
        _updateExcerpt(attrs);
    }

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'))) {
        attrs.access = memberHasAccess;
    }

    return attrs;
};

module.exports = {
    parseGatedBlockParams,
    stripGatedBlocks,
    forPost
};
