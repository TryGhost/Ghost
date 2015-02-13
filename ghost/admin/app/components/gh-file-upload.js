import Ember from 'ember';
var FileUpload = Ember.Component.extend({
    _file: null,

    uploadButtonText: 'Text',

    uploadButtonDisabled: true,

    change: function (event) {
        this.set('uploadButtonDisabled', false);
        this.sendAction('onAdd');
        this._file = event.target.files[0];
    },

    onUpload: 'onUpload',

    actions: {
        upload: function () {
            if (!this.uploadButtonDisabled && this._file) {
                this.sendAction('onUpload', this._file);
            }

            // Prevent double post by disabling the button.
            this.set('uploadButtonDisabled', true);
        }
    }
});

export default FileUpload;
