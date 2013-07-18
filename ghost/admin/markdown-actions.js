// # Surrounds given text with Markdown syntax

/*global $, CodeMirror */
(function () {
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
            var text = this.elem.getSelection(), pass = true, md, cursor, word;
            switch (this.style) {
            case "link":
                md = this.options.syntax.link.replace('$1', text);
                this.elem.replaceSelection(md, "end");
                cursor = this.elem.getCursor();
                this.elem.setSelection({line: cursor.line, ch: cursor.ch - 8}, {line: cursor.line, ch: cursor.ch - 1});
                pass = false;
                break;
            case "image":
                md = this.options.syntax.image.replace('$1', text);
                this.elem.replaceSelection(md, "end");
                cursor = this.elem.getCursor();
                this.elem.setSelection({line: cursor.line, ch: cursor.ch - 8}, {line: cursor.line, ch: cursor.ch - 1});
                pass = false;
                break;
            case "uppercase":
                md = text.toLocaleUpperCase();
                break;
            case "lowercase":
                md = text.toLocaleLowerCase();
                break;
            case "titlecase":
                md = text.replace(/\w\S*/g, function (text) {return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase(); });
                break;
            case "selectword":
                cursor = this.elem.getCursor();
                word = this.elem.getTokenAt(cursor);
                if (!/\w$/g.test(word.string)) {
                    this.elem.setSelection({line: cursor.line, ch: word.start}, {line: cursor.line, ch: word.end - 1});
                } else {
                    this.elem.setSelection({line: cursor.line, ch: word.start}, {line: cursor.line, ch: word.end});
                }
                break;
            case "list":
                md = text.replace(/^/gm, "* ");
                this.elem.replaceSelection("\n" + md + "\n", "end");
                pass = false;
                break;
            default:
                if (this.options.syntax[this.style]) {
                    md = this.options.syntax[this.style].replace('$1', text);
                }
            }
            if (pass && md) {
                this.elem.replaceSelection(md, "end");
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

}());