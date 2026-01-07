const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:roles');
const canThis = require('../../../../../services/permissions').canThis;

module.exports = {
    async browse(models, apiConfig, frame) {
        debug('browse');

        const roles = models.toJSON(frame.options);

        if (frame.options.permissions !== 'assign') {
            return frame.response = {
                roles: roles
            };
        } else {
            const results = await Promise.all(
                roles.map(async (role) => {
                    let permissionResult;
                    try {
                        await canThis(frame.options.context).assign.role(role);
                        permissionResult = role;
                    } catch (err) {
                        permissionResult = {};
                    }
                    return permissionResult && permissionResult.name && (permissionResult.name !== 'Owner');
                })
            );
            const filteredRoles = roles.filter((_v, index) => results[index]);
            return frame.response = {
                roles: filteredRoles
            };
        }
    }
};
