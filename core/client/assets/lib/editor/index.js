// # Ghost Editor
//
// Ghost Editor contains a set of modules which make up the editor component
// It manages the left and right panes, and all of the communication between them
// Including scrolling,

/*global document, $, _, Ghost */
(function () {
    'use strict';

    var Editor = function () {
        var self = this,
            $document = $(document),
        // Create all the needed editor components, passing them what they need to function
            markdown = new Ghost.Editor.MarkdownEditor(),
            uploadMgr = new Ghost.Editor.UploadManager(markdown),
            preview = new Ghost.Editor.HTMLPreview(markdown, uploadMgr),
            scrollHandler = new Ghost.Editor.ScrollHandler(markdown, preview),
            unloadDirtyMessage,
            handleChange,
            handleDrag;

        unloadDirtyMessage = function () {
            return '==============================\n\n' +
                'Hey there! It looks like you\'re in the middle of writing' +
                ' something and you haven\'t saved all of your content.' +
                '\n\nSave before you go!\n\n' +
                '==============================';
        };

        handleChange = function () {
            self.setDirty(true);
            preview.update();
        };

        handleDrag = function (e) {
            e.preventDefault();
        };

        // Public API
        _.extend(this, {
            enable: function () {
                // Listen for changes
                $document.on('markdownEditorChange', handleChange);

                // enable editing and scrolling
                markdown.enable();
                scrollHandler.enable();
            },

            disable: function () {
                // Don't listen for changes
                $document.off('markdownEditorChange', handleChange);

                // disable editing and scrolling
                markdown.disable();
                scrollHandler.disable();
            },

            // Get the markdown value from the editor for saving
            // Upload manager makes sure the upload markers are removed beforehand
            value: function () {
                return uploadMgr.value();
            },

            setDirty: function (dirty) {
                window.onbeforeunload = dirty ? unloadDirtyMessage : null;
            }
        });

         // Initialise
        $document.on('drop dragover', handleDrag);
        preview.update();
        this.enable();
    };

    Ghost.Editor = Ghost.Editor || {};
    Ghost.Editor.Main = Editor;
}());