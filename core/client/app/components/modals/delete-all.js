import Ember from 'ember';
import ModalComponent from 'ghost/components/modals/base';

const {inject} = Ember;

export default ModalComponent.extend({

    submitting: false,

    ghostPaths: inject.service('ghost-paths'),
    notifications: inject.service(),
    store: inject.service(),
    ajax: inject.service(),

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

    actions: {
        confirm() {
            this.set('submitting', true);

            this._deleteAll().then(() => {
                this._unloadData();
                this._showSuccess();
            }).catch((error) => {
                this._showFailure(error);
            }).finally(() => {
                this.send('closeModal');
            });
        }
    }
});
