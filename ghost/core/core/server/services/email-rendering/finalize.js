const cheerio = require('cheerio');
const juice = require('juice');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

/**
 * @param {string} html
 * @returns {string}
 */
const finalizeHtml = (html) => {
    // Add a class to each figcaption so we can style them in the email.
    let $ = cheerio.load(html, null, false);
    $('figcaption').addClass('kg-card-figcaption');
    html = $.html();

    const juicedHtml = juice(html, {inlinePseudoElements: true, removeStyleTags: true});

    // Many email clients, like Outlook and Yahoo, [lack support for <figure>
    // and <figcaption>][0]. To work around this, change the tags to <div>s.
    // Juice should have properly styled them.
    //
    // [0]: https://www.caniemail.com/features/html-semantics/
    $ = cheerio.load(juicedHtml, null, false);
    $('figure, figcaption').each((_, el) => {
        el.tagName = 'div';
    });

    // Fix characters unsupported in some Outlook versions.
    html = $.html();
    html = html.replace(/&apos;/g, '&#39;');
    html = html.replace(/→/g, '&rarr;');
    html = html.replace(/–/g, '&ndash;');
    html = html.replace(/“/g, '&ldquo;');
    html = html.replace(/”/g, '&rdquo;');

    // Fix unnecessary hex-entity encoding of forward slashes that may
    // be introduced by cheerio/juice serialization.
    // Refs https://github.com/TryGhost/Ghost/issues/26905
    html = html.replace(/&#[xX]2[fF];/g, '/');

    return html;
};

module.exports = {
    /**
     * @param {string} html
     * @returns {{html: string, plaintext: string}}
     */
    finalize(html) {
        const resultHtml = finalizeHtml(html);
        return {html: resultHtml, plaintext: htmlToPlaintext.email(resultHtml)};
    }
};
