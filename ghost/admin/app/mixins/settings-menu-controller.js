import Mixin from 'ember-metal/mixin';
import computed from 'ember-computed';
import injectController from 'ember-controller/inject';

export default Mixin.create({
    application: injectController(),

    isViewingSubview: computed('application.showSettingsMenu', {
        get() {
            return false;
        },
        set(key, value) {
            // Not viewing a subview if we can't even see the PSM
            if (!this.get('application.showSettingsMenu')) {
                return false;
            }
            return value;
        }
    }),

    actions: {
        showSubview() {
            this.set('isViewingSubview', true);
        },

        closeSubview() {
            this.set('isViewingSubview', false);
        }
    }
});
