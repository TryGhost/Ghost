var downsize = require('downsize');
var stripTags = require('striptags');

function getExcerpt(html, truncateOptions) {
    truncateOptions = truncateOptions || {};
    // Strip inline and bottom footnotes
    var excerpt = html.replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '');
    excerpt = excerpt.replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '');

    excerpt = stripTags(excerpt, '<a><abbr><b><bdi><bdo><blockquote><br><cite><code><data><dd><del><dfn><dl><dt><em><i><ins><kbd><li><mark><ol><p><pre><q><rp><rt><rtc><ruby><s><samp><small><span><strong><sub><sup><time><u><ul><var><wbr>');

    excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    return downsize(excerpt, truncateOptions);
}

module.exports = getExcerpt;
