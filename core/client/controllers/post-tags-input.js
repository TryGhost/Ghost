var PostTagsInputController = Ember.Controller.extend({
    tagEnteredOrder: Ember.A(),

    tags: Ember.computed('parentController.model.tags', function () {
        var proxyTags = Ember.ArrayProxy.create({
            content: this.get('parentController.model.tags')
        }),
        temp = proxyTags.get('arrangedContent').slice();

        proxyTags.get('arrangedContent').clear();

        this.get('tagEnteredOrder').forEach(function (tagName) {
            var tag = temp.find(function (tag) {
                return tag.get('name') === tagName;
            });

            if (tag) {
                proxyTags.get('arrangedContent').addObject(tag);
                temp.removeObject(tag);
            }
        });

        proxyTags.get('arrangedContent').unshiftObjects(temp);

        return proxyTags;
    }),

    suggestions: null,
    newTagText: null,

    actions: {
        // triggered when the view is inserted so that later store.all('tag')
        // queries hit a full store cache and we don't see empty or out-of-date
        // suggestion lists
        loadAllTags: function () {
            this.store.find('tag', {limit: 'all'});
        },

        addNewTag: function () {
            var newTagText = this.get('newTagText'),
                searchTerm,
                existingTags,
                newTag;

            if (Ember.isEmpty(newTagText) || this.hasTag(newTagText)) {
                this.send('reset');
                return;
            }

            newTagText = newTagText.trim();
            searchTerm = newTagText.toLowerCase();

            // add existing tag if we have a match
            existingTags = this.store.all('tag').filter(function (tag) {
                if (tag.get('isNew')) {
                    return false;
                }

                return tag.get('name').toLowerCase() === searchTerm;
            });

            if (existingTags.get('length')) {
                this.send('addTag', existingTags.get('firstObject'));
            } else {
                // otherwise create a new one
                newTag = this.store.createRecord('tag');
                newTag.set('name', newTagText);

                this.send('addTag', newTag);
            }

            this.send('reset');
        },

        addTag: function (tag) {
            if (!Ember.isEmpty(tag)) {
                this.get('tags').addObject(tag);
                this.get('tagEnteredOrder').addObject(tag.get('name'));
            }

            this.send('reset');
        },

        deleteTag: function (tag) {
            if (tag) {
                this.get('tags').removeObject(tag);
                this.get('tagEnteredOrder').removeObject(tag.get('name'));
            }
        },

        deleteLastTag: function () {
            this.send('deleteTag', this.get('tags.lastObject'));
        },

        selectSuggestion: function (suggestion) {
            if (!Ember.isEmpty(suggestion)) {
                this.get('suggestions').setEach('selected', false);
                suggestion.set('selected', true);
            }
        },

        selectNextSuggestion: function () {
            var suggestions = this.get('suggestions'),
                selectedSuggestion = this.get('selectedSuggestion'),
                currentIndex,
                newSelection;

            if (!Ember.isEmpty(suggestions)) {
                currentIndex = suggestions.indexOf(selectedSuggestion);
                if (currentIndex + 1 < suggestions.get('length')) {
                    newSelection = suggestions[currentIndex + 1];
                    this.send('selectSuggestion', newSelection);
                } else {
                    suggestions.setEach('selected', false);
                }
            }
        },

        selectPreviousSuggestion: function () {
            var suggestions = this.get('suggestions'),
                selectedSuggestion = this.get('selectedSuggestion'),
                currentIndex,
                lastIndex,
                newSelection;

            if (!Ember.isEmpty(suggestions)) {
                currentIndex = suggestions.indexOf(selectedSuggestion);
                if (currentIndex === -1) {
                    lastIndex = suggestions.get('length') - 1;
                    this.send('selectSuggestion', suggestions[lastIndex]);
                } else if (currentIndex - 1 >= 0) {
                    newSelection = suggestions[currentIndex - 1];
                    this.send('selectSuggestion', newSelection);
                } else {
                    suggestions.setEach('selected', false);
                }
            }
        },

        addSelectedSuggestion: function () {
            var suggestion = this.get('selectedSuggestion');

            if (Ember.isEmpty(suggestion)) {
                return;
            }

            this.send('addTag', suggestion.get('tag'));
        },

        reset: function () {
            this.set('suggestions', null);
            this.set('newTagText', null);
        }
    },

    selectedSuggestion: Ember.computed('suggestions.@each.selected', function () {
        var suggestions = this.get('suggestions');

        if (suggestions && suggestions.get('length')) {
            return suggestions.filterBy('selected').get('firstObject');
        } else {
            return null;
        }
    }),

    updateSuggestionsList: function () {
        var searchTerm = this.get('newTagText'),
            matchingTags,
            // Limit the suggestions number
            maxSuggestions = 5,
            suggestions = Ember.A();

        if (!searchTerm || Ember.isEmpty(searchTerm.trim())) {
            this.set('suggestions', null);
            return;
        }

        searchTerm = searchTerm.trim();

        matchingTags = this.findMatchingTags(searchTerm);
        matchingTags = matchingTags.slice(0, maxSuggestions);
        matchingTags.forEach(function (matchingTag) {
            var suggestion = this.makeSuggestionObject(matchingTag, searchTerm);
            suggestions.pushObject(suggestion);
        }, this);

        this.set('suggestions', suggestions);
    }.observes('newTagText'),

    findMatchingTags: function (searchTerm) {
        var matchingTags,
            self = this,
            allTags = this.store.all('tag').filterBy('isNew', false),
            deDupe = {};

        if (allTags.get('length') === 0) {
            return [];
        }

        searchTerm = searchTerm.toLowerCase();

        matchingTags = allTags.filter(function (tag) {
            var tagNameMatches,
                hasAlreadyBeenAdded,
                tagName = tag.get('name');

            tagNameMatches = tagName.toLowerCase().indexOf(searchTerm) !== -1;
            hasAlreadyBeenAdded = self.hasTag(tagName);

            if (tagNameMatches && !hasAlreadyBeenAdded) {
                if (typeof deDupe[tagName] === 'undefined') {
                    deDupe[tagName] = 1;
                } else {
                    deDupe[tagName] += 1;
                }
            }

            return deDupe[tagName] === 1;
        });

        return matchingTags;
    },

    hasTag: function (tagName) {
        return this.get('tags').mapBy('name').contains(tagName);
    },

    makeSuggestionObject: function (matchingTag, _searchTerm) {
        var searchTerm = Ember.Handlebars.Utils.escapeExpression(_searchTerm),
            // jscs:disable
            regexEscapedSearchTerm = searchTerm.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'),
            // jscs:enable
            tagName = Ember.Handlebars.Utils.escapeExpression(matchingTag.get('name')),
            regex = new RegExp('(' + regexEscapedSearchTerm + ')', 'gi'),
            highlightedName,
            suggestion = Ember.Object.create();

        highlightedName = tagName.replace(regex, '<mark>$1</mark>');
        highlightedName = new Ember.Handlebars.SafeString(highlightedName);

        suggestion.set('tag', matchingTag);
        suggestion.set('highlightedName', highlightedName);

        return suggestion;
    }
});

export default PostTagsInputController;
