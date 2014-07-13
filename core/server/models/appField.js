var ghostBookshelf = require('./base'),
    AppField,
    AppFields;

AppField = ghostBookshelf.Model.extend({
    tableName: 'app_fields',

    post: function () {
        return this.morphOne('Post', 'relatable');
    }
});

AppFields = ghostBookshelf.Collection.extend({
    model: AppField
});

module.exports = {
    AppField: ghostBookshelf.model('AppField', AppField),
    AppFields: ghostBookshelf.collection('AppFields', AppFields)
};