import BaseValidator from './base';

var PostValidator = BaseValidator.create({
    properties: ['title', 'metaTitle', 'metaDescription'],

    title: function (model) {
        var title = model.get('title');

        if (validator.empty(title)) {
            model.get('errors').add('title', 'You must specify a title for the post.');
            this.invalidate();
        }
    },

    metaTitle: function (model) {
        var metaTitle = model.get('meta_title');

        if (!validator.isLength(metaTitle, 0, 150)) {
            model.get('errors').add('meta_title', 'Meta Title cannot be longer than 150 characters.');
            this.invalidate();
        }
    },

    metaDescription: function (model) {
        var metaDescription = model.get('meta_description');

        if (!validator.isLength(metaDescription, 0, 200)) {
            model.get('errors').add('meta_description', 'Meta Description cannot be longer than 200 characters.');
            this.invalidate();
        }
    }
});

export default PostValidator;
