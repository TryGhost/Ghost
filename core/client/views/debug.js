/*global window, document, Ghost, $, _, Backbone, NProgress, JST */
(function () {
    "use strict";

    Ghost.Views.Debug = Ghost.View.extend({
        events: {
            "click .settings-menu a": "handleMenuClick",
            "click .js-update": "handleUpdateClick"
        },

        handleMenuClick: function (ev) {
            ev.preventDefault();

            var $target = $(ev.currentTarget);

            // Hide the current content
            this.$(".settings-content").hide();

            // Show the clicked content
            this.$("#debug-" + $target.attr("class")).show();

            return false;
        },

        confirmUpdate: function (updateInfo) {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: false,
                        confirm: {
                            accept: {
                                func: function () {
                                    NProgress.start();

                                    $.ajax({
                                        url: Ghost.settings.apiRoot + '/update/',
                                        type: 'POST',
                                        headers: {
                                            'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                                        },
                                        success: function onSuccess(data) {
                                            if (!data) {
                                                throw new Error('No response received from server.');
                                            }
                                            if (!data.success) {
                                                throw new Error(data.detail || 'Unknown error');
                                            }

                                            Ghost.notifications.addItem({
                                                type: 'success',
                                                message: 'Successfully updated. Please restart Ghost for changes to take effect.',
                                                status: 'passive'
                                            });

                                            NProgress.done();
                                        },
                                        error: function onError(error) {
                                            Ghost.notifications.addItem({
                                                type: 'error',
                                                message: 'A problem was encountered while performing update. Error: ' + error.message + '.',
                                                status: 'passive'
                                            });

                                            NProgress.done();
                                        }
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
                        title: ['v', updateInfo.newVersion, ' is available! Proceed with installation?'].join('')
                    }
                }
            }));
        },

        handleUpdateClick: function (e) {
            e.preventDefault();
            var self = this;

            $.get(Ghost.settings.apiRoot + '/update/').done(function onResponse(data) {
                if (!data) {
                    return Ghost.notifications.addItem({
                        type: 'error',
                        message: 'Invalid response received.',
                        status: 'passive'
                    });
                }
                if (!data.isUpdateAvailable) {
                    return Ghost.notifications.addItem({
                        type: 'success',
                        message: 'Ghost is up to date.',
                        status: 'passive'
                    });
                }

                self.confirmUpdate(data);
            }).fail(function onError(error) {
                return Ghost.notifications.addItem({
                    type: 'error',
                    message: ['Unable to check for update. Error: ', (error && error.message ? error.message : 'Unknown error'), '.'].join(''),
                    status: 'passive'
                });
            });
        }
    });

}());