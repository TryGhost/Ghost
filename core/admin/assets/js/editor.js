// # Article Editor

/*global window, document, history, jQuery, Showdown, CodeMirror, shortcut */
(function ($, ShowDown, CodeMirror, shortcut) {
    "use strict";

    // ## Converter Initialisation
    /**
     * @property converter
     * @type {ShowDown.converter}
     */
    // Initialise the Showdown converter for Markdown.
    // var delay;
    var converter = new ShowDown.converter({extensions: ['ghostdown']}),
        editor = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
            mode: 'markdown',
            tabMode: 'indent',
            lineWrapping: true
        });

    // ## Functions
    /**
     * @method Update word count
     * @todo Really not the best way to do things as it includes Markdown formatting along with words
     * @constructor
     */
        // This updates the word count on the editor preview panel.
    function updateWordCount() {
        var wordCount = document.getElementsByClassName('entry-word-count')[0],
            editorValue = editor.getValue();

        if (editorValue.length) {
            wordCount.innerHTML = editorValue.match(/\S+/g).length + ' words';
        }
    }

    /**
     * @method updatePreview
     * @constructor
     */
        // This updates the editor preview panel.
        // Currently gets called on every key press.
        // Also trigger word count update
    function updatePreview() {
        var preview = document.getElementsByClassName('rendered-markdown')[0];
        preview.innerHTML = converter.makeHtml(editor.getValue());

        updateWordCount();
    }

    /**
     * @method Save
     * @constructor
     */
        // This method saves a post
    function save() {
        var entry = {
                title: document.getElementById('entry-title').value,
                content: editor.getValue()
            },
            urlSegments = window.location.pathname.split('/');

        if (urlSegments[2] === 'editor' && urlSegments[3] && /^[a-zA-Z0-9]+$/.test(urlSegments[2])) {
            entry.id = urlSegments[3];
            $.ajax({
                url: '/api/v0.1/posts/edit',
                method: 'PUT',
                data: entry,
                success: function (data) {
                    console.log('response', data);
                },
                error: function (error) {
                    console.log('error', error);
                }
            });
        } else {
            $.ajax({
                url: '/api/v0.1/posts/create',
                method: 'POST',
                data: entry,
                success: function (data) {
                    console.log('response', data);
                    history.pushState(data, '', '/ghost/editor/' + data.id);
                },
                error: function (jqXHR, status, error) {
                    var errors = JSON.parse(jqXHR.responseText);
                    console.log('FAILED', errors);
                }
            });
        }
    }

    // ## Main Initialisation
    $(document).ready(function () {

        $('.entry-markdown header, .entry-preview header').click(function (e) {
            $('.entry-markdown, .entry-preview').removeClass('active');
            $(e.target).closest('section').addClass('active');
        });

        editor.on("change", function () {
            //clearTimeout(delay);
            //delay = setTimeout(updatePreview, 50);
            updatePreview();
        });

        updatePreview();

        $('.button-save').on('click', function () {
            save();
        });

        // Sync scrolling
        function syncScroll(e) {
            // vars
            var $codeViewport = $(e.target),
                $previewViewport = $('.entry-preview-content'),
                $codeContent = $('.CodeMirror-sizer'),
                $previewContent = $('.rendered-markdown'),

            // calc position
                codeHeight = $codeContent.height() - $codeViewport.height(),
                previewHeight = $previewContent.height() - $previewViewport.height(),
                ratio = previewHeight / codeHeight,
                previewPostition = $codeViewport.scrollTop() * ratio;

            // apply new scroll
            $previewViewport.scrollTop(previewPostition);

        }
        // TODO: Debounce
        $('.CodeMirror-scroll').on('scroll', syncScroll);

        // Shadow on Markdown if scrolled
        $('.CodeMirror-scroll').on('scroll', function (e) {
            if ($('.CodeMirror-scroll').scrollTop() > 10) {
                $('.entry-markdown').addClass('scrolling');
            } else {
                $('.entry-markdown').removeClass('scrolling');
            }
        });
        // Shadow on Preview if scrolled
        $('.entry-preview-content').on('scroll', function (e) {
            if ($('.entry-preview-content').scrollTop() > 10) {
                $('.entry-preview').addClass('scrolling');
            } else {
                $('.entry-preview').removeClass('scrolling');
            }
        });

        // Zen writing mode
        shortcut.add("Alt+Shift+Z", function () {
            $('body').toggleClass('zen');
        });

    });
}(jQuery, Showdown, CodeMirror, shortcut));