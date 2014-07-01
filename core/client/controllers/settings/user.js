/*global alert */
var SettingsUserController = Ember.ObjectController.extend({

    user: Ember.computed.alias('model'),

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
        return 'background-image: url(' + this.getWithDefault('user.image', '/shared/img/user-image.png') + ')';
    }.property('user.image'),

    actions: {
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
