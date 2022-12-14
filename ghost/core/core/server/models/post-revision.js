const ghostBookshelf = require('./base');

const PostRevision = ghostBookshelf.Model.extend({
    tableName: 'post_revisions'
}, {
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

    orderDefaultRaw() {
        return 'created_at_ts DESC';
    },

    toJSON(unfilteredOptions) {
        const options = PostRevision.filterOptions(unfilteredOptions, 'toJSON');
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        // CASE: only for internal accuracy
        delete attrs.created_at_ts;
        return attrs;
    }
});

module.exports = {
    PostRevision: ghostBookshelf.model('PostRevision', PostRevision)
};
