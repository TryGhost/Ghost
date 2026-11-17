/**
 * Better Auth endpoint paths Ghost refers to, relative to `basePath`. A
 * mistyped path never matches and fails silently, so every matcher, limiter
 * and disabled path reads them from here. Plugin paths are listed ahead of
 * the plugins that serve them.
 */
export const ROUTES = {
  signInEmail: '/sign-in/email',
  signInSocial: '/sign-in/social',
  signUpEmail: '/sign-up/email',
  updateUser: '/update-user',
  changeEmail: '/change-email',
  deleteUser: '/delete-user',
  changePassword: '/change-password',
  verifyPassword: '/verify-password',
  requestPasswordReset: '/request-password-reset',
  resetPassword: '/reset-password',
  // magicLink plugin
  signInMagicLink: '/sign-in/magic-link',
  magicLinkVerify: '/magic-link/verify',
  // passkey plugin
  passkeyVerifyAuthentication: '/passkey/verify-authentication',
} as const;

/** `@better-auth/sso` callback paths, which carry a provider id */
export const SSO_PREFIX = '/sso/';
