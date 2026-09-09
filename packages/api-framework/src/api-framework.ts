module.exports = {
  get headers() {
    return require('./headers.ts');
  },

  get http() {
    return require('./http.ts');
  },

  get Frame() {
    return require('./Frame.ts');
  },

  get pipeline() {
    return require('./pipeline.ts');
  },

  get validators() {
    return require('./validators/index.ts');
  },

  get serializers() {
    return require('./serializers/index.ts');
  },

  get utils() {
    return require('./utils/index.ts');
  },
};
