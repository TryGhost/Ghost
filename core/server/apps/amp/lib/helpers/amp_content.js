// # Amp Content Helper
// Usage: `{{amp_content}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Converts normal HTML into AMP HTML with Amperize module and uses a cache to return it from
// there if available. The cacheId is a combination of `updated_at` and the `slug`.
var hbs                  = require('express-hbs'),
    Promise              = require('bluebird'),
    Amperize             = require('amperize'),
    moment               = require('moment'),
    sanitizeHtml         = require('sanitize-html'),
    amperize             = new Amperize(),
    amperizeCache        = {},
    allowedAMPTags       = [],
    cleanHTML,
    ampHTML;

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
                'hkern', 'defs', 'use', 'symbol', 'desc', 'title', 'table', 'caption',
                'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'button',
                'noscript', 'acronym', 'center', 'dir', 'hgroup', 'listing', 'multicol',
                'nextid', 'nobr', 'spacer', 'strike', 'tt', 'xmp', 'amp-img', 'amp-video',
                'amp-ad', 'amp-fit-text', 'amp-font', 'amp-carousel', 'amp-anim',
                'amp-youtube', 'amp-twitter', 'amp-vine',  'amp-instagram', 'amp-iframe',
                'amp-pixel', 'amp-audio', 'amp-lightbox', 'amp-image-lightbox'];

function getAmperizeHTML(html, post) {
    if (!html) {
        return;
    }

    if (!amperizeCache[post.id] || moment(new Date(amperizeCache[post.id].updated_at)).diff(new Date(post.updated_at)) < 0) {
        return new Promise(function (resolve, reject) {
            amperize.parse(html, function (err, res) {
                if (err) {
                    return reject(err);
                }

                amperizeCache[post.id] = {updated_at: post.updated_at, amp: res};
                return resolve(amperizeCache[post.id].amp);
            });
        });
    }

    return Promise.resolve(amperizeCache[post.id].amp);
}

function ampContent() {
    var amperizeHTML = {
            amperize: getAmperizeHTML(this.html, this)
        };

    return Promise.props(amperizeHTML).then(function (result) {
        ampHTML = result.amperize || '';

        // let's sanitize our html!!!
        cleanHTML = sanitizeHtml(ampHTML, {
            allowedTags: allowedAMPTags,
            allowedAttributes: false,
            selfClosing: ['source', 'track']
        });

        return new hbs.handlebars.SafeString(cleanHTML);
    });
}

module.exports = ampContent;
