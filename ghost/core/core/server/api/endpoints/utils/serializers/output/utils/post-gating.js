const membersService = require('../../../../../../services/members');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

const {PERMIT_ACCESS} = membersService.contentGating;

// Match the start of a gated block - fast regex as a pre-check before doing full regex+loop
const HAS_GATED_BLOCKS_REGEX = /<!--\s*kg-gated-block:begin/;
// Match gated block comments
// e.g. <!--kg-gated-block:begin nonMember:true memberSegment:"status:free"-->...gated content<!--kg-gated-block:end-->
const GATED_BLOCK_REGEX = /<!--kg-gated-block:begin ([^\n]+?)\s*-->([\s\S]*?)<!--kg-gated-block:end-->/g;
// Match the key-value pairs (with optional quotes around the value) in the gated-block:begin comment
const GATED_BLOCK_PARAM_REGEX = /\b(?<key>\w+):["']?(?<value>[^"'\s]+)["']?/g;

const ALLOWED_GATED_BLOCK_PARAMS = {
    nonMember: {type: 'boolean'},
    memberSegment: {type: 'string', allowedValues: ['', 'status:free,status:-free', 'status:free', 'status:-free']}
};
const ALLOWED_GATED_BLOCK_KEYS = Object.keys(ALLOWED_GATED_BLOCK_PARAMS);

const parseGatedBlockParams = function (paramsString) {
    const params = {};

    const matches = paramsString.matchAll(GATED_BLOCK_PARAM_REGEX);
    for (const match of matches) {
        const key = match.groups.key;
        let value = match.groups.value;

        if (!ALLOWED_GATED_BLOCK_KEYS.includes(key)) {
            continue;
        }

        // Convert "true"/"false" strings to booleans, otherwise keep as string
        if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        }

        if (typeof value !== ALLOWED_GATED_BLOCK_PARAMS[key].type) {
            continue;
        }

        if (ALLOWED_GATED_BLOCK_PARAMS[key].allowedValues && !ALLOWED_GATED_BLOCK_PARAMS[key].allowedValues.includes(value)) {
            continue;
        }

        params[key] = value;
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

function _updateTextAttrs(attrs) {
    if (attrs.html) {
        attrs.plaintext = htmlToPlaintext.excerpt(attrs.html);
    }

    if (!attrs.custom_excerpt && attrs.excerpt) {
        const plaintext = attrs.plaintext || htmlToPlaintext.excerpt(attrs.html);
        attrs.excerpt = plaintext.substring(0, 500);
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
            _updateTextAttrs(attrs);
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
        _updateTextAttrs(attrs);
    }

    // Replace member UUID placeholder for Transistor embeds (URL-encoded {uuid})
    const member = frame.original.context.member;
    if (member && member.uuid && attrs.html) {
        attrs.html = attrs.html.replace(/%7Buuid%7D/gi, member.uuid);
    }

    // In preview mode, replace Transistor iframe (and its accompanying script + noscript)
    // with a static placeholder since the embed requires a real member UUID to function
    if (frame.isPreview && attrs.html && attrs.html.includes('data-kg-transistor-embed')) {
        attrs.html = attrs.html.replace(
            /<iframe[^>]*data-kg-transistor-embed[^>]*><\/iframe><script>[\s\S]*?<\/script>(?:<noscript>[\s\S]*?<\/noscript>)?/g,
            _buildTransistorPlaceholder()
        );
    }

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'))) {
        attrs.access = memberHasAccess;
    }

    return attrs;
};

function _buildTransistorPlaceholder() {
    return `<figure class="kg-card kg-transistor-card"><div class="kg-transistor-placeholder"><div class="kg-transistor-icon"><svg viewBox="5 0.5 144 144" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M77 120.3c-2.6 0-4.8-2.1-4.8-4.8V29.4c0-2.6 2.1-4.8 4.8-4.8s4.8 2.1 4.8 4.8v86.2c0 2.6-2.2 4.7-4.8 4.7z"/><path d="M57 77.3H34c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.1 4.8-4.8 4.8z"/><path d="M120.1 77.3h-23c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.2 4.8-4.8 4.8z"/><path d="M77 144.5c-39.7 0-72-32.3-72-72s32.3-72 72-72 72 32.3 72 72-32.3 72-72 72zM77 10c-34.4 0-62.4 28-62.4 62.4 0 34.4 28 62.4 62.4 62.4 34.4 0 62.4-28 62.4-62.4C139.4 38 111.4 10 77 10z"/></g></svg></div><div class="kg-transistor-content"><div class="kg-transistor-title">Members-only podcasts</div><div class="kg-transistor-description">Your Transistor podcasts will appear here. Members will see subscribe links based on their access level.</div></div></div></figure>`;
}

module.exports = {
    parseGatedBlockParams,
    stripGatedBlocks,
    forPost
};
