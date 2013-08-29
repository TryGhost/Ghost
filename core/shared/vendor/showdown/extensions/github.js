//
//  Github Extension (WIP)
//  ~~strike-through~~   ->  <del>strike-through</del>
//

(function () {
    var github = function (converter) {
        return [
            {
                // strike-through
                // NOTE: showdown already replaced "~" with "~T", so we need to adjust accordingly.
                type    : 'lang',
                regex   : '(~T){2}([^~]+)(~T){2}',
                replace : function (match, prefix, content, suffix) {
                    return '<del>' + content + '</del>';
                }
            },
            {
                // GFM newline and underscore modifications
                type    : 'lang',
                filter  : function (text) {
                    var extractions = {},
                        hashID = 0;

                    function hashId() {
                        return hashID++;
                    }

                    // Extract pre blocks
                    text = text.replace(/<pre>[\s\S]*?<\/pre>/gim, function (x) {
                        var hash = hashId();
                        extractions[hash] = x;
                        return "{gfm-js-extract-pre-" + hash + "}";
                    }, 'm');

                    // prevent foo_bar_baz from ending up with an italic word in the middle
                    text = text.replace(/(^(?! {4}|\t)\w+_\w+_\w[\w_]*)/gm, function (x) {
                        return x.replace(/_/gm, '\\_');
                    });

                    // in very clear cases, let newlines become <br /> tags
                    text = text.replace(/^[\w\<][^\n]*\n+/gm, function (x) {
                        return x.match(/\n{2}/) ? x : x.trim() + "  \n";
                    });

                    text = text.replace(/\{gfm-js-extract-pre-([0-9]+)\}/gm, function (x, y) {
                        return "\n\n" + extractions[y];
                    });


                    return text;
                }
            },
            {
                // Auto-link URLs and emails
                type    : 'lang',
                filter  : function (text) {
                    var extractions = {},
                        hashID = 0;

                    function hashId() {
                        return hashID++;
                    }

                    // filter out def urls
                    text = text.replace(/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/gim,
                        function (x) {
                            var hash = hashId();
                            extractions[hash] = x;
                            return "{gfm-js-extract-ref-url-" + hash + "}";
                        });

                    // taken from https://gist.github.com/jorilallo/1283095#L158
                    text = text.replace(/https?\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!]/g, function (wholeMatch, matchIndex) {
                        var left = text.slice(0, matchIndex), right = text.slice(matchIndex),
                            href;
                        if (left.match(/<[^>]+$/) && right.match(/^[^>]*>/)) {
                            return wholeMatch;
                        }
                        href = wholeMatch.replace(/^http:\/\/github.com\//, "https://github.com/");
                        return "<a href='" + href + "'>" + wholeMatch + "</a>";
                    });

                    text = text.replace(/[a-z0-9_\-+=.]+@[a-z0-9\-]+(\.[a-z0-9-]+)+/ig, function (wholeMatch) {
                        return "<a href='mailto:" + wholeMatch + "'>" + wholeMatch + "</a>";
                    });

                    text = text.replace(/\{gfm-js-extract-ref-url-([0-9]+)\}/gm, function (x, y) {
                        return "\n\n" + extractions[y];
                    });

                    return text;
                }
            }
        ];
    };

    // Client-side export
    if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) { window.Showdown.extensions.github = github; }
    // Server-side export
    if (typeof module !== 'undefined') module.exports = github;
}());