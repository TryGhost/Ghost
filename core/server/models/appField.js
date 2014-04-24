var ghostBookshelf = require('./base'),
    Post = require('./post').Post,
    AppField,
    AppFields;

AppField = ghostBookshelf.Model.extend({
    tableName: 'app_fields',

    post: function () {
        return this.morphOne(Post, 'relatable');
    }
});

AppFields = ghostBookshelf.Collection.extend({
    model: AppField
});

module.exports = {
    AppField: AppField,
    AppFields: AppFields
};