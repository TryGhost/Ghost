import BaseValidator from './base';

export default BaseValidator.create({
    properties: ['identification', 'signin', 'forgotPassword'],
    invalidMessage: 'Email address is not valid',

    identification(model) {
        let id = model.get('identification');

        if (!validator.empty(id) && !validator.isEmail(id)) {
            model.get('errors').add('identification', this.get('invalidMessage'));
            this.invalidate();
        }
    },

    signin(model) {
        let id = model.get('identification');
        let password = model.get('password');

        model.get('errors').clear();

        if (validator.empty(id)) {
            model.get('errors').add('identification', 'Please enter an email');
            this.invalidate();
        }

        if (!validator.empty(id) && !validator.isEmail(id)) {
            model.get('errors').add('identification', this.get('invalidMessage'));
            this.invalidate();
        }

        if (validator.empty(password)) {
            model.get('errors').add('password', 'Please enter a password');
            this.invalidate();
        }
    },

    forgotPassword(model) {
        let id = model.get('identification');

        model.get('errors').clear();

        if (validator.empty(id) || !validator.isEmail(id)) {
            model.get('errors').add('identification', this.get('invalidMessage'));
            this.invalidate();
        }
    }
});
