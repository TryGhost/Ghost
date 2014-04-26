// The Tag UI area associated with a post

/*global window, document, setTimeout, $, _, Ghost */

(function () {
    "use strict";

    Ghost.View.EditorTagWidget = Ghost.View.extend({

        events: {
            'keyup [data-input-behaviour="tag"]': 'handleKeyup',
            'keydown [data-input-behaviour="tag"]': 'handleKeydown',
            'keypress [data-input-behaviour="tag"]': 'handleKeypress',
            'click ul.suggestions li': 'handleSuggestionClick',
            'click .tags .tag': 'handleTagClick',
            'click .tag-label': 'mobileTags'
        },

        keys: {
            UP: 38,
            DOWN: 40,
            ESC: 27,
            ENTER: 13,
            BACKSPACE: 8
        },

        initialize: function () {
            var self = this,
                tagCollection = new Ghost.Collections.Tags();

            tagCollection.fetch().then(function () {
                self.allGhostTags = tagCollection.toJSON();
            });

            this.listenTo(this.model, 'willSave', this.completeCurrentTag, this);
        },

        render: function () {
            var tags = this.model.get('tags'),
                $tags = $('.tags'),
                tagOffset,
                self = this;

            $tags.empty();

            if (tags) {
                _.forEach(tags, function (tag) {
                    var $tag = $('<span class="tag" data-tag-id="' + tag.id + '">' + _.escape(tag.name) + '</span>');
                    $tags.append($tag);
                    $("[data-tag-id=" + tag.id + "]")[0].scrollIntoView(true);
                });
            }

            this.$suggestions = $("ul.suggestions").hide(); // Initialise suggestions overlay

            if ($tags.length) {
                tagOffset = $('.tag-input').offset().left;
                $('.tag-blocks').css({'left': tagOffset + 'px'});
            }

            $(window).on('resize', self.resize).trigger('resize');

            $('.tag-label').on('touchstart', function () {
                $(this).addClass('touch');
            });

            return this;
        },

        mobileTags: function () {
            var mq = window.matchMedia("(max-width: 400px)"),
                publishBar = $("#publish-bar");
            if (mq.matches) {

                if (publishBar.hasClass("extended-tags")) {
                    publishBar.css("top", "auto").animate({"height": "40px"}, 300, "swing", function () {
                        $(this).removeClass("extended-tags");
                        $(".tag-input").blur();
                    });
                } else {
                    publishBar.animate({"top": 0, "height": $(window).height()}, 300, "swing", function () {
                        $(this).addClass("extended-tags");
                        $(".tag-input").focus();
                    });
                }

                $(".tag-input").one("blur", function () {

                    if (publishBar.hasClass("extended-tags") && !$(':hover').last().hasClass("tag")) {
                        publishBar.css("top", "auto").animate({"height": "40px"}, 300, "swing", function () {
                            $(this).removeClass("extended-tags");
                            $(document.activeElement).blur();
                            document.documentElement.style.display = "none";
                            setTimeout(function () { document.documentElement.style.display = 'block'; }, 0);
                        });
                    }
                });

                window.scrollTo(0, 1);
            }
        },

        showSuggestions: function ($target, _searchTerm) {
            var searchTerm = _searchTerm.toLowerCase(),
                matchingTags = this.findMatchingTags(searchTerm),
                styles = {
                    left: $target.position().left
                },
                // Limit the suggestions number
                maxSuggestions = 5,
                // Escape regex special characters
                escapedTerm = searchTerm.replace(/[\-\/\\\^$*+?.()|\[\]{}]/g, '\\$&'),
                regexTerm = escapedTerm.replace(/(\s+)/g, "(<[^>]+>)*$1(<[^>]+>)*"),
                regexPattern = new RegExp("(" + regexTerm + ")", "i");

            this.$suggestions.css(styles);
            this.$suggestions.html("");

            matchingTags = _.first(matchingTags, maxSuggestions);
            if (matchingTags.length > 0) {
                this.$suggestions.show();
            }
            _.each(matchingTags, function (matchingTag) {
                var highlightedName,
                    suggestionHTML;

                highlightedName = matchingTag.name.replace(regexPattern, function (match, p1) {
                    return "<mark>" + _.escape(p1) + "</mark>";
                });
                /*jslint regexp: true */ // - would like to remove this
                highlightedName = highlightedName.replace(/(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/, function (match, p1, p2, p3, p4) {
                    return _.escape(p1) + '</mark>' + _.escape(p2) + '<mark>' + _.escape(p4);
                });
                
                suggestionHTML = "<li data-tag-id='" + matchingTag.id + "' data-tag-name='" + _.escape(matchingTag.name) + "'><a href='#'>" + highlightedName + "</a></li>";
                this.$suggestions.append(suggestionHTML);
            }, this);
        },

        handleKeyup: function (e) {
            var $target = $(e.currentTarget),
                searchTerm = $.trim($target.val());

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
            } else {
                if (searchTerm) {
                    this.showSuggestions($target, searchTerm);
                } else {
                    this.$suggestions.hide();
                }
            }

            if (e.keyCode === this.keys.UP || e.keyCode === this.keys.DOWN) {
                return false;
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

        handleKeypress: function (e) {
            var $target = $(e.currentTarget),
                searchTerm = $.trim($target.val()),
                tag,
                $selectedSuggestion,
                isComma = ",".localeCompare(String.fromCharCode(e.keyCode || e.charCode)) === 0,
                hasAlreadyBeenAdded;

            // use localeCompare in case of international keyboard layout
            if ((e.keyCode === this.keys.ENTER || isComma) && searchTerm) {
                // Submit tag using enter or comma key
                e.preventDefault();

                $selectedSuggestion = this.$suggestions.children(".selected");
                if (this.$suggestions.is(":visible") && $selectedSuggestion.length !== 0) {
                    tag = {id: $selectedSuggestion.data('tag-id'), name: _.unescape($selectedSuggestion.data('tag-name'))};
                    hasAlreadyBeenAdded = this.hasTagBeenAdded(tag.name);
                    if (!hasAlreadyBeenAdded) {
                        this.addTag(tag);
                    }
                } else {
                    if (isComma) {
                        // Remove comma from string if comma is used to submit.
                        searchTerm = searchTerm.replace(/,/g, "");
                    }

                    hasAlreadyBeenAdded = this.hasTagBeenAdded(searchTerm);
                    if (!hasAlreadyBeenAdded) {
                        this.addTag({id: null, name: searchTerm});
                    }
                }
                $target.val('').focus();
                searchTerm = ""; // Used to reset search term
                this.$suggestions.hide();
            }
        },

        completeCurrentTag: function () {
            var $target = this.$('.tag-input'),
                tagName = $target.val(),
                hasAlreadyBeenAdded;

            hasAlreadyBeenAdded = this.hasTagBeenAdded(tagName);

            if (tagName.length > 0 && !hasAlreadyBeenAdded) {
                this.addTag({id: null, name: tagName});
            }
        },

        handleSuggestionClick: function (e) {
            var $target = $(e.currentTarget);
            if (e) { e.preventDefault(); }
            this.addTag({id: $target.data('tag-id'), name: _.unescape($target.data('tag-name'))});
        },

        handleTagClick: function (e) {
            var $tag = $(e.currentTarget),
                tag = {id: $tag.data('tag-id'), name: $tag.text()};
            $tag.remove();
            window.scrollTo(0, 1);
            this.model.removeTag(tag);
        },

        resize: _.throttle(function () {
            var $tags = $('.tags');
            if ($(window).width() > 400) {
                $tags.css("max-width", $("#entry-tags").width() - 320);
            } else {
                $tags.css("max-width", "inherit");
            }
        }, 50),

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

                hasAlreadyBeenAdded = self.hasTagBeenAdded(tag.name);

                return tagNameMatches && !hasAlreadyBeenAdded;
            });

            return matchingTagModels;
        },

        addTag: function (tag) {
            var $tag = $('<span class="tag" data-tag-id="' + tag.id + '">' + _.escape(tag.name) + '</span>');
            this.$('.tags').append($tag);
            $(".tag").last()[0].scrollIntoView(true);
            window.scrollTo(0, 1);
            this.model.addTag(tag);

            this.$('.tag-input').val('').focus();
            this.$suggestions.hide();
        },

        hasTagBeenAdded: function (tagName) {
            return _.some(this.model.get('tags'), function (usedTag) {
                return tagName.toUpperCase() === usedTag.name.toUpperCase();
            });
        }
    });

}());
