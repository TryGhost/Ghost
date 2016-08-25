var cheerio  = require('cheerio'),
    url      = require('url'),
    config   = require('../config');

/**
 * Make absolute URLs
 * @param {string} html
 * @param {string} siteUrl (blog URL)
 * @param {string} itemUrl (URL of current context)
 * @returns {object} htmlContent
 * @description Takes html, blog url and item url and converts relative url into
 * absolute urls. Returns an object. The html string can be accessed by calling `html()` on
 * the variable that takes the result of this function
 */
function makeAbsoluteUrls(html, siteUrl, itemUrl) {
    var htmlContent = cheerio.load(html, {decodeEntities: false});
    // convert relative resource urls to absolute
    ['href', 'src'].forEach(function forEach(attributeName) {
        htmlContent('[' + attributeName + ']').each(function each(ix, el) {
            var baseUrl,
                attributeValue,
                parsed;

            el = htmlContent(el);

            attributeValue = el.attr(attributeName);

            // if URL is absolute move on to the next element
            try {
                parsed = url.parse(attributeValue);

                if (parsed.protocol) {
                    return;
                }

                // Do not convert protocol relative URLs
                if (attributeValue.lastIndexOf('//', 0) === 0) {
                    return;
                }
            } catch (e) {
                return;
            }

            // compose an absolute URL

            // if the relative URL begins with a '/' use the blog URL (including sub-directory)
            // as the base URL, otherwise use the post's URL.
            baseUrl = attributeValue[0] === '/' ? siteUrl : itemUrl;
            attributeValue = config.urlJoin(baseUrl, attributeValue);
            el.attr(attributeName, attributeValue);
        });
    });

    return htmlContent;
}

module.exports = makeAbsoluteUrls;
