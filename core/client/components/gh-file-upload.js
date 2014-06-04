var FileUpload = Ember.Component.extend({
    _file: null,
    uploadButtonText: 'Text',
    uploadButtonDisabled: true,
    autoUpload: true,
    acceptEncoding: 'image/*',
    didInsertElement: function () {
        var self = this;

        this.$('input').fileupload({
            url: '/ghost/upload/',
            headers: {
                'X-CSRF-Token': $('meta[name=\'csrf-param\']').attr('content')
            },
            add: function (e, data) {
                data.submit();
            },
            progresAll: function (e, data) {
                console.log('progressAll', e, data);
            },
            fail: function (e, data) {
                self.sendAction('onUploadError', data.errorThrown);
            },
            done: function (e, data) {
                self.sendAction('onUploadSuccess', data);
            }
        });
    },
    // change: function (event) {
    //     this.set('uploadButtonDisabled', false);
    //     this._file = event.target.files[0];

    //     if (this.autoUpload) {
    //         this.send('upload');
    //     }
    // },
    actions: {
        upload: function () {
            //@TODO: add progress bar back in
            //@TODO: add in drag and drop

            if (!this.uploadButtonDisabled && this._file) {
                this.sendAction('onUpload', this._file);
            }

            // Prevent double post by disabling the button.
            this.set('uploadButtonDisabled', true);
        }
    }
});

export default FileUpload;
