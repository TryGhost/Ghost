var NewUserValidator = Ember.Object.extend({
    check: function (model) {
        var data = model.getProperties('name', 'email', 'password'),
            validationErrors = [];

        if (!validator.isLength(data.name, 1)) {
            validationErrors.push({
                message: '请输入名字。'
            });
        }

        if (!validator.isEmail(data.email)) {
            validationErrors.push({
                message: '无效的邮箱地址。'
            });
        }

        if (!validator.isLength(data.password, 8)) {
            validationErrors.push({
                message: '密码长度至少是8个字符。'
            });
        }

        return validationErrors;
    }
});

export default NewUserValidator;
