var TransferOwnerController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            var user = this.get('model'),
                self = this;

            self.get('popover').closePopovers();

            // Get owner role
            this.store.find('role').then(function (result) {
                return result.findBy('name', 'Owner');
            }).then(function (ownerRole) {
                // remove roles and assign owner role
                user.get('roles').clear();
                user.get('roles').pushObject(ownerRole);

                return user.saveOnly('roles');
            }).then(function () {
                self.notifications.closePassive();
                self.notifications.showSuccess('Ownership successfully transferred to ' + user.get('name'));
            }).catch(function (errors) {
                self.notifications.closePassive();

                errors = Ember.isArray(errors) ? errors : Ember.A([errors]);
                self.notifications.showErrors(errors);
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