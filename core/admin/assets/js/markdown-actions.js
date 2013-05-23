/*global window, document, jQuery*/

// Polyfill for Object.create
if ( typeof Object.create !== 'function' ) {
    Object.create = function( obj ) {
        function F() {};
        F.prototype = obj;
        return new F();
    };
}

// # Surrounds given text with Markdown syntax
(function ($, window, document, undefined) {
    "use strict";
    var Markdown = {
        init : function (options, elem) {
            var self = this;
            self.elem = elem;
            self.$elem = $(elem);

            self.style = (typeof options === 'string') ? options : options.style;

            self.options = $.extend({}, $.fn.addMarkdown.options, options);

            self.replace();
        },
        replace: function () {
            var text = this.options.target.getSelection(), md;
            if (this.options.syntax[this.style]) {
                md = this.options.syntax[this.style].replace('$1', text);
                this.options.target.replaceSelection(md);
            } else {
                console.log("invalid style");
            }

        }
    };
    $.fn.addMarkdown = function (options) {
        return this.each(function () {

            var markdown = Object.create(Markdown);
            markdown.init(options, this);

        });
    };

    $.fn.addMarkdown.options = {
        style: null,
        target: null,
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
            image: "![$1](http://)",
            blockquote: "> $1",
            currentDate: new Date().toLocaleString()
        }
    };
})(jQuery, window, document);