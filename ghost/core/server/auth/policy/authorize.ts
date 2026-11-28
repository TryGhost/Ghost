import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type { Principal } from '../principal';
import { appOutOfScope } from './app-refusals';
import { capabilities, capabilityKey, type Capability } from './capabilities';
import { rowRules } from './rules';
import { scopesAllow } from './scopes';

const messages = {
  noPermissionToAction: 'You do not have permission to perform this action',
};

export interface AuthorizeOptions {
  /** The resource, or its id, when the check is for one */
  resource?: unknown;
  /** The request's `unsafeAttrs` */
  attrs?: Record<string, unknown>;
}

/** An allowed request; the endpoint strips `excludedAttrs` before the write. */
export interface Allowed {
  excludedAttrs?: string[];
}

export function noPermission() {
  return new errors.NoPermissionError({ message: tpl(messages.noPermissionToAction) });
}

/**
 * The refusal of a key the principal's scopes don't allow. An app's says which scope it lacked,
 * or that no app may take the action when the key is no scope, with a code of its own; a refusal
 * because of the user's role is never this one.
 */
export function outOfScope(principal: Principal, key: Capability) {
  return principal.kind === 'app' ? appOutOfScope(key) : noPermission();
}

/**
 * Resolves when the principal may take the action, and throws otherwise. A
 * row rule for the type decides, and can narrow or widen the grant, but is
 * only reached when the scopes allow the key.
 */
export async function authorize(
  principal: Principal,
  action: string,
  objectType: string,
  { resource, attrs = {} }: AuthorizeOptions = {},
): Promise<Allowed> {
  if (principal.kind === 'internal') {
    return {};
  }

  const { granted, scopes } = capabilities(principal);
  const key = capabilityKey(objectType, action);

  if (!scopesAllow(scopes, key)) {
    throw outOfScope(principal, key);
  }

  if (Object.hasOwn(rowRules, objectType)) {
    return rowRules[objectType]({ principal, action, granted: granted.has(key), resource, attrs });
  }

  if (!granted.has(key)) {
    throw noPermission();
  }

  return {};
}
