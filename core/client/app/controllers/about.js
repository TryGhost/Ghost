import Ember from 'ember';
var AboutController = Ember.Controller.extend({
    updateNotificationCount: 0,

    actions: {
        updateNotificationChange: function (count) {
            this.set('updateNotificationCount', count);
        }
    }
});

export default AboutController;
