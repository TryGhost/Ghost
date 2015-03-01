define("ghost/validators/forgotten", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ForgotValidator = Ember.Object.create({
        check: function (model) {
            var data = model.getProperties('email'),
                validationErrors = [];

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: '邮箱格式不正确。'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = ForgotValidator;
  });