const debug = require('@tryghost/debug')('importer:users');
const _ = require('lodash');
const BaseImporter = require('./Base');
const models = require('../../../../models');
const limitService = require('../../../../services/limits');

class UsersImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'User',
            dataKeyToImport: 'users',
            requiredFromFile: ['roles', 'roles_users']
        });
    }

    fetchExisting(modelOptions) {
        return models.User.findAll(_.merge({columns: ['id', 'slug', 'email'], withRelated: ['roles']}, modelOptions))
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    /**
     * - by default all imported users are locked and get a random password
     * - they have to follow the password forgotten flow
     * - we add the role by name [supported by the user model, see User.add]
     *   - background: if you import roles, but they exist already, the related user roles reference to an old model id
     *
     *   If importOptions object is supplied with a property of importPersistUser then the user status is not locked
     */
    beforeImport() {
        debug('beforeImport');

        let role;
        let lookup = {};

        // NOTE: sort out duplicated roles based on incremental id
        _.each(this.requiredFromFile.roles_users, (attachedRole) => {
            if (Object.prototype.hasOwnProperty.call(lookup, attachedRole.user_id)) {
                if (lookup[attachedRole.user_id].id < attachedRole.id) {
                    lookup[attachedRole.user_id] = attachedRole;
                }
            } else {
                lookup[attachedRole.user_id] = attachedRole;
            }
        });

        this.requiredFromFile.roles_users = _.toArray(lookup);

        _.each(this.requiredFromFile.roles_users, (attachedRole) => {
            role = _.find(this.requiredFromFile.roles, (requiredRole) => {
                if (attachedRole.role_id === requiredRole.id) {
                    return requiredRole;
                }
            });

            // CASE: default fallback role
            if (!role) {
                role = {name: 'Author'};
            }

            // If this site has any sort of staff limit, set all imported users to contributors
            // Any other sort of logic for counting staff users would be too complex in this scenario
            // So we essentially don't allow importing staff users
            // The roles can be changed afterwards if the limit permits
            if (limitService.isLimited('staff')) {
                role = {name: 'Contributor'};
            }

            _.each(this.dataToImport, (obj) => {
                if (attachedRole.user_id === obj.id) {
                    if (!_.isArray(obj.roles)) {
                        obj.roles = [];
                    }

                    // CASE: we never import the owner, the owner is always present in the database
                    // That's why it is not allowed to import the owner role
                    if (role.name === 'Owner') {
                        role.name = 'Administrator';
                    }

                    obj.roles.push(role.name);
                }
            });
        });

        return super.beforeImport();
    }

    doImport(options, importOptions) {
        return super.doImport(options, importOptions);
    }
}

module.exports = UsersImporter;
