var EditorTags = Ember.View.extend({
    templateName: 'editor-tags',

    didInsertElement: function () {
        // Cache elements for later use
        this.$input = this.$('#tags');

        this.$suggestions = this.$('ul.suggestions');
    },

    willDestroyElement: function () {
        // Release ownership of the object for proper GC
        this.$input = null;

        this.$suggestions = null;
    },

    keys: {
        UP: 38,
        DOWN: 40,
        ESC: 27,
        ENTER: 13,
        BACKSPACE: 8
    },

    overlay: {
        visible: false,
        left: 0
    },

    overlayStyle: function () {
        var styles = [];

        styles.push(this.get('overlay.visible') ?
            'display: block' :
            'display: none'
        );

        styles.push(this.get('overlay.left') ?
            'left: ' + this.get('overlay.left') + 'px' :
            'left: 0'
        );

        return styles.join(';');
    }.property('overlay.visible'),

    showSuggestions: function (_searchTerm) {
        var searchTerm = _searchTerm.toLowerCase(),
            matchingTags = this.findMatchingTags(searchTerm),
            // Limit the suggestions number
            maxSuggestions = 5,
            // Escape regex special characters
            escapedTerm = searchTerm.replace(/[\-\/\\\^$*+?.()|\[\]{}]/g, '\\$&'),
            regexTerm = escapedTerm.replace(/(\s+)/g, '(<[^>]+>)*$1(<[^>]+>)*'),
            regexPattern = new RegExp('(' + regexTerm + ')', 'i'),
            highlightedNameRegex;

        this.set('overlay.left', this.$input.position().left);
        this.$suggestions.html('');

        matchingTags = matchingTags.slice(0, maxSuggestions);
        if (matchingTags.length > 0) {
            this.set('overlay.visible', true);
        }

        highlightedNameRegex = /(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/;

        matchingTags.forEach(function (matchingTag) {
            var highlightedName,
                suggestionHTML;

            highlightedName = matchingTag.get('name').replace(regexPattern, function (match, p1) {
                return '<mark>' + encodeURIComponent(p1) + '</mark>';
            });
            /*jslint regexp: true */ // - would like to remove this
            highlightedName = highlightedName.replace(highlightedNameRegex, function (match, p1, p2, p3, p4) {
                return encodeURIComponent(p1) + '</mark>' + encodeURIComponent(p2) + '<mark>' + encodeURIComponent(p4);
            });

            suggestionHTML = '<li data-tag-id="' + matchingTag.get('id') +
                '" data-tag-name="' + encodeURIComponent(matchingTag.get('name')) +
                '"><a href="#">' + highlightedName + '</a></li>';

            this.$suggestions.append(suggestionHTML);
        }, this);
    },

    findMatchingTags: function (searchTerm) {
        var matchingTagModels,
            self = this,
            allTags = this.get('controller.store').all('tag');

        if (allTags.get('length') === 0) {
            return [];
        }

        searchTerm = searchTerm.toUpperCase();

        matchingTagModels = allTags.filter(function (tag) {
            var tagNameMatches,
                hasAlreadyBeenAdded;

            tagNameMatches = tag.get('name').toUpperCase().indexOf(searchTerm) !== -1;

            hasAlreadyBeenAdded = self.hasTagBeenAdded(tag.name);

            return tagNameMatches && !hasAlreadyBeenAdded;
        });

        return matchingTagModels;
    },

    keyDown: function (e) {
        var lastTagIndex;

        // Delete character tiggers on Keydown, so needed to check on that event rather than Keyup.
        if (e.keyCode === this.keys.BACKSPACE && !this.get('input')) {
            lastTagIndex = this.get('controller.model.tags').get('length') - 1;

            if (lastTagIndex > -1) {
                this.get('controller.model.tags').removeAt(lastTagIndex);
            }
        }
    },

    keyUp: function (e) {
        var searchTerm = $.trim(this.get('input'));

        if (e.keyCode === this.keys.UP) {
            e.preventDefault();
            if (this.get('overlay.visible')) {
                if (this.$suggestions.children('.selected').length === 0) {
                    this.$suggestions.find('li:last-child').addClass('selected');
                } else {
                    this.$suggestions.children('.selected').removeClass('selected').prev().addClass('selected');
                }
            }
        } else if (e.keyCode === this.keys.DOWN) {
            e.preventDefault();
            if (this.get('overlay.visible')) {
                if (this.$suggestions.children('.selected').length === 0) {
                    this.$suggestions.find('li:first-child').addClass('selected');
                } else {
                    this.$suggestions.children('.selected').removeClass('selected').next().addClass('selected');
                }
            }
        } else if (e.keyCode === this.keys.ESC) {
            this.set('overlay.visible', false);
        } else {
            if (searchTerm) {
                this.showSuggestions(searchTerm);
            } else {
                this.set('overlay.visible', false);
            }
        }

        if (e.keyCode === this.keys.UP || e.keyCode === this.keys.DOWN) {
            return false;
        }
    },

    keyPress: function (e) {
        var searchTerm = $.trim(this.get('input')),
            tag,
            $selectedSuggestion,
            isComma = ','.localeCompare(String.fromCharCode(e.keyCode || e.charCode)) === 0,
            hasAlreadyBeenAdded;

        // use localeCompare in case of international keyboard layout
        if ((e.keyCode === this.keys.ENTER || isComma) && searchTerm) {
            // Submit tag using enter or comma key
            e.preventDefault();

            $selectedSuggestion = this.$suggestions.children('.selected');
            if (this.get('overlay.visible') && $selectedSuggestion.length !== 0) {
                tag = {
                    id: $selectedSuggestion.data('tag-id'),
                    name: decodeURIComponent($selectedSuggestion.data('tag-name'))
                };
                hasAlreadyBeenAdded = this.hasTagBeenAdded(tag.name);
                if (!hasAlreadyBeenAdded) {
                    this.addTag(tag);
                }
            } else {
                if (isComma) {
                    // Remove comma from string if comma is used to submit.
                    searchTerm = searchTerm.replace(/,/g, '');
                }

                hasAlreadyBeenAdded = this.hasTagBeenAdded(searchTerm);
                if (!hasAlreadyBeenAdded) {
                    this.addTag({id: null, name: searchTerm});
                }
            }
            this.set('input', '');
            this.$input.focus();
            this.set('overlay.visible', false);
        }
    },

    addTag: function (tag) {
        var allTags = this.get('controller.store').all('tag'),
            newTag = allTags.findBy('name', tag.name);

        if (!newTag) {
            newTag = this.get('controller.store').createRecord('tag', tag);
        }

        this.get('controller.model.tags').addObject(newTag);

        // Wait till Ember render's the new tag to access its dom element.
        Ember.run.schedule('afterRender', this, function () {
            this.$('.tag').last()[0].scrollIntoView(true);
            window.scrollTo(0, 1);

            this.set('input', '');
            this.$input.focus();

            this.set('overlay.visible', false);
        });
    },

    hasTagBeenAdded: function (tagName) {
        if (!tagName) {
            return false;
        }

        return this.get('controller.model.tags').filter(function (usedTag) {
            return usedTag.get('name').toUpperCase() ===  tagName.toUpperCase();
        }).length > 0;
    },

    actions: {
        tagClick: function (tag) {
            this.get('controller.model.tags').removeObject(tag);
            window.scrollTo(0, 1);
        },
    }

});

export default EditorTags;
