// # Excerpt Helper
// Usage: `{{excerpt}}`, `{{excerpt words="50"}}`, `{{excerpt characters="256"}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    downsize        = require('downsize'),
    excerpt;

excerpt = function (options) {
    var truncateOptions = (options || {}).hash || {},
        excerpt;

    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
    _.keys(truncateOptions).map(function (key) {
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });

    /*jslint regexp:true */
    excerpt = String(this.html);
    // Strip inline and bottom footnotes
    excerpt = excerpt.replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '');
    excerpt = excerpt.replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '');

    // truncate for GBK when use character mode
    // 中文内容截断，根据字符的方式
    if (truncateOptions.characters) {
        // remove heading tags with content and other html tags
        excerpt = excerpt.replace(/<h\d.*?\/h\d>/gi, '');
        excerpt = excerpt.replace(/<\/?[^>]+>/gi, '');
        var arr = excerpt.split("\n"), tmp = "";
        for (var i = 0, j = arr.length; i < j; i++) {
            // remove \n && \r
            arr[i] = arr[i].replace(/(\r\n|\n|\r)+/gm, '');
            if (arr[i]) {
                if (tmp.length < truncateOptions.characters) {
                    var len = tmp.length;
                    if (len + arr[i].length > truncateOptions.characters) {
                        tmp += arr[i];
                        tmp = tmp.substr(0, truncateOptions.characters - 3);
                        tmp = tmp.substr(0, len) + tmp.substr(len).replace(/(，|\,|\:|\-|\"|、|“|”)/gm, '') + '...';
                        break;
                    } else {
                        // less than 10 chars is unnecessary
                        if (truncateOptions.characters - len < 10 && arr[i].length<10) {
                            break;
                        } else {
                            tmp += arr[i];
                        }
                    }
                }
            }
        }
        excerpt = tmp.replace(/(\r\n|\n|\r)+/gm, ' ');
    } else {
        // Strip other html
        excerpt = excerpt.replace(/<\/?[^>]+>/gi, '');
        excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
    }

    /*jslint regexp:false */

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    return new hbs.handlebars.SafeString(
        downsize(excerpt, truncateOptions)
    );
};

module.exports = excerpt;
