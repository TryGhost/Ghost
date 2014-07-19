var InviteNewUserController = Ember.Controller.extend({

    confirm: {
        accept: {
            text: 'send invitation now'
        },
        reject: {
            buttonClass: 'hidden'
        }
    },

    // @TODO: replace with roles from server - see issue #3196
    roles: [
        {
            id: 3,
            name: 'Author'
        }
    ],

    actions: {
        confirmAccept: function () {
            var email = this.get('email'),
                role_id = this.get('role'),
                self = this,
                newUser;

            this.notifications.closePassive();

            newUser = this.store.createRecord('user', {
                email: email,
                role: role_id,
                status: 'invited'
            });

            newUser.save().then(function () {
                var notificationText = 'Invitation sent! (' + email + ')';

                self.notifications.showSuccess(notificationText, false);
            }).catch(function (errors) {
                if (errors[0].message.indexOf('Email Error:') === -1) {
                    newUser.deleteRecord();
                } else {
                    newUser.set('status', 'invited-pending');
                }

                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });

            this.set('email', null);
            this.set('role', null);

        },

        confirmReject: function () {
            return false;
        }
    }
});

export default InviteNewUserController;
