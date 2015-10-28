import Ember from 'ember';

const {Controller, PromiseProxyMixin, computed, inject} = Ember;
const {alias} = computed;

export default Controller.extend({
    notifications: inject.service(),

    userPostCount: computed('model.id', function () {
        let query = {
            filter: `author:${this.get('model.slug')}`,
            status: 'all'
        };

        let promise = this.store.query('post', query).then((results) => {
            return results.meta.pagination.total;
        });

        return Ember.Object.extend(PromiseProxyMixin, {
            count: alias('content'),

            inflection: computed('count', function () {
                return this.get('count') > 1 ? 'posts' : 'post';
            })
        }).create({promise});
    }),

    confirm: {
        accept: {
            text: 'Delete User',
            buttonClass: 'btn btn-red'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'btn btn-default btn-minor'
        }
    },

    actions: {
        confirmAccept() {
            let user = this.get('model');

            user.destroyRecord().then(() => {
                this.get('notifications').closeAlerts('user.delete');
                this.store.unloadAll('post');
                this.transitionToRoute('team');
            }, () => {
                this.get('notifications').showAlert('The user could not be deleted. Please try again.', {type: 'error', key: 'user.delete.failed'});
            });
        },

        confirmReject() {
            return false;
        }
    }
});
