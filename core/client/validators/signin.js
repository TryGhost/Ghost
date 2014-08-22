var SigninValidator = Ember.Object.create({
    check: function (model) {
        var data = model.getProperties('identification', 'password'),
            validationErrors = [];

        if (!validator.isEmail(data.identification)) {
            validationErrors.push('无效的邮箱地址');
        }

        if (!validator.isLength(data.password || '', 1)) {
            validationErrors.push('请输入密码');
        }

        return validationErrors;
    }
});

export default SigninValidator;
