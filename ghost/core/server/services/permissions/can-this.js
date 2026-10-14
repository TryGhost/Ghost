const _ = require('lodash');
const models = require('../../models');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const providers = require('./providers');
const parseContext = require('./parse-context');
const actionsMap = require('./actions-map-cache');
const rolePermissions = require('./role-permissions');
const { setIsRoles } = require('../../models/role-utils');

const messages = {
  noPermissionToAction: 'You do not have permission to perform this action',
  noActionsMapFoundError:
    'No actions map found, ensure you have loaded permissions into database and then call permissions.init() before use.',
  parityMismatch: 'Permission grants differ with in-memory role permissions',
  parityCheckFailed: 'Permissions parity check could not run',
};

// Compare grants from both permission sources. Model rules may override the
// grants and perform database reads, so they run only once using the database
// permissions. Each distinct grant difference is logged once per process.
// This is temporary and goes with the switch.

const roleNamesOf = (actor) => (actor?.roles ?? []).map((role) => role.name);

/**
 * The same actors, with their permissions taken from the in-memory role map
 * instead of the database.
 */
function withInMemoryPermissions(loaded) {
  const swap = (actor) =>
    actor ? { ...actor, permissions: rolePermissions.forRoles(roleNamesOf(actor)) } : actor;

  return { ...loaded, user: swap(loaded.user), apiKey: swap(loaded.apiKey) };
}

/**
 * Calculates grants without performing I/O or running model-specific rules.
 */
function getGrantFlags(loadedPermissions, actType, objType) {
  // Iterate through the user permissions looking for an affirmation
  const userPermissions = loadedPermissions.user ? loadedPermissions.user.permissions : null;
  const apiKeyPermissions = loadedPermissions.apiKey ? loadedPermissions.apiKey.permissions : null;

  let hasUserPermission;
  let hasApiKeyPermission;

  const checkPermission = function (perm) {
    // Look for a matching action type and object type first
    if (perm.action_type !== actType || perm.object_type !== objType) {
      return false;
    }

    return true;
  };
  const { isOwner } = setIsRoles(loadedPermissions);
  if (isOwner) {
    hasUserPermission = true;
  } else if (!_.isEmpty(userPermissions)) {
    hasUserPermission = _.some(userPermissions, checkPermission);
  }

  // Check api key permissions if they were passed
  hasApiKeyPermission = true;
  if (!_.isNull(apiKeyPermissions)) {
    if (loadedPermissions.user) {
      // Staff API key scenario: both user and API key present
      // Use USER permissions and ignore API key permissions
      hasApiKeyPermission = true; // Allow API key check to pass
    } else {
      // Traditional API key scenario: API key only, no user
      // Use API key permissions as before
      hasUserPermission = true;
      hasApiKeyPermission = _.some(apiKeyPermissions, checkPermission);
    }
  }

  return { hasUserPermission, hasApiKeyPermission };
}

const reportedParityMismatches = new Set();

/**
 * Compares grants from the database with grants from the in-memory role map.
 * Uses the same loaded actors, does no additional reads, and never runs model
 * rules. The caller does not wait for this diagnostic comparison.
 *
 * @param {{hasUserPermission: boolean|undefined, hasApiKeyPermission: boolean}} databaseGrants
 * @param {object} loaded the actors loaded from the database
 * @param {{actType: string, objType: string, context: object}} check
 * @returns {Promise<void>}
 */
function compareWithInMemoryGrants(databaseGrants, loaded, check) {
  return Promise.resolve()
    .then(() => {
      const inMemoryGrants = getGrantFlags(
        withInMemoryPermissions(loaded),
        check.actType,
        check.objType,
      );

      // Preserve the original flags passed to model rules, but treat an absent
      // grant (undefined) and an explicit false as equivalent for comparison.
      const normalize = (grants) => ({
        hasUserPermission: Boolean(grants.hasUserPermission),
        hasApiKeyPermission: Boolean(grants.hasApiKeyPermission),
      });
      const database = normalize(databaseGrants);
      const inMemory = normalize(inMemoryGrants);

      if (_.isEqual(database, inMemory)) {
        return;
      }

      const userRoles = roleNamesOf(loaded.user);
      const apiKeyRoles = roleNamesOf(loaded.apiKey);
      const key = JSON.stringify([
        check.actType,
        check.objType,
        userRoles,
        apiKeyRoles,
        database,
        inMemory,
      ]);

      if (reportedParityMismatches.has(key)) {
        return;
      }

      reportedParityMismatches.add(key);

      logging.error(
        new errors.InternalServerError({
          message: tpl(messages.parityMismatch),
          code: 'PERMISSIONS_PARITY_MISMATCH',
          errorDetails: {
            action: check.actType,
            object: check.objType,
            user: loaded.user ? { id: check.context.user, roles: userRoles } : null,
            apiKey: loaded.apiKey ? { id: check.context.api_key?.id, roles: apiKeyRoles } : null,
            grants: { database, inMemory },
          },
        }),
      );
    })
    .catch((err) => {
      logging.error({ err, message: tpl(messages.parityCheckFailed) });
    });
}

