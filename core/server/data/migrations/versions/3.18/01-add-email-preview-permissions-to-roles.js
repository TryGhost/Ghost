const utils = require('../../../schema/fixtures/utils');
const logging = require('../../../../../shared/logging');

const resource = 'email_preview';

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        const relationFixtures = utils.findPermissionRelationsForObject(resource);
        try {
            const result = await utils.addFixturesForRelation(relationFixtures, options);
            const success = result.done === result.expected;
            if (!success) {
                return logging.warn('Adding email_preview permissions to roles (did not insert)');
            }
            return logging.info('Adding email_preview permissions to roles');
        } catch (err) {
            logging.error('Issue adding email_preview permissions to roles');
            throw err;
        }
    },

    async down(options) {
        const relationFixtures = utils.findPermissionRelationsForObject(resource);
        try {
            await utils.removeFixturesForRelation(relationFixtures, options);
            return logging.info('Removing email_preview permissions from roles');
        } catch (err) {
            logging.error('Issue removing email_preview permissions from roles');
            throw err;
        }
    }
};
