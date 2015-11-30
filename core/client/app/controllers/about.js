import Ember from 'ember';

const {Controller} = Ember;

export default Controller.extend({
    updateNotificationCount: 0,

    actions: {
        updateNotificationChange(count) {
            this.set('updateNotificationCount', count);
        }
    }
});
