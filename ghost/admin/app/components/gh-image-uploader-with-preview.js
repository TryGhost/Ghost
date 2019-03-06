import Component from '@ember/component';

export default Component.extend({

    allowUnsplash: false,

    actions: {
        update() {
            let action = this.update;
            if (action) {
                action(...arguments);
            }
        },

        uploadStarted() {
            let action = this.uploadStarted;
            if (action) {
                action(...arguments);
            }
        },

        uploadFinished() {
            let action = this.uploadFinished;
            if (action) {
                action(...arguments);
            }
        },

        remove() {
            let action = this.remove;
            if (action) {
                action();
            }
        }
    }
});
