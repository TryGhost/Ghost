const logging = require('../../../../../shared/logging');

module.exports = {
    async up({connection}) {
        let result = await connection('settings')
            .where('key', '=', 'labs')
            .select('value');

        if (!result || !result[0]) {
            logging.warn(`Could not find labs setting`);
            result = [{}];
        }

        const labs = JSON.parse(result[0].value);

        labs.members = !!labs.members || !!labs.subscribers;

        logging.info(`Updating labs setting removing subscribers (was ${labs.subscribers}) settings members to ${labs.members}`);
        labs.subscribers = undefined;

        await connection('settings')
            .where('key', '=', 'labs')
            .update('value', JSON.stringify(labs));
    },
    async down() {
        throw new Error();
    }
};
