var SignupValidator = Ember.Object.create({
    check: function (model) {
        var data = model.getProperties('name', 'email', 'password'),
            validationErrors = [];

        if (!validator.isLength(data.name || '', 1)) {
            validationErrors.push({
                message: 'Please enter a name.'
            });
        }

        if (!validator.isEmail(data.email)) {
            validationErrors.push({
                message: 'Invalid Email.'
            });
        }

        if (!validator.isLength(data.password || '', 1)) {
            validationErrors.push({
                message: 'Please enter a password.'
            });
        }

        return validationErrors;
    }
});

export default SignupValidator;
