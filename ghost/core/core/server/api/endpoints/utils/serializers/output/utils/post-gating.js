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

/**
 * Extracts the per-post web CTA overrides from the post's paywall card so the
 * frontend can render them in place of the built-in defaults. Runs before the
 * lexical source is stripped from Content API output.
 *
 * @param {string} [lexical]
 * @returns {Object | null} snake_cased webCta dataset, or null when the post
 * has no paywall card or the card carries no web overrides
 */
const getPaywallCardCta = (lexical) => {
    if (!lexical || !lexical.includes('"type":"paywall"')) {
        return null;
    }

    try {
        const stack = [...(JSON.parse(lexical).root?.children || [])];
        while (stack.length) {
            const node = stack.shift();
            if (node?.type === 'paywall') {
                // the card's per-post override for THIS channel; empty means
                // the built-in default, which the theme resolves
                const web = node.webCta || {};
                const cta = {
                    heading: web.heading || null,
                    description: web.description || null,
                    button_text: web.buttonText || null,
                    button_url: web.buttonUrl || null,
                    image: web.image || null,
                    image_bottom: Boolean(web.imageBottom),
                    image_small: Boolean(web.imageSmall),
                    background_color: web.backgroundColor || null,
                    button_color: web.buttonColor || null
                };
                const hasOverride = cta.heading || cta.description || cta.button_text || cta.button_url || cta.image || cta.background_color || cta.button_color;
                return hasOverride ? cta : null;
            }
            if (Array.isArray(node?.children)) {
                stack.push(...node.children);
            }
        }
    } catch (err) {
        // invalid lexical document - no custom CTA
    }
    return null;
};

// @TODO: reconsider the location of this - it's part of members and adds a property to the API
const forPost = (attrs, frame, {lexical} = {}) => {
    // CASE: Access always defaults to true, unless members is enabled and the member does not have access
    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') || (frame.options.columns.includes('access'))) {
        attrs.access = true;
    }

    const memberHasAccess = membersService.contentGating.checkPostAccess(attrs, frame.original.context.member);

    if (!memberHasAccess) {
        const paywallIndex = (attrs.html || '').indexOf('<!--members-only-->');

        // Per-post CTA copy set on the paywall card travels with the post so
        // the frontend can render it instead of the built-in default
        const paywallCardCta = getPaywallCardCta(lexical || attrs.lexical);
        if (paywallCardCta) {
            attrs.paywall_cta = paywallCardCta;
        }

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
