// # Amp Content Helper
// Usage: `{{amp_content}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Converts normal HTML into AMP HTML with Amperize module and uses a cache to return it from
// there if available. The cacheId is a combination of `updated_at` and the `slug`.
const Promise = require('bluebird');

const {DateTime, Interval} = require('luxon');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const {SafeString} = require('../../../../services/rendering');

const amperizeCache = {};
let allowedAMPTags = [];
let allowedAMPAttributes = {};
let amperize = null;
let ampHTML = '';
let cleanHTML = '';

allowedAMPTags = ['html', 'body', 'article', 'section', 'nav', 'aside', 'h1', 'h2',
    'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'address', 'p', 'hr',
    'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure',
    'figcaption', 'div', 'main', 'a', 'em', 'strong', 'small', 's', 'cite',
    'q', 'dfn', 'abbr', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub',
    'sup', 'i', 'b', 'u', 'mark', 'ruby', 'rb', 'rt', 'rtc', 'rp', 'bdi',
    'bdo', 'span', 'br', 'wbr', 'ins', 'del', 'source', 'track', 'svg', 'g',
    'path', 'glyph', 'glyphref', 'marker', 'view', 'circle', 'line', 'polygon',
    'polyline', 'rect', 'text', 'textpath', 'tref', 'tspan', 'clippath',
    'filter', 'lineargradient', 'radialgradient', 'mask', 'pattern', 'vkern',
    'hkern', 'defs', 'stop', 'use', 'foreignobject', 'symbol', 'desc', 'title',
    'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td',
    'th', 'button', 'noscript', 'acronym', 'center', 'dir', 'hgroup', 'listing',
    'multicol', 'nextid', 'nobr', 'spacer', 'strike', 'tt', 'xmp', 'amp-img',
    'amp-video', 'amp-ad', 'amp-embed', 'amp-anim', 'amp-iframe', 'amp-youtube',
    'amp-pixel', 'amp-audio', 'O:P'];

allowedAMPAttributes = {
    '*': ['itemid', 'itemprop', 'itemref', 'itemscope', 'itemtype', 'accesskey', 'class', 'dir', 'draggable',
        'id', 'lang', 'tabindex', 'title', 'translate', 'aria-*', 'role', 'placeholder', 'fallback', 'lightbox',
        'overflow', 'amp-access', 'amp-access-*', 'i-amp-access-id', 'data-*'],
    h1: ['align'],
    h2: ['align'],
    h3: ['align'],
    h4: ['align'],
    h5: ['align'],
    h6: ['align'],
    p: ['align'],
    blockquote: ['align'],
    ol: ['reversed', 'start', 'type'],
    li: ['value'],
    div: ['align'],
    a: ['href', 'hreflang', 'rel', 'role', 'tabindex', 'target', 'download', 'media', 'type', 'border', 'name'],
    time: ['datetime'],
    bdo: ['dir'],
    ins: ['datetime'],
    del: ['datetime'],
    source: ['src', 'srcset', 'sizes', 'media', 'type', 'kind', 'label', 'srclang'],
    track: ['src', 'default', 'kind', 'label', 'srclang'],
    svg: ['*'],
    g: ['*'],
    glyph: ['*'],
    glyphref: ['*'],
    marker: ['*'],
    path: ['*'],
    view: ['*'],
    circle: ['*'],
    line: ['*'],
    polygon: ['*'],
    polyline: ['*'],
    rect: ['*'],
    text: ['*'],
    textpath: ['*'],
    tref: ['*'],
    tspan: ['*'],
    clippath: ['*'],
    filter: ['*'],
    hkern: ['*'],
    lineargradient: ['*'],
    mask: ['*'],
    pattern: ['*'],
    radialgradient: ['*'],
    stop: ['*'],
    vkern: ['*'],
    defs: ['*'],
    symbol: ['*'],
    use: ['*'],
    foreignobject: ['*'],
    desc: ['*'],
    title: ['*'],
    table: ['sortable', 'align', 'border', 'bgcolor', 'cellpadding', 'cellspacing', 'width'],
    colgroup: ['span'],
    col: ['span'],
    tr: ['align', 'bgcolor', 'height', 'valign'],
    td: ['align', 'bgcolor', 'height', 'valign', 'colspan', 'headers', 'rowspan'],
    th: ['align', 'bgcolor', 'height', 'valign', 'colspan', 'headers', 'rowspan', 'abbr', 'scope', 'sorted'],
    button: ['disabled', 'name', 'role', 'tabindex', 'type', 'value', 'formtarget'],
    // built ins
    'amp-img': ['media', 'noloading', 'alt', 'attribution', 'placeholder', 'src', 'srcset', 'width', 'height', 'layout'],
    'amp-pixel': ['src'],
    'amp-video': ['src', 'srcset', 'media', 'noloading', 'width', 'height', 'layout', 'alt', 'attribution',
        'autoplay', 'controls', 'loop', 'muted', 'poster', 'preload'],
    'amp-embed': ['media', 'noloading', 'width', 'height', 'layout', 'type', 'data-*', 'json'],
    'amp-ad': ['media', 'noloading', 'width', 'height', 'layout', 'type', 'data-*', 'json'],
    // extended components we support
    'amp-anim': ['media', 'noloading', 'alt', 'attribution', 'placeholder', 'src', 'srcset', 'width', 'height', 'layout'],
    'amp-audio': ['src', 'width', 'height', 'autoplay', 'loop', 'muted', 'controls'],
    'amp-iframe': ['src', 'srcdoc', 'width', 'height', 'layout', 'frameborder', 'allowfullscreen', 'allowtransparency',
        'sandbox', 'referrerpolicy'],
    'amp-youtube': ['src', 'width', 'height', 'layout', 'frameborder', 'autoplay', 'loop', 'data-videoid', 'data-live-channelid']
};

