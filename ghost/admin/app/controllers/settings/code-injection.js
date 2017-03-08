import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import {task} from 'ember-concurrency';

export default Controller.extend({
    notifications: injectService(),

    save: task(function* () {
        let notifications = this.get('notifications');

        try {
            return yield this.get('model').save();
        } catch (error) {
            notifications.showAPIError(error, {key: 'code-injection.save'});
            throw error;
        }
    })
});
