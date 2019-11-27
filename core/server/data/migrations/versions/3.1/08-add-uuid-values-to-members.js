const common = require('../../../../lib/common');
const uuid = require('uuid');

module.exports = {
    config: {
        transaction: true
    },
    async up(options) {
        const conn = options.connection || options.transacting;

        const membersWithoutUUID = await conn.select('id').from('members').whereNull('uuid');

        common.logging.info(`Adding uuid field value to ${membersWithoutUUID.length} members.`);

        for (const member of membersWithoutUUID) {
            await conn('members').update('uuid', uuid.v4()).where('id', member.id);
        }
    },
    async down() {
        // noop
    }
};
