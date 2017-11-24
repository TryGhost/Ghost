import Component from '@ember/component';

export default Component.extend({

    allowUnsplash: false,

    actions: {
        update() {
            let action = this.get('update');
            if (action) {
                action(...arguments);
            }
        },

        uploadStarted() {
            let action = this.get('uploadStarted');
            if (action) {
                action(...arguments);
            }
        },

        uploadFinished() {
            let action = this.get('uploadFinished');
            if (action) {
                action(...arguments);
            }
        },

        remove() {
            let action = this.get('remove');
            if (action) {
                action();
            }
        }
    }
});
