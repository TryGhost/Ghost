const cheerio = require('cheerio');

const getSegmentsFromHtml = (html) => {
    const $ = cheerio.load(html);

    const allSegments = $('[data-gh-segment]')
        .get()
        .map(el => el.attribs['data-gh-segment']);

    return allSegments;
};

module.exports.getSegmentsFromHtml = getSegmentsFromHtml;
