'use strict';

const debug = require('ghost-ignition').debug('importer:users'),
    _ = require('lodash'),
    BaseImporter = require('./base');

class UsersImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'User',
            dataKeyToImport: 'users',
            requiredData: ['roles', 'roles_users']
        }));

        // Map legacy keys
        this.legacyKeys = {
            image: 'profile_image',
            cover: 'cover_image',
            last_login: 'last_seen'
        };
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

        let self = this, role, lookup = {};

        // Remove legacy field language
        this.dataToImport = _.filter(this.dataToImport, function (data) {
            return _.omit(data, 'language');
        });

        this.dataToImport = this.dataToImport.map(self.legacyMapper);

        // NOTE: sort out duplicated roles based on incremental id
        _.each(this.roles_users, function (attachedRole) {
            if (lookup.hasOwnProperty(attachedRole.user_id)) {
                if (lookup[attachedRole.user_id].id < attachedRole.id) {
                    lookup[attachedRole.user_id] = attachedRole;
                }
            } else {
                lookup[attachedRole.user_id] = attachedRole;
            }
        });

        this.roles_users = _.toArray(lookup);

        _.each(this.roles_users, function (attachedRole) {
            role = _.find(self.roles, function (role) {
                if (attachedRole.role_id === role.id) {
                    return role;
                }
            });

            // CASE: default fallback role
            if (!role) {
                role = {name: 'Author'};
            }

            _.each(self.dataToImport, function (obj) {
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

    doImport(options) {
        return super.doImport(options);
    }
}

module.exports = UsersImporter;
