let ghostBookshelf = require('./base'),
    CustomFieldValue,
    CustomFieldValues;

CustomFieldValue = ghostBookshelf.Model.extend({
    tableName: 'custom_field_values',
    serialize() {
        return {
            id: this.get('id'),
            field_id: this.get('field_id'),
            value: this.get('value')
        };
    }
}, {
    edit: function (values, options) {
        return Promise.map(values, function (item) {
            // TODO: some validation
            return CustomFieldValue
                .forge({field_id: item.field_id, post_id: options.id})
                .fetch()
                .then((customValue) => {
                    if (customValue) {
                        if (item.value === null || item.value === '') {
                            return customValue.destroy();
                        }

                        customValue.set('value', item.value);

                        if (customValue.hasChanged()) {
                            return customValue.save(null, {});
                        }

                        return customValue;
                    }

                    if (item.value !== null) {
                        return CustomFieldValue.forge({
                            field_id: item.field_id, 
                            post_id: options.id, 
                            value: item.value
                        }).save(null, {});
                    }
                });
        });
    }
});

CustomFieldValues = ghostBookshelf.Collection.extend({
    model: CustomFieldValue
});

module.exports = {
    CustomFieldValue: ghostBookshelf.model('CustomFieldValue', CustomFieldValue),
    CustomFieldValues: ghostBookshelf.collection('CustomFieldValues', CustomFieldValues)
};
