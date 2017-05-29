import ModalComponent from 'ghost-admin/components/modals/base';
import injectService from 'ember-service/inject';
import {alias} from 'ember-computed';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    post: alias('model.post'),
    onSuccess: alias('model.onSuccess'),

    notifications: injectService(),
    routing: injectService('-routing'),

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
    }).drop(),

    actions: {
        confirm() {
            this.get('deletePost').perform();
        }
    }
});
