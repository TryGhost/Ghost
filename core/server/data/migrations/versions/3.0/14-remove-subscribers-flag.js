const common = require('../../../../lib/common');

module.exports = {
    async up({connection}) {
        let result = await connection('settings')
            .where('key', '=', 'labs')
            .select('value');

        if (!result || !result[0]) {
            common.logging.warn(`Could not find labs setting`);
            result = [{}];
        }

        const labs = JSON.parse(result[0].value);

        labs.members = !!labs.members || !!labs.subscribers;

        common.logging.info(`Updating labs setting removing subscribers (was ${labs.subscribers}) settings members to ${labs.members}`);
        labs.subscribers = undefined;

        await connection('settings')
            .where('key', '=', 'labs')
            .update('value', JSON.stringify(labs));
    },
    async down() {
        throw new Error();
    }
};
