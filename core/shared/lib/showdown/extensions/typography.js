/*global module */
//
// Replaces straight quotes with curly ones, -- and --- with en dash and em
// dash respectively, and ... with horizontal ellipses.
//

(function(root, undefined) {

  "use strict";


/* typography main */

// Base function.
var typography = function () {
  return [
    {
      type: "lang",
      filter: function (text) {
        var fCodeblocks = {}, nCodeblocks = {}, iCodeblocks = {},
          e = {
            endash: '\u2013',
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

        // Fix renderer messes with embedded HTML
        // Support multilingual(unicode)

        // Double quotes.
        text = text.
          // Opening quotes
          replace(/"([\u00BF-\u1FFF\u2C00-\uD7FF\w])(?=[^>]*(<|$))/g, e.ldquo + "$1").
          // All the rest
          replace(/"(?=[^>]*(<|$))/g, e.rdquo);

        // Single quotes/apostrophes
        text = text.
          // Apostrophes first
          replace(/([\u00BF-\u1FFF\u2C00-\uD7FF\w])'([\u00BF-\u1FFF\u2C00-\uD7FF\w])/g, "$1" + e.rsquo + "$2").
          // Opening quotes
          replace(/'([\u00BF-\u1FFF\u2C00-\uD7FF\w])(?=[^>]*(<|$))/g, e.lsquo + "$1").
          // All the rest
          replace(/'(?=[^>]*(<|$))/g, e.rsquo);

        // Dashes
        text = text
          // Don't replace lines containing only hyphens
          .replace(/^-+$/gm, "{typog-hr}")
          .replace(/---/g, e.emdash)
          .replace(/--/g, e.endash)
          .replace(/{typog-hr}/g, "----");

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

// Export to the root, which is probably `window`.
root.typography = typography;

// Client-side export
if (typeof root !== 'undefined' && root.Showdown && root.Showdown.extensions) {
  root.Showdown.extensions.typography = typography;
}
// Server-side export
if (typeof module !== 'undefined') {
  module.exports = typography;
}


}(this));
