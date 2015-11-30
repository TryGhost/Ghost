import UploadUi from 'ghost/assets/lib/upload-ui';

export default function (options) {
    var settings = $.extend({
        progressbar: true,
        editor: false,
        fileStorage: true
    }, options);

    return this.each(function () {
        var $dropzone = $(this),
            ui;

        ui = new UploadUi($dropzone, settings);
        $(this).attr('data-uploaderui', true);
        this.uploaderUi = ui;
        ui.init();
    });
}
