const config = require('../../../../../shared/config');
const urlUtils = require('../../../../../shared/url-utils');
const {getAcceptedMarkdownContentType, getMarkdownPath, renderEntryMarkdown} = require('../../../llms/markdown');
const buildCanonicalUrl = require('./canonical-url');

const MEMBERS_ONLY_MARKDOWN = '# Members-only content\n\nThis post requires a subscription and is not available for public access.\n';

function llmsEnabled(req) {
    const llmsService = req.app.get('llmsService') || null;
    return Boolean(llmsService && llmsService.isEnabled());
}

function isPublic(entry) {
    return entry.visibility === 'public';
}

function serveMarkdown(res, entry) {
    const llmsIndexUrl = urlUtils.urlFor({relativeUrl: '/llms.txt'}, true);
    res.set('Cache-Control', `public, max-age=${config.get('caching:llms:maxAge')}`);
    res.set('Content-Location', getMarkdownPath(new URL(entry.url).pathname));
    res.type('text/markdown');
    return res.send(renderEntryMarkdown(entry, {llmsIndexUrl}));
}

/**
 * Whether this is a `.md` URL request (the scoped suffix route sets the flag).
 *
 * @param {Object} res
 * @returns {boolean}
 */
function isMdRequest(res) {
    return Boolean(res.routerOptions.isMarkdownRequest);
}

/**
 * Serve a `.md` URL as markdown for LLM consumption. When the feature is
 * disabled we redirect to the canonical (html) url; members-only content is
 * refused.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} entry
 * @returns {*}
 */
function serveMdRequest(req, res, entry) {
    if (!llmsEnabled(req)) {
        return res.redirect(302, buildCanonicalUrl(req, entry));
    }

    if (!isPublic(entry)) {
        return res.status(403).type('text/markdown').send(MEMBERS_ONLY_MARKDOWN);
    }

    return serveMarkdown(res, entry);
}

/**
 * Whether the request negotiates markdown via the Accept header — only for a
 * public entry with the llms feature enabled, otherwise it renders as html.
 *
 * @param {Object} req
 * @param {Object} entry
 * @returns {boolean}
 */
function isAcceptsRequest(req, entry) {
    return isPublic(entry) && Boolean(getAcceptedMarkdownContentType(req)) && llmsEnabled(req);
}

/**
 * Serve markdown negotiated via the Accept header.
 *
 * @param {Object} res
 * @param {Object} entry
 * @returns {*}
 */
function serveAcceptsRequest(res, entry) {
    res.vary('Accept');
    return serveMarkdown(res, entry);
}

module.exports = {
    isMdRequest,
    serveMdRequest,
    isAcceptsRequest,
    serveAcceptsRequest
};
