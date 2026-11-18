import _ from 'lodash';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import { actionsMap, forRoles, type Permission } from './role-permissions';
import type { RoleView, UserView } from '../principal';
import { setIsRoles } from '../../models/role-utils';
import parseContext, { type ParsedContext } from './parse-context';

const models = require('../../models');

const messages = {
  noPermissionToAction: 'You do not have permission to perform this action',
};

/** What canThis needs to grant or deny for one actor */
export interface LoadedPermissions {
  permissions: Permission[];
  roles: Array<{ id: string; name: string }>;
}

/** User and API key permissions, each null when that actor is absent */
interface LoadedActors {
  user: LoadedPermissions | null;
  apiKey: LoadedPermissions | null;
}

/** canThis(context).edit.post(idOrModel, unsafeAttrs) */
type ObjectTypeHandler = (
  modelOrId?: string | number | { id: string } | null,
  unsafeAttrs?: Record<string, unknown>,
) => Promise<unknown>;

export type CanThisResult = Record<string, Record<string, ObjectTypeHandler>>;

/**
 * Calculates grants without performing I/O or running model-specific rules.
 */
function getGrantFlags(loadedPermissions: LoadedActors, actType: string, objType: string) {
  // Iterate through the user permissions looking for an affirmation
  const userPermissions = loadedPermissions.user ? loadedPermissions.user.permissions : null;
  const apiKeyPermissions = loadedPermissions.apiKey ? loadedPermissions.apiKey.permissions : null;

  let hasUserPermission: boolean | undefined;
  let hasApiKeyPermission: boolean;

  const checkPermission = function (perm: Permission) {
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

function rolePermissions(roles: readonly RoleView[]): LoadedPermissions {
  return {
    permissions: forRoles(roles.map((role) => role.name)),
    roles: roles.map(({ id, name }) => ({ id, name })),
  };
}

const NO_ACTORS: LoadedActors = Object.freeze({ user: null, apiKey: null });

function missingPrincipal() {
  return new errors.IncorrectUsageError({
    message: 'canThis needs the principal for the user or API key in its context.',
  });
}

/**
 * The actors from the roles authentication put on the principal. A context
 * naming a user or key needs the principal for it, so a caller that drops or
 * mismatches it fails loudly rather than checking as no one.
 */
function actorsFor(context: ParsedContext): LoadedActors | Error {
  const principal = context.principal;
  if (context.internal) {
    return NO_ACTORS;
  }

  if (!principal) {
    return context.user || context.api_key ? missingPrincipal() : NO_ACTORS;
  }

  // A staff token acts as its user, so its key's role is not needed
  let user: UserView | null = null;
  if (principal.kind === 'user') {
    user = principal.user;
  } else if (principal.kind === 'app') {
    user = principal.actingFor;
  }
  if (user) {
    return user.id === context.user
      ? { user: rolePermissions(user.roles), apiKey: null }
      : missingPrincipal();
  }

  if (principal.kind === 'integration') {
    const matches = !context.user && principal.apiKey.id === context.api_key?.id;
    if (!matches) {
      return missingPrincipal();
    }
    const role = principal.apiKey.role;
    return { user: null, apiKey: rolePermissions(role ? [role] : []) };
  }

  // An app with no user, or an anonymous request; the app is refused before the check
  return context.user || (context.api_key && principal.kind !== 'app')
    ? missingPrincipal()
    : NO_ACTORS;
}

function isAppWithoutUser(context: ParsedContext) {
  return context.principal?.kind === 'app' && !context.user;
}

class CanThisResultBuilder {
  buildObjectTypeHandlers(
    objTypes: readonly string[],
    actType: string,
    context: ParsedContext,
    actors: LoadedActors | Error,
  ) {
    const objectTypeModelMap: Record<string, { permissible?: (...args: unknown[]) => unknown }> = {
      post: models.Post,
      role: models.Role,
      user: models.User,
      setting: models.Settings,
      invite: models.Invite,
      integration: models.Integration,
      comment: models.Comment,
    };

    // Iterate through the object types, i.e. ['post', 'tag', 'user']
    return _.reduce(
      objTypes,
      function (objTypeHandlers: Record<string, ObjectTypeHandler>, objType) {
        // Grab the TargetModel through the objectTypeModelMap
        const TargetModel = objectTypeModelMap[objType];

        // Create the 'handler' for the object type;
        // the '.post()' in canThis(user).edit.post()
        objTypeHandlers[objType] = function (modelOrId, unsafeAttrs) {
          let modelId: string | number | undefined;
          unsafeAttrs = unsafeAttrs || {};

          // If it's an internal request, resolve immediately
          if (context.internal) {
            return Promise.resolve();
          }

          // Until scopes are enforced (PLA-639), an app is only ever the user it acts for
          if (isAppWithoutUser(context)) {
            return Promise.reject(
              new errors.NoPermissionError({ message: tpl(messages.noPermissionToAction) }),
            );
          }

          if (_.isNumber(modelOrId) || _.isString(modelOrId)) {
            // It's an id already, do nothing
            modelId = modelOrId;
          } else if (modelOrId) {
            // It's a model, get the id
            modelId = modelOrId.id;
          }
          // A context missing its principal fails here, not when canThis is called
          if (actors instanceof Error) {
            return Promise.reject(actors);
          }

          return Promise.resolve(actors).then(function (loadedPermissions) {
            const { hasUserPermission, hasApiKeyPermission } = getGrantFlags(
              loadedPermissions,
              actType,
              objType,
            );

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

  beginCheck(rawContext: unknown): CanThisResult {
    // Get context.user, context.api_key and context.app
    const context = parseContext(rawContext);
    return this.buildHandlers(context, actorsFor(context));
  }

  buildHandlers(context: ParsedContext, actors: LoadedActors | Error): CanThisResult {
    // Iterate through the actions and their related object types
    _.each(actionsMap, (objTypes, actType) => {
      // Build up the object type handlers;
      // the '.post()' parts in canThis(user).edit.post()
      const objTypeHandlers = this.buildObjectTypeHandlers(objTypes, actType, context, actors);

      // Define a property for the action on the result;
      // the '.edit' in canThis(user).edit.post()
      Object.defineProperty(this, actType, {
        writable: false,
        enumerable: false,
        configurable: false,
        value: objTypeHandlers,
      });
    });

    // Return this for chaining
    return this as unknown as CanThisResult;
  }
}

export default function canThis(context: unknown): CanThisResult {
  const result = new CanThisResultBuilder();

  return result.beginCheck(context);
}
