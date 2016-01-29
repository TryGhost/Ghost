import Ember from 'ember';

const {Component} = Ember;

export default Component.extend({
    _file: null,

    uploadButtonText: 'Text',
    uploadButtonDisabled: true,

    onUpload: null,
    onAdd: null,

    shouldResetForm: true,

    change(event) {
        this.set('uploadButtonDisabled', false);
        this.sendAction('onAdd');
        this._file = event.target.files[0];
    },

    actions: {
        upload() {
            if (!this.get('uploadButtonDisabled') && this._file) {
                this.sendAction('onUpload', this._file);
            }

            // Prevent double post by disabling the button.
            this.set('uploadButtonDisabled', true);

            // Reset form
            if (this.get('shouldResetForm')) {
                this.$().closest('form')[0].reset();
            }
        }
    }
});
