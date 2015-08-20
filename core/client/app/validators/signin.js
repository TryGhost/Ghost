import BaseValidator from './base';

var SigninValidator = BaseValidator.create({
    properties: ['identification', 'signin', 'forgotPassword'],

    identification: function (model) {
        var id = model.get('identification');

        if (!validator.empty(id) && !validator.isEmail(id)) {
            model.get('errors').add('identification', 'Invalid email');
            this.invalidate();
        }
    },

    signin: function (model) {
        var id = model.get('identification'),
            password = model.get('password');

        model.get('errors').clear();

        if (validator.empty(id)) {
            model.get('errors').add('identification', '');
            this.invalidate();
        }

        if (validator.empty(password)) {
            model.get('errors').add('password', '');
            this.invalidate();
        }
    },

    forgotPassword: function (model) {
        var id = model.get('identification');

        model.get('errors').clear();

        if (validator.empty(id) || !validator.isEmail(id)) {
            model.get('errors').add('identification', '');
            this.invalidate();
        }
    }
});

export default SigninValidator;
