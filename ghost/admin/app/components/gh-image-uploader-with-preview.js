import Component from 'ember-component';

export default Component.extend({
    actions: {
        update() {
            if (typeof this.attrs.update === 'function') {
                this.attrs.update(...arguments);
            }
        },

        onInput() {
            if (typeof this.attrs.onInput === 'function') {
                this.attrs.onInput(...arguments);
            }
        },

        uploadStarted() {
            if (typeof this.attrs.uploadStarted === 'function') {
                this.attrs.uploadStarted(...arguments);
            }
        },

        uploadFinished() {
            if (typeof this.attrs.uploadFinished === 'function') {
                this.attrs.uploadFinished(...arguments);
            }
        },

        formChanged() {
            if (typeof this.attrs.formChanged === 'function') {
                this.attrs.formChanged(...arguments);
            }
        }
    }
});
