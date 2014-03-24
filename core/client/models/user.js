import BaseModel from 'ghost/models/base';

var UserModel = BaseModel.extend({
    url: BaseModel.apiRoot + '/users/me/',

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
            if (!validator.isURL(this.get('website')) ||
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

        if (!validator.equals(password.newpassword, password.ne2password)) {
            validationErrors.push("Your new passwords do not match");
        }

        if (!validator.isLength(password.newpassword, 8)) {
            validationErrors.push("Your password is not long enough. It must be at least 8 characters long.");
        }

        if (validationErrors.length > 0) {
            this.set('passwordIsValid', false);
        } else {
            this.set('passwordIsValid', true);
        }

        this.set('passwordErrors', validationErrors);

        return this;
    }
});

export default UserModel;