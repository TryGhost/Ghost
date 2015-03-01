define("ghost/validators/setting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingValidator = Ember.Object.create({
        check: function (model) {
            var validationErrors = [],
                title = model.get('title'),
                description = model.get('description'),
                email = model.get('email'),
                postsPerPage = model.get('postsPerPage');

            if (!validator.isLength(title, 0, 150)) {

                validationErrors.push({message: '博客名称太长了(150字以内)'});
            }

            if (!validator.isLength(description, 0, 200)) {
                validationErrors.push({message: '博客简介太长了(200字以内)'});
            }

            if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
                validationErrors.push({message: '邮箱格式不正确'});
            }

            if (postsPerPage > 1000) {
                validationErrors.push({message: '每页最多显示1000个博文'});
            }

            if (postsPerPage < 1) {
                validationErrors.push({message: '每页至少显示1个博文'});
            }

            if (!validator.isInt(postsPerPage)) {
                validationErrors.push({message: '每页显示博文数量应为数字'});
            }

            return validationErrors;
        }
    });

    __exports__["default"] = SettingValidator;
  });