import Ember from 'ember';
var SigninValidator = Ember.Object.create({
    check: function (model) {
        var data = model.getProperties('identification', 'password'),
            validationErrors = [];

        if (!validator.isEmail(data.identification)) {
            validationErrors.push('邮箱格式不正确');
        }

        if (!validator.isLength(data.password || '', 1)) {
            validationErrors.push('请输入密码');
        }

        return validationErrors;
    }
});

export default SigninValidator;
