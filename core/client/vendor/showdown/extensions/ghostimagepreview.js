/* jshint node:true, browser:true */
/* global Ember */

// Ghost Image Preview
//
// Manages the conversion of image markdown `![]()` from markdown into the HTML image preview
// This provides a dropzone and other interface elements for adding images
// Is only used in the admin client.

var Ghost = Ghost || {};
(function () {
    var ghostimagepreview = function () {
        return [
            // ![] image syntax
            {
                type: 'lang',
                filter: function (text) {
                    var imageMarkdownRegex = /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
                        /* regex from isURL in node-validator. Yum! */
                        uriRegex = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i,
                        pathRegex = /^(\/)?([^\/\0]+(\/)?)+$/i;

                    return text.replace(imageMarkdownRegex, function (match, key, alt, src) {
                        var result = '',
                            output;

                        if (src && (src.match(uriRegex) || src.match(pathRegex))) {
                            result = '<img class="js-upload-target" src="' + src + '"/>';
                        }

                        if ((Ghost && Ghost.touchEditor) || (typeof window !== 'undefined' && Ember.touchEditor)) {
                            output = '<section class="image-uploader">' +
                                result + '<div class="description">Mobile uploads coming soon</div></section>';
                        } else {
                            output = '<section id="image_upload_' + key + '" class="js-drop-zone image-uploader">' +
                                result + '<div class="description">Add image of <strong>' + alt + '</strong></div>' +
                                '<input data-url="upload" class="js-fileupload main fileupload" type="file" name="uploadimage">' +
                                '</section>';
                        }

                        return output;
                    });
                }
            }
        ];
    };

    // Client-side export
    if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) {
        window.Showdown.extensions.ghostimagepreview = ghostimagepreview;
    }
    // Server-side export
    if (typeof module !== 'undefined') {
        module.exports = ghostimagepreview;
    }
}());
