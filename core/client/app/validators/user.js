import BaseValidator from './base';
import Ember from 'ember';

var UserValidator = BaseValidator.create({
    properties: ['name', 'bio', 'email', 'location', 'website', 'roles'],
    isActive: function (model) {
        return (model.get('status') === 'active');
    },
    name: function (model) {
        var name = model.get('name');

        if (this.isActive(model)) {
            if (validator.empty(name)) {
                model.get('errors').add('name', 'Please enter a name.');
                this.invalidate();
            } else if (!validator.isLength(name, 0, 150)) {
                model.get('errors').add('name', 'Name is too long');
                this.invalidate();
            }
        }
    },
    bio: function (model) {
        var bio = model.get('bio');

        if (this.isActive(model)) {
            if (!validator.isLength(bio, 0, 200)) {
                model.get('errors').add('bio', 'Bio is too long');
                this.invalidate();
            }
        }
    },
    email: function (model) {
        var email = model.get('email');

        if (!validator.isEmail(email)) {
            model.get('errors').add('email', 'Please supply a valid email address');
            this.invalidate();
        }
    },
    location: function (model) {
        var location = model.get('location');

        if (this.isActive(model)) {
            if (!validator.isLength(location, 0, 150)) {
                model.get('errors').add('location', 'Location is too long');
                this.invalidate();
            }
        }
    },
    website: function (model) {
        var website = model.get('website');

        if (this.isActive(model)) {
            if (!Ember.isEmpty(website) &&
                (!validator.isURL(website, {require_protocol: false}) ||
                !validator.isLength(website, 0, 2000))) {
                model.get('errors').add('website', 'Website is not a valid url');
                this.invalidate();
            }
        }
    },
    roles: function (model) {
        if (!this.isActive(model)) {
            var roles = model.get('roles');

            if (roles.length < 1) {
                model.get('errors').add('role', 'Please select a role');
                this.invalidate();
            }
        }
    }
});

export default UserValidator;
