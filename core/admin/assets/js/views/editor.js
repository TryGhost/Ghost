// # Article Editor

/*global window, alert, document, history, Backbone, Ghost, $, _, Showdown, CodeMirror, shortcut, Countable */
(function () {
    "use strict";

    var PublishBar,
        TagWidget,
        ActionsWidget,
        MarkdownShortcuts = [
            {'key': 'Ctrl+B', 'style': 'bold'},
            {'key': 'Meta+B', 'style': 'bold'},
            {'key': 'Ctrl+I', 'style': 'italic'},
            {'key': 'Meta+I', 'style': 'italic'},
            {'key': 'Ctrl+Alt+U', 'style': 'strike'},
            {'key': 'Ctrl+Shift+K', 'style': 'code'},
            {'key': 'Ctrl+Alt+1', 'style': 'h1'},
            {'key': 'Ctrl+Alt+2', 'style': 'h2'},
            {'key': 'Ctrl+Alt+3', 'style': 'h3'},
            {'key': 'Ctrl+Alt+4', 'style': 'h4'},
            {'key': 'Ctrl+Alt+5', 'style': 'h5'},
            {'key': 'Ctrl+Alt+6', 'style': 'h6'},
            {'key': 'Ctrl+Shift+L', 'style': 'link'},
            {'key': 'Ctrl+Shift+I', 'style': 'image'},
            {'key': 'Ctrl+Q', 'style': 'blockquote'},
            {'key': 'Ctrl+Shift+1', 'style': 'currentdate'}
        ];

    // The publish bar associated with a post, which has the TagWidget and
    // Save button and options and such.
    // ----------------------------------------
    PublishBar = Ghost.View.extend({

        initialize: function () {
            this.addSubview(new TagWidget({el: this.$('#entry-categories'), model: this.model})).render();
            this.addSubview(new ActionsWidget({el: this.$('#entry-actions'), model: this.model})).render();
        }

    });

    // The Tag UI area associated with a post
    // ----------------------------------------
    TagWidget = Ghost.View.extend({

    });

    // The Publish, Queue, Publish Now buttons
    // ----------------------------------------
    ActionsWidget = Ghost.View.extend({

        events: {
            'click [data-set-status]': 'handleStatus',
            'click .js-post-button': 'updatePost'
        },

        statusMap: {
            'draft' : 'Save Draft',
            'published': 'Update Post',
            'scheduled' : 'Save Schedued Post'
        },

        initialize: function () {
            var self = this;
            // Toggle publish
            shortcut.add("Ctrl+Alt+P", function () {
                self.toggleStatus();
            });
            shortcut.add("Ctrl+S", function () {
                self.updatePost();
            });
            shortcut.add("Meta+S", function () {
                self.updatePost();
            });
            this.listenTo(this.model, 'change:status', this.render);
            this.model.on('change:id', function (m) {
                Backbone.history.navigate('/editor/' + m.id);
            });
        },

        toggleStatus: function () {
            var keys = Object.keys(this.statusMap),
                model = this.model,
                currentIndex = keys.indexOf(model.get('status')),
                newIndex;


            if (keys[currentIndex + 1] === 'scheduled') { // TODO: Remove once scheduled posts work
                newIndex = currentIndex + 2 > keys.length - 1 ? 0 : currentIndex + 1;
            } else {
                newIndex = currentIndex + 1 > keys.length - 1 ? 0 : currentIndex + 1;
            }

            this.savePost({
                status: keys[newIndex]
            }).then(function () {
                alert('Your post: ' + model.get('title') + ' has been ' + keys[newIndex]);
            });
        },

        handleStatus: function (e) {
            e.preventDefault();
            var status = $(e.currentTarget).attr('data-set-status'),
                model = this.model;

            if (status === 'publish-on') {
                return alert('Scheduled publishing not supported yet.');
            }
            if (status === 'queue') {
                return alert('Scheduled publishing not supported yet.');
            }

            this.savePost({
                status: status
            }).then(function () {
                alert('Your post: ' + model.get('title') + ' has been ' + status);
            });
        },

        updatePost: function (e) {
            if (e) {
                e.preventDefault();
            }
            var model = this.model;
            this.savePost().then(function () {
                alert('Your post was saved as ' + model.get('status'));
            }, function () {
                alert(model.validationError);
            });
        },

        savePost: function (data) {
            // TODO: The content getter here isn't great, shouldn't rely on currentView.
            var saved = this.model.save(_.extend({
                title: $('#entry-title').val(),
                content: Ghost.currentView.editor.getValue()
            }, data));

            // TODO: Take this out if #2489 gets merged in Backbone. Or patch Backbone
            // ourselves for more consistent promises.
            if (saved) {
                return saved;
            }
            return $.Deferred().reject();
        },

        render: function () {
            this.$('.js-post-button').text(this.statusMap[this.model.get('status')]);
        }

    });

    // The entire /editor page's route (TODO: move all views to client side templates)
    // ----------------------------------------
    Ghost.Views.Editor = Ghost.View.extend({

        initialize: function () {

            // Add the container view for the Publish Bar
            this.addSubview(new PublishBar({el: "#publish-bar", model: this.model})).render();

            this.$('#entry-markdown').html(this.model.get('content'));

            this.initMarkdown();
            this.renderPreview();

            // TODO: Debounce
            this.$('.CodeMirror-scroll').on('scroll', this.syncScroll);

            // Shadow on Markdown if scrolled
            this.$('.CodeMirror-scroll').on('scroll', function (e) {
                if ($('.CodeMirror-scroll').scrollTop() > 10) {
                    $('.entry-markdown').addClass('scrolling');
                } else {
                    $('.entry-markdown').removeClass('scrolling');
                }
            });

            // Shadow on Preview if scrolled
            this.$('.entry-preview-content').on('scroll', function (e) {
                if ($('.entry-preview-content').scrollTop() > 10) {
                    $('.entry-preview').addClass('scrolling');
                } else {
                    $('.entry-preview').removeClass('scrolling');
                }
            });

            // Zen writing mode shortcut
            shortcut.add("Alt+Shift+Z", function () {
                $('body').toggleClass('zen');
            });

            $('.entry-markdown header, .entry-preview header').click(function (e) {
                $('.entry-markdown, .entry-preview').removeClass('active');
                $(e.target).closest('section').addClass('active');
            });

        },

        syncScroll: function (e) {
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
        },

        // This updates the editor preview panel.
        // Currently gets called on every key press.
        // Also trigger word count update
        renderPreview: function () {
            var view = this,
                preview = document.getElementsByClassName('rendered-markdown')[0];
            preview.innerHTML = this.converter.makeHtml(this.editor.getValue());
            Countable.once(preview, function (counter) {
                view.$('.entry-word-count').text(counter.words + ' words');
                view.$('.entry-character-count').text(counter.characters + ' characters');
                view.$('.entry-paragraph-count').text(counter.paragraphs + ' paragraphs');
            });
        },

        // Markdown converter & markdown shortcut initialization.
        initMarkdown: function () {
            this.converter = new Showdown.converter({extensions: ['ghostdown']});
            this.editor = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
                mode: 'markdown',
                tabMode: 'indent',
                tabindex: "2",
                lineWrapping: true
            });

            var view = this;

            _.each(MarkdownShortcuts, function (combo) {
                shortcut.add(combo.key, function () {
                    return view.editor.addMarkdown({style: combo.style});
                });
            });

            this.editor.on('change', function () {
                view.renderPreview();
            });
        }

    });

}());