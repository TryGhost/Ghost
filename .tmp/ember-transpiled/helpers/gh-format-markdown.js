define("ghost/helpers/gh-format-markdown", 
  ["ghost/utils/caja-sanitizers","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global Showdown, Handlebars, html_sanitize*/
    var cajaSanitizers = __dependency1__["default"];

    var showdown,
        formatMarkdown;

    showdown = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm', 'footnotes', 'highlight']});

    formatMarkdown = Ember.Handlebars.makeBoundHelper(function (markdown) {
        var escapedhtml = '';

        // convert markdown to HTML
        escapedhtml = showdown.makeHtml(markdown || '');

        // replace script and iFrame
        // jscs:disable
        escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
        escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');
        // jscs:enable

        // sanitize html
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

        return new Handlebars.SafeString(escapedhtml);
    });

    __exports__["default"] = formatMarkdown;
  });