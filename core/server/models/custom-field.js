let ghostBookshelf = require('./base'),
    CustomField,
    CustomFields;

CustomField = ghostBookshelf.Model.extend({
    tableName: 'custom_fields'
});

CustomFields = ghostBookshelf.Collection.extend({
    model: CustomField
});

module.exports = {
    CustomField: ghostBookshelf.model('CustomField', CustomField),
    CustomFields: ghostBookshelf.collection('CustomFields', CustomFields)
};
