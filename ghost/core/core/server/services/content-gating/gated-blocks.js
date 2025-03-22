const {PERMIT_ACCESS} = require('./constants');
const accessChecks = require('./access-checks');

// NOTE: regexes defined as consts to avoid recompiling them on every function call

// Match the start of a gated block - fast regex as a pre-check before doing full regex+loop
// (define as const to avoid recompiling the regex on every function call)
const HAS_GATED_BLOCKS_REGEX = /<!--\s*kg-gated-block:begin/;

// Match gated block comments
// e.g. <!--kg-gated-block:begin nonMember:true memberSegment:"status:free"-->...gated content<!--kg-gated-block:end-->
const GATED_BLOCK_REGEX = /<!--\s*kg-gated-block:begin\s+([^\n]+?)\s*-->\s*([\s\S]*?)\s*<!--\s*kg-gated-block:end\s*-->/g;

// Match the key-value pairs (with optional quotes around the value) in the gated-block:begin comment
const GATED_BLOCK_PARAM_REGEX = /\b(?<key>\w+):["']?(?<value>[^"'\s]+)["']?/g;

// Restrict access to known keys and values to prevent unexpected behaviour from user-provided input
const ALLOWED_GATED_BLOCK_PARAMS = {
    nonMember: {type: 'boolean'},
    memberSegment: {type: 'string', allowedValues: ['', 'status:free,status:-free', 'status:free', 'status:-free']}
};
const ALLOWED_GATED_BLOCK_KEYS = Object.keys(ALLOWED_GATED_BLOCK_PARAMS);

/**
* @typedef {import ('./typings').GatedMember} GatedMember
* @typedef {import ('./typings').GatedBlockParams} GatedBlockParams
*/

/**
 * Gated block values are stored as strings, this function converts "true"/"false"
 * strings to booleans for easier comparison later on. Explicitly checks for
 * "true"/"false" rather than a more generic JSON.parse() because this is user input.
 *
 * @param {string} value
 * @returns {boolean|string}
 */
function parseStringWithBooleans(value) {
    // Convert "true"/"false" strings to booleans, otherwise keep as string
    if (value === 'true') {
        return true;
    } else if (value === 'false') {
        return false;
    } else {
        return value;
    }
}

/**
 * Check if the provided HTML contains gated blocks.
 *
 * @param {string} html
 * @returns {boolean}
 */
module.exports.htmlHasGatedBlocks = function htmlHasGatedBlocks(html) {
    if (!html) {
        return false;
    }

    return HAS_GATED_BLOCKS_REGEX.test(html);
};

/**
 * Takes a string of key-value pairs extracted from a gated block comment and
 * returns an object of allowed keys and their parsed values.
 *
 * @param {string} paramsString
 * @returns {GatedBlockParams}
 */
module.exports.parseGatedBlockParams = function parseGatedBlockParams(paramsString) {
    const params = {};

    const matches = paramsString.matchAll(GATED_BLOCK_PARAM_REGEX);
    for (const match of matches) {
        const key = match.groups.key;
        const value = parseStringWithBooleans(match.groups.value);

        if (!ALLOWED_GATED_BLOCK_KEYS.includes(key)) {
            continue;
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
 *
 * @param {string} html
 * @param {GatedMember} member
 * @returns
 */
module.exports.removeGatedBlocksFromHtml = function removeGatedBlocksFromHtml(html, member) {
    return html.replace(GATED_BLOCK_REGEX, (match, params, content) => {
        const gatedBlockParams = module.exports.parseGatedBlockParams(params);
        const checkResult = accessChecks.checkGatedBlockAccess(gatedBlockParams, member);

        if (checkResult === PERMIT_ACCESS) {
            // return content rather than match to avoid rendering gated block wrapping comments
            return content;
        } else {
            return '';
        }
    });
};
