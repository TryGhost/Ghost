/*global console, jQuery, CodeMirror*/

// # Surrounds given text with Markdown syntax
(function ($) {
    "use strict";
    var Markdown = {
        init : function (options, elem) {
            var self = this;
            self.elem = elem;

            self.style = (typeof options === 'string') ? options : options.style;

            self.options = $.extend({}, CodeMirror.prototype.addMarkdown.options, options);

            self.replace();
        },
        replace: function () {
            var text = this.elem.getSelection(), md;
            if (this.options.syntax[this.style]) {
                md = this.options.syntax[this.style].replace('$1', text);
                this.elem.replaceSelection(md);
            } else {
                console.log("Invalid style.");
            }

        }
    };

    CodeMirror.prototype.addMarkdown = function (options) {
        var markdown = Object.create(Markdown);
        markdown.init(options, this);
    };

    CodeMirror.prototype.addMarkdown.options = {
        style: null,
        syntax: {
            bold: "**$1**",
            italic: "_$1_",
            strike: "~~$1~~",
            code: "`$1`",
            h1: "\n# $1\n",
            h2: "\n## $1\n",
            h3: "\n### $1\n",
            h4: "\n#### $1\n",
            h5: "\n##### $1\n",
            h6: "\n###### $1\n",
            link: "[$1](http://)",
            image: "!image[$1](http://)",
            blockquote: "> $1",
            currentDate: new Date().toLocaleString()
        }
    };
}(jQuery));