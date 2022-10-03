import Component from '@glimmer/component';
import {isArray} from '@ember/array';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class TransferOwnershipModal extends Component {
    @service ajax;
    @service dropdown;
    @service ghostPaths;
    @service notifications;
    @service store;

    @task({drop: true})
    *transferOwnershipTask() {
        try {
            this.dropdown.closeDropdowns();

            const {user} = this.args.data;
            const url = this.ghostPaths.url.api('users', 'owner');

            const response = yield this.ajax.put(url, {
                data: {
                    owner: [{
                        id: user.id
                    }]
                }
            });

            // manually update the roles for the users that just changed roles
            // because store.pushPayload is not working with embedded relations
            if (isArray(response?.users)) {
                response.users.forEach((userJSON) => {
                    const updatedUser = this.store.peekRecord('user', userJSON.id);
                    const role = this.store.peekRecord('role', userJSON.roles[0].id);

                    updatedUser.role = role;
                });
            }

            this.notifications.showAlert(`Ownership successfully transferred to ${user.get('name')}`, {type: 'success', key: 'owner.transfer.success'});
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'owner.transfer'});
            throw error;
        } finally {
            this.args.close();
        }
    }
}
