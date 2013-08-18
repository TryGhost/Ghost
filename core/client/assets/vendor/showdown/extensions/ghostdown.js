(function () {
    var ghostdown = function (converter) {
        return [
            // [image] syntax
            {
                type: 'lang',
                filter: function (source) {
                    return source.replace(/\n?!(?:image)?\[([^\n\]]*)\](?:\(([^\n\)]*)\))?/gi, function (match, alt, src) {
                        var result = "";

                        if (src !== "http://") {
                            result = '<img class="js-upload-target" src="' + src + '"/>';
                        }
                        return '<section  class="js-drop-zone image-uploader">' + result +
                               '<div class="description">Add image of <strong>' + alt + '</strong></div>' +
                               '<input data-url="upload" class="js-fileupload fileupload" type="file" name="uploadimage">' +
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