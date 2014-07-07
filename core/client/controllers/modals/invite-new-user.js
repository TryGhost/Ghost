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

            newUser = this.store.createRecord('user', {
                'email': email,
                'role': role_id
            });

            newUser.save().then(function () {
                var notificationText = 'Invitation sent! (' + email + ')';

                self.notifications.showSuccess(notificationText, false);
            }).fail(function (error) {
                self.notifications.closePassive();
                self.notifications.showAPIError(error);
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
