const logging = require('../../../../lib/common/logging');
const models = require('../../../../models');
const utils = require('../../../schema/fixtures/utils');

const fixtureBackupContentPerm = utils.findModelFixtureEntry('Permission', {
    object_type: 'db',
    action_type: 'backupContent'
});

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        try {
            const existingBackupContentPerm = await models.Permission.findOne(
                fixtureBackupContentPerm,
                options
            );

            if (existingBackupContentPerm) {
                return logging.warn('Issue adding db.backupContent (already exists)');
            }

            const result = await utils.addFixturesForModel({
                name: 'Permission',
                entries: [fixtureBackupContentPerm]
            }, options);

            const success = result.done === result.expected;

            if (!success) {
                return logging.warn('Issue adding db.backupContent permission (did not insert)');
            }

            return logging.info('Completed adding db.backupContent permission');
        } catch (err) {
            return logging.error('Errored when adding db.backupContent permission');
        }
    },

    async down(options) {
        try {
            const existingBackupContentPerm = await models.Permission.findOne(
                fixtureBackupContentPerm,
                options
            );

            if (!existingBackupContentPerm) {
                return logging.warn('Issue removing db.backupContent (already removed)');
            }

            await existingBackupContentPerm.destroy(options);

            return logging.info('Completed removing db.backupContent permission');
        } catch (err) {
            return logging.error('Errored when removing db.backupContent permission');
        }
    }
};
