define("ghost/validators/post", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostValidator = Ember.Object.create({
        check: function (model) {
            var validationErrors = [],
                data = model.getProperties('title', 'meta_title', 'meta_description');

            if (validator.empty(data.title)) {
                validationErrors.push({
                    message: '博文标题不能为空。'
                });
            }

            if (!validator.isLength(data.meta_title, 0, 150)) {
                validationErrors.push({
                    message: '呈现标题不能超过150个字。'
                });
            }

            if (!validator.isLength(data.meta_description, 0, 200)) {
                validationErrors.push({
                    message: '呈现摘要不能超过200个字。'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = PostValidator;
  });