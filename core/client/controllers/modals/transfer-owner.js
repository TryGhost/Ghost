var TransferOwnerController = Ember.Controller.extend({

    actions: {
        confirmAccept: function () {
            var user = this.get('model'),
                self = this;

            // Get owner role
            this.store.find('role').then(function (result) {
                return result.findBy('name', 'Owner');
            }).then(function (ownerRole) {
                // remove roles and assign owner role
                user.get('roles').clear();
                user.get('roles').pushObject(ownerRole);
                return user.save({ format: false });
            }).then(function (model) {
                self.notifications.closePassive();
                self.notifications.showSuccess('Settings successfully saved.');
                return model;
            }).catch(function (errors) {
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            }).finally(function () {
                self.get('popover').closePopovers();
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