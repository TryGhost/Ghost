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
                // GFM newline and underscore modifications, happen BEFORE showdown
                type    : 'lang',
                filter  : function (text) {
                    var extractions = {},
                        imageMarkdownRegex = /^(?:\{(.*?)\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
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

                    // Extract code blocks
                    text = text.replace(/```[\s\S]*```/gim, function (x) {
                        var hash = hashId();
                        extractions[hash] = x;
                        return "{gfm-js-extract-code-" + hash + "}";
                    }, 'm');


                    //prevent foo_bar and foo_bar_baz from ending up with an italic word in the middle
                    text = text.replace(/(^(?! {4}|\t)(?!__)\w+_\w+_\w[\w_]*)/gm, function (x) {
                        return x.replace(/_/gm, '\\_');
                    });

                    text = text.replace(/\{gfm-js-extract-code-([0-9]+)\}/gm, function (x, y) {
                        return extractions[y];
                    });

                    // in very clear cases, let newlines become <br /> tags
                    text = text.replace(/^[\w\<\"\'][^\n]*\n+/gm, function (x) {
                        return x.match(/\n{2}/) ? x : x.trim() + "  \n";
                    });

                    // better URL support, but no title support
                    text = text.replace(imageMarkdownRegex, function (match, key, alt, src) {
                        if (src) {
                            return '<img src="' + src + '" alt="' + alt + '" />';
                        }

                        return '';
                    });

                    text = text.replace(/\{gfm-js-extract-pre-([0-9]+)\}/gm, function (x, y) {
                        return "\n\n" + extractions[y];
                    });


                    return text;
                }
            },
            {
                // GFM autolinking & custom image handling, happens AFTER showdown
                type    : 'html',
                filter  : function (text) {
                    var refExtractions = {},
                        preExtractions = {},
                        hashID = 0;

                    function hashId() {
                        return hashID++;
                    }

                    // Extract pre blocks
                    text = text.replace(/<(pre|code)>[\s\S]*?<\/(\1)>/gim, function (x) {
                        var hash = hashId();
                        preExtractions[hash] = x;
                        return "{gfm-js-extract-pre-" + hash + "}";
                    }, 'm');

                    // filter out def urls
                    // from Marked https://github.com/chjj/marked/blob/master/lib/marked.js#L24
                    text = text.replace(/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/gmi,
                        function (x) {
                            var hash = hashId();
                            refExtractions[hash] = x;
                            return "{gfm-js-extract-ref-url-" + hash + "}";
                        });

                    // match a URL
                    // adapted from https://gist.github.com/jorilallo/1283095#L158
                    // and http://blog.stevenlevithan.com/archives/mimic-lookbehind-javascript
                    text = text.replace(/(\]\(|\]|\[|<a[^\>]*?\>)?https?\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!]/gmi,
                        function (wholeMatch, lookBehind, matchIndex) {
                            // Check we are not inside an HTML tag
                            var left = text.slice(0, matchIndex), right = text.slice(matchIndex);
                            if ((left.match(/<[^>]+$/) && right.match(/^[^>]*>/)) || lookBehind) {
                                return wholeMatch;
                            }
                            // If we have a matching lookBehind, this is a failure, else wrap the match in <a> tag
                            return lookBehind ? wholeMatch : "<a href='" + wholeMatch + "'>" + wholeMatch + "</a>";
                        });

                    // match email
                    text = text.replace(/[a-z0-9_\-+=.]+@[a-z0-9\-]+(\.[a-z0-9-]+)+/gmi, function (wholeMatch) {
                        return "<a href='mailto:" + wholeMatch + "'>" + wholeMatch + "</a>";
                    });

                    // replace extractions
                    text = text.replace(/\{gfm-js-extract-pre-([0-9]+)\}/gm, function (x, y) {
                        return preExtractions[y];
                    });

                    text = text.replace(/\{gfm-js-extract-ref-url-([0-9]+)\}/gi, function (x, y) {
                        return "\n\n" + refExtractions[y];
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
