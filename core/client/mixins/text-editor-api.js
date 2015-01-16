var TextEditorAPI = Ember.Mixin.create({
    getValue: function () {
        return this.get('element').value;
    },

    getSelection: function () {
        return this.$().getSelection();
    },

    getLineToCursor: function () {
        var selection = this.$().getSelection(),
            value = this.getValue(),
            lineStart;

        // Normalise newlines
        value = value.replace('\r\n', '\n');

        // We want to look at the characters behind the cursor
        lineStart = value.lastIndexOf('\n', selection.start - 1) + 1;

        return {
            text: value.substring(lineStart, selection.start),
            start: lineStart
        };
    },

    getLine: function () {
        var selection = this.$().getSelection(),
            value = this.getValue(),
            lineStart,
            lineEnd;

        // Normalise newlines
        value = value.replace('\r\n', '\n');

        // We want to look at the characters behind the cursor
        lineStart = value.lastIndexOf('\n', selection.start - 1) + 1;
        lineEnd = value.indexOf('\n', selection.start);
        lineEnd = lineEnd === -1 ? value.length - 1 : lineEnd;

        return {
            // jscs:disable
            text: value.substring(lineStart, lineEnd).replace(/^\n/, ''),
            // jscs:enable
            start: lineStart,
            end: lineEnd
        };
    },

    setSelection: function (start, end) {
        var $textarea = this.$();

        if (start === 'end') {
            start = $textarea.val().length;
        }

        end = end || start;

        $textarea.setSelection(start, end);
    },

    /**
     * Replace Selection
     *
     * @param {String} replacement - the string to replace with
     * @param {number} replacementStart - where to start replacing
     * @param {number} [replacementEnd] - when to stop replacing, defaults to replacementStart
     * @param {String|boolean|Object} [cursorPosition]  - where to put the cursor after replacing
     *
     * Cursor position after replacement defaults to the end of the replacement.
     * Providing selectionStart only will cause the cursor to be placed there, or alternatively a range can be selected
     * by providing selectionEnd.
     */
    replaceSelection: function (replacement, replacementStart, replacementEnd, cursorPosition) {
        var $textarea = this.$();

        cursorPosition = cursorPosition || 'collapseToEnd';
        replacementEnd = replacementEnd || replacementStart;

        $textarea.setSelection(replacementStart, replacementEnd);

        if (['select', 'collapseToStart', 'collapseToEnd'].indexOf(cursorPosition) !== -1) {
            $textarea.replaceSelectedText(replacement, cursorPosition);
        } else {
            $textarea.replaceSelectedText(replacement);
            if (cursorPosition.hasOwnProperty('start')) {
                $textarea.setSelection(cursorPosition.start, cursorPosition.end);
            } else {
                $textarea.setSelection(cursorPosition, cursorPosition);
            }
        }

        $textarea.focus();
    }
});

export default TextEditorAPI;
