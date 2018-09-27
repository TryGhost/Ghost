// # Roles API
// RESTful API for the Role resource
const Promise = require('bluebird'),
    pipeline = require('../../lib/promise/pipeline'),
    localUtils = require('./utils'),
    canThis = require('../../services/permissions').canThis,
    models = require('../../models'),
    docName = 'roles';

let roles;

/**
 * ## Roles API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
 */
roles = {
    /**
     * ### Browse
     * Find all roles
     *
     * If a 'permissions' property is passed in the options object then
     * the results will be filtered based on whether or not the context user has the given
     * permission on a role.
     *
     *
     * @public
     * @param {{context, permissions}} options (optional)
     * @returns {Promise(Roles)} Roles Collection
     */
    browse(options) {
        let permittedOptions = ['permissions'],
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return models.Role.findAll(options)
                .then((models) => {
                    let roles = models.map((role) => {
                        return role.toJSON();
                    });

                    if (options.permissions !== 'assign') {
                        return {roles: roles};
                    }

                    return Promise.filter(roles.map((role) => {
                        return canThis(options.context).assign.role(role)
                            .return(role)
                            .catch(() => {});
                    }), (value) => {
                        return value && value.name !== 'Owner';
                    }).then((roles) => {
                        return {
                            roles: roles
                        };
                    });
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {opts: permittedOptions}),
            localUtils.convertOptions(),
            localUtils.handlePermissions(docName, 'browse'),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    }
};

module.exports = roles;
