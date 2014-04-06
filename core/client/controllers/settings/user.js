/*global alert */

var SettingsUserController = Ember.Controller.extend({
    cover: function () {
        // @TODO: add {{asset}} subdir path
        return this.user.getWithDefault('cover', '/shared/img/user-cover.png');
    }.property('user.cover'),

    coverTitle: function () {
        return this.get('user.name') + '\'s Cover Image';
    }.property('user.name'),

    image: function () {
        // @TODO: add {{asset}} subdir path
        return 'background-image: url(' + this.user.getWithDefault('image', '/shared/img/user-image.png') + ')';
    }.property('user.image'),

    actions: {
        save: function () {
            alert('@TODO: Saving user...');

            if (this.user.validate().get('isValid')) {
                this.user.save().then(function (response) {
                    alert('Done saving' + JSON.stringify(response));
                }, function () {
                    alert('Error saving.');
                });
            } else {
                alert('Errors found! ' + JSON.stringify(this.user.get('errors')));
            }
        },

        password: function () {
            alert('@TODO: Changing password...');
            var passwordProperties = this.getProperties('password', 'newPassword', 'ne2Password');

            if (this.user.validatePassword(passwordProperties).get('passwordIsValid')) {
                this.user.saveNewPassword(passwordProperties).then(function () {
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
                alert('Errors found! ' + JSON.stringify(this.user.get('passwordErrors')));
            }
        }
    }

});

export default SettingsUserController;