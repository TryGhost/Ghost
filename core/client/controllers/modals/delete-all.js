var DeleteAllController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var self = this;

            ic.ajax.request(this.get('ghostPaths.url').api('db'), {
                type: 'DELETE'
            }).then(function () {
                self.notifications.showSuccess('删除成功');
                self.store.unloadAll('post');
                self.store.unloadAll('tag');
            }).catch(function (response) {
                self.notifications.showErrors(response);
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

export default DeleteAllController;
