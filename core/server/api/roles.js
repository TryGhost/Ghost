// # Roles API
// RESTful API for the Role resource
var Promise         = require('bluebird'),
    canThis         = require('../permissions').canThis,
    dataProvider    = require('../models'),
    pipeline        = require('../utils/pipeline'),
    utils           = require('./utils'),
    docName         = 'roles',

    roles;

/**
 * ## Roles API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
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
    browse: function browse(options) {
        var permittedOptions = ['permissions'],
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function modelQuery(options) {
            return dataProvider.Role.findAll(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: permittedOptions}),
            utils.handlePermissions(docName, 'browse'),
            modelQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(results) {
            var roles = results.map(function (r) {
                return r.toJSON();
            });

            if (options.permissions !== 'assign') {
                return {roles: roles};
            }

            return Promise.filter(roles.map(function (role) {
                return canThis(options.context).assign.role(role)
                    .return(role)
                    .catch(function () {});
            }), function (value) {
                return value && value.name !== 'Owner';
            }).then(function (roles) {
                return {roles: roles};
            });
        });
    }
};

module.exports = roles;
