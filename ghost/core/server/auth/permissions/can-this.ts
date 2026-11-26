import errors from '@tryghost/errors';
import { actionsMap, forRoles, type Permission } from './role-permissions';
import { ANONYMOUS, type Principal, type RoleView, type UserView } from '../principal';
import { authorize, noPermission, outOfScope, type Allowed } from '../policy/authorize';
import { capabilities, capabilityKey } from '../policy/capabilities';
import { scopesAllow } from '../policy/scopes';
import parseContext, { type ParsedContext } from './parse-context';

const models = require('../../models');

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
 * What a check resolves to: the endpoint filter strips `excludedAttrs` when
 * present, as it does for the hooks' results, and an allowed check is otherwise undefined.
 */
export function toCheckResult({ excludedAttrs }: Allowed): Allowed | undefined {
  return excludedAttrs ? { excludedAttrs } : undefined;
}

/** The grant flags the model `permissible` hooks still take; they read them by truthiness. */
export function getGrantFlags(principal: Principal, actType: string, objType: string) {
  const granted = capabilities(principal).granted.has(capabilityKey(objType, actType));

  // An integration key's grant is the key's flag; every other principal's is the user's
  if (principal.kind === 'integration') {
    return { hasUserPermission: true, hasApiKeyPermission: granted };
  }
  return { hasUserPermission: granted, hasApiKeyPermission: true };
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
    return objTypes.reduce(function (objTypeHandlers: Record<string, ObjectTypeHandler>, objType) {
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

        // Until PLA-639, an app needs a user to act for, whatever its scopes
        if (isAppWithoutUser(context)) {
          return Promise.reject(noPermission());
        }

        if (typeof modelOrId === 'number' || typeof modelOrId === 'string') {
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

        // Only `context.internal` grants everything, never a principal claiming it
        const principal =
          !context.principal || context.principal.kind === 'internal'
            ? ANONYMOUS
            : context.principal;

        return Promise.resolve(actors).then(function (loadedPermissions) {
          // Scopes cap the hooks as they will cap row rules; unscoped principals pass
          const { scopes } = capabilities(principal);
          const key = capabilityKey(objType, actType);
          if (!scopesAllow(scopes, key)) {
            return Promise.reject(outOfScope(principal, key));
          }

          // Offer a chance for the TargetModel to override the results
          if (TargetModel && typeof TargetModel.permissible === 'function') {
            const { hasUserPermission, hasApiKeyPermission } = getGrantFlags(
              principal,
              actType,
              objType,
            );

            return TargetModel.permissible(
              modelId,
              actType,
              context,
              unsafeAttrs,
              loadedPermissions,
              hasUserPermission,
              hasApiKeyPermission,
            );
          }

          return authorize(principal, actType, objType, {
            resource: modelId,
            attrs: unsafeAttrs,
          }).then(toCheckResult);
        });
      };

      return objTypeHandlers;
    }, {});
  }

  beginCheck(rawContext: unknown): CanThisResult {
    // Get context.user, context.api_key and context.app
    const context = parseContext(rawContext);
    return this.buildHandlers(context, actorsFor(context));
  }

  buildHandlers(context: ParsedContext, actors: LoadedActors | Error): CanThisResult {
    // Iterate through the actions and their related object types
    for (const [actType, objTypes] of Object.entries(actionsMap)) {
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
    }

    // Return this for chaining
    return this as unknown as CanThisResult;
  }
}

export default function canThis(context: unknown): CanThisResult {
  const result = new CanThisResultBuilder();

  return result.beginCheck(context);
}