class CanThisResult {
  buildObjectTypeHandlers(objTypes, actType, context, permissionLoad) {
    const objectTypeModelMap = {
      post: models.Post,
      role: models.Role,
      user: models.User,
      permission: models.Permission,
      setting: models.Settings,
      invite: models.Invite,
      integration: models.Integration,
      comment: models.Comment,
    };

    // Iterate through the object types, i.e. ['post', 'tag', 'user']
    return _.reduce(
      objTypes,
      function (objTypeHandlers, objType) {
        // Grab the TargetModel through the objectTypeModelMap
        const TargetModel = objectTypeModelMap[objType];

        // Create the 'handler' for the object type;
        // the '.post()' in canThis(user).edit.post()
        objTypeHandlers[objType] = function (modelOrId, unsafeAttrs) {
          let modelId;
          unsafeAttrs = unsafeAttrs || {};

          // If it's an internal request, resolve immediately
          if (context.internal) {
            return Promise.resolve();
          }

          if (_.isNumber(modelOrId) || _.isString(modelOrId)) {
            // It's an id already, do nothing
            modelId = modelOrId;
          } else if (modelOrId) {
            // It's a model, get the id
            modelId = modelOrId.id;
          }
          // Wait for the user loading to finish
          return permissionLoad.then(function (loadedPermissions) {
            const grants = getGrantFlags(loadedPermissions, actType, objType);
            const { hasUserPermission, hasApiKeyPermission } = grants;

            compareWithInMemoryGrants(grants, loadedPermissions, { actType, objType, context });

            // Ensure permission decisions are based on the user's role if present, not their staff-token.
            const permissionsForModel = loadedPermissions.user
              ? { ...loadedPermissions, apiKey: null }
              : loadedPermissions;

            // Offer a chance for the TargetModel to override the results
            if (TargetModel && _.isFunction(TargetModel.permissible)) {
              return TargetModel.permissible(
                modelId,
                actType,
                context,
                unsafeAttrs,
                permissionsForModel,
                hasUserPermission,
                hasApiKeyPermission,
              );
            }

            if (hasUserPermission && hasApiKeyPermission) {
              return;
            }

            return Promise.reject(
              new errors.NoPermissionError({ message: tpl(messages.noPermissionToAction) }),
            );
          });
        };

        return objTypeHandlers;
      },
      {},
    );
  }

  beginCheck(context) {
    const self = this;
    let userPermissionLoad;
    let apiKeyPermissionLoad;

    // Get context.user, context.api_key and context.app
    context = parseContext(context);

    if (actionsMap.empty()) {
      throw new errors.InternalServerError({ message: tpl(messages.noActionsMapFoundError) });
    }

    // Kick off loading of user permissions if necessary
    if (context.user) {
      userPermissionLoad = providers.user(context.user);
    } else {
      // Resolve null if no context.user to prevent db call
      userPermissionLoad = Promise.resolve(null);
    }

    // Kick off loading of api key permissions if necessary
    if (context.api_key) {
      apiKeyPermissionLoad = providers.apiKey(context.api_key.id);
    } else {
      // Resolve null if no context.api_key
      apiKeyPermissionLoad = Promise.resolve(null);
    }

    // Wait for both user and api key permissions to load
    const permissionsLoad = Promise.all([userPermissionLoad, apiKeyPermissionLoad]).then(
      function (result) {
        return {
          user: result[0],
          apiKey: result[1],
        };
      },
    );

    // Iterate through the actions and their related object types
    _.each(actionsMap.getAll(), function (objTypes, actType) {
      // Build up the object type handlers;
      // the '.post()' parts in canThis(user).edit.post()
      const objTypeHandlers = self.buildObjectTypeHandlers(
        objTypes,
        actType,
        context,
        permissionsLoad,
      );

      // Define a property for the action on the result;
      // the '.edit' in canThis(user).edit.post()
      Object.defineProperty(self, actType, {
        writable: false,
        enumerable: false,
        configurable: false,
        value: objTypeHandlers,
      });
    });

    // Return this for chaining
    return this;
  }
}

module.exports = function canThis(context) {
  const result = new CanThisResult();

  return result.beginCheck(context);
};