function getAmperizeHTML(html, post) {
    if (!html) {
        return;
    }

    let Amperize = require('amperize');

    amperize = amperize || new Amperize();

    const startedAtMoment = DateTime.now();

    let cacheDateTime;
    let postDateTime;

    if (amperizeCache[post.id]) {
        const {updated_at: ampCacheUpdatedAt} = amperizeCache[post.id];
        const {updated_at: postUpdatedAt} = post;

        cacheDateTime = DateTime.fromJSDate(new Date(ampCacheUpdatedAt));
        postDateTime = DateTime.fromJSDate(new Date(postUpdatedAt));
    }

    if (!amperizeCache[post.id] || cacheDateTime.diff(postDateTime).valueOf() < 0) {
        return new Promise((resolve) => {
            amperize.parse(html, (err, res) => {
                logging.info('amp.parse', post.url, Interval.fromDateTimes(startedAtMoment, DateTime.now()).length('milliseconds') + 'ms');

                if (err) {
                    if (err.src) {
                        // This is a valid 500 GhostError because it means the amperize parser is unable to handle some Ghost HTML.
                        logging.error(new errors.InternalServerError({
                            message: `AMP HTML couldn't be parsed: ${err.src}`,
                            code: 'AMP_PARSER_ERROR',
                            err: err,
                            context: post.url,
                            help: 'Please share this error on GitHub or https://forum.ghost.org'
                        }));
                    } else {
                        logging.error(new errors.InternalServerError({err, code: 'AMP_PARSER_ERROR'}));
                    }

                    // save it in cache to prevent multiple calls to Amperize until
                    // content is updated.
                    amperizeCache[post.id] = {updated_at: post.updated_at, amp: html};
                    // return the original html on an error
                    return resolve(html);
                }

                amperizeCache[post.id] = {updated_at: post.updated_at, amp: res};
                return resolve(amperizeCache[post.id].amp);
            });
        });
    }

    return Promise.resolve(amperizeCache[post.id].amp);
}

function ampContent() {
    let sanitizeHtml = require('sanitize-html');
    let cheerio = require('cheerio');

    let amperizeHTML = {
        amperize: getAmperizeHTML(this.html, this)
    };

    return Promise.props(amperizeHTML).then((result) => {
        let $ = null;

        // our Amperized HTML
        ampHTML = result.amperize || '';

        // Use cheerio to traverse through HTML and make little clean-ups
        $ = cheerio.load(ampHTML);

        // We have to remove source children in video, as source
        // is whitelisted for audio, but causes validation
        // errors in video, because video will be stripped out.
        // @TODO: remove this, when Amperize support video transform
        $('video').children('source').remove();
        $('video').children('track').remove();

        // Case: AMP parsing failed and we returned the regular HTML,
        // then we have to remove remaining, invalid HTML tags.
        $('audio').children('source').remove();
        $('audio').children('track').remove();

        ampHTML = $.html();

        // @TODO: remove this, when Amperize supports HTML sanitizing
        cleanHTML = sanitizeHtml(ampHTML, {
            allowedTags: allowedAMPTags,
            allowedAttributes: allowedAMPAttributes,
            selfClosing: ['source', 'track', 'br']
        });

        return new SafeString(cleanHTML);
    });
}

module.exports = ampContent;

module.exports.async = true;
