let ghostBookshelf = require('./base'),
    CustomField,
    CustomFields;

CustomField = ghostBookshelf.Model.extend({
    tableName: 'custom_fields',
    custom_field_values() {
        return this.hasMany('CustomFieldValue', 'field_id');
    }
}, {
    edit: function (data, options) {
        return Promise.map(data, function (item) {
            // TODO: some validation
            return CustomField.forge({name: item.name})
                .fetch(options)
                .then((customField) => {
                    if (customField) {
                        customField.set('type', item.type);
                        customField.set('name', item.name);

                        if (customField.hasChanged()) {
                            return customField.save(null, options);
                        }

                        return customField;
                    }

                    return CustomField.forge(item).save(null, options);
                });
        }).then(() => {
            options.withRelated = ['custom_field_values'];

            return CustomField.where('name', 'NOT IN', data.map(item => item.name))
                .fetchAll(options)
                .then((collection) => {
                    collection.forEach((customField) => {
                        return customField.related('custom_field_values')
                            .invokeThen('destroy', options)
                            .then(() => customField.destroy(null, options));
                    });
                });
        });
    }
});

CustomFields = ghostBookshelf.Collection.extend({
    model: CustomField
});

module.exports = {
    CustomField: ghostBookshelf.model('CustomField', CustomField),
    CustomFields: ghostBookshelf.collection('CustomFields', CustomFields)
};
