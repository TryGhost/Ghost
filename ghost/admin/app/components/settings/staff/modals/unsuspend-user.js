import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class UnsuspendUserModal extends Component {
    @service limit;
    @service notifications;
    @service router;

    @tracked hostLimitError = null;

    constructor() {
        super(...arguments);
        this.checkHostLimitsTask.perform();
    }

    @action
    upgrade() {
        this.router.transitionTo('pro');
        this.args.close();
    }

    @task
    *checkHostLimitsTask() {
        if (this.args.data.user.role.name !== 'Contributor' && this.limit.limiter.isLimited('staff')) {
            try {
                yield this.limit.limiter.errorIfWouldGoOverLimit('staff');
            } catch (error) {
                if (error.errorType === 'HostLimitError') {
                    this.hostLimitError = error.message;
                } else {
                    this.notifications.showAPIError(error, {key: 'staff.limit'});
                    this.args.close();
                }
            }
        }
    }

    @task({drop: true})
    *unsuspendUserTask() {
        try {
            const {user, saveTask} = this.args.data;

            user.status = 'active';
            yield saveTask.perform();

            this.notifications.closeAlerts('user.unsuspend');
        } catch (error) {
            this.notifications.showAlert('The user could not be unsuspended. Please try again.', {type: 'error', key: 'user.unsuspend.failed'});
            throw error;
        } finally {
            this.args.close();
        }
    }
}
