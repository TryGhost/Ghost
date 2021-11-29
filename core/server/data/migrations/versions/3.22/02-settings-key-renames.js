const logging = require('@tryghost/logging');

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
    getToValue: (fromValue) => {
        try {
            return JSON.parse(fromValue).primaryColor || '';
        } catch (err) {
            return '';
        }
    },
    getFromValue: (toValue) => {
        return JSON.stringify({
            primaryColor: toValue || ''
        });
    }
}];

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        // eslint-disable-next-line no-restricted-syntax
        for (const renameMapping of renameMappings) {
            const oldSetting = await options.transacting('settings')
                .where('key', renameMapping.from)
                .select('value')
                .first();

            if (!oldSetting) {
                logging.warn(`Could not find setting ${renameMapping.from}, not updating ${renameMapping.to} value`);
                continue;
            }

            const updatedValue = renameMapping.getToValue ? renameMapping.getToValue(oldSetting.value) : oldSetting.value;

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
        // eslint-disable-next-line no-restricted-syntax
        for (const renameMapping of renameMappings) {
            const newSetting = await options.transacting('settings')
                .where('key', renameMapping.to)
                .select('value')
                .first();

            if (!newSetting) {
                logging.warn(`Could not find setting ${renameMapping.to}, not updating ${renameMapping.from} value`);
                continue;
            }

            const updatedValue = renameMapping.getFromValue ? renameMapping.getFromValue(newSetting.value) : newSetting.value;

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
