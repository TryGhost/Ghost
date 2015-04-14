import Ember from 'ember';
var NewUserValidator = Ember.Object.extend({
    check: function (model) {
        var data = model.getProperties('name', 'email', 'password'),
            validationErrors = [];

        if (!validator.isLength(data.name, 1)) {
            validationErrors.push({
                message: '请填写姓名/昵称。'
            });
        }

        if (!validator.isEmail(data.email)) {
            validationErrors.push({
                message: '邮箱格式不正确。'
            });
        }

        if (!validator.isLength(data.password, 8)) {
            validationErrors.push({
                message: '密码至少要8个字符。'
            });
        }

        return validationErrors;
    }
});

export default NewUserValidator;
