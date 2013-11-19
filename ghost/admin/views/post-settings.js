// The Post Settings Menu available in the content preview screen, as well as the post editor.

/*global window, document, $, _, Backbone, Ghost, moment */

(function () {
    "use strict";

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
                this.listenTo(this.model, 'change:id', this.render);
                this.listenTo(this.model, 'change:status', this.render);
                this.listenTo(this.model, 'change:published_at', this.render);
                this.listenTo(this.model, 'change:page', this.render);
            }
        },

        render: function () {
            var slug = this.model ? this.model.get('slug') : '',
                pubDate = this.model ? this.model.get('published_at') : 'Not Published',
                $pubDateEl = this.$('.post-setting-date');

            $('.post-setting-slug').val(slug);

            // Update page status test if already a page.
            if (this.model && this.model.get('page')) {
                $('.post-setting-static-page').prop('checked', this.model.get('page'));
            }

            // Insert the published date, and make it editable if it exists.
            if (this.model && this.model.get('published_at')) {
                pubDate = moment(pubDate).format('DD MMM YY HH:mm');
            }

            if (this.model && this.model.get('id')) {
                this.$('.post-setting-page').removeClass('hidden');
                this.$('.delete').removeClass('hidden');
            }

            $pubDateEl.val(pubDate);
        },

        selectSlug: function (e) {
            e.currentTarget.select();
        },

        editSlug: function (e) {
            e.preventDefault();
            var self = this,
                slug = self.model.get('slug'),
                slugEl = e.currentTarget,
                newSlug = slugEl.value;

            // Ignore empty or unchanged slugs
            if (newSlug.length === 0 || slug === newSlug) {
                slugEl.value = slug === undefined ? '' : slug;
                return;
            }

            this.model.save({
                slug: newSlug
            }, {
                success : function (model, response, options) {
                    /*jslint unparam:true*/
                    // Repopulate slug in case it changed on the server (e.g. 'new-slug-2')
                    slugEl.value = model.get('slug');
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Permalink successfully changed to <strong>" + model.get('slug') + '</strong>.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jslint unparam:true*/
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        },

        editDate: function (e) {
            e.preventDefault();
            var self = this,
                parseDateFormats = ['DD MMM YY HH:mm', 'DD MMM YYYY HH:mm', 'DD/MM/YY HH:mm', 'DD/MM/YYYY HH:mm', 'DD-MM-YY HH:mm', 'DD-MM-YYYY HH:mm'],
                displayDateFormat = 'DD MMM YY HH:mm',
                errMessage = '',
                pubDate = self.model.get('published_at'),
                pubDateEl = e.currentTarget,
                newPubDate = pubDateEl.value,
                pubDateMoment,
                newPubDateMoment;

            // Check for missing time stamp on current model
            // If no time specified, add a 12:00
            if (!pubDate.slice(-5).match(/\d+:\d\d/)) {
                pubDate += " 12:00";
            }

            pubDateMoment = moment(pubDate, parseDateFormats);

            // Same for new date
            if (!newPubDate.slice(-5).match(/\d+:\d\d/)) {
                newPubDate += " 12:00";
            }

            newPubDateMoment = moment(newPubDate, parseDateFormats);

            // Ensure the published date has changed
            if (newPubDate.length === 0 || pubDateMoment.isSame(newPubDateMoment)) {
                pubDateEl.value = pubDate === undefined ? 'Not Published' : pubDateMoment.format(displayDateFormat);
                return;
            }

            // Validate new Published date
            if (!newPubDateMoment.isValid()) {
                errMessage = 'Published Date must be a valid date with format: DD MMM YY HH:mm (e.g. 6 Dec 14 15:00)';
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
                pubDateEl.value = pubDateMoment.format(displayDateFormat);
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
                    /*jslint unparam:true*/
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });

        },

        toggleStaticPage: function (e) {
            var pageEl = $(e.currentTarget),
                page = this.model ? !this.model.get('page') : false;

            this.model.save({
                page: page
            }, {
                success : function (model, response, options) {
                    /*jslint unparam:true*/
                    pageEl.prop('checked', page);
                    Ghost.notifications.addItem({
                        type: 'success',
                        message: "Successfully converted " + (page ? "to static page" : "to post") + '.',
                        status: 'passive'
                    });
                },
                error : function (model, xhr) {
                    /*jslint unparam:true*/
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: Ghost.Views.Utils.getRequestErrorMessage(xhr),
                        status: 'passive'
                    });
                }
            });
        },

        deletePost: function (e) {
            e.preventDefault();
            var self = this;
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
                                            window.location = '/ghost/content/';
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
                                text: "Yes"
                            },
                            reject: {
                                func: function () {
                                    return true;
                                },
                                text: "No"
                            }
                        },
                        type: "action",
                        style: ["wide", "centered"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'blank',
                        title: 'Are you sure you want to delete this post?'
                    }
                }
            }));
        }

    });

}());
