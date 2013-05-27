// # Article Editor
/*global window, document, Ghost, Backbone, $, _, Showdown, CodeMirror, shortcut */
(function() {
    "use strict";

    // Initialise the Showdown converter for Markdown.
    var categoryOffset,
        existingTags = [ // This will be replaced by an API return.
            'quim',
            'quimtastic',
            'quimmy',
            'quimlord',
            'quickly',
            'joaquim pheonix',
            'quimcy jones'
        ],
        keys = {
            UP: 38,
            DOWN: 40,
            ESC: 27,
            ENTER: 13,
            COMMA: 188,
            BACKSPACE: 8
        },
        converter = new Showdown.converter({extensions: ['ghostdown']}),
        PublishBarView;

    // The Bar at the bottom of the screen
    PublishBarView = Backbone.View.extend({

        events: {
            'click .button-save': 'save'
        },

        initialize: function () {},

        save: function (e) {
            e.preventDefault();
            this.model.save({
                title: $("#entry-title").val(),
                content: this.codeMirror.getValue()
            });
        },

        render: function () {
            var tagView = new TagView({el: $(".js-entry-categories")}).render();
            return this;
        }

    });

    // EDITOR / NOTIFICATIONS
    Ghost.Views.Editor = Backbone.View.extend({

        events: {
            'click .js-header': 'handleHeaderClick'
        },

        initialize: function () {
            this.$suggestions = $("ul.suggestions");
            this.codeMirror = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
                mode: 'markdown',
                tabMode: 'indent',
                lineWrapping: true
            });
            this.codeMirror.on("change", _.bind(this.updatePreview, this));
        },

        render: function () {

            // Initialize the required views.
            var publishBarView = new PublishBarView({el: this.$("#publish-bar")}).render();

            // Add Zen Mode
            shortcut.add("Alt+Shift+Z", function () {
                $('body').toggleClass('zen');
            });

            $(".CodeMirror-scroll").on('scroll', this.handleScroll);
            $(".js-entry-preview-content").on('scroll', this.handlePreviewScroll);

            this.updatePreview();
            return this;
        },

        updateWordCount: function () {
            var wordCount = this.$('.js-word-count')[0],
                editorValue = this.codeMirror.getValue();
            if (editorValue.length) {
                wordCount.innerHTML = editorValue.match(/\S+/g).length + ' words';
            }
        },

        // This updates the editor preview panel.
        // Currently gets called on every key press.
        // Also trigger word count update
        updatePreview: function () {
            var preview = document.getElementsByClassName('rendered-markdown')[0];
            preview.innerHTML = converter.makeHtml(this.codeMirror.getValue());
            this.updateWordCount();
        },

        // Sync The scrolling
        handleScroll: function (e) {

            // vars
            var $codeViewport    = $(e.target),
                $previewViewport = $('.entry-preview-content'),
                $codeContent     = $('.CodeMirror-sizer'),
                $previewContent  = $('.rendered-markdown'),

                // calc position
                codeHeight = $codeContent.height() - $codeViewport.height(),
                previewHeight = $previewContent.height() - $previewViewport.height(),
                ratio = previewHeight / codeHeight,
                previewPostition = $codeViewport.scrollTop() * ratio;

            // Shadow on Markdown if scrolled
            if ($('.CodeMirror-scroll').scrollTop() > 10) {
                $('.entry-markdown').addClass('scrolling');
            } else {
                $('.entry-markdown').removeClass('scrolling');
            }

            // apply new scroll
            $previewViewport.scrollTop(previewPostition);
        },

        handlePreviewScroll: function () {
            if ($('.entry-preview-content').scrollTop() > 10) {
                $('.entry-preview').addClass('scrolling');
            } else {
                $('.entry-preview').removeClass('scrolling');
            }
        },

        handleHeaderClick: function (e) {
            $('.entry-markdown, .entry-preview').removeClass('active');
            $(e.target).closest('section').addClass('active');
        }

    });

    var TagView = Backbone.View.extend({

        events: {
            'click .js-categories > .category': 'handleCategoryClick',
            'click .js-suggestions > li': 'handleSuggestionClick',
            'keyup [data-input-behaviour="tag"]': 'handleKeyUp',
            'keydown [data-input-behaviour="tag"]': 'handleKeyDown'
        },

        initialize: function () {
            var categoryOffset;
            this.$suggestions = $("ul.suggestions");
            if ($('.category-input').length) {
                categoryOffset = $('.category-input').offset().left;
                $('.category-blocks').css({'left': categoryOffset + 'px'});
            }
        },

        handleKeyUp: function (e) {
            var $target = $(e.currentTarget),
                $suggestions = this.$suggestions,
                searchTerm = $.trim($target.val()).toLowerCase(),
                category,
                populator;

            if (e.keyCode === keys.UP) {
                e.preventDefault();
                if ($suggestions.is(":visible")) {
                    if ($suggestions.children(".selected").length === 0) {
                        $suggestions.find("li:last-child").addClass('selected');
                    } else {
                        $suggestions.children(".selected").removeClass('selected').prev().addClass('selected');
                    }
                }
            } else if (e.keyCode === keys.DOWN) {
                e.preventDefault();
                if ($suggestions.is(":visible")) {
                    if ($suggestions.children(".selected").length === 0) {
                        $suggestions.find("li:first-child").addClass('selected');
                    } else {
                        $suggestions.children(".selected").removeClass('selected').next().addClass('selected');
                    }
                }
            } else if (e.keyCode === keys.ESC) {
                $suggestions.hide();
            } else if ((e.keyCode === keys.ENTER || e.keyCode === keys.COMMA) && searchTerm) {
                // Submit tag using enter or comma key
                e.preventDefault();
                if ($suggestions.is(":visible") && $suggestions.children(".selected").length !== 0) {

                    if ($('.category:containsExact("' + $suggestions.children(".selected").text() + '")').length === 0) {

                        category = $('<span class="category">' + $suggestions.children(".selected").text() + '</span>');
                        if ($target.data('populate')) {

                            populator = $($target.data('populate'));
                            populator.append(category);
                        }
                    }
                    $suggestions.hide();
                } else {
                    if (e.keyCode === keys.COMMA) {
                        searchTerm = searchTerm.replace(",", "");
                    }  // Remove comma from string if comma is uses to submit.
                    if ($('.category:containsExact("' + searchTerm + '")').length === 0) {
                        category = $('<span class="category">' + searchTerm + '</span>');
                        if ($target.data('populate')) {
                            populator = $($target.data('populate'));
                            populator.append(category);
                        }
                    }
                }
                $target.val('').focus();
                searchTerm = ""; // Used to reset search term
                this.$suggestions.hide();
            }

            if (e.keyCode === keys.UP || e.keyCode === keys.DOWN) {
                return false;
            }

            if (searchTerm) {
                this.showSuggestions($target, searchTerm);
            } else {
                this.$suggestions.hide();
            }
        },

        handleKeyDown: function (e) {
            var $target = $(e.currentTarget),
                populator,
                lastBlock;
            // Delete character tiggers on Keydown, so needed to check on that event rather than Keyup.
            if (e.keyCode === keys.BACKSPACE && !$target.val()) {
                populator = $($target.data('populate'));
                lastBlock = populator.find('.category').last();
                lastBlock.remove();
            }
        },

        findTerms: function (searchTerm, array) {
            searchTerm = searchTerm.toUpperCase();
            return $.map(array, function (item) {
                var match = item.toUpperCase().indexOf(searchTerm) !== -1;
                return match ? item : null;
            });
        },

        showSuggestions: function ($target, searchTerm) {
            this.$suggestions.show();
            var results = this.findTerms(searchTerm, existingTags),
                pos = $target.position(),
                styles = {
                    left: pos.left
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
                this.$suggestions.append("<li><a href='#'>" + results[i] + "</a></li>");
            }

            suggest = $('ul.suggestions li a:contains("' + searchTerm + '")');

            suggest.each(function () {
                var src_str = $(this).html(),
                    term = searchTerm,
                    pattern;

                term = term.replace(/(\s+)/, "(<[^>]+>)*$1(<[^>]+>)*");
                pattern = new RegExp("(" + term + ")", "i");

                src_str = src_str.replace(pattern, "<mark>$1</mark>");
                src_str = src_str.replace(/(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/, "$1</mark>$2<mark>$4");

                $(this).html(src_str);
            });
        },

        handleSuggestionClick: function (e) {
            var $target = $(e.currentTarget),
                category = $('<span class="category">' + $(e.currentTarget).text() + '</span>'),
                populator;

            if ($target.parent().data('populate')) {
                populator = $($target.parent().data('populate'));
                populator.append(category);
                this.$suggestions.hide();
                $('[data-input-behaviour="tag"]').val('').focus();
            }
        },

        handleCategoryClick: function (e) {
            $(e.currentTarget).remove();
        }

    });

}());