var downsize = require('downsize');

function getExcerpt(html, truncateOptions) {
    truncateOptions = truncateOptions || {};

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    var excerpt = downsize(html, truncateOptions);

    // Strip inline and bottom footnotes
    excerpt = excerpt.replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '');
    excerpt = excerpt.replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '');
    // Strip other html
    excerpt = excerpt.replace(/<\/?[^>]+>/gi, '');
    excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
    /*jslint regexp:false */

    return excerpt;
}

module.exports = getExcerpt;
