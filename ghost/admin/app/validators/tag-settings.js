import BaseValidator from './base';

var TagSettingsValidator = BaseValidator.create({
    properties: ['name', 'metaTitle', 'metaDescription'],
    name: function (model) {
        var name = model.get('name');

        if (validator.empty(name)) {
            model.get('errors').add('name', 'You must specify a name for the tag.');
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

export default TagSettingsValidator;
