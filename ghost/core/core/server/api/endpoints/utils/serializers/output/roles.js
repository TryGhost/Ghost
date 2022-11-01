const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:roles');
const canThis = require('../../../../../services/permissions').canThis;

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        const roles = models.toJSON(frame.options);

        if (frame.options.permissions !== 'assign') {
            return frame.response = {
                roles: roles
            };
        } else {
            return Promise.all(
                roles.map(async (role) => {
                    const permissionResult = await canThis(frame.options.context).assign.role(role)
                        .return(role)
                        .catch(() => {});
                    return permissionResult && (permissionResult.name !== 'Owner');   
                }))
                .then(results => roles.filter((_v, index) => results[index]))   
                .then((filteredRoles) => {
                    return frame.response = {
                        roles: filteredRoles
                    };
                });
        }
    }
};
