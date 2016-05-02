// something useful: https://babeljs.io/repl/#?evaluate=true&presets=es2015
// did you know that mocha doesn't know ES6?
var downsize = require('downsize'),
    stripTags = require('striptags'),
    roundSentenceChar,
    roundSentenceSentences;

roundSentenceChar = function (string, chars) {
    var periods = [],
        absperiods = [],
        indexofperiod,
        i,
        x,
        len;
    for (i = 0, len = string.length; i < len; i += 1) {
        if (string[i] === '.') {
            periods.push(i);
        }
    }
    if (periods.length >= 1) {
        for (x = 0; x < periods.length; x += 1) {
            absperiods[x] = Math.abs(chars - periods[x]);
        }
        indexofperiod = absperiods.indexOf(Math.min.apply(Math, absperiods));
        return periods[indexofperiod] + 1;
    } else {
        return chars;
    }
};

roundSentenceSentences = function (string, sentences) {
    var periods = [],
    i,
    len;
    for (i = 0, len = string.length; i < len; i += 1) {
        if (string[i] === '.') {
            periods.push(i);
        }
    }
    if (periods.length >= 1) {
        return periods[sentences - 1] + 1;
    }
};

function getExcerpt(html, truncateOptions) {
    truncateOptions = truncateOptions || {};
    // Strip inline and bottom footnotes
    var excerpt = html.replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '');
    excerpt = excerpt.replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '');
    // Strip other html
    if (truncateOptions.stripTags === true) {
        // this list of allowed tags is from issue #5060
        excerpt = stripTags(excerpt, '<a><abbr><b><bdi><bdo><blockquote><br><cite><code><data><dd><del><dfn><dl><dt><em><i><ins><kbd><li><mark><ol><p><pre><q><rp><rt><rtc><ruby><s><samp><small><span><strong><sub><sup><time><u><ul><var><wbr>');
    } else {
        excerpt = excerpt.replace(/<\/?[^>]+>/gi, '');
    }
    excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
    /*jslint regexp:false */

    if (truncateOptions.round) {
        truncateOptions.characters = roundSentenceChar(excerpt, truncateOptions.characters);
    }

    if (truncateOptions.sentences) {
        truncateOptions.characters = roundSentenceSentences(excerpt, truncateOptions.sentences);
    }

    if (!truncateOptions.words && !truncateOptions.characters && !truncateOptions.sentences) {
        truncateOptions.words = 50;
    }

    return downsize(excerpt, truncateOptions);
}

module.exports = getExcerpt;
