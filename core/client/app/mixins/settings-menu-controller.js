import Ember from 'ember';

export default Ember.Mixin.create({
    application: Ember.inject.controller(),

    isViewingSubview: Ember.computed('application.showSettingsMenu', function (key, value) {
        // Not viewing a subview if we can't even see the PSM
        if (!this.get('application.showSettingsMenu')) {
            return false;
        }
        if (arguments.length > 1) {
            return value;
        }

        return false;
    }),

    actions: {
        showSubview: function () {
            this.set('isViewingSubview', true);
        },

        closeSubview: function () {
            this.set('isViewingSubview', false);
        }
    }
});
