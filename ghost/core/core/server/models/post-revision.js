const ghostBookshelf = require('./base');
const _ = require('lodash');

const PostRevision = ghostBookshelf.Model.extend({
    tableName: 'post_revisions',

    author() {
        return this.belongsTo('User', 'author_id');
    },

    permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);
        const validOptions = {
            findAll: ['filter', 'columns']
        };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    defaultRelations: function defaultRelations(methodName, options) {
        if (['edit', 'add', 'destroy'].indexOf(methodName) !== -1) {
            options.withRelated = _.union(['author'], options.withRelated || []);
        }

        return options;
    },

    orderDefaultRaw() {
        return 'created_at_ts DESC';
    },

    toJSON(unfilteredOptions) {
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, unfilteredOptions);

        // We embed the full author object, so no need to send the author_id
        delete attrs.author_id;
        return attrs;
    }
});

module.exports = {
    PostRevision: ghostBookshelf.model('PostRevision', PostRevision)
};
