// # Article Editor

/*global document, setTimeout, navigator, $, Backbone, Ghost, shortcut */
(function () {
    'use strict';

    var PublishBar;

    // The publish bar associated with a post, which has the TagWidget and
    // Save button and options and such.
    // ----------------------------------------
    PublishBar = Ghost.View.extend({

        initialize: function () {

            this.addSubview(new Ghost.View.EditorTagWidget(
                {el: this.$('#entry-tags'), model: this.model}
            )).render();
            this.addSubview(new Ghost.View.PostSettings(
                {el: $('#entry-controls'), model: this.model}
            )).render();

            // Pass the Actions widget references to the title and editor so that it can get
            // the values that need to be saved
            this.addSubview(new Ghost.View.EditorActionsWidget(
                {
                    el: this.$('#entry-actions'),
                    model: this.model,
                    $title: this.options.$title,
                    editor: this.options.editor
                }
            )).render();

        },

        render: function () { return this; }
    });


    // The entire /editor page's route
    // ----------------------------------------
    Ghost.Views.Editor = Ghost.View.extend({

        events: {
            'click .markdown-help': 'showHelp',
            'blur #entry-title': 'trimTitle',
            'orientationchange': 'orientationChange'
        },

        initialize: function () {
            this.$title = this.$('#entry-title');
            this.$editor = this.$('#entry-markdown');

            this.$title.val(this.model.get('title')).focus();
            this.$editor.text(this.model.get('markdown'));

            // Create a new editor
            this.editor = new Ghost.Editor.Main();

            // Add the container view for the Publish Bar
            // Passing reference to the title and editor
            this.addSubview(new PublishBar(
                {el: '#publish-bar', model: this.model, $title: this.$title, editor: this.editor}
            )).render();

            this.listenTo(this.model, 'change:title', this.renderTitle);
            this.listenTo(this.model, 'change:id', this.handleIdChange);

            this.bindShortcuts();

            $('.entry-markdown header, .entry-preview header').on('click', function (e) {
                $('.entry-markdown, .entry-preview').removeClass('active');
                $(e.currentTarget).closest('section').addClass('active');
            });
        },

        bindShortcuts: function () {
            var self = this;

             // Zen writing mode shortcut - full editor view
            shortcut.add('Alt+Shift+Z', function () {
                $('body').toggleClass('zen');
            });

            // HTML copy & paste
            shortcut.add('Ctrl+Alt+C', function () {
                self.showHTML();
            });
        },

        trimTitle: function () {
            var rawTitle = this.$title.val(),
                trimmedTitle = $.trim(rawTitle);

            if (rawTitle !== trimmedTitle) {
                this.$title.val(trimmedTitle);
            }

            // Trigger title change for post-settings.js
            this.model.set('title', trimmedTitle);
        },

        renderTitle: function () {
            this.$title.val(this.model.get('title'));
        },

        handleIdChange: function (m) {
            // This is a special case for browsers which fire an unload event when using navigate. The id change
            // happens before the save success and can cause the unload alert to appear incorrectly on first save
            // The id only changes in the event that the save has been successful, so this workaround is safes
            this.editor.setDirty(false);
            Backbone.history.navigate('/editor/' + m.id + '/');
        },

        // This is a hack to remove iOS6 white space on orientation change bug
        // See: http://cl.ly/RGx9
        orientationChange: function () {
            if (/iPhone/.test(navigator.userAgent) && !/Opera Mini/.test(navigator.userAgent)) {
                var focusedElement = document.activeElement,
                    s = document.documentElement.style;
                focusedElement.blur();
                s.display = 'none';
                setTimeout(function () { s.display = 'block'; focusedElement.focus(); }, 0);
            }
        },

        showEditorModal: function (content) {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        style: ['wide'],
                        animation: 'fade'
                    },
                    content: content
                }
            }));
        },

        showHelp: function () {
            var content = {
                template: 'markdown',
                title: 'Markdown Help'
            };
            this.showEditorModal(content);
        },

        showHTML: function () {
            var content = {
                template: 'copyToHTML',
                title: 'Copied HTML'
            };
            this.showEditorModal(content);
        },

        render: function () { return this; }
    });
}());