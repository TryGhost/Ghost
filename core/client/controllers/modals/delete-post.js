var DeletePostController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var self = this,
                model = this.get('model');

            // definitely want to clear the data store and post of any unsaved, client-generated tags
            model.updateTags();

            model.destroyRecord().then(function () {
                self.get('popover').closePopovers();
                self.transitionToRoute('posts.index');
                self.notifications.showSuccess('文章已删除。', { delayed: true });
            }, function () {
                self.notifications.showError('删除文章失败。请重试。');
            });

        },

        confirmReject: function () {
            return false;
        }
    },
    confirm: {
        accept: {
            text: '删除',
            buttonClass: 'button-delete'
        },
        reject: {
            text: '取消',
            buttonClass: 'button'
        }
    }
});

export default DeletePostController;
