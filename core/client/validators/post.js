var PostValidator = Ember.Object.create({
    check: function (model) {
        var validationErrors = [],

            title = model.get('title');

        if (validator.empty(title)) {
            validationErrors.push({
                message: '请为文章输入一个标题。'
            });
        }

        return validationErrors;
    }
});

export default PostValidator;
