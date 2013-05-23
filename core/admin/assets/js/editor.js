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

    function getSelectedText()  {
        if (window.getSelection) {
            var sel = window.getSelection();
            if (sel.rangeCount) {
                var range = sel.getRangeAt(0).cloneRange();
                range.surroundContents(span);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        if (document.selection) {
            return document.selection.createRange().text;
        }
        return '';
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

        // ## Shortcuts
        // Zen writing mode
        shortcut.add("Alt+Shift+Z", function () {
            $('body').toggleClass('zen');
        });

        var CMTextarea = $(".CodeMirror textarea");
        // Bold text
        shortcut.add("Ctrl+B", function () {
            return CMTextarea.addMarkdown({style: "bold", target: editor});
        });

        // Bold text
        shortcut.add("Meta+B", function () {
            return CMTextarea.addMarkdown({style: "bold", target: editor});
        });

        // Italic text
        shortcut.add("Ctrl+I", function () {
            return CMTextarea.addMarkdown({style: "italic", target: editor});
        });

        // Italic text
        shortcut.add("Meta+I", function () {
            return CMTextarea.addMarkdown({style: "italic", target: editor});
        });

        // Strike through text
        shortcut.add("Ctrl+Alt+U", function () {
            return CMTextarea.addMarkdown({style: "strike", target: editor});
        });

        // Inline Code
        shortcut.add("Ctrl+Shift+K", function () {
            return CMTextarea.addMarkdown({style: "code", target: editor});
        });

        // Inline Code
        shortcut.add("Meta+K", function () {
            return CMTextarea.addMarkdown({style: "code", target: editor});
        });

        // H1
        shortcut.add("Alt+1", function () {
            return CMTextarea.addMarkdown({style: "h1", target: editor});
        });

        // H2
        shortcut.add("Alt+2", function () {
            return CMTextarea.addMarkdown({style: "h2", target: editor});
        });

        // H3
        shortcut.add("Alt+3", function () {
            return CMTextarea.addMarkdown({style: "h3", target: editor});
        });

        // H4
        shortcut.add("Alt+4", function () {
            return CMTextarea.addMarkdown({style: "h4", target: editor});
        });

        // H5
        shortcut.add("Alt+5", function () {
            return CMTextarea.addMarkdown({style: "h5", target: editor});
        });

        // H6
        shortcut.add("Alt+6", function () {
            return CMTextarea.addMarkdown({style: "h6", target: editor});
        });

        // Link
        shortcut.add("Ctrl+Shift+L", function () {
            return CMTextarea.addMarkdown({style: "link", target: editor});
        });

        // Image
        shortcut.add("Ctrl+Shift+I", function () {
            return CMTextarea.addMarkdown({style: "image", target: editor});
        });

        // Blockquote
        shortcut.add("Ctrl+Q", function () {
            return CMTextarea.addMarkdown({style: "blockquote", target: editor});
        });

        // Current Date
        shortcut.add("Ctrl+Shift+1", function () {
            return CMTextarea.addMarkdown({style: "currentDate", target: editor});
        });
    });
}(jQuery, Showdown, CodeMirror, shortcut));