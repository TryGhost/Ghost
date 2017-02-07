// # Excerpt Helper
// Usage: `{{read_time}}`
//
// Attempts to return how minutes (in average) you will need to read the post

var hbs = require('express-hbs'),
    getContent = require('./content'),
    content, wordCount, time;

function readTime() {
    content = getContent.bind(this)().toString();
    content = content.replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '');
    content = content.replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '');
    content = content.replace(/<\/?[^>]+>/gi, '');
    content = content.replace(/(\r\n|\n|\r)+/gm, ' ');

    wordCount = content.replace(/[^\w ]/g, '').split(/\s+/).length;
    time = Math.floor(wordCount / 250) + 1;

    return new hbs.handlebars.SafeString(time.toString());
}

module.exports = readTime;
