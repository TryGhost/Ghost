var DeleteUserController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var self = this,
                user = this.get('model');

            user.destroyRecord().then(function () {
                self.store.unloadAll('post');
                self.transitionToRoute('settings.users');
                self.notifications.showSuccess('用户已被删除。', { delayed: true });
            }, function () {
                self.notifications.showError('删除用户失败。请重试。');
            });

        },

        confirmReject: function () {
            return false;
        }
    },
    confirm: {
        accept: {
            text: '删除用户',
            buttonClass: 'button-delete'
        },
        reject: {
            text: '取消',
            buttonClass: 'button'
        }
    }
});

export default DeleteUserController;
