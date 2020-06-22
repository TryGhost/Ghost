const logging = require('../../../../../shared/logging');

const renameMapping = [{
    down: 'default_locale',
    up: 'lang'
}, {
    down: 'active_timezone',
    up: 'timezone'
}, {
    down: 'ghost_head',
    up: 'codeinjection_head'
}, {
    down: 'ghost_foot',
    up: 'codeinjection_foot'
}];

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        await Promise.map(renameMapping, async (renameMap) => {
            logging.info(`Renaming ${renameMap.down} to ${renameMap.up}`);

            return await options
                .transacting('settings')
                .where('key', renameMap.down)
                .update({
                    key: renameMap.up
                });
        });

        const brandResult = await options
            .transacting('settings')
            .where('key', 'brand')
            .select('value');

        const brand = JSON.parse(brandResult[0].value);

        logging.info(`Updating brand.publicationColor in settings to accent_color with value ${brand.primaryColor}`);

        return await options
            .transacting('settings')
            .where('key', 'brand')
            .update('key', 'accent_color')
            .update('value', brand.primaryColor);
    },

    async down(options) {
        await Promise.map(renameMapping, async (renameMap) => {
            logging.info(`Renaming ${renameMap.up} to ${renameMap.down}`);

            return await options
                .transacting('settings')
                .where('key', renameMap.up)
                .update({
                    key: renameMap.down
                });
        });

        let accentColor = await options
            .transacting('settings')
            .where('key', 'accent_color')
            .select('value');

        const brand = accentColor[0].value;

        logging.info(`Updating accent_color in settings to brand.publicationColor with value ${brand.primaryColor}`);

        return await options
            .transacting('settings')
            .where('key', 'accent_color')
            .update('key', 'brand')
            .update('value', JSON.stringify({
                brand: {
                    primaryColor: ''
                }
            }));
    }
};
