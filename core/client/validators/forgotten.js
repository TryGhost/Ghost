var ForgotValidator = Ember.Object.create({
    check: function (model) {
        var data = model.getProperties('email'),
            validationErrors = [];

        if (!validator.isEmail(data.email)) {
            validationErrors.push({
                message: '无效的邮箱地址'
            });
        }

        return validationErrors;
    }
});

export default ForgotValidator;
