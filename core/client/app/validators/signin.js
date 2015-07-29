import BaseValidator from './base';

var SigninValidator = BaseValidator.create({
    properties: ['identification', 'password'],
    identification: function (model) {
        var id = model.get('identification');

        if (validator.empty(id)) {
            model.get('errors').add('identification', 'Please enter an email');
            this.invalidate();
        } else if (!validator.isEmail(id)) {
            model.get('errors').add('identification', 'Invalid email');
            this.invalidate();
        }
    },
    password: function (model) {
        var password = model.get('password') || '';

        if (!validator.isLength(password, 1)) {
            model.get('errors').add('password', 'Please enter a password');
            this.invalidate();
        }
    }
});

export default SigninValidator;
