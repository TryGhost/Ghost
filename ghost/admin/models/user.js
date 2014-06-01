var User = DS.Model.extend({
    uuid: DS.attr('string'),
    name: DS.attr('string'),
    slug: DS.attr('string'),
    password: DS.attr('string'),
    email: DS.attr('string'),
    image: DS.attr('string'),
    cover: DS.attr('string'),
    bio: DS.attr('string'),
    website: DS.attr('string'),
    location: DS.attr('string'),
    accessibility: DS.attr('string'),
    status: DS.attr('string'),
    language: DS.attr('string'),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    last_login: DS.attr('date'),
    created_at: DS.attr('date'),
    created_by: DS.attr('number'),
    updated_at: DS.attr('date'),
    updated_by: DS.attr('number'),

    isSignedIn: Ember.computed.bool('id'),

    validationErrors: function () {
        var validationErrors = [];

        if (!validator.isLength(this.get('name'), 0, 150)) {
            validationErrors.push({message: 'Name is too long'});
        }

        if (!validator.isLength(this.get('bio'), 0, 200)) {
            validationErrors.push({message: 'Bio is too long'});
        }

        if (!validator.isEmail(this.get('email'))) {
            validationErrors.push({message: 'Please supply a valid email address'});
        }

        if (!validator.isLength(this.get('location'), 0, 150)) {
            validationErrors.push({message: 'Location is too long'});
        }

        if (this.get('website').length) {
            if (!validator.isURL(this.get('website'), { protocols: ['http', 'https'], require_protocol: true }) ||
                !validator.isLength(this.get('website'), 0, 2000)) {
                validationErrors.push({message: 'Please use a valid url'});
            }
        }

        return validationErrors;
    }.property('name', 'bio', 'email', 'location', 'website'),

    isValid: Ember.computed.empty('validationErrors.[]'),

    saveNewPassword: function (password) {
        var url = this.get('ghostPaths').adminUrl('changepw');
        return ic.ajax.request(url, {
            type: 'POST',
            data: password
        });
    },

    passwordValidationErrors: function (password) {
        var validationErrors = [];

        if (!validator.equals(password.newPassword, password.ne2Password)) {
            validationErrors.push('Your new passwords do not match');
        }

        if (!validator.isLength(password.newPassword, 8)) {
            validationErrors.push('Your password is not long enough. It must be at least 8 characters long.');
        }

        return validationErrors;
    },

    fetchForgottenPasswordFor: function (email) {
        var forgottenUrl = this.get('ghostPaths').apiUrl('forgotten');

        return new Ember.RSVP.Promise(function (resolve, reject) {
            if (!validator.isEmail(email)) {
                reject(new Error('Please enter a correct email address.'));
            } else {
                resolve(ic.ajax.request(forgottenUrl, {
                    type: 'POST',
                    headers: {
                        // @TODO Find a more proper way to do this.
                        'X-CSRF-Token': $('meta[name="csrf-param"]').attr('content')
                    },
                    data: {
                        email: email
                    }
                }));
            }
        });
    },

    resetPassword: function (passwords, token) {
        var self = this,
            resetUrl = this.get('ghostPaths').apiUrl('reset');

        return new Ember.RSVP.Promise(function (resolve, reject) {
            if (!self.validatePassword(passwords).get('passwordIsValid')) {
                reject(new Error('Errors found! ' + JSON.stringify(self.get('passwordErrors'))));
            } else {
                resolve(ic.ajax.request(resetUrl, {
                    type: 'POST',
                    headers: {
                        // @TODO: find a more proper way to do this.
                        'X-CSRF-Token': $('meta[name="csrf-param"]').attr('content')
                    },
                    data: {
                        newpassword: passwords.newPassword,
                        ne2password: passwords.ne2Password,
                        token: token
                    }
                }));
            }
        });
    }
});

export default User;
