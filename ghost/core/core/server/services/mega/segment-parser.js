const labs = require('../../../shared/labs');

const getSegmentsFromHtml = (html) => {
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);

    let allSegments = $('[data-gh-segment]')
        .get()
        .map(el => el.attribs['data-gh-segment']);

    /**
     * Always add free and paid segments if email has paywall card
     */
    if (labs.isSet('newsletterPaywall') && html.indexOf('<!--members-only-->') !== -1) {
        allSegments = allSegments.concat(['status:free', 'status:-free']);
    }

    // only return unique elements
    return [...new Set(allSegments)];
};

module.exports.getSegmentsFromHtml = getSegmentsFromHtml;
