import Ember from 'ember';

export default Ember.Controller.extend({
    updateNotificationCount: 0,

    actions: {
        updateNotificationChange: function (count) {
            this.set('updateNotificationCount', count);
        }
    }
});
