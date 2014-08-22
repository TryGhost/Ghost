var ResetValidator = Ember.Object.create({
    check: function (model) {

        var data = model.getProperties('passwords'),
            p1 = data.passwords.newPassword,
            p2 = data.passwords.ne2Password,
            validationErrors = [];

        if (!validator.equals(p1, p2)) {
            validationErrors.push({
                message: '新输入的两个密码不一致。'
            });
        }

        if (!validator.isLength(p1, 8)) {
            validationErrors.push({
                message: '密码长度至少是8个字符。'
            });
        }
        return validationErrors;
    }
});

export default ResetValidator;
