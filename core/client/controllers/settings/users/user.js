/*global alert */
var SettingsUserController = Ember.ObjectController.extend({

    user: Ember.computed.alias('model'),

    email: Ember.computed.readOnly('user.email'),

    coverDefault: '/shared/img/user-cover.png',

    cover: function () {
        // @TODO: add {{asset}} subdir path
        var cover = this.get('user.cover');
        if (typeof cover !== 'string') {
            cover = this.get('coverDefault');
        }
        return cover;
    }.property('user.cover', 'coverDefault'),

    coverTitle: function () {
        return this.get('user.name') + '\'s Cover Image';
    }.property('user.name'),

    image: function () {
        // @TODO: add {{asset}} subdir path
        return  'background-image: url(' + this.getWithDefault('user.image', '/shared/img/user-image.png') + ')';
    }.property('user.image'),

    imageUrl: function () {
        // @TODO: add {{asset}} subdir path
        return  this.getWithDefault('user.image', '/shared/img/user-image.png');
    }.property('user.image'),

    last_login: function () {
        return moment(this.get('user.last_login')).fromNow();
    }.property('user.last_login'),

    created_at: function () {
        return moment(this.get('user.created_at')).fromNow();
    }.property('user.created_at'),

    actions: {
        revoke: function () {
            var self = this,
                email = this.get('email');

            this.get('model').destroyRecord().then(function () {
                var notificationText = 'Invitation revoked. (' + email + ')';
                self.notifications.showSuccess(notificationText, false);
            }).catch(function (error) {
                self.notifications.closePassive();
                self.notifications.showAPIError(error);
            });
        },

        resend: function () {
            var self = this;

            this.get('model').resendInvite().then(function () {
                var notificationText = 'Invitation resent! (' + self.get('email') + ')';
                self.notifications.showSuccess(notificationText, false);
            }).catch(function (error) {
                self.notifications.closePassive();
                self.notifications.showAPIError(error);
            });
        },

        save: function () {
            var user = this.get('user'),
                self = this;

            self.notifications.closePassive();

            alert('@TODO: Saving user...');

            if (user.validate().get('isValid')) {
                user.save().then(function (response) {
                    alert('Done saving' + JSON.stringify(response));
                }, function () {
                    alert('Error saving.');
                });
            } else {
                alert('Errors found! ' + JSON.stringify(user.get('errors')));
            }
        },

        password: function () {
            alert('@TODO: Changing password...');
            var user = this.get('user'),
                passwordProperties = this.getProperties('password', 'newPassword', 'ne2Password');

            if (user.validatePassword(passwordProperties).get('passwordIsValid')) {
                user.saveNewPassword(passwordProperties).then(function () {
                    alert('Success!');
                    // Clear properties from view
                    this.setProperties({
                        'password': '',
                        'newpassword': '',
                        'ne2password': ''
                    });
                }.bind(this), function (errors) {
                    alert('Errors ' + JSON.stringify(errors));
                });
            } else {
                alert('Errors found! ' + JSON.stringify(user.get('passwordErrors')));
            }
        }
    }

});

export default SettingsUserController;
