var TransferOwnerController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var user = this.get('model'),
                url = this.get('ghostPaths.url').api('users', 'owner'),
                self = this;

            self.get('popover').closePopovers();

            ic.ajax.request(url, {
                type: 'PUT',
                data: {
                    owner: [{
                        'id': user.get('id')
                    }]
                }
            }).then(function (response) {
                // manually update the roles for the users that just changed roles
                // because store.pushPayload is not working with embedded relations
                if (response && Ember.isArray(response.users)) {
                    response.users.forEach(function (userJSON) {
                        var user = self.store.getById('user', userJSON.id),
                            role = self.store.getById('role', userJSON.roles[0].id);

                        user.set('role', role);
                    });
                }

                self.notifications.showSuccess('博客所有权已经成功转移给 ' + user.get('name'));
            }).catch(function (error) {
                self.notifications.showAPIError(error);
            });
        },

        confirmReject: function () {
            return false;
        }
    },

    confirm: {
        accept: {
            text: '是的 - 我确定',
            buttonClass: 'button-delete'
        },
        reject: {
            text: '取消',
            buttonClass: 'button'
        }
    }
});

export default TransferOwnerController;