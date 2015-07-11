import BaseValidator from './base';

var NewUserValidator = BaseValidator.extend({
    properties: ['name', 'email', 'password'],

    name: function (model) {
        var name = model.get('name');

        if (!validator.isLength(name, 1)) {
            model.get('errors').add('name', 'Please enter a name.');
            this.invalidate();
        }
    },
    email: function (model) {
        var email = model.get('email');

        if (validator.empty(email)) {
            model.get('errors').add('email', 'Please enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', 'Invalid Email.');
            this.invalidate();
        }
    },
    password: function (model) {
        var password = model.get('password');

        if (!validator.isLength(password, 8)) {
            model.get('errors').add('password', 'Password must be at least 8 characters long');
            this.invalidate();
        }
    }
});

export default NewUserValidator;
