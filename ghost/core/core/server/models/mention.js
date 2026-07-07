module.exports = function (ghostBookshelf) {
    const Mention = ghostBookshelf.Model.extend({
        tableName: 'mentions',
        defaults: {
            deleted: false,
            verified: false,
            revalidation_failure_count: 0
        },
        defaultFilters() {
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

    return {
        Mention: ghostBookshelf.model('Mention', Mention)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
