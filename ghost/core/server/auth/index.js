module.exports = {
  get authorize() {
    return require('./authorize');
  },

  get authenticate() {
    return require('./authenticate').default;
  },

  get session() {
    return require('./session');
  },

  get setup() {
    return require('./setup');
  },

  get passwordreset() {
    return require('./passwordreset');
  },

  get resetAuthentication() {
    return require('./reset-authentication').default;
  },

  // Loads Better Auth; only boot under auth:engine better-auth should touch it
  get betterAuth() {
    return require('./better-auth').default;
  },
};
