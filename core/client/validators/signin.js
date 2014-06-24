var SigninValidator = Ember.Object.create({
    validate: function (model) {
        var data = model.getProperties('email', 'password'),
            validationErrors = [];

        if (!validator.isEmail(data.email)) {
            validationErrors.push('Invalid Email');
        }

        if (!validator.isLength(data.password || '', 1)) {
            validationErrors.push('Please enter a password');
        }

        return validationErrors;
    }
});

export default SigninValidator;
