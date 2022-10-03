import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeleteUserModal extends Component {
    @service notifications;
    @service router;
    @service store;

    get ownerUser() {
        return this.store.peekAll('user').findBy('isOwnerOnly', true);
    }

    @task({drop: true})
    *deleteUserTask() {
        try {
            const {user} = this.args.data;

            yield user.destroyRecord();

            this.notifications.closeAlerts('user.delete');
            this.store.unloadAll('post');
            this.router.transitionTo('settings.staff');
        } catch (error) {
            this.notifications.showAlert('The user could not be deleted. Please try again.', {type: 'error', key: 'user.delete.failed'});
            throw error;
        } finally {
            this.args.close();
        }
    }
}
