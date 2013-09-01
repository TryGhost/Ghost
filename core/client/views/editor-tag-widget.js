// The Tag UI area associated with a post

/*global window, document, $, _, Backbone, Ghost */

(function () {
    "use strict";

    Ghost.View.EditorTagWidget = Ghost.View.extend({

        events: {
            'keyup [data-input-behaviour="tag"]': 'handleKeyup',
            'keydown [data-input-behaviour="tag"]': 'handleKeydown',
            'click ul.suggestions li': 'handleSuggestionClick',
            'click .tags .tag': 'handleTagClick'
        },

        keys: {
            UP: 38,
            DOWN: 40,
            ESC: 27,
            ENTER: 13,
            COMMA: 188,
            BACKSPACE: 8
        },

        initialize: function () {
            var self = this,
                tagCollection = new Ghost.Collections.Tags();

            tagCollection.fetch().then(function () {
                self.allGhostTags = tagCollection.toJSON();
            });

            this.model.on('willSave', this.completeCurrentTag, this);
        },

        render: function () {
            var tags = this.model.get('tags'),
                $tags = $('.tags'),
                tagOffset;

            $tags.empty();

            if (tags) {
                _.forEach(tags, function (tag) {
                    var $tag = $('<span class="tag" data-tag-id="' + tag.id + '">' + tag.name + '</span>');
                    $tags.append($tag);
                });
            }

            this.$suggestions = $("ul.suggestions").hide(); // Initialise suggestions overlay

            if ($tags.length) {
                tagOffset = $('.tag-input').offset().left;
                $('.tag-blocks').css({'left': tagOffset + 'px'});
            }

            return this;
        },

        showSuggestions: function ($target, searchTerm) {
            this.$suggestions.show();
            var results = this.findMatchingTags(searchTerm),
                styles = {
                    left: $target.position().left
                },
                maxSuggestions = 5, // Limit the suggestions number
                results_length = results.length,
                i,
                suggest;

            this.$suggestions.css(styles);
            this.$suggestions.html("");

            if (results_length < maxSuggestions) {
                maxSuggestions = results_length;
            }
            for (i = 0; i < maxSuggestions; i += 1) {
                this.$suggestions.append("<li data-tag-id='" + results[i].id + "' data-tag-name='" + results[i].name + "'><a href='#'>" + results[i].name + "</a></li>");
            }

            suggest = $('ul.suggestions li a:contains("' + searchTerm + '")');

            suggest.each(function () {
                var src_str = $(this).html(),
                    term = searchTerm,
                    pattern;

                term = term.replace(/(\s+)/, "(<[^>]+>)*$1(<[^>]+>)*");
                pattern = new RegExp("(" + term + ")", "i");

                src_str = src_str.replace(pattern, "<mark>$1</mark>");
                /*jslint regexp: true */ // - would like to remove this
                src_str = src_str.replace(/(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/, "$1</mark>$2<mark>$4");

                $(this).html(src_str);
            });
        },

        handleKeyup: function (e) {
            var $target = $(e.currentTarget),
                searchTerm = $.trim($target.val()).toLowerCase(),
                tag,
                $selectedSuggestion;

            if (e.keyCode === this.keys.UP) {
                e.preventDefault();
                if (this.$suggestions.is(":visible")) {
                    if (this.$suggestions.children(".selected").length === 0) {
                        this.$suggestions.find("li:last-child").addClass('selected');
                    } else {
                        this.$suggestions.children(".selected").removeClass('selected').prev().addClass('selected');
                    }
                }
            } else if (e.keyCode === this.keys.DOWN) {
                e.preventDefault();
                if (this.$suggestions.is(":visible")) {
                    if (this.$suggestions.children(".selected").length === 0) {
                        this.$suggestions.find("li:first-child").addClass('selected');
                    } else {
                        this.$suggestions.children(".selected").removeClass('selected').next().addClass('selected');
                    }
                }
            } else if (e.keyCode === this.keys.ESC) {
                this.$suggestions.hide();
            } else if ((e.keyCode === this.keys.ENTER || e.keyCode === this.keys.COMMA) && searchTerm) {
                // Submit tag using enter or comma key
                e.preventDefault();

                $selectedSuggestion = this.$suggestions.children(".selected");
                if (this.$suggestions.is(":visible") && $selectedSuggestion.length !== 0) {

                    if ($('.tag:containsExact("' + $selectedSuggestion.data('tag-name') + '")').length === 0) {
                        tag = {id: $selectedSuggestion.data('tag-id'), name: $selectedSuggestion.data('tag-name')};
                        this.addTag(tag);
                    }
                } else {
                    if (e.keyCode === this.keys.COMMA) {
                        searchTerm = searchTerm.replace(/,/g, "");
                    }  // Remove comma from string if comma is used to submit.
                    if ($('.tag:containsExact("' + searchTerm + '")').length === 0) {
                        this.addTag({id: null, name: searchTerm});
                    }
                }
                $target.val('').focus();
                searchTerm = ""; // Used to reset search term
                this.$suggestions.hide();
            }

            if (e.keyCode === this.keys.UP || e.keyCode === this.keys.DOWN) {
                return false;
            }

            if (searchTerm) {
                this.showSuggestions($target, searchTerm);
            } else {
                this.$suggestions.hide();
            }
        },

        handleKeydown: function (e) {
            var $target = $(e.currentTarget),
                lastBlock,
                tag;
            // Delete character tiggers on Keydown, so needed to check on that event rather than Keyup.
            if (e.keyCode === this.keys.BACKSPACE && !$target.val()) {
                lastBlock = this.$('.tags').find('.tag').last();
                lastBlock.remove();
                tag = {id: lastBlock.data('tag-id'), name: lastBlock.text()};
                this.model.removeTag(tag);
            }
        },

        completeCurrentTag: function () {
            var $target = this.$('.tag-input'),
                tagName = $target.val(),
                usedTagNames,
                hasAlreadyBeenAdded;

            usedTagNames = _.map(this.model.get('tags'), function (tag) {
                return tag.name.toUpperCase();
            });
            hasAlreadyBeenAdded = usedTagNames.indexOf(tagName.toUpperCase()) !== -1;

            if (tagName.length > 0 && !hasAlreadyBeenAdded) {
                this.addTag({id: null, name: tagName});
            }
        },

        handleSuggestionClick: function (e) {
            var $target = $(e.currentTarget);
            if (e) { e.preventDefault(); }
            this.addTag({id: $target.data('tag-id'), name: $target.data('tag-name')});
        },

        handleTagClick: function (e) {
            var $tag = $(e.currentTarget),
                tag = {id: $tag.data('tag-id'), name: $tag.text()};
            $tag.remove();

            this.model.removeTag(tag);
        },

        findMatchingTags: function (searchTerm) {
            var matchingTagModels,
                self = this;

            if (!this.allGhostTags) {
                return [];
            }

            searchTerm = searchTerm.toUpperCase();
            matchingTagModels = _.filter(this.allGhostTags, function (tag) {
                var tagNameMatches,
                    hasAlreadyBeenAdded;

                tagNameMatches = tag.name.toUpperCase().indexOf(searchTerm) !== -1;

                hasAlreadyBeenAdded = _.some(self.model.get('tags'), function (usedTag) {
                    return tag.name.toUpperCase() === usedTag.name.toUpperCase();
                });
                return tagNameMatches && !hasAlreadyBeenAdded;
            });

            return matchingTagModels;
        },

        addTag: function (tag) {
            var $tag = $('<span class="tag" data-tag-id="' + tag.id + '">' + tag.name + '</span>');
            this.$('.tags').append($tag);
            this.model.addTag(tag);

            this.$('.tag-input').val('').focus();
            this.$suggestions.hide();
        }
    });

}());
