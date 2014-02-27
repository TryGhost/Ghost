/*global Ghost, $ */
(function () {
    "use strict";

    Ghost.Views.Debug = Ghost.View.extend({
        events: {
            "click .settings-menu a": "handleMenuClick",
            "click #startupload": "handleUploadClick",
            "click .js-delete": "handleDeleteClick"
        },

        initialize: function () {
            var view = this;

            this.uploadButton = this.$el.find('#startupload');

            // Disable import button and initizalize BlueImp file upload
            this.uploadButton.prop('disabled', 'disabled');
            $('#importfile').fileupload({
                url: Ghost.paths.apiRoot + '/db/',
                limitMultiFileUploads: 1,
                replaceFileInput: false,
                headers: {
                    'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                },
                dataType: 'json',
                add: function (e, data) {
                    /*jshint unused:false*/

                    // Bind the upload data to the view, so it is
                    // available to the click handler, and enable the
                    // upload button.
                    view.fileUploadData = data;
                    data.context = view.uploadButton.removeProp('disabled');
                },
                done: function (e, data) {
                    /*jshint unused:false*/
                    $('#startupload').text('Import');
                    if (!data.result) {
                        throw new Error('No response received from server.');
                    }
                    if (!data.result.message) {
                        throw new Error('Unknown error');
                    }

                    Ghost.notifications.addItem({
                        type: 'success',
                        message: data.result.message,
                        status: 'passive'
                    });
                },
                error: function (response) {
                    $('#startupload').text('Import');
                    var responseJSON = response.responseJSON,
                        message = responseJSON && responseJSON.error ? responseJSON.error : 'unknown';
                    Ghost.notifications.addItem({
                        type: 'error',
                        message: ['A problem was encountered while importing new content to your blog. Error: ', message].join(''),
                        status: 'passive'
                    });
                }

            });

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

        handleUploadClick: function (ev) {
            ev.preventDefault();

            if (!this.uploadButton.prop('disabled')) {
                this.fileUploadData.context = this.uploadButton.text('Importing');
                this.fileUploadData.submit();
            }

            // Prevent double post by disabling the button.
            this.uploadButton.prop('disabled', 'disabled');
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
                        title: 'Would you really like to delete all content from your blog?',
                        text: '<p>This is permanent! No backups, no restores, no magic undo button. <br /> We warned you, ok?</p>'
                    }
                }
            }));
        }
    });
}());
