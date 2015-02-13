import Ember from 'ember';
var UserValidator = Ember.Object.create({
    check: function (model) {
        var validator = this.validators[model.get('status')];

        if (typeof validator !== 'function') {
            return [];
        }

        return validator(model);
    },

    validators: {
        invited: function (model) {
            var validationErrors = [],
                email = model.get('email'),
                roles = model.get('roles');

            if (!validator.isEmail(email)) {
                validationErrors.push({message: 'Please supply a valid email address'});
            }

            if (roles.length < 1) {
                validationErrors.push({message: 'Please select a role'});
            }

            return validationErrors;
        },

        active: function (model) {
            var validationErrors = [],
                name = model.get('name'),
                bio = model.get('bio'),
                email = model.get('email'),
                location = model.get('location'),
                website = model.get('website');

            if (!validator.isLength(name, 0, 150)) {
                validationErrors.push({message: 'Name is too long'});
            }

            if (!validator.isLength(bio, 0, 200)) {
                validationErrors.push({message: 'Bio is too long'});
            }

            if (!validator.isEmail(email)) {
                validationErrors.push({message: 'Please supply a valid email address'});
            }

            if (!validator.isLength(location, 0, 150)) {
                validationErrors.push({message: 'Location is too long'});
            }

            if (!Ember.isEmpty(website) &&
                (!validator.isURL(website, {require_protocol: false}) ||
                !validator.isLength(website, 0, 2000))) {
                validationErrors.push({message: 'Website is not a valid url'});
            }

            return validationErrors;
        }
    }
});

export default UserValidator;
