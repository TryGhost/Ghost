module.exports = {
  get handle() {
    return require('./handle.ts');
  },

  get input() {
    return require('./input/index.ts');
  },
};
