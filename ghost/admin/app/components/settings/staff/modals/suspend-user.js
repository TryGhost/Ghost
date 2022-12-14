import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class SuspendUserModal extends Component {
    @service notifications;

    @task({drop: true})
    *suspendUserTask() {
        try {
            const {user, saveTask} = this.args.data;

            user.status = 'inactive';
            yield saveTask.perform();

            this.notifications.closeAlerts('user.suspend');
        } catch (error) {
            this.notifications.showAlert('The user could not be suspended. Please try again.', {type: 'error', key: 'user.suspend.failed'});
            throw error;
        } finally {
            this.args.close();
        }
    }
}
