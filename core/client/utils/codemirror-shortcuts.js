/* global CodeMirror, moment, Showdown */
// jscs:disable disallowSpacesInsideParentheses

/** Set up a shortcut function to be called via router actions.
 *  See editor-base-route
 */

import titleize from 'ghost/utils/titleize';

function init() {
    // remove predefined `ctrl+h` shortcut
    delete CodeMirror.keyMap.emacsy['Ctrl-H'];

    // Used for simple, noncomputational replace-and-go! shortcuts.
    // See default case in shortcut function below.
    CodeMirror.prototype.simpleShortcutSyntax = {
        bold: '**$1**',
        italic: '*$1*',
        strike: '~~$1~~',
        code: '`$1`',
        link: '[$1](http://)',
        image: '![$1](http://)',
        blockquote: '> $1'
    };

    CodeMirror.prototype.shortcut = function (type) {
        var text = this.getSelection(),
            cursor = this.getCursor(),
            line = this.getLine(cursor.line),
            fromLineStart = {line: cursor.line, ch: 0},
            toLineEnd = {line: cursor.line, ch: line.length},
            md, letterCount, textIndex, position, converter,
            generatedHTML, match, currentHeaderLevel, hashPrefix,
            replacementLine;

        switch (type) {
        case 'cycleHeaderLevel':
            match = line.match(/^#+/);

            if (!match) {
                currentHeaderLevel = 1;
            } else {
                currentHeaderLevel = match[0].length;
            }

            if (currentHeaderLevel > 2) {
                currentHeaderLevel = 1;
            }

            hashPrefix = new Array(currentHeaderLevel + 2).join('#');

            replacementLine = hashPrefix + ' ' + line.replace(/^#* /, '');

            this.replaceRange(replacementLine, fromLineStart, toLineEnd);
            this.setCursor(cursor.line, cursor.ch + replacementLine.length);
            break;

        case 'link':
            md = this.simpleShortcutSyntax.link.replace('$1', text);
            this.replaceSelection(md, 'end');
            if (!text) {
                this.setCursor(cursor.line, cursor.ch + 1);
            } else {
                textIndex = line.indexOf(text, cursor.ch - text.length);
                position = textIndex + md.length - 1;
                this.setSelection({
                    line: cursor.line,
                    ch: position - 7
                }, {
                    line: cursor.line,
                    ch: position
                });
            }
            return;

        case 'image':
            md = this.simpleShortcutSyntax.image.replace('$1', text);
            if (line !== '') {
                md = '\n\n' + md;
            }
            this.replaceSelection(md, 'end');
            cursor = this.getCursor();
            this.setSelection({line: cursor.line, ch: cursor.ch - 8}, {line: cursor.line, ch: cursor.ch - 1});
            return;

        case 'list':
            md = text.replace(/^(\s*)(\w\W*)/gm, '$1* $2');
            this.replaceSelection(md, 'end');
            return;

        case 'currentDate':
            md = moment(new Date()).format('D MMMM YYYY');
            this.replaceSelection(md, 'end');
            return;

        case 'uppercase':
            md = text.toLocaleUpperCase();
            break;

        case 'lowercase':
            md = text.toLocaleLowerCase();
            break;

        case 'titlecase':
            md = titleize(text);
            break;

        case 'copyHTML':
            converter = new Showdown.converter();

            if (text) {
                generatedHTML = converter.makeHtml(text);
            } else {
                generatedHTML = converter.makeHtml(this.getValue());
            }

            // Talk to Ember
            this.component.sendAction('openModal', 'copy-html', {generatedHTML: generatedHTML});

            break;

        default:
            if (this.simpleShortcutSyntax[type]) {
                md = this.simpleShortcutSyntax[type].replace('$1', text);
            }
        }
        if (md) {
            this.replaceSelection(md, 'end');
            if (!text) {
                letterCount = md.length;
                this.setCursor({
                    line: cursor.line,
                    ch: cursor.ch + (letterCount / 2)
                });
            }
        }
    };
}

export default {
    init: init
};
