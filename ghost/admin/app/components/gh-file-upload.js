import Component from '@ember/component';

export default Component.extend({
    _file: null,

    acceptEncoding: null,
    uploadButtonText: 'Text',
    uploadButtonDisabled: true,

    shouldResetForm: true,

    // closure actions
    onUpload() {},
    onAdd() {},

    actions: {
        upload() {
            if (!this.get('uploadButtonDisabled') && this._file) {
                this.onUpload(this._file);
            }

            // Prevent double post by disabling the button.
            this.set('uploadButtonDisabled', true);

            // Reset form
            if (this.get('shouldResetForm')) {
                this.$().closest('form')[0].reset();
            }
        }
    },

    change(event) {
        this.set('uploadButtonDisabled', false);
        this.onAdd();
        this._file = event.target.files[0];
    }
});
