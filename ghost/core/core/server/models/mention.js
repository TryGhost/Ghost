const ghostBookshelf = require('./base');

const Mention = ghostBookshelf.Model.extend({
    tableName: 'mentions',
    defaults: {
        deleted: false,
        verified: false
    },
    enforcedFilters() {
        return 'deleted:false';
    }
}, {
    permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);
        const validOptions = {
            findPage: ['selectRaw', 'whereRaw']
        };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    }
});

module.exports = {
    Mention: ghostBookshelf.model('Mention', Mention)
};
