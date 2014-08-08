var InviteNewUserController = Ember.Controller.extend({
    //Used to set the initial value for the dropdown
    authorRole: Ember.computed(function () {
        var self = this;
        return this.store.find('role').then(function (roles) {
            var authorRole = roles.findBy('name', 'Author');
            //Initialize role as well.
            self.set('role', authorRole);
            self.set('authorRole', authorRole);
            return authorRole;
        });
    }),
    
    confirm: {
        accept: {
            text: 'send invitation now'
        },
        reject: {
            buttonClass: 'hidden'
        }
    },
        
    actions: {
        setRole: function (role) {
            this.set('role', role);
        },

        confirmAccept: function () {
            var email = this.get('email'),
                role = this.get('role'),
                self = this,
                newUser,
                invitedUser,
                invitedStatus;

            // reset the form and close the modal
            self.set('email', '');
            self.set('role', self.get('authorRole'));
            self.send('closeModal');

            //Check if we're inviting a known user
            this.store.find('user').then(function (result) {
                invitedUser = result.findBy('email', email);
                invitedStatus = invitedUser ? invitedUser.get('status') : undefined;

                if (invitedUser && (invitedStatus === 'invited-pending' || invitedStatus === 'invited')) {
                    invitedUser.set('role', role);
                    return invitedUser.resendInvite();
                } else {
                    newUser = self.store.createRecord('user', {
                        email: email,
                        status: 'invited',
                        role: role
                    });
                    return newUser.save();
                }
            }).then(function (result) {
                var notificationText = 'Invitation resent! (' + email + ')';

                // If sending the invitation email fails, the API will still return a status of 201
                // but the user's status in the response object will be 'invited-pending'.
                if (result.users && result.users[0].status === 'invited-pending') {
                    self.notifications.showWarn('Invitation email was not sent.  Please try resending.');
                } else if (newUser && newUser.get('status') === 'invited-pending') {
                    self.notifications.showWarn('Invitation email was not sent.  Please try resending.');
                } else {
                    if (invitedUser) {
                        invitedUser.set('status', result.users[0].status);
                    }
                    self.notifications.showSuccess(notificationText);
                }
            }).catch(function (error) {
                if (newUser) {
                    newUser.destroyRecord();
                }
                self.notifications.showAPIError(error);
            });
        },

        confirmReject: function () {
            return false;
        }
    }
});

export default InviteNewUserController;
