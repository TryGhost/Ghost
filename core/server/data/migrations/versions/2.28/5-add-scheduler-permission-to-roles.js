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
            post: 'publish'
        },
        'Admin Integration': {
            post: 'publish'
        },
        Editor: {
            post: 'publish'
        },
        'Scheduler Integration': {
            post: 'publish'
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
            return logging.info('Completed adding post.publish permission to roles');
        } catch (err) {
            return logging.warn('Issue adding post.publish permission to roles');
        }
    },

    async down(options) {
        try {
            await utils.removeFixturesForRelation(relationFixtures, options);
            return logging.info('Completed removing post.publish permission from roles');
        } catch (err) {
            return logging.warn('Issue removing post.publish permission from roles');
        }
    }
};
