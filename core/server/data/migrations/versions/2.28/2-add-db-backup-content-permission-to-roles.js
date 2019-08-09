const logging = require('../../../../lib/common/logging');
const utils = require('../../../schema/fixtures/utils');

const relationFixtures = {
    from: {
        model: 'Role',
        match: 'name',
        relation: 'permissions'
    },
    to: {
        model: 'Permission',
        match: ['object_type', 'action_type']
    },
    entries: {
        Administrator: {
            db: 'backupContent'
        },
        'DB Backup Integration': {
            db: 'backupContent'
        }
    }
};

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        try {
            await utils.addFixturesForRelation(relationFixtures, options);
            return logging.info('Completed adding db.backupContent permission to roles');
        } catch (err) {
            return logging.warn('Issue adding db.backupContent permission to roles');
        }
    },

    async down(options) {
        try {
            await utils.removeFixturesForRelation(relationFixtures, options);
            return logging.info('Completed removing db.backupContent permission from roles');
        } catch (err) {
            return logging.warn('Issue removing db.backupContent permission from roles');
        }
    }
};
