var DeleteUserController = Ember.Controller.extend({
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
                self.transitionToRoute('settings.users');
                self.notifications.showSuccess('The user has been deleted.', {delayed: true});
            }, function () {
                self.notifications.showError('The user could not be deleted. Please try again.');
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

export default DeleteUserController;
