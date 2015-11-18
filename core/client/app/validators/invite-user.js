import BaseValidator from './base';

export default BaseValidator.create({
    properties: ['email'],

    email(model) {
        let email = model.get('email');

        if (validator.empty(email)) {
            model.get('errors').add('email', 'Please enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', 'Invalid Email.');
            this.invalidate();
        }
    }
});
