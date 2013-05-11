// ## Tag Selector UI

/*jslint regexp: true */ // - would like to remove this
/*global jQuery, document, window */

(function ($) {
    "use strict";

    var suggestions,
        categoryOffset,
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
        };

    function findTerms(searchTerm, array) {
        searchTerm = searchTerm.toUpperCase();
        return $.map(array, function (item) {
            var match = item.toUpperCase().indexOf(searchTerm) !== -1;
            return match ? item : null;
        });
    }

    function showSuggestions($target, searchTerm) {
        suggestions.show();
        var results = findTerms(searchTerm, existingTags),
            pos = $target.position(),
            styles = {
                left: pos.left
            },
            maxSuggestions = 5, // Limit the suggestions number
            results_length = results.length,
            i,
            suggest;

        suggestions.css(styles);
        suggestions.html("");

        if (results_length < maxSuggestions) {
            maxSuggestions = results_length;
        }
        for (i = 0; i < maxSuggestions; i += 1) {
            suggestions.append("<li><a href='#'>" + results[i] + "</a></li>");
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
    }

    function handleTagKeyup(e) {
        var $target = $(e.currentTarget),
            searchTerm = $.trim($target.val()).toLowerCase(),
            category,
            populator;

        if (e.keyCode === keys.UP) {
            e.preventDefault();
            if (suggestions.is(":visible")) {
                if (suggestions.children(".selected").length === 0) {
                    suggestions.find("li:last-child").addClass('selected');
                } else {
                    suggestions.children(".selected").removeClass('selected').prev().addClass('selected');
                }
            }
        } else if (e.keyCode === keys.DOWN) {
            e.preventDefault();
            if (suggestions.is(":visible")) {
                if (suggestions.children(".selected").length === 0) {
                    suggestions.find("li:first-child").addClass('selected');
                } else {
                    suggestions.children(".selected").removeClass('selected').next().addClass('selected');
                }
            }
        } else if (e.keyCode === keys.ESC) {
            suggestions.hide();
        } else if ((e.keyCode === keys.ENTER || e.keyCode === keys.COMMA)
                && searchTerm) { // Submit tag using enter or comma key
            e.preventDefault();
            if (suggestions.is(":visible") && suggestions.children(".selected").length !== 0) {

                if ($('.category:containsExact("' + suggestions.children(".selected").text() + '")').length === 0) {

                    category = $('<span class="category">' + suggestions.children(".selected").text() + '</span>');
                    if ($target.data('populate')) {

                        populator = $($target.data('populate'));
                        populator.append(category);
                    }
                }
                suggestions.hide();
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
            suggestions.hide();
        }

        if (e.keyCode === keys.UP || e.keyCode === keys.DOWN) {
            return false;
        }

        if (searchTerm) {
            showSuggestions($target, searchTerm);
        } else {
            suggestions.hide();
        }
    }

    function handleTagKeyDown(e) {
        var $target = $(e.currentTarget),
            populator,
            lastBlock;
        // Delete character tiggers on Keydown, so needed to check on that event rather than Keyup.
        if (e.keyCode === keys.BACKSPACE && !$target.val()) {
            populator = $($target.data('populate'));
            lastBlock = populator.find('.category').last();
            lastBlock.remove();
        }
    }

    function handleSuggestionClick(e) {
        var $target = $(e.currentTarget),
            category = $('<span class="category">' + $(e.currentTarget).text() + '</span>'),
            populator;

        if ($target.parent().data('populate')) {
            populator = $($target.parent().data('populate'));
            populator.append(category);
            suggestions.hide();
            $('[data-input-behaviour="tag"]').val('').focus();
        }
    }

    function handleCategoryClick(e) {
        $(e.currentTarget).remove();
    }

    function handleClickOff(e) {
        if (window.matchMedia('max-width: 650px')) {
            e.preventDefault();
            $('body').toggleClass('off-canvas');
        }
    }

    $(document).ready(function () {
        suggestions = $("ul.suggestions").hide(); // Initnialise suggestions overlay

        if ($('.category-input').length) {
            categoryOffset = $('.category-input').offset().left;
            $('.category-blocks').css({'left': categoryOffset + 'px'});
        }

        $('[data-input-behaviour="tag"]')
            .on('keyup', handleTagKeyup)
            .on('keydown', handleTagKeyDown);
        $('ul.suggestions').on('click', "li", handleSuggestionClick);
        $('.categories').on('click', ".category", handleCategoryClick);
        $('[data-off-canvas]').on('click', handleClickOff);
    });
}(jQuery));