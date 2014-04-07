// # Ghost Editor Markdown Editor
//
// Markdown Editor is a light wrapper around CodeMirror

/*global Ghost, CodeMirror, shortcut, _, $ */
(function () {
    'use strict';

    var MarkdownShortcuts,
        MarkdownEditor;

    MarkdownShortcuts = [
        {'key': 'Ctrl+B', 'style': 'bold'},
        {'key': 'Meta+B', 'style': 'bold'},
        {'key': 'Ctrl+I', 'style': 'italic'},
        {'key': 'Meta+I', 'style': 'italic'},
        {'key': 'Ctrl+Alt+U', 'style': 'strike'},
        {'key': 'Ctrl+Shift+K', 'style': 'code'},
        {'key': 'Meta+K', 'style': 'code'},
        {'key': 'Ctrl+Alt+1', 'style': 'h1'},
        {'key': 'Ctrl+Alt+2', 'style': 'h2'},
        {'key': 'Ctrl+Alt+3', 'style': 'h3'},
        {'key': 'Ctrl+Alt+4', 'style': 'h4'},
        {'key': 'Ctrl+Alt+5', 'style': 'h5'},
        {'key': 'Ctrl+Alt+6', 'style': 'h6'},
        {'key': 'Ctrl+Shift+L', 'style': 'link'},
        {'key': 'Ctrl+Shift+I', 'style': 'image'},
        {'key': 'Ctrl+Q', 'style': 'blockquote'},
        {'key': 'Ctrl+Shift+1', 'style': 'currentDate'},
        {'key': 'Ctrl+U', 'style': 'uppercase'},
        {'key': 'Ctrl+Shift+U', 'style': 'lowercase'},
        {'key': 'Ctrl+Alt+Shift+U', 'style': 'titlecase'},
        {'key': 'Ctrl+Alt+W', 'style': 'selectword'},
        {'key': 'Ctrl+L', 'style': 'list'},
        {'key': 'Ctrl+Alt+C', 'style': 'copyHTML'},
        {'key': 'Meta+Alt+C', 'style': 'copyHTML'},
        {'key': 'Meta+Enter', 'style': 'newLine'},
        {'key': 'Ctrl+Enter', 'style': 'newLine'}
    ];

    MarkdownEditor = function () {
        var codemirror = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
            mode:           'gfm',
            tabMode:        'indent',
            tabindex:       '2',
            cursorScrollMargin: 10,
            lineWrapping:   true,
            dragDrop:       false,
            extraKeys: {
                Home:   'goLineLeft',
                End:    'goLineRight'
            }
        });

        // Markdown shortcuts for the editor
        _.each(MarkdownShortcuts, function (combo) {
            shortcut.add(combo.key, function () {
                return codemirror.addMarkdown({style: combo.style});
            });
        });

        // Public API
        _.extend(this, {
            codemirror: codemirror,

            scrollViewPort: function () {
                return $('.CodeMirror-scroll');
            },
            scrollContent: function () {
                return $('.CodeMirror-sizer');
            },
            enable: function () {
                codemirror.setOption('readOnly', false);
                codemirror.on('change', function () {
                    $(document).trigger('markdownEditorChange');
                });
            },
            disable: function () {
                codemirror.setOption('readOnly', 'nocursor');
                codemirror.off('change', function () {
                    $(document).trigger('markdownEditorChange');
                });
            },
            isCursorAtEnd: function () {
                return codemirror.getCursor('end').line > codemirror.lineCount() - 5;
            },
            value: function () {
                return codemirror.getValue();
            }
        });
    };

    Ghost.Editor = Ghost.Editor || {};
    Ghost.Editor.MarkdownEditor = MarkdownEditor;
} ());