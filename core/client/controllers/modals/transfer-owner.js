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
            }).then(function () {
                self.notifications.closePassive();
                self.notifications.showSuccess('Ownership successfully transferred to ' + user.get('name'));
            }).catch(function (error) {
                self.notifications.closePassive();
                self.notifications.showAPIError(error);
            });
        },

        confirmReject: function () {
            return false;
        }
    },

    confirm: {
        accept: {
            text: 'YEP - I\'M SURE',
            buttonClass: 'button-delete'
        },
        reject: {
            text: 'CANCEL',
            buttonClass: 'button'
        }
    }
});

export default TransferOwnerController;