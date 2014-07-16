var SetupValidator = Ember.Object.create({
    check: function (model) {
        var data = model.getProperties('blogTitle', 'name', 'email', 'password'),
            validationErrors = [];

        if (!validator.isLength(data.blogTitle, 1)) {
            validationErrors.push({
                message: 'Please enter a blog title.'
            });
        }

        if (!validator.isLength(data.name, 1)) {
            validationErrors.push({
                message: 'Please enter a name.'
            });
        }

        if (!validator.isEmail(data.email)) {
            validationErrors.push({
                message: 'Invalid Email.'
            });
        }

        if (!validator.isLength(data.password, 8)) {
            validationErrors.push({
                message: 'Password must be at least 8 characters long.'
            });
        }

        return validationErrors;
    }
});

export default SetupValidator;
