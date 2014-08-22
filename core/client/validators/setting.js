var SettingValidator = Ember.Object.create({
    check: function (model) {
        var validationErrors = [],
            title = model.get('title'),
            description = model.get('description'),
            email = model.get('email'),
            postsPerPage = model.get('postsPerPage');

        if (!validator.isLength(title, 0, 150)) {
            validationErrors.push({ message: '标题太长' });
        }

        if (!validator.isLength(description, 0, 200)) {
            validationErrors.push({ message: '描述太长' });
        }

        if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
            validationErrors.push({ message: '请提供一个有效的邮箱地址' });
        }

        if (!validator.isInt(postsPerPage) || postsPerPage > 1000) {
            validationErrors.push({ message: '请输入小于1000的数字' });
        }

        if (!validator.isInt(postsPerPage) || postsPerPage < 0) {
            validationErrors.push({ message: '请输入大于0的数字' });
        }

        return validationErrors;
    }
});

export default SettingValidator;
