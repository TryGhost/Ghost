import ModalComponent from 'ghost-admin/components/modal-base';
import {fetch} from 'fetch';
import {not} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    notifications: service(),

    isChecked: false,
    isConfirmDisabled: not('isChecked'),

    actions: {
        toggleCheckbox() {
            set(this, 'isChecked', !this.isChecked);
        },
        confirm() {
            this.deletePost.perform();
        }
    },

    async _resetPasswords() {
        const res = await fetch('/ghost/api/admin/authentication/global_password_reset/', {
            method: 'POST'
        });
        if (res.status < 200 || res.status >= 300) {
            throw new Error('api failed ' + res.status + ' ' + res.statusText);
        }
    },

    _failure(error) {
        this.notifications.showAPIError(error, {key: 'user.resetAllPasswords.failed'});
    },

    resetPasswords: task(function* () {
        try {
            yield this._resetPasswords();
            window.location = window.location.href.split('#')[0];
        } catch (e) {
            this._failure(e);
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
