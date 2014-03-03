/*global module */
//
// Replaces straight quotes with curly ones, -- and --- with en dash and em
// dash respectively, and ... with horizontal ellipses.
//

(function () {
    var typography = function () {
        return [
            {
                type: "lang",
                filter: function (text) {
                    var fCodeblocks = {}, nCodeblocks = {}, iCodeblocks = {},
                        e = {
                            endash: '\u2009\u2013\u2009', // U+2009 = thin space
                            emdash: '\u2014',
                            lsquo:  '\u2018',
                            rsquo:  '\u2019',
                            ldquo:  '\u201c',
                            rdquo:  '\u201d',
                            hellip: '\u2026'
                        },

                        i;

                    // Extract fenced code blocks.
                    i = -1;
                    text = text.replace(/```((?:.|\n)+?)```/g,
                        function (match, code) {
                            i += 1;
                            fCodeblocks[i] = "```" + code + "```";
                            return "{typog-fcb-" + i + "}";
                        });

                    // Extract indented code blocks.
                    i = -1;
                    text = text.replace(/((\n+([ ]{4}|\t).+)+)/g,
                        function (match, code) {
                            i += 1;
                            nCodeblocks[i] = "    " + code;
                            return "{typog-ncb-" + i + "}";
                        });

                    // Extract inline code blocks
                    i = -1;
                    text = text.replace(/`(.+)`/g, function (match, code) {
                            i += 1;
                            iCodeblocks[i] = "`" + code + "`";
                            return "{typog-icb-" + i + "}";
                        });

                    // Perform typographic symbol replacement.

                    // Double quotes. There might be a reason this doesn't use
                    // the same \b matching style as the single quotes, but I
                    // can't remember what it is :(
                    text = text.
                        // Opening quotes
                        replace(/"([\w'])/g, e.ldquo + "$1").
                        // All the rest
                        replace(/"/g, e.rdquo);

                    // Single quotes/apostrophes
                    text = text.
                        // Apostrophes first
                        replace(/\b'\b/g, e.rsquo).
                        // Opening quotes
                        replace(/'\b/g, e.lsquo).
                        // All the rest
                        replace(/'/g, e.rsquo);

                    // Dashes
                    text = text.
                        // Don't replace lines containing only hyphens
                        replace(/^-+$/gm, "{typog-hr}").
                        replace(/---/g, e.emdash).
                        replace(/ -- /g, e.endash).
                        replace(/{typog-hr}/g, "----");

                    // Ellipses.
                    text = text.replace(/\.{3}/g, e.hellip);


                    // Restore fenced code blocks.
                    text = text.replace(/{typog-fcb-([0-9]+)}/g, function (x, y) {
                        return  fCodeblocks[y];
                    });

                    // Restore indented code blocks.
                    text = text.replace(/{typog-ncb-([0-9]+)}/g, function (x, y) {
                        return  nCodeblocks[y];
                    });

                    // Restore inline code blocks.
                    text = text.replace(/{typog-icb-([0-9]+)}/g, function (x, y) {
                        return iCodeblocks[y];
                    });

                    return text;
                }
            }
        ];
    };

    // Client-side export
    if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) {
        window.Showdown.extensions.typography = typography;
    }
    // Server-side export
    if (typeof module !== 'undefined') {
        module.exports = typography;
    }
}());

