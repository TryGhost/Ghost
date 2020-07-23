const config = require('../../../shared/config');
const db = require('../../data/db');
const errors = require('@tryghost/errors');

// Get total members direct from DB
// @TODO: determine performance difference between this, normal knex, and using the model layer
async function getTotalMembers() {
    const isSQLite = config.get('database:client') === 'sqlite3';
    const result = await db.knex.raw('SELECT COUNT(id) AS total FROM members');
    return isSQLite ? result[0].total : result[0][0].total;
}

module.exports = async () => {
    const membersHostLimit = config.get('host_settings:limits:members');
    if (membersHostLimit) {
        const allowedMembersLimit = membersHostLimit.max;
        const hostUpgradeLink = config.get('host_settings:limits').upgrade_url;

        const totalMembers = await getTotalMembers();

        if (totalMembers > allowedMembersLimit) {
            throw new errors.HostLimitError({
                message: `Your current plan allows you to have up to ${allowedMembersLimit} members, but you currently have ${totalMembers} members`,
                help: hostUpgradeLink,
                errorDetails: {
                    limit: allowedMembersLimit,
                    total: totalMembers
                }
            });
        }
    }
};
