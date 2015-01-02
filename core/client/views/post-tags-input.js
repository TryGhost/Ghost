var PostTagsInputView = Ember.View.extend({
    tagName: 'section',
    elementId: 'entry-tags',
    classNames: 'publish-bar-inner',
    classNameBindings: ['hasFocus:focused'],

    hasFocus: false,

    keys: {
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        ESCAPE: 27,
        UP: 38,
        DOWN: 40,
        NUMPAD_ENTER: 108
    },

    didInsertElement: function () {
        this.get('controller').send('loadAllTags');
    },

    willDestroyElement: function () {
        this.get('controller').send('reset');
    },

    overlayStyles: Ember.computed('hasFocus', 'controller.suggestions.length', function () {
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
    }),

    tagInputView: Ember.TextField.extend({
        focusIn: function () {
            this.get('parentView').set('hasFocus', true);
        },

        focusOut: function () {
            this.get('parentView').set('hasFocus', false);
        },

        keyPress: function (event) {
            // listen to keypress event to handle comma key on international keyboard
            var controller = this.get('parentView.controller'),
                isComma = ','.localeCompare(String.fromCharCode(event.keyCode || event.charCode)) === 0;

            // use localeCompare in case of international keyboard layout
            if (isComma) {
                event.preventDefault();

                if (controller.get('selectedSuggestion')) {
                    controller.send('addSelectedSuggestion');
                } else {
                    controller.send('addNewTag');
                }
            }
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
        }
    }),

    actions: {
        deleteTag: function (tag) {
            // The view wants to keep focus on the input after a click on a tag
            Ember.$('.js-tag-input').focus();
            // Make the controller do the actual work
            this.get('controller').send('deleteTag', tag);
        }
    }
});

export default PostTagsInputView;
