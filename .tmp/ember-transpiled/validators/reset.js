define("ghost/validators/reset", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ResetValidator = Ember.Object.create({
        check: function (model) {
            var p1 = model.get('newPassword'),
                p2 = model.get('ne2Password'),
                validationErrors = [];

            if (!validator.equals(p1, p2)) {
                validationErrors.push({
                    message: '两次输入的新密码不一致。'
                });
            }

            if (!validator.isLength(p1, 8)) {
                validationErrors.push({
                    message: '新密码至少要8个字符。'
                });
            }
            return validationErrors;
        }
    });

    __exports__["default"] = ResetValidator;
  });