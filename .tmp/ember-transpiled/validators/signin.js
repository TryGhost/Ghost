define("ghost/validators/signin", 
  ["exports"],
  function(__exports__) {
    "use strict";
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

    __exports__["default"] = SigninValidator;
  });