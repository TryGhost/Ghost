const ghostBookshelf = require('./base');

const MobiledocRevision = ghostBookshelf.Model.extend({
    tableName: 'mobiledoc_revisions'
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
        const attrs = ghostBookshelf.Model.prototype.toJSON.call(this, unfilteredOptions);

        // CASE: only for internal accuracy
        delete attrs.created_at_ts;
        return attrs;
    }
});

module.exports = {
    MobiledocRevision: ghostBookshelf.model('MobiledocRevision', MobiledocRevision)
};
