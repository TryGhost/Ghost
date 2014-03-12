// # Article Editor

/*global window, document, setTimeout, navigator, $, _, Backbone, Ghost, Showdown, CodeMirror, shortcut, Countable, JST */
(function () {
    "use strict";

    /*jslint regexp: true, bitwise: true */
    var PublishBar,
        ActionsWidget,
        UploadManager,
        MarkerManager,
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
            {'key': 'Meta+Alt+C', 'style': 'copyHTML'}
        ],
        imageMarkdownRegex = /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
        markerRegex = /\{<([\w\W]*?)>\}/;
    /*jslint regexp: false, bitwise: false */

    // The publish bar associated with a post, which has the TagWidget and
    // Save button and options and such.
    // ----------------------------------------
    PublishBar = Ghost.View.extend({

        initialize: function () {
            this.addSubview(new Ghost.View.EditorTagWidget({el: this.$('#entry-tags'), model: this.model})).render();
            this.addSubview(new ActionsWidget({el: this.$('#entry-actions'), model: this.model})).render();
            this.addSubview(new Ghost.View.PostSettings({el: $('#entry-controls'), model: this.model})).render();
        },

        render: function () { return this; }

    });

    // The Publish, Queue, Publish Now buttons
    // ----------------------------------------
    ActionsWidget = Ghost.View.extend({

        events: {
            'click [data-set-status]': 'handleStatus',
            'click .js-publish-button': 'handlePostButton'
        },

        statusMap: null,

        createStatusMap: {
            'draft': 'Save Draft',
            'published': 'Publish Now'
        },

        updateStatusMap: {
            'draft': 'Unpublish',
            'published': 'Update Post'
        },

        notificationMap: {
            'draft': 'Your post has been saved as a draft.',
            'published': 'Your post has been published.'
        },

        errorMap: {
            'draft': 'Your post could not be saved as a draft.',
            'published': 'Your post could not be published.'
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
            this.listenTo(this.model, 'change:id', function (m) {
                Backbone.history.navigate('/editor/' + m.id + '/');
            });
        },

        toggleStatus: function () {
            var self = this,
                keys = Object.keys(this.statusMap),
                model = self.model,
                prevStatus = model.get('status'),
                currentIndex = keys.indexOf(prevStatus),
                newIndex,
                status;

            newIndex = currentIndex + 1 > keys.length - 1 ? 0 : currentIndex + 1;
            status = keys[newIndex];

            this.setActiveStatus(keys[newIndex], this.statusMap[status], prevStatus);

            this.savePost({
                status: keys[newIndex]
            }).then(function () {
                self.reportSaveSuccess(status);
            }, function (xhr) {
                // Show a notification about the error
                self.reportSaveError(xhr, model, status);
            });
        },

        setActiveStatus: function (newStatus, displayText, currentStatus) {
            var isPublishing = (newStatus === 'published' && currentStatus !== 'published'),
                isUnpublishing = (newStatus === 'draft' && currentStatus === 'published'),
                // Controls when background of button has the splitbutton-delete/button-delete classes applied
                isImportantStatus = (isPublishing || isUnpublishing);

            $('.js-publish-splitbutton')
                .removeClass(isImportantStatus ? 'splitbutton-save' : 'splitbutton-delete')
                .addClass(isImportantStatus ? 'splitbutton-delete' : 'splitbutton-save');

            // Set the publish button's action and proper coloring
            $('.js-publish-button')
                .attr('data-status', newStatus)
                .text(displayText)
                .removeClass(isImportantStatus ? 'button-save' : 'button-delete')
                .addClass(isImportantStatus ? 'button-delete' : 'button-save');

            // Remove the animated popup arrow
            $('.js-publish-splitbutton > a')
                .removeClass('active');

            // Set the active action in the popup
            $('.js-publish-splitbutton .editor-options li')
                .removeClass('active')
                .filter(['li[data-set-status="', newStatus, '"]'].join(''))
                    .addClass('active');
        },

        handleStatus: function (e) {
            if (e) { e.preventDefault(); }
            var status = $(e.currentTarget).attr('data-set-status'),
                currentStatus = this.model.get('status');

            this.setActiveStatus(status, this.statusMap[status], currentStatus);

            // Dismiss the popup menu
            $('body').find('.overlay:visible').fadeOut();
        },

        handlePostButton: function (e) {
            if (e) { e.preventDefault(); }
            var status = $(e.currentTarget).attr('data-status');

            this.updatePost(status);
        },

        updatePost: function (status) {
            var self = this,
                model = this.model,
                prevStatus = model.get('status');

            // Default to same status if not passed in
            status = status || prevStatus;

            model.trigger('willSave');

            this.savePost({
                status: status
            }).then(function () {
                self.reportSaveSuccess(status);
                // Refresh publish button and all relevant controls with updated status.
                self.render();
            }, function (xhr) {
                // Set the model status back to previous
                model.set({ status: prevStatus });
                // Set appropriate button status
                self.setActiveStatus(status, self.statusMap[status], prevStatus);
                // Show a notification about the error
                self.reportSaveError(xhr, model, status);
            });
        },

        savePost: function (data) {
            _.each(this.model.blacklist, function (item) {
                this.model.unset(item);
            }, this);

            var saved = this.model.save(_.extend({
                title: $('#entry-title').val(),
                // TODO: The content_raw getter here isn't great, shouldn't rely on currentView.
                markdown: Ghost.currentView.getEditorValue()
            }, data));

            // TODO: Take this out if #2489 gets merged in Backbone. Or patch Backbone
            // ourselves for more consistent promises.
            if (saved) {
                return saved;
            }
            return $.Deferred().reject();
        },

        reportSaveSuccess: function (status) {
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'success',
                message: this.notificationMap[status],
                status: 'passive'
            });
        },

        reportSaveError: function (response, model, status) {
            var message = this.errorMap[status];

            if (response) {
                // Get message from response
                message += " " + Ghost.Views.Utils.getRequestErrorMessage(response);
            } else if (model.validationError) {
                // Grab a validation error
                message += " " + model.validationError;
            }

            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        },

        setStatusLabels: function (statusMap) {
            _.each(statusMap, function (label, status) {
                $('li[data-set-status="' + status + '"] > a').text(label);
            });
        },

        render: function () {
            var status = this.model.get('status');

            // Assume that we're creating a new post
            if (status !== 'published') {
                this.statusMap = this.createStatusMap;
            } else {
                this.statusMap = this.updateStatusMap;
            }

            // Populate the publish menu with the appropriate verbiage
            this.setStatusLabels(this.statusMap);

            // Default the selected publish option to the current status of the post.
            this.setActiveStatus(status, this.statusMap[status], status);
        }

    });

    // The entire /editor page's route
    // ----------------------------------------
    Ghost.Views.Editor = Ghost.View.extend({

        initialize: function () {

            // Add the container view for the Publish Bar
            this.addSubview(new PublishBar({el: "#publish-bar", model: this.model})).render();

            this.$('#entry-title').val(this.model.get('title')).focus();
            this.$('#entry-markdown').text(this.model.get('markdown'));

            this.listenTo(this.model, 'change:title', this.renderTitle);

            this.initMarkdown();
            this.renderPreview();

            $('.entry-content header, .entry-preview header').on('click', function () {
                $('.entry-content, .entry-preview').removeClass('active');
                $(this).closest('section').addClass('active');
            });

            $('.entry-title .icon-fullscreen').on('click', function (e) {
                e.preventDefault();
                $('body').toggleClass('fullscreen');
            });

            this.$('.CodeMirror-scroll').on('scroll', this.syncScroll);

            this.$('.CodeMirror-scroll').scrollClass({target: '.entry-markdown', offset: 10});
            this.$('.entry-preview-content').scrollClass({target: '.entry-preview', offset: 10});


            // Zen writing mode shortcut
            shortcut.add("Alt+Shift+Z", function () {
                $('body').toggleClass('zen');
            });

            $('.entry-markdown header, .entry-preview header').click(function (e) {
                $('.entry-markdown, .entry-preview').removeClass('active');
                $(e.target).closest('section').addClass('active');
            });

        },

        events: {
            'click .markdown-help': 'showHelp',
            'blur #entry-title': 'trimTitle',
            'orientationchange': 'orientationChange'
        },

        syncScroll: _.throttle(function (e) {
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
        }, 10),

        showHelp: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: ["wide"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'markdown',
                        title: 'Markdown Help'
                    }
                }
            }));
        },

        trimTitle: function () {
            var $title = $('#entry-title'),
                rawTitle = $title.val(),
                trimmedTitle = $.trim(rawTitle);

            if (rawTitle !== trimmedTitle) {
                $title.val(trimmedTitle);
            }
        },

        renderTitle: function () {
            this.$('#entry-title').val(this.model.get('title'));
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

        // This updates the editor preview panel.
        // Currently gets called on every key press.
        // Also trigger word count update
        renderPreview: function () {
            var self = this,
                preview = document.getElementsByClassName('rendered-markdown')[0];
            preview.innerHTML = this.converter.makeHtml(this.editor.getValue());

            this.initUploads();

            Countable.once(preview, function (counter) {
                self.$('.entry-word-count').text($.pluralize(counter.words, 'word'));
                self.$('.entry-character-count').text($.pluralize(counter.characters, 'character'));
                self.$('.entry-paragraph-count').text($.pluralize(counter.paragraphs, 'paragraph'));
            });
        },

        // Markdown converter & markdown shortcut initialization.
        initMarkdown: function () {
            var self = this;

            this.converter = new Showdown.converter({extensions: ['ghostdown', 'github']});
            this.editor = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
                mode: 'gfm',
                tabMode: 'indent',
                tabindex: "2",
                lineWrapping: true,
                dragDrop: false
            });
            this.uploadMgr = new UploadManager(this.editor);

            // Inject modal for HTML to be viewed in
            shortcut.add("Ctrl+Alt+C", function () {
                self.showHTML();
            });
            shortcut.add("Ctrl+Alt+C", function () {
                self.showHTML();
            });

            _.each(MarkdownShortcuts, function (combo) {
                shortcut.add(combo.key, function () {
                    return self.editor.addMarkdown({style: combo.style});
                });
            });

            this.enableEditor();
        },

        options: {
            markers: {}
        },

        getEditorValue: function () {
            return this.uploadMgr.getEditorValue();
        },

        initUploads: function () {
            this.$('.js-drop-zone').upload({editor: true});
            this.$('.js-drop-zone').on('uploadstart', $.proxy(this.disableEditor, this));
            this.$('.js-drop-zone').on('uploadfailure', $.proxy(this.enableEditor, this));
            this.$('.js-drop-zone').on('uploadsuccess', $.proxy(this.enableEditor, this));
            this.$('.js-drop-zone').on('uploadsuccess', this.uploadMgr.handleUpload);
        },

        enableEditor: function () {
            var self = this;
            this.editor.setOption("readOnly", false);
            this.editor.on('change', function () {
                self.renderPreview();
            });
        },

        disableEditor: function () {
            var self = this;
            this.editor.setOption("readOnly", "nocursor");
            this.editor.off('change', function () {
                self.renderPreview();
            });
        },

        showHTML: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: ["wide"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'copyToHTML',
                        title: 'Copied HTML'
                    }
                }
            }));
        },

        render: function () { return this; }
    });

    MarkerManager = function (editor) {
        var markers = {},
            uploadPrefix = 'image_upload',
            uploadId = 1;

        function addMarker(line, ln) {
            var marker,
                magicId = '{<' + uploadId + '>}';
            editor.setLine(ln, magicId + line.text);
            marker = editor.markText(
                {line: ln, ch: 0},
                {line: ln, ch: (magicId.length)},
                {collapsed: true}
            );

            markers[uploadPrefix + '_' + uploadId] = marker;
            uploadId += 1;
        }

        function getMarkerRegexForId(id) {
            id = id.replace('image_upload_', '');
            return new RegExp('\\{<' + id + '>\\}', 'gmi');
        }

        function stripMarkerFromLine(line) {
            var markerText = line.text.match(markerRegex),
                ln = editor.getLineNumber(line);

            if (markerText) {
                editor.replaceRange('', {line: ln, ch: markerText.index}, {line: ln, ch: markerText.index + markerText[0].length});
            }
        }

        function findAndStripMarker(id) {
            editor.eachLine(function (line) {
                var markerText = getMarkerRegexForId(id).exec(line.text),
                    ln;

                if (markerText) {
                    ln = editor.getLineNumber(line);
                    editor.replaceRange('', {line: ln, ch: markerText.index}, {line: ln, ch: markerText.index + markerText[0].length});
                }
            });
        }

        function removeMarker(id, marker, line) {
            delete markers[id];
            marker.clear();

            if (line) {
                stripMarkerFromLine(line);
            } else {
                findAndStripMarker(id);
            }
        }

        function checkMarkers() {
            _.each(markers, function (marker, id) {
                var line;
                marker = markers[id];
                if (marker.find()) {
                    line = editor.getLineHandle(marker.find().from.line);
                    if (!line.text.match(imageMarkdownRegex)) {
                        removeMarker(id, marker, line);
                    }
                } else {
                    removeMarker(id, marker);
                }
            });
        }

        function initMarkers(line) {
            var isImage = line.text.match(imageMarkdownRegex),
                hasMarker = line.text.match(markerRegex);

            if (isImage && !hasMarker) {
                addMarker(line, editor.getLineNumber(line));
            }
        }

        // public api
        _.extend(this, {
            markers: markers,
            checkMarkers: checkMarkers,
            addMarker: addMarker,
            stripMarkerFromLine: stripMarkerFromLine,
            getMarkerRegexForId: getMarkerRegexForId
        });

        // Initialise
        editor.eachLine(initMarkers);
    };

    UploadManager = function (editor) {
        var markerMgr = new MarkerManager(editor);

        function findLine(result_id) {
            // try to find the right line to replace
            if (markerMgr.markers.hasOwnProperty(result_id) && markerMgr.markers[result_id].find()) {
                return editor.getLineHandle(markerMgr.markers[result_id].find().from.line);
            }

            return false;
        }

        function checkLine(ln, mode) {
            var line = editor.getLineHandle(ln),
                isImage = line.text.match(imageMarkdownRegex),
                hasMarker;

            // We care if it is an image
            if (isImage) {
                hasMarker = line.text.match(markerRegex);

                if (hasMarker && mode === 'paste') {
                    // this could be a duplicate, and won't be a real marker
                    markerMgr.stripMarkerFromLine(line);
                }

                if (!hasMarker) {
                    markerMgr.addMarker(line, ln);
                }
            }
            // TODO: hasMarker but no image?
        }

        function handleUpload(e, result_src) {
            /*jslint regexp: true, bitwise: true */
            var line = findLine($(e.currentTarget).attr('id')),
                lineNumber = editor.getLineNumber(line),
                match = line.text.match(/\([^\n]*\)?/),
                replacement = '(http://)';
            /*jslint regexp: false, bitwise: false */

            if (match) {
                // simple case, we have the parenthesis
                editor.setSelection({line: lineNumber, ch: match.index + 1}, {line: lineNumber, ch: match.index + match[0].length - 1});
            } else {
                match = line.text.match(/\]/);
                if (match) {
                    editor.replaceRange(
                        replacement,
                        {line: lineNumber, ch: match.index + 1},
                        {line: lineNumber, ch: match.index + 1}
                    );
                    editor.setSelection(
                        {line: lineNumber, ch: match.index + 2},
                        {line: lineNumber, ch: match.index + replacement.length }
                    );
                }
            }
            editor.replaceSelection(result_src);
        }

        function getEditorValue() {
            var value = editor.getValue();

            _.each(markerMgr.markers, function (marker, id) {
                value = value.replace(markerMgr.getMarkerRegexForId(id), '');
            });

            return value;
        }

        // Public API
        _.extend(this, {
            getEditorValue: getEditorValue,
            handleUpload: handleUpload
        });

        // initialise
        editor.on('change', function (cm, changeObj) {
            var linesChanged = _.range(changeObj.from.line, changeObj.from.line + changeObj.text.length);

            _.each(linesChanged, function (ln) {
                checkLine(ln, changeObj.origin);
            });

            // Is this a line which may have had a marker on it?
            markerMgr.checkMarkers();
        });
    };

}());
