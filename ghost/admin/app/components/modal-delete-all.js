import ModalComponent from 'ghost-admin/components/modal-base';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    ghostPaths: service(),
    notifications: service(),
    store: service(),
    ajax: service(),

    actions: {
        confirm() {
            this.get('deleteAll').perform();
        }
    },

    _deleteAll() {
        let deleteUrl = this.get('ghostPaths.url').api('db');
        return this.get('ajax').del(deleteUrl);
    },

    _unloadData() {
        this.get('store').unloadAll('post');
        this.get('store').unloadAll('tag');
    },

    _showSuccess() {
        this.get('notifications').showAlert('All content deleted from database.', {type: 'success', key: 'all-content.delete.success'});
    },

    _showFailure(error) {
        this.get('notifications').showAPIError(error, {key: 'all-content.delete'});
    },

    deleteAll: task(function* () {
        try {
            yield this._deleteAll();
            this._unloadData();
            this._showSuccess();
        } catch (error) {
            this._showFailure(error);
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
