import Ember from 'ember';

export default Ember.Controller.extend({
    notifications: Ember.inject.service(),

    userPostCount: Ember.computed('model.id', function () {
        var promise,
            query = {
                author: this.get('model.slug'),
                status: 'all'
            };

        promise = this.store.find('post', query).then(function (results) {
            return results.meta.pagination.total;
        });

        return Ember.Object.extend(Ember.PromiseProxyMixin, {
            count: Ember.computed.alias('content'),

            inflection: Ember.computed('count', function () {
                return this.get('count') > 1 ? 'posts' : 'post';
            })
        }).create({promise: promise});
    }),

    actions: {
        confirmAccept: function () {
            var self = this,
                user = this.get('model');

            user.destroyRecord().then(function () {
                self.store.unloadAll('post');
                self.transitionToRoute('team');
            }, function () {
                self.get('notifications').showAlert('The user could not be deleted. Please try again.', {type: 'error'});
            });
        },

        confirmReject: function () {
            return false;
        }
    },

    confirm: {
        accept: {
            text: 'Delete User',
            buttonClass: 'btn btn-red'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'btn btn-default btn-minor'
        }
    }
});
