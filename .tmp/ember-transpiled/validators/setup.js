define("ghost/validators/setup", 
  ["ghost/validators/new-user","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var NewUserValidator = __dependency1__["default"];

    var SetupValidator = NewUserValidator.extend({
        check: function (model) {
            var data = model.getProperties('blogTitle'),
                validationErrors = this._super(model);

            if (!validator.isLength(data.blogTitle, 1)) {
                validationErrors.push({
                    message: '请填写博客名称。'
                });
            }

            return validationErrors;
        }
    }).create();

    __exports__["default"] = SetupValidator;
  });