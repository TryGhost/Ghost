// # Surrounds given text with Markdown syntax

/*global $, window, CodeMirror, Showdown, moment */
(function () {
    'use strict';
    var Markdown = {
        init : function (options, elem) {
            var self = this;
            self.elem = elem;

            self.style = (typeof options === 'string') ? options : options.style;

            self.options = $.extend({}, CodeMirror.prototype.addMarkdown.options, options);

            self.replace();
        },
        replace: function () {
            var text = this.elem.getSelection(), pass = true, md, cursor, line, word, letterCount, converter;
            switch (this.style) {
            case 'h1':
                cursor = this.elem.getCursor();
                line = this.elem.getLine(cursor.line);
                this.elem.setLine(cursor.line, '# ' + line);
                this.elem.setCursor(cursor.line, cursor.ch + 2);
                pass = false;
                break;
            case 'h2':
                cursor = this.elem.getCursor();
                line = this.elem.getLine(cursor.line);
                this.elem.setLine(cursor.line, '## ' + line);
                this.elem.setCursor(cursor.line, cursor.ch + 3);
                pass = false;
                break;
            case 'h3':
                cursor = this.elem.getCursor();
                line = this.elem.getLine(cursor.line);
                this.elem.setLine(cursor.line, '### ' + line);
                this.elem.setCursor(cursor.line, cursor.ch + 4);
                pass = false;
                break;
            case 'h4':
                cursor = this.elem.getCursor();
                line = this.elem.getLine(cursor.line);
                this.elem.setLine(cursor.line, '#### ' + line);
                this.elem.setCursor(cursor.line, cursor.ch + 5);
                pass = false;
                break;
            case 'h5':
                cursor = this.elem.getCursor();
                line = this.elem.getLine(cursor.line);
                this.elem.setLine(cursor.line, '##### ' + line);
                this.elem.setCursor(cursor.line, cursor.ch + 6);
                pass = false;
                break;
            case 'h6':
                cursor = this.elem.getCursor();
                line = this.elem.getLine(cursor.line);
                this.elem.setLine(cursor.line, '###### ' + line);
                this.elem.setCursor(cursor.line, cursor.ch + 7);
                pass = false;
                break;
            case 'link':
                md = this.options.syntax.link.replace('$1', text);
                this.elem.replaceSelection(md, 'end');
                cursor = this.elem.getCursor();
                this.elem.setSelection({line: cursor.line, ch: cursor.ch - 8}, {line: cursor.line, ch: cursor.ch - 1});
                pass = false;
                break;
            case 'image':
                cursor = this.elem.getCursor();
                md = this.options.syntax.image.replace('$1', text);
                if (this.elem.getLine(cursor.line) !== '') {
                    md = "\n\n" + md;
                }
                this.elem.replaceSelection(md, "end");
                cursor = this.elem.getCursor();
                this.elem.setSelection({line: cursor.line, ch: cursor.ch - 8}, {line: cursor.line, ch: cursor.ch - 1});
                pass = false;
                break;
            case 'uppercase':
                md = text.toLocaleUpperCase();
                break;
            case 'lowercase':
                md = text.toLocaleLowerCase();
                break;
            case 'titlecase':
                md = text.toTitleCase();
                break;
            case 'selectword':
                cursor = this.elem.getCursor();
                word = this.elem.getTokenAt(cursor);
                if (!/\w$/g.test(word.string)) {
                    this.elem.setSelection({line: cursor.line, ch: word.start}, {line: cursor.line, ch: word.end - 1});
                } else {
                    this.elem.setSelection({line: cursor.line, ch: word.start}, {line: cursor.line, ch: word.end});
                }
                break;
            case 'copyHTML':
                converter = new Showdown.converter();
                if (text) {
                    md = converter.makeHtml(text);
                } else {
                    md = converter.makeHtml(this.elem.getValue());
                }

                $(".modal-copyToHTML-content").text(md).selectText();
                pass = false;
                break;
            case 'list':
                md = text.replace(/^(\s*)(\w\W*)/gm, '$1* $2');
                this.elem.replaceSelection(md, 'end');
                pass = false;
                break;
            case 'currentDate':
                md = moment(new Date()).format('D MMMM YYYY');
                this.elem.replaceSelection(md, 'end');
                pass = false;
                break;
            default:
                if (this.options.syntax[this.style]) {
                    md = this.options.syntax[this.style].replace('$1', text);
                }
            }
            if (pass && md) {
                this.elem.replaceSelection(md, 'end');
                if (!text) {
                    letterCount = md.length;
                    cursor = this.elem.getCursor();
                    this.elem.setCursor({line: cursor.line, ch: cursor.ch - (letterCount / 2)});
                }
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
            italic: "*$1*",
            strike: "~~$1~~",
            code: "`$1`",
            link: "[$1](http://)",
            image: "![$1](http://)",
            blockquote: "> $1"
        }
    };

}());