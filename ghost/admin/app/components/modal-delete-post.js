import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    notifications: service(),

    post: alias('model.post'),
    onSuccess: alias('model.onSuccess'),

    actions: {
        confirm() {
            this.get('deletePost').perform();
        }
    },

    _deletePost() {
        let post = this.get('post');

        // definitely want to clear the data store and post of any unsaved,
        // client-generated tags
        post.updateTags();

        return post.destroyRecord();
    },

    _success() {
        // clear any previous error messages
        this.get('notifications').closeAlerts('post.delete');

        // trigger the success action
        if (this.get('onSuccess')) {
            this.get('onSuccess')();
        }
    },

    _failure(error) {
        this.get('notifications').showAPIError(error, {key: 'post.delete.failed'});
    },

    deletePost: task(function* () {
        try {
            yield this._deletePost();
            this._success();
        } catch (e) {
            this._failure(e);
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
