const config = require('../../../shared/config');
const models = require('../../models');
const errors = require('@tryghost/errors');

// Get total members direct from DB
async function getTotalMembers() {
    return models.Member.count('id');
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
