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

    orderDefaultOptions() {
        return {
            created_at: 'DESC'
        };
    }
});

module.exports = {
    MobiledocRevision: ghostBookshelf.model('MobiledocRevision', MobiledocRevision)
};
