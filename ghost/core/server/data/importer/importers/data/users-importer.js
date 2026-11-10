const debug = require('@tryghost/debug')('importer:users');
const _ = require('lodash');
const BaseImporter = require('./base');
const models = require('../../../../models');
const { limitService } = require('../../../../services/limits');
const { ASSIGNABLE_ROLES } = require('../../../../models/role-utils');

// User.add resolves a role by id when the value looks like an ObjectId, so a role from the
// file must be an exact staff role name. The owner is never imported, so Owner becomes
// Administrator; anything else, such as the Owner role's id or an integration role, gets
// the default fallback role. Sites with a staff limit only import contributors; counting
// staff users here would be too complex, and roles can be changed afterwards.
function importableRoleName(roleName) {
  if (limitService.isLimited('staff')) {
    return 'Contributor';
  }

  if (roleName === 'Owner') {
    return 'Administrator';
  }

  return ASSIGNABLE_ROLES.includes(roleName) ? roleName : 'Author';
}

class UsersImporter extends BaseImporter {
  constructor(allDataFromFile) {
    super(allDataFromFile, {
      modelName: 'User',
      dataKeyToImport: 'users',
      requiredFromFile: ['roles', 'roles_users'],
    });
  }

  fetchExisting(modelOptions) {
    return models.User.findAll(
      _.merge({ columns: ['id', 'slug', 'email'], withRelated: ['roles'] }, modelOptions),
    ).then((existingData) => {
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
    const lookup = {};

    // Custom imports may set roles by name on the user record; they reach User.add as-is.
    _.each(this.dataToImport, (obj) => {
      if (Array.isArray(obj.roles)) {
        obj.roles = obj.roles.map((userRole) => importableRoleName(userRole?.name ?? userRole));
      } else {
        delete obj.roles;
      }
    });

    // NOTE: sort out duplicated roles based on incremental id
    _.each(this.requiredFromFile.roles_users, (attachedRole) => {
      if (Object.hasOwn(lookup, attachedRole.user_id)) {
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
        role = { name: 'Author' };
      }

      _.each(this.dataToImport, (obj) => {
        if (attachedRole.user_id === obj.id) {
          if (!Array.isArray(obj.roles)) {
            obj.roles = [];
          }

          obj.roles.push(importableRoleName(role.name));
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
