var DeletePostController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var self = this,
                model = this.get('model');

            // definitely want to clear the data store and post of any unsaved, client-generated tags
            model.updateTags();

            model.destroyRecord().then(function () {
                self.get('dropdown').closeDropdowns();
                self.transitionToRoute('posts.index');
                self.notifications.showSuccess('删除成功', {delayed: true});
            }, function () {
                self.notifications.showError('删除失败,请重试');
            });
        },

        confirmReject: function () {
            return false;
        }
    },

    confirm: {
        accept: {
            text: '确认删除',
            buttonClass: 'btn btn-red'
        },
        reject: {
            text: '取消操作',
            buttonClass: 'btn btn-default btn-minor'
        }
    }
});

export default DeletePostController;
