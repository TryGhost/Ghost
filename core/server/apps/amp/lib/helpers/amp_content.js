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
    config               = require('../../../../config'),
    makeAbsoluteUrl      = require('../../../../utils/make-absolute-urls'),
    cheerio              = require('cheerio'),
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

    // make relative URLs abolute
    html = makeAbsoluteUrl(html, config.url, post.url).html();

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
        var $;

        // our Amperized HTML
        ampHTML = result.amperize || '';

        // Use cheerio to traverse through HTML and make little clean-ups
        $ = cheerio.load(ampHTML);

        // We have to remove source children in video, as source
        // is whitelisted for audio, but causes validation
        // errors in video, because video will be stripped out.
        // @TODO: remove this, when Amperize support video transform
        $('video').children('source').remove();

        // Vimeo iframe e. g. come with prohibited attributes
        // @TODO: remove this, when Amperize supports HTML sanitizing
        $('amp-iframe').removeAttr('webkitallowfullscreen');
        $('amp-iframe').removeAttr('mozallowfullscreen');

        // No inline style allowed
        $('*').removeAttr('style');

        ampHTML = $.html();

        // @TODO: remove this, when Amperize supports HTML sanitizing
        cleanHTML = sanitizeHtml(ampHTML, {
            allowedTags: allowedAMPTags,
            allowedAttributes: false,
            selfClosing: ['source', 'track']
        });

        return new hbs.handlebars.SafeString(cleanHTML);
    });
}

module.exports = ampContent;
