import Ember from 'ember';

const {
    Controller,
    computed
} = Ember;

export default Controller.extend({
    updateNotificationCount: 0,

    actions: {
        updateNotificationChange(count) {
            this.set('updateNotificationCount', count);
        }
    },

    copyrightYear: computed(function () {
        let date = new Date();
        return date.getFullYear();
    })
});
