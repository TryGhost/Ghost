var InviteNewUserController = Ember.Controller.extend({

    confirm: {
        accept: {
            text: 'send invitation now'
        },
        reject: {
            buttonClass: 'hidden'
        }
    },

    roles: Ember.computed(function () {
        var roles = {},
            self = this;

        roles.promise = this.store.find('role', { permissions: 'assign' }).then(function (roles) {
            return roles.rejectBy('name', 'Owner').sortBy('id');
        }).then(function (roles) {
            // After the promise containing the roles has been resolved and the array
            // has been sorted, explicitly set the selectedRole for the Ember.Select.
            // The explicit set is needed because the data-select-text attribute is
            // not being set until a change is made in the dropdown list.
            // This is only required with Ember.Select when it is bound to async data.
            self.set('selectedRole', roles.get('firstObject'));

            return roles;
        });

        return Ember.ArrayProxy.extend(Ember.PromiseProxyMixin).create(roles);
    }),

    actions: {
        confirmAccept: function () {
            var email = this.get('email'),
                role_id = this.get('role'),
                self = this,
                newUser,
                role;

            newUser = self.store.createRecord('user', {
                email: email,
                status: 'invited'
            });

            // no need to make an API request, the store will already have this role
            role = self.store.getById('role', role_id);

            newUser.get('roles').pushObject(role);

            newUser.save().then(function () {
                var notificationText = 'Invitation sent! (' + email + ')';

                self.notifications.closePassive();

                // If sending the invitation email fails, the API will still return a status of 201
                // but the user's status in the response object will be 'invited-pending'.
                if (newUser.get('status') === 'invited-pending') {
                    self.notifications.showWarn('Invitation email was not sent.  Please try resending.');
                }
                else {
                    self.notifications.showSuccess(notificationText, false);
                }
            }).catch(function (errors) {
                newUser.deleteRecord();
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });

            self.set('email', null);
            self.set('role', null);
        },

        confirmReject: function () {
            return false;
        }
    }
});

export default InviteNewUserController;
