import PasswordValidator from 'ghost-admin/validators/password';

export default PasswordValidator.extend({
    init() {
        this._super(...arguments);
        this.properties = this.properties || ['name', 'email', 'password'];
    },

    name(model) {
        let name = model.get('name');

        if (!validator.isLength(name, 1)) {
            model.get('errors').add('name', 'Please enter a name.');
            this.invalidate();
        }
    },

    email(model) {
        let email = model.get('email');

        if (validator.empty(email)) {
            model.get('errors').add('email', 'Please enter an email.');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', 'Invalid Email.');
            this.invalidate();
        }
    },

    password(model) {
        this.passwordValidation(model);
    }
});
