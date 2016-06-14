import {alias} from 'ember-computed';
import injectService from 'ember-service/inject';
import ModalComponent from 'ghost-admin/components/modals/base';

export default ModalComponent.extend({

    submitting: false,

    post: alias('model'),

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

        // redirect to content screen
        this.get('routing').transitionTo('posts');
    },

    _failure(error) {
        this.get('notifications').showAPIError(error, {key: 'post.delete.failed'});
    },

    actions: {
        confirm() {
            this.set('submitting', true);

            this._deletePost().then(() => {
                this._success();
            }, (error) => {
                this._failure(error);
            }).finally(() => {
                this.send('closeModal');
            });
        }
    }
});
