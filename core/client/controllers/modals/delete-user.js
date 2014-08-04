var DeleteUserController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var self = this,
                user = this.get('model');

            user.destroyRecord().then(function () {
                self.store.unloadAll('post');
                self.transitionToRoute('settings.users');
                self.notifications.showSuccess('The user has been deleted.', { delayed: true });
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
            buttonClass: 'button-delete'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'button'
        }
    }
});

export default DeleteUserController;
