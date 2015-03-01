define("ghost/validators/user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var UserValidator = Ember.Object.create({
        check: function (model) {
            var validator = this.validators[model.get('status')];

            if (typeof validator !== 'function') {
                return [];
            }

            return validator(model);
        },

        validators: {
            invited: function (model) {
                var validationErrors = [],
                    email = model.get('email'),
                    roles = model.get('roles');

                if (!validator.isEmail(email)) {

                    validationErrors.push({message: '请填写邮箱。'});
                }

                if (roles.length < 1) {
                    validationErrors.push({message: '请选择一个角色。'});
                }

                return validationErrors;
            },

            active: function (model) {
                var validationErrors = [],
                    name = model.get('name'),
                    bio = model.get('bio'),
                    email = model.get('email'),
                    location = model.get('location'),
                    website = model.get('website');

                if (!validator.isLength(name, 0, 150)) {

                    validationErrors.push({message: '姓名/昵称不能超过150个字'});
                }

                if (!validator.isLength(bio, 0, 200)) {
                    validationErrors.push({message: '个人简介不能超过200个字。'});
                }

                if (!validator.isEmail(email)) {
                    validationErrors.push({message: '邮箱格式不正确。'});
                }

                if (!validator.isLength(location, 0, 150)) {
                    validationErrors.push({message: '所在地不能超过150个字。' });
                }

                if (!Ember.isEmpty(website) &&
                    (!validator.isURL(website, {require_protocol: false}) ||
                    !validator.isLength(website, 0, 2000))) {

                    validationErrors.push({message: '个人网站地址格式不正确。'});
                }

                return validationErrors;
            }
        }
    });

    __exports__["default"] = UserValidator;
  });