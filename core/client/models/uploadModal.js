/*global Ghost, Backbone, $ */
(function () {
    'use strict';
    Ghost.Models.uploadModal = Backbone.Model.extend({

        options: {
            close: true,
            type: 'action',
            style: ["wide"],
            animation: 'fade',
            afterRender: function () {
                var filestorage = $('#' + this.options.model.id).data('filestorage');
                this.$('.js-drop-zone').upload({fileStorage: filestorage});
            },
            confirm: {
                reject: {
                    func: function () { // The function called on rejection
                        return true;
                    },
                    buttonClass: true,
                    text: "Cancel" // The reject button text
                }
            }
        },
        content: {
            template: 'uploadImage'
        },

        initialize: function (options) {
            this.options.id = options.id;
            this.options.key = options.key;
            this.options.src = options.src;
            this.options.confirm.accept = options.accept;
            this.options.acceptEncoding = options.acceptEncoding || 'image/*';
        }
    });

}());
