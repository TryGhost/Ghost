const logging = require('../../../../../shared/logging');

const renameMapping = [{
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
}];

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        await Promise.map(renameMapping, async (renameMap) => {
            logging.info(`Renaming ${renameMap.from} to ${renameMap.to}`);

            return await options
                .transacting('settings')
                .where('key', renameMap.from)
                .update({
                    key: renameMap.to
                });
        });

        const brandResult = await options
            .transacting('settings')
            .where('key', 'brand')
            .select('value');

        const value = JSON.parse(brandResult[0].value);
        const accentColor = value.primaryColor || '';

        logging.info(`Updating brand.primaryColor in settings to accent_color with value '${accentColor}'`);

        return await options
            .transacting('settings')
            .where('key', 'brand')
            .update('key', 'accent_color')
            .update('value', accentColor);
    },

    async down(options) {
        await Promise.map(renameMapping, async (renameMap) => {
            logging.info(`Renaming ${renameMap.to} to ${renameMap.from}`);

            return await options
                .transacting('settings')
                .where('key', renameMap.to)
                .update({
                    key: renameMap.from
                });
        });

        let accentColor = await options
            .transacting('settings')
            .where('key', 'accent_color')
            .select('value');

        const primaryColor = accentColor[0].value || '';

        logging.info(`Updating accent_color in settings to brand.primaryColor with value '${primaryColor}'`);

        return await options
            .transacting('settings')
            .where('key', 'accent_color')
            .update('key', 'brand')
            .update('value', JSON.stringify({
                primaryColor
            }));
    }
};
