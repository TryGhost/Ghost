const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:roles');
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
            return Promise.filter(roles.map((role) => {
                return canThis(frame.options.context).assign.role(role)
                    .return(role)
                    .catch(() => {});
            }), (value) => {
                return value && (value.name !== 'Owner');
            }).then((roles) => {
                return frame.response = {
                    roles: roles
                };
            });
        }
    }
};
