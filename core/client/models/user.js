import BaseModel from 'ghost/models/base';

var UserModel = BaseModel.extend({
    id: null,
    name: null,
    image: null,

    isSignedIn: Ember.computed.bool('id'),

    url: BaseModel.apiRoot + '/users/me/',
    forgottenUrl: BaseModel.apiRoot + '/forgotten/',
    resetUrl: BaseModel.apiRoot + '/reset/',

    save: function () {
        return ic.ajax.request(this.url, {
            type: 'POST',
            data: this.getProperties(Ember.keys(this))
        });
    },

    validate: function () {
        var validationErrors = [];

        if (!validator.isLength(this.get('name'), 0, 150)) {
            validationErrors.push({message: "Name is too long"});
        }

        if (!validator.isLength(this.get('bio'), 0, 200)) {
            validationErrors.push({message: "Bio is too long"});
        }

        if (!validator.isEmail(this.get('email'))) {
            validationErrors.push({message: "Please supply a valid email address"});
        }

        if (!validator.isLength(this.get('location'), 0, 150)) {
            validationErrors.push({message: "Location is too long"});
        }

        if (this.get('website').length) {
            if (!validator.isURL(this.get('website'), { protocols: ['http', 'https'], require_protocol: true }) ||
                !validator.isLength(this.get('website'), 0, 2000)) {
                validationErrors.push({message: "Please use a valid url"});
            }
        }

        if (validationErrors.length > 0) {
            this.set('isValid', false);
        } else {
            this.set('isValid', true);
        }

        this.set('errors', validationErrors);

        return this;
    },

    saveNewPassword: function (password) {
        return ic.ajax.request(BaseModel.subdir + '/ghost/changepw/', {
            type: 'POST',
            data: password
        });
    },

    validatePassword: function (password) {
        var validationErrors = [];

        if (!validator.equals(password.newPassword, password.ne2Password)) {
            validationErrors.push("Your new passwords do not match");
        }

        if (!validator.isLength(password.newPassword, 8)) {
            validationErrors.push("Your password is not long enough. It must be at least 8 characters long.");
        }

        if (validationErrors.length > 0) {
            this.set('passwordIsValid', false);
        } else {
            this.set('passwordIsValid', true);
        }

        this.set('passwordErrors', validationErrors);

        return this;
    },

    fetchForgottenPasswordFor: function (email) {
        var self = this;
        return new Ember.RSVP.Promise(function (resolve, reject) {
            if (!validator.isEmail(email)) {
                reject(new Error('Please enter a correct email address.'));
            } else {
                resolve(ic.ajax.request(self.forgottenUrl, {
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
        var self = this;
        return new Ember.RSVP.Promise(function (resolve, reject) {
            if (!self.validatePassword(passwords).get('passwordIsValid')) {
                reject(new Error('Errors found! ' + JSON.stringify(self.get('passwordErrors'))));
            } else {
                resolve(ic.ajax.request(self.resetUrl, {
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

export default UserModel;
