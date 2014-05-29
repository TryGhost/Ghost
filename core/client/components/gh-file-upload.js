var FileUpload = Ember.Component.extend({
    _file: null,
    uploadButtonText: 'Text',
    uploadButtonDisabled: true,
    change: function (event) {
        this.set('uploadButtonDisabled', false);
        this.sendAction('onAdd');
        this._file = event.target.files[0];
    },
    actions: {
        upload: function () {
            var self = this;
            if (!this.uploadButtonDisabled && self._file) {
                self.sendAction('onUpload', self._file);
            }

            // Prevent double post by disabling the button.
            this.set('uploadButtonDisabled', true);
        }
    }
});

export default FileUpload;
