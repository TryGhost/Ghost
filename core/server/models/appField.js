var ghostBookshelf = require('./base'),
    Post = require('./post').Post,
    AppField,
    AppFields;

AppField = ghostBookshelf.Model.extend({
    tableName: 'app_fields',

    validate: function () {
        ghostBookshelf.validator.check(this.get('key'), 'Key cannot be blank').notEmpty();
        ghostBookshelf.validator.check(this.get('key'), 'Key maximum length is 150 characters.').len(0, 150);
        ghostBookshelf.validator.check(this.get('app_id'), 'App cannot be blank').notEmpty();
        ghostBookshelf.validator.check(this.get('type'), 'Type maximum length is 150 characters.').len(0, 150);
        ghostBookshelf.validator.check(this.get('relatable_id'), 'Relatable id cannot be blank').notEmpty();
        ghostBookshelf.validator.check(this.get('relatable_type'), 'Relatable type cannot be blank').notEmpty();

        return true;
    },

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