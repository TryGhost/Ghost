import Controller from 'ember-controller';
import computed from 'ember-computed';

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
