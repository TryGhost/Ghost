import Ember from 'ember';

export default Ember.Component.extend({
    _file: null,

    uploadButtonText: 'Text',

    uploadButtonDisabled: true,

    onUpload: null,
    onAdd: null,

    shouldResetForm: true,

    change: function (event) {
        this.set('uploadButtonDisabled', false);
        this.sendAction('onAdd');
        this._file = event.target.files[0];
    },

    actions: {
        upload: function () {
            if (!this.get('uploadButtonDisabled') && this._file) {
                this.sendAction('onUpload', this._file);
            }

            // Prevent double post by disabling the button.
            this.set('uploadButtonDisabled', true);

            // Reset form
            if (this.get('shouldResetForm')) {
                this.$().closest('form').get(0).reset();
            }
        }
    }
});
