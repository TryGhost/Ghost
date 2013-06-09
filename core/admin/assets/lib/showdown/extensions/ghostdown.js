(function () {
    var ghostdown = function (converter) {
        return [
            // [image] syntax
            {
                type: 'lang',
                filter: function (source) {
                    return source.replace(/\n?!image\[([\d\w\s]*)\]/gi, function (match, alt, a) {
                        return '<section  class="js-drop-zone image-uploader">' +
                            '<span class="media"><span class="hidden">Image Upload</span></span>' +
                            '<div class="description">Add image of <strong>' + alt + '</strong></div>' +
                            '<input data-url="upload" class="js-fileupload fileupload" type="file" name="uploadimage">' +
                            '<a class="image-url" title="Add image from URL"><span class="hidden">URL</span></a>' +
                            '<a class="image-webcam" title="Add image from webcam">' +
                            '<span class="hidden">Webcam</span></a>' +
                            '</section>';
                    });
                }
            }
        ];
    };

    // Client-side export
    if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) {
        window.Showdown.extensions.ghostdown = ghostdown;
    }
    // Server-side export
    if (typeof module !== 'undefined') module.exports = ghostdown;
}());