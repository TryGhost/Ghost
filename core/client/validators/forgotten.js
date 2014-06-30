var ForgotValidator = Ember.Object.create({
    check: function (model) {
        var data = model.getProperties('email'),
            validationErrors = [];

        if (!validator.isEmail(data.email)) {
            validationErrors.push({
                message: 'Invalid Email'
            });
        }

        return validationErrors;
    }
});

export default ForgotValidator;
