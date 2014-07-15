var PostTagsInputView = Ember.View.extend({
    tagName: 'section',
    elementId: 'entry-tags',
    classNames: 'left',

    templateName: 'post-tags-input',

    hasFocus: false,

    keys: {
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        ESCAPE: 27,
        UP: 38,
        DOWN: 40,
        NUMPAD_ENTER: 108,
        COMMA: 188
    },

    didInsertElement: function () {
        this.get('controller').send('loadAllTags');
    },

    willDestroyElement: function () {
        this.get('controller').send('reset');
    },

    overlayStyles: function () {
        var styles = [],
            leftPos;

        if (this.get('hasFocus') && this.get('controller.suggestions.length')) {
            leftPos = this.$().find('#tags').position().left;
            styles.push('display: block');
            styles.push('left: ' + leftPos + 'px');
        } else {
            styles.push('display: none');
            styles.push('left', 0);
        }

        return styles.join(';');
    }.property('hasFocus', 'controller.suggestions.length'),


    tagInputView: Ember.TextField.extend({
        focusIn: function () {
            this.get('parentView').set('hasFocus', true);
        },

        focusOut: function () {
            this.get('parentView').set('hasFocus', false);

            // if (!Ember.isEmpty(this.get('value'))) {
            //     this.get('parentView.controller').send('addNewTag');
            // }
        },

        keyDown: function (event) {
            var controller = this.get('parentView.controller'),
                keys = this.get('parentView.keys'),
                hasValue;

            switch (event.keyCode) {
                case keys.UP:
                    event.preventDefault();
                    controller.send('selectPreviousSuggestion');
                    break;

                case keys.DOWN:
                    event.preventDefault();
                    controller.send('selectNextSuggestion');
                    break;

                case keys.TAB:
                case keys.ENTER:
                case keys.NUMPAD_ENTER:
                case keys.COMMA:
                    if (event.keyCode === keys.COMMA && event.shiftKey) {
                        break;
                    }

                    if (controller.get('selectedSuggestion')) {
                        event.preventDefault();
                        controller.send('addSelectedSuggestion');
                    } else {
                        // allow user to tab out of field if input is empty
                        hasValue = !Ember.isEmpty(this.get('value'));
                        if (hasValue || event.keyCode !== keys.TAB) {
                            event.preventDefault();
                            controller.send('addNewTag');
                        }
                    }
                    break;

                case keys.BACKSPACE:
                    if (Ember.isEmpty(this.get('value'))) {
                        event.preventDefault();
                        controller.send('deleteLastTag');
                    }
                    break;

                case keys.ESCAPE:
                    event.preventDefault();
                    controller.send('reset');
                    break;
            }
        }
    }),


    tagView: Ember.View.extend({
        tagName: 'span',
        classNames: 'tag',

        tag: null,

        click: function () {
            this.get('parentView.controller').send('deleteTag', this.get('tag'));
        }
    }),


    suggestionView: Ember.View.extend({
        tagName: 'li',
        classNameBindings: 'suggestion.selected',

        suggestion: null,

        // we can't use the 'click' event here as the focusOut event on the
        // input will fire first

        mouseDown: function (event) {
            event.preventDefault();
        },

        mouseUp: function (event) {
            event.preventDefault();
            this.get('parentView.controller').send('addTag',
                this.get('suggestion.tag'));
        },
    })
});

export default PostTagsInputView;
