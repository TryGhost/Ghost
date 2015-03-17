/* global moment, Showdown */
import Ember from 'ember';
import titleize from 'ghost/utils/titleize';

var simpleShortcutSyntax,
    shortcuts,
    EditorShortcuts;

// Used for simple, noncomputational replace-and-go! shortcuts.
// See default case in shortcut function below.
simpleShortcutSyntax = {
    bold: {
        regex: '**|**',
        cursor: '|'
    },
    italic: {
        regex: '*|*',
        cursor: '|'

    },
    strike: {
        regex: '~~|~~',
        cursor: '|'
    },
    code: {
        regex: '`|`',
        cursor: '|'
    },
    blockquote: {
        regex: '> |',
        cursor: '|',
        newline: true
    },
    list: {
        regex: '* |',
        cursor: '|',
        newline: true
    },
    link: {
        regex: '[|](http://)',
        cursor: 'http://'
    },
    image: {
        regex: '![|](http://)',
        cursor: 'http://',
        newline: true
    }
};

shortcuts = {
    simple: function (type, replacement, selection, line) {
        var shortcut,
            startIndex = 0;

        if (simpleShortcutSyntax.hasOwnProperty(type)) {
            shortcut = simpleShortcutSyntax[type];
            // insert the markdown
            replacement.text = shortcut.regex.replace('|', selection.text);

            // add a newline if needed
            if (shortcut.newline && line.text !== '') {
                startIndex = 1;
                replacement.text = '\n' + replacement.text;
            }

            // handle cursor position
            if (selection.text === '' && shortcut.cursor === '|') {
                // the cursor should go where | was
                replacement.position = startIndex + replacement.start + shortcut.regex.indexOf(shortcut.cursor);
            } else if (shortcut.cursor !== '|') {
                // the cursor should select the string which matches shortcut.cursor
                replacement.position = {
                    start: replacement.start + replacement.text.indexOf(shortcut.cursor)
                };
                replacement.position.end = replacement.position.start + shortcut.cursor.length;
            }
        }

        return replacement;
    },
    cycleHeaderLevel: function (replacement, line) {
        // jscs:disable
        var match = line.text.match(/^#+/),
        // jscs:enable
            currentHeaderLevel,
            hashPrefix;

        if (!match) {
            currentHeaderLevel = 1;
        } else {
            currentHeaderLevel = match[0].length;
        }

        if (currentHeaderLevel > 2) {
            currentHeaderLevel = 1;
        }

        hashPrefix = new Array(currentHeaderLevel + 2).join('#');

        // jscs:disable
        replacement.text = hashPrefix + ' ' + line.text.replace(/^#* /, '');
        // jscs:enable

        replacement.start = line.start;
        replacement.end = line.end;

        return replacement;
    },
    copyHTML: function (editor, selection) {
        var converter = new Showdown.converter(),
            generatedHTML;

        if (selection.text) {
            generatedHTML = converter.makeHtml(selection.text);
        } else {
            generatedHTML = converter.makeHtml(editor.getValue());
        }

        // Talk to the editor
        editor.sendAction('openModal', 'copy-html', {generatedHTML: generatedHTML});
    },
    currentDate: function (replacement) {
        replacement.text = moment(new Date()).format('D MMMM YYYY');
        return replacement;
    },
    uppercase: function (replacement, selection) {
        replacement.text = selection.text.toLocaleUpperCase();
        return replacement;
    },
    lowercase: function (replacement, selection) {
        replacement.text = selection.text.toLocaleLowerCase();
        return replacement;
    },
    titlecase: function (replacement, selection) {
        replacement.text = titleize(selection.text);
        return replacement;
    }
};

EditorShortcuts = Ember.Mixin.create({
    shortcut: function (type) {
        var selection = this.getSelection(),
            replacement = {
                start: selection.start,
                end: selection.end,
                position: 'collapseToEnd'
            };

        switch (type) {
            // This shortcut is special as it needs to send an action
            case 'copyHTML':
                shortcuts.copyHTML(this, selection);
                break;
            case 'cycleHeaderLevel':
                replacement = shortcuts.cycleHeaderLevel(replacement, this.getLine());
                break;
            // These shortcuts all process the basic information
            case 'currentDate':
            case 'uppercase':
            case 'lowercase':
            case 'titlecase':
                replacement = shortcuts[type](replacement, selection, this.getLineToCursor());
                break;
            // All the of basic formatting shortcuts work with a regex
            default:
                replacement = shortcuts.simple(type, replacement, selection, this.getLineToCursor());
        }

        if (replacement.text) {
            this.replaceSelection(replacement.text, replacement.start, replacement.end, replacement.position);
        }
    }
});

export default EditorShortcuts;
