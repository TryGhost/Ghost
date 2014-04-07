// The Save / Publish button

/*global $, _, Ghost, shortcut */

(function () {
    'use strict';

    // The Publish, Queue, Publish Now buttons
    // ----------------------------------------
    Ghost.View.EditorActionsWidget = Ghost.View.extend({

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

        //TODO: This has to be moved to the I18n localization file.
        //This structure is supposed to be close to the i18n-localization which will be used soon.
        messageMap: {
            errors: {
                post: {
                    published: {
                        'published': 'Your post could not be updated.',
                        'draft': 'Your post could not be saved as a draft.'
                    },
                    draft: {
                        'published': 'Your post could not be published.',
                        'draft': 'Your post could not be saved as a draft.'
                    }

                }
            },

            success: {
                post: {
                    published: {
                        'published': 'Your post has been updated.',
                        'draft': 'Your post has been saved as a draft.'
                    },
                    draft: {
                        'published': 'Your post has been published.',
                        'draft': 'Your post has been saved as a draft.'
                    }
                }
            }
        },

        initialize: function () {
            var self = this;

            // Toggle publish
            shortcut.add('Ctrl+Alt+P', function () {
                self.toggleStatus();
            });
            shortcut.add('Ctrl+S', function () {
                self.updatePost();
            });
            shortcut.add('Meta+S', function () {
                self.updatePost();
            });
            this.listenTo(this.model, 'change:status', this.render);
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
                    self.reportSaveSuccess(status, prevStatus);
                }, function (xhr) {
                    // Show a notification about the error
                    self.reportSaveError(xhr, model, status, prevStatus);
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
                    self.reportSaveSuccess(status, prevStatus);
                    // Refresh publish button and all relevant controls with updated status.
                    self.render();
                }, function (xhr) {
                    // Set the model status back to previous
                    model.set({ status: prevStatus });
                    // Set appropriate button status
                    self.setActiveStatus(status, self.statusMap[status], prevStatus);
                    // Show a notification about the error
                    self.reportSaveError(xhr, model, status, prevStatus);
                });
        },

        savePost: function (data) {
            var publishButton = $('.js-publish-button'),
                saved,
                enablePublish = function (deferred) {
                    deferred.always(function () {
                        publishButton.prop('disabled', false);
                    });
                    return deferred;
                };

            publishButton.prop('disabled', true);

            _.each(this.model.blacklist, function (item) {
                this.model.unset(item);
            }, this);

            saved = this.model.save(_.extend({
                title: this.options.$title.val(),
                markdown: this.options.editor.value()
            }, data));

            // TODO: Take this out if #2489 gets merged in Backbone. Or patch Backbone
            // ourselves for more consistent promises.
            if (saved) {
                return enablePublish(saved);
            }

            return enablePublish($.Deferred().reject());
        },

        reportSaveSuccess: function (status, prevStatus) {
            Ghost.notifications.clearEverything();
            Ghost.notifications.addItem({
                type: 'success',
                message: this.messageMap.success.post[prevStatus][status],
                status: 'passive'
            });
            this.options.editor.setDirty(false);
        },

        reportSaveError: function (response, model, status, prevStatus) {
            var message = this.messageMap.errors.post[prevStatus][status];

            if (response) {
                // Get message from response
                message += ' ' + Ghost.Views.Utils.getRequestErrorMessage(response);
            } else if (model.validationError) {
                // Grab a validation error
                message += ' ' + model.validationError;
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
}());