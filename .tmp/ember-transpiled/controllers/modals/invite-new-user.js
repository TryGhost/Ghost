define("ghost/controllers/modals/invite-new-user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var InviteNewUserController = Ember.Controller.extend({
        // Used to set the initial value for the dropdown
        authorRole: Ember.computed(function () {
            var self = this;

            return this.store.find('role').then(function (roles) {
                var authorRole = roles.findBy('name', 'Author');

                // Initialize role as well.
                self.set('role', authorRole);
                self.set('authorRole', authorRole);

                return authorRole;
            });
        }),

        confirm: {
            accept: {
                text: '立即发送邀请函'
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

                // reset the form and close the modal
                self.set('email', '');
                self.set('role', self.get('authorRole'));
                self.send('closeModal');

                this.store.find('user').then(function (result) {
                    var invitedUser = result.findBy('email', email);

                    if (invitedUser) {
                        if (invitedUser.get('status') === 'invited' || invitedUser.get('status') === 'invited-pending') {
                            self.notifications.showWarn('你已邀请过这个用户。');
                        } else {
                            self.notifications.showWarn('邮箱地址已存在。');
                        }
                    } else {
                        newUser = self.store.createRecord('user', {
                            email: email,
                            status: 'invited',
                            role: role
                        });

                        newUser.save().then(function () {
                            var notificationText = '邀请邮件发送成功！(' + email + ')';

                            // If sending the invitation email fails, the API will still return a status of 201
                            // but the user's status in the response object will be 'invited-pending'.
                            if (newUser.get('status') === 'invited-pending') {
                                self.notifications.showWarn('邀请邮件发送失败,请重试。（ 反馈QQ群: 335978388 ）');
                            } else {
                                self.notifications.showSuccess(notificationText);
                            }
                        }).catch(function (errors) {
                            newUser.deleteRecord();
                            self.notifications.showErrors(errors);
                        });
                    }
                });
            },

            confirmReject: function () {
                return false;
            }
        }
    });

    __exports__["default"] = InviteNewUserController;
  });