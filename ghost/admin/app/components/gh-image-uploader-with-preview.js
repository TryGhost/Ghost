import Component from 'ember-component';
import {invokeAction} from 'ember-invoke-action';

export default Component.extend({

    allowUnsplash: false,

    actions: {
        update() {
            if (typeof this.attrs.update === 'function') {
                this.attrs.update(...arguments);
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

        remove() {
            invokeAction(this, 'remove');
        }
    }
});
