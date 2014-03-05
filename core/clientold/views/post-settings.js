// The Post Settings Menu available in the content preview screen, as well as the post editor.

/*global window, $, _, Ghost, moment */

(function () {
    "use strict";

    var parseDateFormats = ["DD MMM YY HH:mm", "DD MMM YYYY HH:mm", "DD/MM/YY HH:mm", "DD/MM/YYYY HH:mm",
            "DD-MM-YY HH:mm", "DD-MM-YYYY HH:mm", "YYYY-MM-DD HH:mm"],
        displayDateFormat = 'DD MMM YY @ HH:mm';

    Ghost.View.PostSettings = Ghost.View.extend({

        events: {
            'blur  .post-setting-slug' : 'editSlug',
            'click .post-setting-slug' : 'selectSlug',
            'blur  .post-setting-date' : 'editDate',
            'click .post-setting-static-page' : 'toggleStaticPage',
            'click .delete' : 'deletePost'
        },

        initialize: function () {
            if (this.model) {
                // These three items can be updated outside of the post settings menu, so have to be listened to.
                this.listenTo(this.model, 'change:id', this.render);
                this.listenTo(this.model, 'change:title', this.updateSlugPlaceholder);
                this.listenTo(this.model, 'change:published_at', this.updatePublishedDate);
            }
        },

        render: function () {
            var slug = this.model ? this.model.get('slug') : '',
                pubDate = this.model ? this.model.get('published_at') : 'Not Published',
                $pubDateEl = this.$('.post-setting-date'),
                $postSettingSlugEl = this.$('.post-setting-slug');

            $postSettingSlugEl.val(slug);

            // Update page status test if already a page.
            if (this.model && this.model.get('page')) {
                $('.post-setting-static-page').prop('checked', this.model.get('page'));
            }

            // Insert the published date, and make it editable if it exists.
            if (this.model && this.model.get('published_at')) {
                pubDate = moment(pubDate).format(displayDateFormat);
                $pubDateEl.attr('placeholder', '');
            } else {
                $pubDateEl.attr('placeholder', moment().format(displayDateFormat));
            }

            if (this.model && this.model.get('id')) {
                this.$('.post-setting-page').removeClass('hidden');
                this.$('.delete').removeClass('hidden');
            }

            // Apply different style for model's that aren't
            // yet persisted to the server.
            // Mostly we're hiding the delete post UI
            if (this.model.id === undefined) {
                this.$el.addClass('unsaved');
            } else {
                this.$el.removeClass('unsaved');
            }

            $pubDateEl.val(pubDate);
        },

        // Requests a new slug when the title was changed
        updateSlugPlaceholder: function () {
            var title = this.model.get('title'),
                $postSettingSlugEl = this.$('.post-setting-slug');

            // If there's a title present we want to
            // validate it against existing slugs in the db
            // and then update the placeholder value.
            if (title) {
                $.ajax({
                    url: Ghost.paths.apiRoot + '/posts/getSlug/' + encodeURIComponent(title) + '/',
                    success: function (result) {
                        $postSettingSlugEl.attr('placeholder', result);
                    }
                });
            } else {
                // If there's no title set placeholder to blank
                // and don't make an ajax request to server
                // for a proper slug (as there won't be any).
                $postSettingSlugEl.attr('placeholder', '');
                return;
            }
        },

        selectSlug: function (e) {
            e.currentTarget.select();
        },

        editSlug: _.debounce(function (e) {
            e.preventDefault();
            var self = this,
                slug = self.model.get('slug'),
                slugEl = e.currentTarget,
                newSlug = slugEl.value,
                placeholder = slugEl.placeholder;

            newSlug = (_.isEmpty(newSlug) && placeholder) ? placeholder : newSlug;

            // If the model doesn't currently
            // exist on the server (aka has no id)
            // then just update the model's value
            if (self.model.id === undefined) {
                this.model.set({
                    slug: newSlug
                });
                return;
            }

            // Ignore unchanged slugs
            if (slug === newSlug) {
                slugEl.value = slug === undefined ? '' : slug;
                return;
            }

            this.model.save({
                slug: newSlug
            }, {
                success : function (model, response, options) {
                    /*jshint unused:false*/
                    // Repopulate slug in case it changed on the server (e.g. 'new-slug-2')
                    slugEl.value = model.get('slug');
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Permalink successfully changed to <strong>" + model.get('slug') + '</strong>.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jshint unused:false*/
                    slugEl.value = model.previous('slug');
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        }, 500),


        updatePublishedDate: function () {
            var pubDate = this.model.get('published_at') ? moment(this.model.get('published_at'))
                    .format(displayDateFormat) : '',
                $pubDateEl = this.$('.post-setting-date');

            // Only change the date if it's different
            if (pubDate && $pubDateEl.val() !== pubDate) {
                $pubDateEl.val(pubDate);
            }
        },

        editDate: _.debounce(function (e) {
            e.preventDefault();
            var self = this,
                errMessage = '',
                pubDate = self.model.get('published_at') ? moment(self.model.get('published_at'))
                    .format(displayDateFormat) : '',
                pubDateEl = e.currentTarget,
                newPubDate = pubDateEl.value,
                pubDateMoment,
                newPubDateMoment;

            // if there is no new pub date do nothing
            if (!newPubDate) {
                return;
            }

            // Check for missing time stamp on new data
            // If no time specified, add a 12:00
            if (newPubDate && !newPubDate.slice(-5).match(/\d+:\d\d/)) {
                newPubDate += " 12:00";
            }

            newPubDateMoment = moment(newPubDate, parseDateFormats);

            // If there was a published date already set
            if (pubDate) {
                 // Check for missing time stamp on current model
                // If no time specified, add a 12:00
                if (!pubDate.slice(-5).match(/\d+:\d\d/)) {
                    pubDate += " 12:00";
                }

                pubDateMoment = moment(pubDate, parseDateFormats);

                 // Ensure the published date has changed
                if (newPubDate.length === 0 || pubDateMoment.isSame(newPubDateMoment)) {
                    // If it wasn't, reset it and return
                    pubDateEl.value = pubDateMoment.format(displayDateFormat);
                    return;
                }
            }

            // Validate new Published date
            if (!newPubDateMoment.isValid()) {
                errMessage = 'Published Date must be a valid date with format: DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
            }

            if (newPubDateMoment.diff(new Date(), 'h') > 0) {
                errMessage = 'Published Date cannot currently be in the future.';
            }

            if (errMessage.length) {
                // Show error message
                Ghost.notifications.addItem({
                    type: 'error',
                    message: errMessage,
                    status: 'passive'
                });

                // Reset back to original value and return
                pubDateEl.value = pubDateMoment ? pubDateMoment.format(displayDateFormat) : '';
                return;
            }

            // If the model doesn't currently
            // exist on the server (aka has no id)
            // then just update the model's value
            if (self.model.id === undefined) {
                this.model.set({
                    published_at: newPubDateMoment.toDate()
                });
                return;
            }

            // Save new 'Published' date
            this.model.save({
                published_at: newPubDateMoment.toDate()
            }, {
                success : function (model) {
                    pubDateEl.value = moment(model.get('published_at')).format(displayDateFormat);
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: 'Publish date successfully changed to <strong>' + pubDateEl.value + '</strong>.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jshint unused:false*/
                    //  Reset back to original value
                    pubDateEl.value = pubDateMoment ? pubDateMoment.format(displayDateFormat) : '';
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });

        }, 500),

        toggleStaticPage: _.debounce(function (e) {
            var pageEl = $(e.currentTarget),
                page = pageEl.prop('checked');

            // Don't try to save
            // if the model doesn't currently
            // exist on the server
            if (this.model.id === undefined) {
                this.model.set({
                    page: page
                });
                return;
            }

            this.model.save({
                page: page
            }, {
                success : function (model, response, options) {
                    /*jshint unused:false*/
                    pageEl.prop('checked', page);
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Successfully converted " + (page ? "to static page" : "to post") + '.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jshint unused:false*/
                    pageEl.prop('checked', model.previous('page'));
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        }, 500),

        deletePost: function (e) {
            e.preventDefault();
            var self = this;
            // You can't delete a post
            // that hasn't yet been saved
            if (this.model.id === undefined) {
                return;
            }
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: false,
                        confirm: {
                            accept: {
                                func: function () {
                                    self.model.destroy({
                                        wait: true
                                    }).then(function () {
                                        // Redirect to content screen if deleting post from editor.
                                        if (window.location.pathname.indexOf('editor') > -1) {
                                            window.location = Ghost.paths.subdir + '/ghost/content/';
                                        }
                                        Ghost.notifications.addItem({
                                            type: 'success',
                                            message: 'Your post has been deleted.',
                                            status: 'passive'
                                        });
                                    }, function () {
                                        Ghost.notifications.addItem({
                                            type: 'error',
                                            message: 'Your post could not be deleted. Please try again.',
                                            status: 'passive'
                                        });
                                    });
                                },
                                text: "Delete",
                                buttonClass: "button-delete"
                            },
                            reject: {
                                func: function () {
                                    return true;
                                },
                                text: "Cancel",
                                buttonClass: "button"
                            }
                        },
                        type: "action",
                        style: ["wide", "centered"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'blank',
                        title: 'Are you sure you want to delete this post?',
                        text: '<p>This is permanent! No backups, no restores, no magic undo button. <br /> We warned you, ok?</p>'
                    }
                }
            }));
        }

    });

}());
