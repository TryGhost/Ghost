import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    notifications: service(),

    member: alias('model.member'),
    onSuccess: alias('model.onSuccess'),

    actions: {
        confirm() {
            this.deleteMember.perform();
        }
    },

    _success() {
        // clear any previous error messages
        this.notifications.closeAlerts('post.delete');

        // trigger the success action
        if (this.onSuccess) {
            this.onSuccess();
        }
    },

    _failure(error) {
        this.notifications.showAPIError(error, {key: 'post.delete.failed'});
    },

    deleteMember: task(function* () {
        try {
            yield this.member.destroyRecord();
            this._success();
        } catch (e) {
            this._failure(e);
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
