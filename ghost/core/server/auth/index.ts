// NOTE: this file must contain no export other than the `export =` below; see
// shared/config/index.ts. Each getter loads its module on first use.

// @ts-expect-error ignore erasableSyntaxOnly here: js endpoints require() this
// module and read its getters straight off module.exports.
export = {
  // auth:engine, which is fixed for the process
  get isBetterAuth(): boolean {
    return require('../../shared/config').get('auth:engine') === 'better-auth';
  },

  get authorize(): typeof import('./authorize') {
    return require('./authorize');
  },

  get authenticate(): typeof import('./authenticate').default {
    return require('./authenticate').default;
  },

  get session(): typeof import('./session').default {
    return require('./session').default;
  },

  get setup(): typeof import('./setup') {
    return require('./setup');
  },

  get passwordreset(): typeof import('./passwordreset').default {
    return require('./passwordreset').default;
  },

  get resetAuthentication(): typeof import('./reset-authentication').default {
    return require('./reset-authentication').default;
  },

  // Loads Better Auth; only boot under auth:engine better-auth should touch it
  get betterAuth(): typeof import('./better-auth').default {
    return require('./better-auth').default;
  },

  // Better Auth's session revocation; only under auth:engine better-auth
  get staffSessions(): ReturnType<typeof import('./better-auth/staff-sessions').default> {
    return require('./better-auth/staff-sessions').default();
  },

  // Stripe Connect's OAuth state; only under auth:engine better-auth
  get stripeConnectState(): ReturnType<
    typeof import('./better-auth/stripe-connect-state').default
  > {
    return require('./better-auth/stripe-connect-state').default();
  },
};
