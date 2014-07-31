var InviteNewUserController = Ember.Controller.extend({
    //Used to set the initial value for the dropdown
    authorRole: Ember.computed(function () {
        var self = this;
        return this.store.find('role').then(function (roles) {
            var authorRole = roles.findBy('name', 'Author');
            //Initialize role as well.
            self.set('role', authorRole);
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
                newUser;

            newUser = self.store.createRecord('user', {
                email: email,
                status: 'invited',
                role: role
            });

            newUser.save().then(function () {
                var notificationText = 'Invitation sent! (' + email + ')';

                self.notifications.closePassive();

                // If sending the invitation email fails, the API will still return a status of 201
                // but the user's status in the response object will be 'invited-pending'.
                if (newUser.get('status') === 'invited-pending') {
                    self.notifications.showWarn('Invitation email was not sent.  Please try resending.');
                } else {
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
