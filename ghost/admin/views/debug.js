/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    Ghost.Views.Debug = Ghost.View.extend({
        events: {
            "click .settings-menu a": "handleMenuClick",
            "click .js-delete": "handleDeleteClick"
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
        handleDeleteClick: function (ev) {
            ev.preventDefault();
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        confirm: {
                            accept: {
                                func: function () {
                                    $.ajax({
                                        url: Ghost.paths.apiRoot + '/db/',
                                        type: 'DELETE',
                                        headers: {
                                            'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                                        },
                                        success: function onSuccess(response) {
                                            if (!response) {
                                                throw new Error('No response received from server.');
                                            }
                                            if (!response.message) {
                                                throw new Error(response.detail || 'Unknown error');
                                            }

                                            Ghost.notifications.addItem({
                                                type: 'success',
                                                message: response.message,
                                                status: 'passive'
                                            });

                                        },
                                        error: function onError(response) {
                                            var responseText = JSON.parse(response.responseText),
                                                message = responseText && responseText.error ? responseText.error : 'unknown';
                                            Ghost.notifications.addItem({
                                                type: 'error',
                                                message: ['A problem was encountered while deleting content from your blog. Error: ', message].join(''),
                                                status: 'passive'
                                            });

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
                        title: 'Would you really like to delete all content from your blog?'
                    }
                }
            }));
        }
    });
}());