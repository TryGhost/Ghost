// # Ghost Editor HTML Preview
//
// HTML Preview is the right pane in the split view editor.
// It is effectively just a scrolling container for the HTML output from showdown
// It knows how to update itself, and that's pretty much it.

/*global Ghost, Showdown, Countable, _, $ */
(function () {
    'use strict';

    var HTMLPreview = function (markdown, uploadMgr) {
        var converter = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm']}),
            preview = document.getElementsByClassName('rendered-markdown')[0],
            update;

        // Update the preview
        // Includes replacing all the HTML, intialising upload dropzones, and updating the counter
        update = function () {
            preview.innerHTML = converter.makeHtml(markdown.value());

            uploadMgr.enable();

            Countable.once(preview, function (counter) {
                $('.entry-word-count').text($.pluralize(counter.words, 'word'));
                $('.entry-character-count').text($.pluralize(counter.characters, 'character'));
                $('.entry-paragraph-count').text($.pluralize(counter.paragraphs, 'paragraph'));
            });
        };

        // Public API
        _.extend(this, {
            scrollViewPort: function () {
                return $('.entry-preview-content');
            },
            scrollContent: function () {
                return $('.rendered-markdown');
            },
            update: update
        });
    };

    Ghost.Editor = Ghost.Editor || {};
    Ghost.Editor.HTMLPreview = HTMLPreview;
} ());