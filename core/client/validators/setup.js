import NewUserValidator from 'ghost/validators/new-user';

var SetupValidator = NewUserValidator.extend({
    check: function (model) {
        var data = model.getProperties('blogTitle'),
            validationErrors = this._super(model);

        if (!validator.isLength(data.blogTitle, 1)) {
            validationErrors.push({
                message: '请为博客设置一个标题。'
            });
        }

        return validationErrors;
    }
}).create();

export default SetupValidator;
