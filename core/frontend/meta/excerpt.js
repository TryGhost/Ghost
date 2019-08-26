var downsize = require('downsize');

function getExcerpt(html, truncateOptions) {
    truncateOptions = truncateOptions || {};
    // Strip inline and bottom footnotes
    var excerpt = html.replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '');
    excerpt = excerpt.replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '');

    // Make sure to have space between paragraphs and new lines
    excerpt = excerpt.replace(/(<\/p>|<br>)/gi, ' ');

    // Strip other html
    excerpt = excerpt.replace(/<\/?[^>]+>/gi, '');
    excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    return downsize(excerpt, truncateOptions);
}

module.exports = getExcerpt;
