import Ember from 'ember';
var TagSettingsValidator = Ember.Object.create({
    check: function (model) {
        var validationErrors = [],
            data = model.getProperties('name', 'meta_title', 'meta_description');

        if (validator.empty(data.name)) {
            validationErrors.push({
                message: 'You must specify a name for the tag.'
            });
        }

        if (!validator.isLength(data.meta_title, 0, 150)) {
            validationErrors.push({
                message: 'Meta Title cannot be longer than 150 characters.'
            });
        }

        if (!validator.isLength(data.meta_description, 0, 200)) {
            validationErrors.push({
                message: 'Meta Description cannot be longer than 200 characters.'
            });
        }

        return validationErrors;
    }
});

export default TagSettingsValidator;
