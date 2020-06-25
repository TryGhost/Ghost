const logging = require('../../../../../shared/logging');

const renameMappings = [{
    from: 'default_locale',
    to: 'lang'
}, {
    from: 'active_timezone',
    to: 'timezone'
}, {
    from: 'ghost_head',
    to: 'codeinjection_head'
}, {
    from: 'ghost_foot',
    to: 'codeinjection_foot'
}, {
    from: 'brand',
    to: 'accent_color',
    getValue: (oldValue) => {
        return JSON.parse(oldValue).primaryColor || '';
    },
    getOldValue: (newValue) => {
        return JSON.stringify({
            primaryColor: newValue || ''
        });
    }
}];

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        for (const renameMapping of renameMappings) {
            const oldSetting = await options.transacting('settings')
                .where('key', renameMapping.from)
                .select('value')
                .first();

            const updatedValue = renameMapping.getValue ? renameMapping.getValue(oldSetting.value) : oldSetting.value;

            logging.info(`Updating ${renameMapping.to} with value from ${renameMapping.from}`);
            await options.transacting('settings')
                .where('key', renameMapping.to)
                .update('value', updatedValue);

            logging.info(`Deleting ${renameMapping.from}`);
            await options.transacting('settings')
                .where('key', renameMapping.from)
                .del();
        }
    },

    async down(options) {
        for (const renameMapping of renameMappings) {
            const newSetting = await options.transacting('settings')
                .where('key', renameMapping.to)
                .select('value')
                .first();

            const updatedValue = renameMapping.getOldValue ? renameMapping.getOldValue(newSetting.value) : newSetting.value;

            logging.info(`Updating ${renameMapping.from} with value from ${renameMapping.to}`);
            await options.transacting('settings')
                .where('key', renameMapping.from)
                .update('value', updatedValue);

            logging.info(`Deleting ${renameMapping.from}`);
            await options.transacting('settings')
                .where('key', renameMapping.from)
                .del();
        }
    }
};
