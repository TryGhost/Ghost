import errors from '@tryghost/errors';

// How Ghost refuses an app's call for a reason that is the app's, not the staff user's it acts
// for: a 403 with a code of its own, so an app's developer can tell it from Ghost's other
// refusals and it can be found in the logs. A refusal because the staff user's role doesn't
// allow the call stays Ghost's generic one.

/** `APP_NOT_ALLOWED`: no app may call the endpoint, whatever its scopes. */
export function appNotAllowed() {
  return new errors.NoPermissionError({
    message: 'Apps are not allowed to access this endpoint',
    code: 'APP_NOT_ALLOWED',
  });
}

/** `APP_SCOPE_REQUIRED`: the app wasn't approved for the scope a permission check needs. */
export function appScopeRequired(permissionKey: string) {
  return new errors.NoPermissionError({
    message: `This app was not approved for the ${permissionKey} scope`,
    code: 'APP_SCOPE_REQUIRED',
  });
}
