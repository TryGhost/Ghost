/* jshint node:true, browser:true, -W044 */

// Adds highlight syntax as per RedCarpet:
//
// https://github.com/vmg/redcarpet
//
// This is ==highlighted==. It looks like this: <mark>highlighted</mark>

(function () {
    var highlight = function () {
        return [
            {
                type: 'html',
                filter: function (text) {
                    var highlightRegex = /(=){2}([\s\S]+?)(=){2}/gim,
                        preExtractions = {},
                        codeExtractions = {},
                        hashID = 0;

                    function hashId() {
                        return hashID += 1;
                    }

                    // Extract pre blocks
                    text = text.replace(/<pre>[\s\S]*?<\/pre>/gim, function (x) {
                        var hash = hashId();
                        preExtractions[hash] = x;
                        return '{gfm-js-extract-pre-' + hash + '}';
                    }, 'm');

                    // Extract code blocks
                    text = text.replace(/<code>[\s\S]*?<\/code>/gim, function (x) {
                        var hash = hashId();
                        codeExtractions[hash] = x;
                        return '{gfm-js-extract-code-' + hash + '}';
                    }, 'm');

                    text = text.replace(highlightRegex, function (match, n, content) {
                        // Check the content isn't just an `=`
                        if (!/^=+$/.test(content)) {
                            return '<mark>' + content + '</mark>';
                        }

                        return match;
                    });

                    // replace pre extractions
                    text = text.replace(/\{gfm-js-extract-pre-([0-9]+)\}/gm, function (x, y) {
                        return preExtractions[y];
                    });

                     // replace code extractions
                    text = text.replace(/\{gfm-js-extract-code-([0-9]+)\}/gm, function (x, y) {
                        return codeExtractions[y];
                    });

                    return text;
                }
            }
        ];
    };

    // Client-side export
    if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) {
        window.Showdown.extensions.highlight = highlight;
    }
    // Server-side export
    if (typeof module !== 'undefined') {
        module.exports = highlight;
    }
}());
