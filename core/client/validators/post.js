var PostValidator = Ember.Object.create({
    check: function (model) {
        var validationErrors = [],
            data = model.getProperties('title', 'meta_title', 'meta_description');

        if (validator.empty(data.title)) {
            validationErrors.push({
                message: 'You must specify a title for the post.'
            });
        }

        if (!validator.isLength(data.meta_title, 0, 70)) {
            validationErrors.push({
                message: 'Meta Title is too long.'
            });
        }

        if (!validator.isLength(data.meta_description, 0, 156)) {
            validationErrors.push({
                message: 'Meta Description is too long.'
            });
        }

        return validationErrors;
    }
});

export default PostValidator;
